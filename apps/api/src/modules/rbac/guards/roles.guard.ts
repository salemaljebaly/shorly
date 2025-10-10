import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';
import { ROLES_KEY, PERMISSIONS_KEY, ANY_PERMISSION_KEY } from '../decorators';
import { Role } from '../enums/roles.enum';
import { Permission } from '../enums/permissions.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private reflector: Reflector,
    private rbacService: RbacService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('🛡️ RolesGuard - Checking access for:', {
      url: request.url,
      method: request.method,
      user: {
        id: user?.id,
        email: user?.email,
        role: user?.role?.name || user?.role,
        isActive: user?.isActive
      }
    });

    // If there's no user, authentication failed
    if (!user || !user.id) {
      console.log('❌ RolesGuard - No user or user ID found');
      throw new ForbiddenException('Authentication required');
    }

    // Get required roles from metadata
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Get required permissions from metadata (AND logic)
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Get required permissions from metadata (OR logic)
    const anyRequiredPermissions = this.reflector.getAllAndOverride<Permission[]>(ANY_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles or permissions are required, allow access
    if (!requiredRoles?.length && !requiredPermissions?.length && !anyRequiredPermissions?.length) {
      return true;
    }

    try {
      // Check role-based access
      if (requiredRoles?.length) {
        console.log('🛡️ RolesGuard - Checking required roles:', requiredRoles);
        const hasRole = await this.rbacService.hasAnyRole(user.id, requiredRoles);
        console.log('🛡️ RolesGuard - Role check result:', hasRole);
        if (!hasRole) {
          this.logger.warn(`Access denied: User ${user.id} lacks required roles: ${requiredRoles.join(', ')}`);
          console.log('❌ RolesGuard - Access denied: insufficient roles');
          throw new ForbiddenException('Insufficient permissions: invalid role');
        }
      }

      // Check permission-based access (AND logic - all permissions required)
      if (requiredPermissions?.length) {
        console.log('🛡️ RolesGuard - Checking required permissions:', requiredPermissions);
        const hasPermissions = await this.rbacService.hasAllPermissions(user.id, requiredPermissions);
        console.log('🛡️ RolesGuard - Permission check result:', hasPermissions);
        if (!hasPermissions) {
          this.logger.warn(`Access denied: User ${user.id} lacks required permissions: ${requiredPermissions.join(', ')}`);
          console.log('❌ RolesGuard - Access denied: insufficient permissions');
          throw new ForbiddenException('Insufficient permissions: missing required permissions');
        }
      }

      // Check permission-based access (OR logic - any permission sufficient)
      if (anyRequiredPermissions?.length) {
        const hasAnyPermission = await this.rbacService.hasAnyPermission(user.id, anyRequiredPermissions);
        if (!hasAnyPermission) {
          this.logger.warn(`Access denied: User ${user.id} lacks any of required permissions: ${anyRequiredPermissions.join(', ')}`);
          throw new ForbiddenException('Insufficient permissions: missing required permissions');
        }
      }

      // Log successful access for audit purposes
      this.logger.debug(`Access granted: User ${user.id} accessed ${request.method} ${request.url}`);

      return true;
    } catch (error) {
      // Re-throw ForbiddenException, log other errors
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`Error checking permissions for user ${user.id}:`, error);
      throw new ForbiddenException('Authorization check failed');
    }
  }
}