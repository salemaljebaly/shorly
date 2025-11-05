import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Role, Permission } from './enums';
import { ROLE_HIERARCHY } from './enums/roles.enum';

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  // Cache TTL constants (in seconds)
  private readonly USER_ROLE_CACHE_TTL = 900; // 15 minutes
  private readonly ROLE_PERMISSIONS_CACHE_TTL = 3600; // 1 hour

  constructor(
    private prisma: PrismaClient,
    @Inject('REDIS_CLIENT') private redis: Redis
  ) {}

  /**
   * Get user's role from database with caching
   * @param userId The user ID
   * @returns Promise<Role> The user's role
   */
  async getUserRole(userId: string): Promise<Role> {
    const cacheKey = `user_role:${userId}`;

    try {
      // Try to get from cache first
      const cachedRole = await this.redis.get(cacheKey);
      if (cachedRole) {
        return cachedRole as Role;
      }

      // Query database for user role
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      const roleName = user.role?.name || Role.USER;

      // Cache the result
      await this.redis.setex(cacheKey, this.USER_ROLE_CACHE_TTL, roleName);

      return roleName as Role;
    } catch (error) {
      this.logger.error(`Failed to get user role for ${userId}:`, error);
      // Default to USER role on error
      return Role.USER;
    }
  }

  /**
   * Check if user has a specific permission
   * @param userId The user ID
   * @param permission The permission to check
   * @returns Promise<boolean> True if user has the permission
   */
  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);
      const rolePermissions = await this.getRolePermissions(userRole);
      return rolePermissions.includes(permission);
    } catch (error) {
      this.logger.error(`Failed to check permission for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if user has ANY of the provided permissions
   * @param userId The user ID
   * @param permissions Array of permissions to check (OR logic)
   * @returns Promise<boolean> True if user has any of the permissions
   */
  async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    if (permissions.length === 0) return true;

    try {
      const userRole = await this.getUserRole(userId);
      const rolePermissions = await this.getRolePermissions(userRole);
      return permissions.some(permission => rolePermissions.includes(permission));
    } catch (error) {
      this.logger.error(`Failed to check any permission for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if user has ALL of the provided permissions
   * @param userId The user ID
   * @param permissions Array of permissions to check (AND logic)
   * @returns Promise<boolean> True if user has all permissions
   */
  async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    if (permissions.length === 0) return true;

    try {
      const userRole = await this.getUserRole(userId);
      const rolePermissions = await this.getRolePermissions(userRole);
      return permissions.every(permission => rolePermissions.includes(permission));
    } catch (error) {
      this.logger.error(`Failed to check all permissions for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get all permissions for a role with caching
   * @param role The role to get permissions for
   * @returns Promise<Permission[]> Array of permissions
   */
  async getRolePermissions(role: Role): Promise<Permission[]> {
    const cacheKey = `role_permissions:${role}`;

    try {
      // Try to get from cache first
      const cachedPermissions = await this.redis.get(cacheKey);
      if (cachedPermissions) {
        return JSON.parse(cachedPermissions) as Permission[];
      }

      // Query database for role permissions
      const roleData = await this.prisma.role.findUnique({
        where: { name: role },
        select: { permissions: true },
      });

      if (!roleData) {
        this.logger.warn(`Role not found: ${role}`);
        return [];
      }

      const permissions = (roleData.permissions as string[]).filter(
        (perm): perm is Permission => Object.values(Permission).includes(perm as Permission)
      );

      // Cache the result
      await this.redis.setex(
        cacheKey,
        this.ROLE_PERMISSIONS_CACHE_TTL,
        JSON.stringify(permissions)
      );

      return permissions;
    } catch (error) {
      this.logger.error(`Failed to get role permissions for ${role}:`, error);
      return [];
    }
  }

  /**
   * Check if a user's role meets the minimum required role level
   * @param userId The user ID
   * @param requiredRole The minimum required role
   * @returns Promise<boolean> True if user's role is equal or higher
   */
  async hasMinimumRole(userId: string, requiredRole: Role): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);
      return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
    } catch (error) {
      this.logger.error(`Failed to check minimum role for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if user has ANY of the provided roles
   * @param userId The user ID
   * @param roles Array of roles to check
   * @returns Promise<boolean> True if user has any of the roles
   */
  async hasAnyRole(userId: string, roles: Role[]): Promise<boolean> {
    if (roles.length === 0) return true;

    try {
      const userRole = await this.getUserRole(userId);
      return roles.includes(userRole);
    } catch (error) {
      this.logger.error(`Failed to check any role for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Invalidate user role cache (call when role changes)
   * @param userId The user ID whose cache should be invalidated
   */
  async invalidateUserRoleCache(userId: string): Promise<void> {
    try {
      const cacheKey = `user_role:${userId}`;
      await this.redis.del(cacheKey);
      this.logger.debug(`Invalidated role cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate user role cache for ${userId}:`, error);
    }
  }

  /**
   * Invalidate role permissions cache (call when role permissions change)
   * @param role The role whose cache should be invalidated
   */
  async invalidateRolePermissionsCache(role: Role): Promise<void> {
    try {
      const cacheKey = `role_permissions:${role}`;
      await this.redis.del(cacheKey);
      this.logger.debug(`Invalidated permissions cache for role: ${role}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate role permissions cache for ${role}:`, error);
    }
  }

  /**
   * Get role hierarchy level
   * @param role The role
   * @returns number The hierarchy level
   */
  getRoleLevel(role: Role): number {
    return ROLE_HIERARCHY[role];
  }

  /**
   * Get all available roles
   * @returns Promise<Role[]> Array of all roles
   */
  async getAllRoles(): Promise<Role[]> {
    try {
      const roles = await this.prisma.role.findMany({
        select: { name: true },
        orderBy: { createdAt: 'asc' },
      });
      return roles.map(role => role.name as Role);
    } catch (error) {
      this.logger.error('Failed to get all roles:', error);
      return [];
    }
  }
}