import { Test, TestingModule } from '@nestjs/testing';
import { RbacService } from './rbac.service';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Role, Permission } from './enums';

describe('RbacService', () => {
  let service: RbacService;
  let prisma: PrismaClient;
  let redis: Redis;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  const mockRedis = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        {
          provide: PrismaClient,
          useValue: mockPrisma,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
    prisma = module.get<PrismaClient>(PrismaClient);
    redis = module.get<Redis>('REDIS_CLIENT');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRole', () => {
    it('should return user role from cache', async () => {
      const userId = 'user123';
      const cachedRole = Role.ADMIN;

      mockRedis.get.mockResolvedValue(cachedRole);

      const result = await service.getUserRole(userId);

      expect(result).toBe(cachedRole);
      expect(redis.get).toHaveBeenCalledWith(`user_role:${userId}`);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch user role from database when not cached', async () => {
      const userId = 'user123';
      const userRole = Role.SUPER_ADMIN;

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        role: { name: userRole },
      });
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.getUserRole(userId);

      expect(result).toBe(userRole);
      expect(redis.get).toHaveBeenCalledWith(`user_role:${userId}`);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { role: { select: { name: true } } },
      });
      expect(redis.setex).toHaveBeenCalledWith(`user_role:${userId}`, 900, userRole);
    });

    it('should return USER role when user has no role', async () => {
      const userId = 'user123';

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        role: null,
      });
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.getUserRole(userId);

      expect(result).toBe(Role.USER);
    });

    it('should return USER role when user not found', async () => {
      const userId = 'user123';

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getUserRole(userId);

      expect(result).toBe(Role.USER);
    });

    it('should return USER role on error', async () => {
      const userId = 'user123';

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await service.getUserRole(userId);

      expect(result).toBe(Role.USER);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      const userId = 'user123';
      const permission = Permission.USERS_READ;

      jest.spyOn(service, 'getUserRole').mockResolvedValue(Role.ADMIN);
      jest
        .spyOn(service, 'getRolePermissions')
        .mockResolvedValue([Permission.USERS_READ, Permission.USERS_WRITE]);

      const result = await service.hasPermission(userId, permission);

      expect(result).toBe(true);
    });

    it('should return false when user does not have permission', async () => {
      const userId = 'user123';
      const permission = Permission.USERS_DELETE;

      jest.spyOn(service, 'getUserRole').mockResolvedValue(Role.SUPERVISOR);
      jest
        .spyOn(service, 'getRolePermissions')
        .mockResolvedValue([Permission.USERS_READ, Permission.BILLING_READ]);

      const result = await service.hasPermission(userId, permission);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const userId = 'user123';
      const permission = Permission.USERS_READ;

      jest.spyOn(service, 'getUserRole').mockRejectedValue(new Error('Error'));

      const result = await service.hasPermission(userId, permission);

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has any of the permissions', async () => {
      const userId = 'user123';
      const permissions = [Permission.USERS_DELETE, Permission.USERS_READ];

      jest.spyOn(service, 'getUserRole').mockResolvedValue(Role.ADMIN);
      jest.spyOn(service, 'getRolePermissions').mockResolvedValue([Permission.USERS_READ]);

      const result = await service.hasAnyPermission(userId, permissions);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the permissions', async () => {
      const userId = 'user123';
      const permissions = [Permission.USERS_DELETE, Permission.BILLING_REFUND];

      jest.spyOn(service, 'getUserRole').mockResolvedValue(Role.SUPERVISOR);
      jest.spyOn(service, 'getRolePermissions').mockResolvedValue([Permission.USERS_READ]);

      const result = await service.hasAnyPermission(userId, permissions);

      expect(result).toBe(false);
    });

    it('should return true for empty permissions array', async () => {
      const userId = 'user123';
      const permissions: Permission[] = [];

      const result = await service.hasAnyPermission(userId, permissions);

      expect(result).toBe(true);
    });

    it('should return false and log error on exception', async () => {
      const userId = 'user123';
      const permissions = [Permission.USERS_READ];

      jest.spyOn(service, 'getUserRole').mockRejectedValue(new Error('Service error'));

      const result = await service.hasAnyPermission(userId, permissions);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all permissions', async () => {
      const userId = 'user123';
      const permissions = [Permission.USERS_READ, Permission.USERS_WRITE];

      jest.spyOn(service, 'getUserRole').mockResolvedValue(Role.ADMIN);
      jest
        .spyOn(service, 'getRolePermissions')
        .mockResolvedValue([
          Permission.USERS_READ,
          Permission.USERS_WRITE,
          Permission.USERS_DELETE,
        ]);

      const result = await service.hasAllPermissions(userId, permissions);

      expect(result).toBe(true);
    });

    it('should return false when user missing some permissions', async () => {
      const userId = 'user123';
      const permissions = [Permission.USERS_READ, Permission.USERS_DELETE];

      jest.spyOn(service, 'getUserRole').mockResolvedValue(Role.SUPERVISOR);
      jest.spyOn(service, 'getRolePermissions').mockResolvedValue([Permission.USERS_READ]);

      const result = await service.hasAllPermissions(userId, permissions);

      expect(result).toBe(false);
    });

    it('should return true for empty permissions array', async () => {
      const userId = 'user123';
      const permissions: Permission[] = [];

      const result = await service.hasAllPermissions(userId, permissions);

      expect(result).toBe(true);
    });

    it('should return false and log error on exception', async () => {
      const userId = 'user123';
      const permissions = [Permission.USERS_READ];

      jest.spyOn(service, 'getUserRole').mockRejectedValue(new Error('Service error'));

      const result = await service.hasAllPermissions(userId, permissions);

      expect(result).toBe(false);
    });
  });

  describe('getRolePermissions', () => {
    it('should return role permissions from cache', async () => {
      const role = Role.ADMIN;
      const cachedPermissions = [Permission.USERS_READ, Permission.USERS_WRITE];

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedPermissions));

      const result = await service.getRolePermissions(role);

      expect(result).toEqual(cachedPermissions);
      expect(redis.get).toHaveBeenCalledWith(`role_permissions:${role}`);
      expect(prisma.role.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch role permissions from database when not cached', async () => {
      const role = Role.SUPER_ADMIN;
      const permissions = [Permission.USERS_DELETE, Permission.ROLES_MANAGE];

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({
        permissions: permissions,
      });
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.getRolePermissions(role);

      expect(result).toEqual(permissions);
      expect(redis.get).toHaveBeenCalledWith(`role_permissions:${role}`);
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: role },
        select: { permissions: true },
      });
      expect(redis.setex).toHaveBeenCalledWith(
        `role_permissions:${role}`,
        3600,
        JSON.stringify(permissions)
      );
    });

    it('should return empty array when role not found', async () => {
      const role = Role.ADMIN;

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue(null);

      const result = await service.getRolePermissions(role);

      expect(result).toEqual([]);
    });

    it('should filter invalid permissions', async () => {
      const role = Role.ADMIN;
      const rawPermissions = [Permission.USERS_READ, 'INVALID_PERMISSION', Permission.USERS_WRITE];

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({
        permissions: rawPermissions,
      });
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.getRolePermissions(role);

      expect(result).toEqual([Permission.USERS_READ, Permission.USERS_WRITE]);
    });

    it('should return empty array on error', async () => {
      const role = Role.ADMIN;

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await service.getRolePermissions(role);

      expect(result).toEqual([]);
    });
  });

  describe('hasMinimumRole', () => {
    it('should return true when user role meets minimum requirement', async () => {
      const userId = 'user123';

      jest.spyOn(service, 'getUserRole').mockResolvedValue(Role.ADMIN);

      const result = await service.hasMinimumRole(userId, Role.SUPERVISOR);

      expect(result).toBe(true);
    });

    it('should return false when user role does not meet minimum requirement', async () => {
      const userId = 'user123';

      jest.spyOn(service, 'getUserRole').mockResolvedValue(Role.SUPERVISOR);

      const result = await service.hasMinimumRole(userId, Role.ADMIN);

      expect(result).toBe(false);
    });

    it('should return true when user role equals required role', async () => {
      const userId = 'user123';

      jest.spyOn(service, 'getUserRole').mockResolvedValue(Role.USER);

      const result = await service.hasMinimumRole(userId, Role.USER);

      expect(result).toBe(true);
    });

    it('should return false and log error on exception', async () => {
      const userId = 'user123';

      jest.spyOn(service, 'getUserRole').mockRejectedValue(new Error('Service error'));

      const result = await service.hasMinimumRole(userId, Role.ADMIN);

      expect(result).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has one of the specified roles', async () => {
      const userId = 'user123';
      const roles = [Role.ADMIN, Role.SUPER_ADMIN];

      jest.spyOn(service, 'getUserRole').mockResolvedValue(Role.SUPER_ADMIN);

      const result = await service.hasAnyRole(userId, roles);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the specified roles', async () => {
      const userId = 'user123';
      const roles = [Role.ADMIN, Role.SUPER_ADMIN];

      jest.spyOn(service, 'getUserRole').mockResolvedValue(Role.SUPERVISOR);

      const result = await service.hasAnyRole(userId, roles);

      expect(result).toBe(false);
    });

    it('should return true for empty roles array', async () => {
      const userId = 'user123';
      const roles: Role[] = [];

      const result = await service.hasAnyRole(userId, roles);

      expect(result).toBe(true);
    });

    it('should return false and log error on exception', async () => {
      const userId = 'user123';
      const roles = [Role.ADMIN];

      jest.spyOn(service, 'getUserRole').mockRejectedValue(new Error('Service error'));

      const result = await service.hasAnyRole(userId, roles);

      expect(result).toBe(false);
    });
  });

  describe('invalidateUserRoleCache', () => {
    it('should invalidate user role cache', async () => {
      const userId = 'user123';

      mockRedis.del.mockResolvedValue(1);

      await service.invalidateUserRoleCache(userId);

      expect(redis.del).toHaveBeenCalledWith(`user_role:${userId}`);
    });

    it('should handle cache invalidation errors gracefully', async () => {
      const userId = 'user123';

      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(service.invalidateUserRoleCache(userId)).resolves.toBeUndefined();
    });
  });

  describe('invalidateRolePermissionsCache', () => {
    it('should invalidate role permissions cache', async () => {
      const role = Role.ADMIN;

      mockRedis.del.mockResolvedValue(1);

      await service.invalidateRolePermissionsCache(role);

      expect(redis.del).toHaveBeenCalledWith(`role_permissions:${role}`);
    });

    it('should handle cache invalidation errors gracefully', async () => {
      const role = Role.ADMIN;

      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(service.invalidateRolePermissionsCache(role)).resolves.toBeUndefined();
    });
  });

  describe('getRoleLevel', () => {
    it('should return correct role level', () => {
      expect(service.getRoleLevel(Role.USER)).toBe(1);
      expect(service.getRoleLevel(Role.SUPERVISOR)).toBe(2);
      expect(service.getRoleLevel(Role.ADMIN)).toBe(3);
      expect(service.getRoleLevel(Role.SUPER_ADMIN)).toBe(4);
    });
  });

  describe('getAllRoles', () => {
    it('should return all roles from database', async () => {
      const mockRoles = [
        { name: Role.USER },
        { name: Role.SUPERVISOR },
        { name: Role.ADMIN },
        { name: Role.SUPER_ADMIN },
      ];

      mockPrisma.role.findMany.mockResolvedValue(mockRoles);

      const result = await service.getAllRoles();

      expect(result).toEqual([Role.USER, Role.SUPERVISOR, Role.ADMIN, Role.SUPER_ADMIN]);
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        select: { name: true },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array on error', async () => {
      mockPrisma.role.findMany.mockRejectedValue(new Error('Database error'));

      const result = await service.getAllRoles();

      expect(result).toEqual([]);
    });
  });
});
