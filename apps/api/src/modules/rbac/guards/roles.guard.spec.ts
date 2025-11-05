import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { RbacService } from '../rbac.service';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role, Permission } from '../enums';
import { ROLES_KEY, PERMISSIONS_KEY, ANY_PERMISSION_KEY } from '../decorators';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let rbacService: RbacService;
  let reflector: Reflector;

  const mockRbacService = {
    hasAnyRole: jest.fn(),
    hasAllPermissions: jest.fn(),
    hasAnyPermission: jest.fn(),
  } as any;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  } as any;

  const createMockContext = (user: any = { id: 'user123' }) => {
    const context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user,
          method: 'GET',
          url: '/test',
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
    return context;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: RbacService,
          useValue: mockRbacService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    rbacService = module.get<RbacService>(RbacService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when no user (unauthenticated)', async () => {
      const context = createMockContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when no user ID', async () => {
      const context = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when no roles or permissions required', async () => {
      const context = createMockContext();

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(null) // ROLES_KEY
        .mockReturnValueOnce(null) // PERMISSIONS_KEY
        .mockReturnValueOnce(null); // ANY_PERMISSION_KEY

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRbacService.hasAnyRole).not.toHaveBeenCalled();
      expect(mockRbacService.hasAllPermissions).not.toHaveBeenCalled();
      expect(mockRbacService.hasAnyPermission).not.toHaveBeenCalled();
    });

    it('should allow access when user has required role', async () => {
      const context = createMockContext();
      const requiredRoles = [Role.ADMIN, Role.SUPER_ADMIN];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredRoles) // ROLES_KEY
        .mockReturnValueOnce(null) // PERMISSIONS_KEY
        .mockReturnValueOnce(null); // ANY_PERMISSION_KEY

      mockRbacService.hasAnyRole.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRbacService.hasAnyRole).toHaveBeenCalledWith('user123', requiredRoles);
    });

    it('should deny access when user does not have required role', async () => {
      const context = createMockContext();
      const requiredRoles = [Role.ADMIN, Role.SUPER_ADMIN];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredRoles) // ROLES_KEY
        .mockReturnValueOnce(null) // PERMISSIONS_KEY
        .mockReturnValueOnce(null); // ANY_PERMISSION_KEY

      mockRbacService.hasAnyRole.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockRbacService.hasAnyRole).toHaveBeenCalledWith('user123', requiredRoles);
    });

    it('should allow access when user has all required permissions', async () => {
      const context = createMockContext();
      const requiredPermissions = [Permission.USERS_READ, Permission.USERS_WRITE];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(null) // ROLES_KEY
        .mockReturnValueOnce(requiredPermissions) // PERMISSIONS_KEY
        .mockReturnValueOnce(null); // ANY_PERMISSION_KEY

      mockRbacService.hasAllPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRbacService.hasAllPermissions).toHaveBeenCalledWith('user123', requiredPermissions);
    });

    it('should deny access when user does not have all required permissions', async () => {
      const context = createMockContext();
      const requiredPermissions = [Permission.USERS_READ, Permission.USERS_DELETE];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(null) // ROLES_KEY
        .mockReturnValueOnce(requiredPermissions) // PERMISSIONS_KEY
        .mockReturnValueOnce(null); // ANY_PERMISSION_KEY

      mockRbacService.hasAllPermissions.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockRbacService.hasAllPermissions).toHaveBeenCalledWith('user123', requiredPermissions);
    });

    it('should allow access when user has any of the required permissions', async () => {
      const context = createMockContext();
      const requiredPermissions = [Permission.USERS_DELETE, Permission.USERS_READ];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(null) // ROLES_KEY
        .mockReturnValueOnce(null) // PERMISSIONS_KEY
        .mockReturnValueOnce(requiredPermissions); // ANY_PERMISSION_KEY

      mockRbacService.hasAnyPermission.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRbacService.hasAnyPermission).toHaveBeenCalledWith('user123', requiredPermissions);
    });

    it('should deny access when user has none of the required permissions', async () => {
      const context = createMockContext();
      const requiredPermissions = [Permission.USERS_DELETE, Permission.BILLING_REFUND];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(null) // ROLES_KEY
        .mockReturnValueOnce(null) // PERMISSIONS_KEY
        .mockReturnValueOnce(requiredPermissions); // ANY_PERMISSION_KEY

      mockRbacService.hasAnyPermission.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockRbacService.hasAnyPermission).toHaveBeenCalledWith('user123', requiredPermissions);
    });

    it('should check both roles and permissions when both are required', async () => {
      const context = createMockContext();
      const requiredRoles = [Role.ADMIN];
      const requiredPermissions = [Permission.USERS_READ];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredRoles) // ROLES_KEY
        .mockReturnValueOnce(requiredPermissions) // PERMISSIONS_KEY
        .mockReturnValueOnce(null); // ANY_PERMISSION_KEY

      mockRbacService.hasAnyRole.mockResolvedValue(true);
      mockRbacService.hasAllPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRbacService.hasAnyRole).toHaveBeenCalledWith('user123', requiredRoles);
      expect(mockRbacService.hasAllPermissions).toHaveBeenCalledWith('user123', requiredPermissions);
    });

    it('should deny access when user has role but missing permissions', async () => {
      const context = createMockContext();
      const requiredRoles = [Role.ADMIN];
      const requiredPermissions = [Permission.USERS_DELETE];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredRoles) // ROLES_KEY
        .mockReturnValueOnce(requiredPermissions) // PERMISSIONS_KEY
        .mockReturnValueOnce(null); // ANY_PERMISSION_KEY

      mockRbacService.hasAnyRole.mockResolvedValue(true);
      mockRbacService.hasAllPermissions.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should deny access when user has permissions but wrong role', async () => {
      const context = createMockContext();
      const requiredRoles = [Role.ADMIN];
      const requiredPermissions = [Permission.USERS_READ];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredRoles) // ROLES_KEY
        .mockReturnValueOnce(requiredPermissions) // PERMISSIONS_KEY
        .mockReturnValueOnce(null); // ANY_PERMISSION_KEY

      mockRbacService.hasAnyRole.mockResolvedValue(false);
      mockRbacService.hasAllPermissions.mockResolvedValue(true);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should handle role check errors gracefully', async () => {
      const context = createMockContext();
      const requiredRoles = [Role.ADMIN];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(requiredRoles) // ROLES_KEY
        .mockReturnValueOnce(null) // PERMISSIONS_KEY
        .mockReturnValueOnce(null); // ANY_PERMISSION_KEY

      mockRbacService.hasAnyRole.mockRejectedValue(new Error('Service error'));

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should handle permission check errors gracefully', async () => {
      const context = createMockContext();
      const requiredPermissions = [Permission.USERS_READ];

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(null) // ROLES_KEY
        .mockReturnValueOnce(requiredPermissions) // PERMISSIONS_KEY
        .mockReturnValueOnce(null); // ANY_PERMISSION_KEY

      mockRbacService.hasAllPermissions.mockRejectedValue(new Error('Service error'));

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

      });
});