import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaClient, SubscriptionPlan } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import {
  AdminLoggingService,
  AdminLogAction,
  AdminLogTargetType,
} from '../rbac/admin-logging.service';
import * as bcrypt from 'bcrypt';
import { GetUsersQueryDto, UserPlan, UserStatus, SortOrder } from './dto/get-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SuspendUserDto, ActivateUserDto, DeleteUserDto } from './dto/suspend-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(() => Promise.resolve('hashed-password')),
}));

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaClient;
  let jwtService: JwtService;
  let adminLoggingService: AdminLoggingService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    link: {
      updateMany: jest.fn(),
    },
    oneLink: {
      updateMany: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
  } as any;

  const mockJwtService = {
    sign: jest.fn(),
  } as any;

  const mockAdminLoggingService = {
    logAction: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaClient,
          useValue: mockPrisma,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: AdminLoggingService,
          useValue: mockAdminLoggingService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaClient>(PrismaClient);
    jwtService = module.get<JwtService>(JwtService);
    adminLoggingService = module.get<AdminLoggingService>(AdminLoggingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserList', () => {
    it('should return paginated user list', async () => {
      const query: GetUsersQueryDto = {
        page: 1,
        pageSize: 20,
      };

      const mockUsers = [
        {
          id: 'user1',
          email: 'user1@example.com',
          name: 'User 1',
          plan: SubscriptionPlan.FREE,
          status: 'ACTIVE',
          total_links: 10,
          total_onelinks: 0,
          total_clicks: 100,
        },
      ];

      const mockCountResult = [{ total: 1 }];

      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce(mockUsers)
        .mockResolvedValueOnce(mockCountResult);

      const result = await service.getUserList(query, 'admin123');

      expect(result.data).toEqual(mockUsers);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should filter users by search term', async () => {
      const query: GetUsersQueryDto = {
        search: 'user1',
        page: 1,
        pageSize: 10,
      };

      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

      await service.getUserList(query, 'admin123');

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
      const [usersQueryCall, countQueryCall] = mockPrisma.$queryRawUnsafe.mock.calls;

      expect(usersQueryCall[0]).toContain('u.email ILIKE $1');
      expect(usersQueryCall[1]).toBe('%user1%');
      expect(usersQueryCall[2]).toBe(10);
      expect(usersQueryCall[3]).toBe(0);

      expect(countQueryCall[0]).toContain('u.email ILIKE $1');
      expect(countQueryCall[1]).toBe('%user1%');
    });

    it('should filter users by status', async () => {
      const query: GetUsersQueryDto = {
        status: UserStatus.SUSPENDED,
        page: 1,
        pageSize: 10,
      };

      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

      await service.getUserList(query, 'admin123');

      const [usersQueryCall] = mockPrisma.$queryRawUnsafe.mock.calls;
      expect(usersQueryCall[0]).toContain('u."suspendedAt" IS NOT NULL');
    });

    it('should sort users by different fields', async () => {
      const query: GetUsersQueryDto = {
        sortBy: 'email',
        sortOrder: SortOrder.ASC,
        page: 1,
        pageSize: 10,
      };

      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

      await service.getUserList(query, 'admin123');

      const [usersQueryCall] = mockPrisma.$queryRawUnsafe.mock.calls;
      expect(usersQueryCall[0]).toContain('ORDER BY u."email" ASC');
    });

    it('should limit page size to maximum 100', async () => {
      const query: GetUsersQueryDto = {
        page: 1,
        pageSize: 200,
      };

      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

      await service.getUserList(query, 'admin123');

      const [usersQueryCall] = mockPrisma.$queryRawUnsafe.mock.calls;
      expect(usersQueryCall[1]).toBe(100);
      expect(usersQueryCall[2]).toBe(0);
    });
  });

  describe('createUser', () => {
    it('should create a new user with hashed password and default role', async () => {
      const createDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'Password123',
        name: 'New User',
        plan: SubscriptionPlan.PRO,
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // no existing user
        .mockResolvedValueOnce({ id: 'admin123', role: { name: 'SUPER_ADMIN' } });
      mockPrisma.role.findUnique.mockResolvedValueOnce({ id: 'role-admin', name: 'ADMIN' });
      const createdAt = new Date('2025-01-01T00:00:00Z');
      mockPrisma.user.create.mockResolvedValueOnce({
        id: 'user123',
        email: 'newuser@example.com',
        name: 'New User',
        avatar: null,
        bio: null,
        location: null,
        website: null,
        timezone: 'UTC',
        language: 'en',
        emailNotifications: true,
        analyticsTracking: true,
        createdAt,
        updatedAt: createdAt,
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: null,
        isActive: true,
        plan: SubscriptionPlan.PRO,
        role: { name: 'ADMIN' },
      });

      const result = await service.createUser(createDto, 'admin123');

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'newuser@example.com',
            roleId: 'role-admin',
            plan: SubscriptionPlan.PRO,
          }),
        })
      );
      expect(mockAdminLoggingService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: 'admin123',
          action: AdminLogAction.CREATE_USER,
          targetId: 'user123',
        })
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('User created successfully');
      expect(result.user?.email).toBe('newuser@example.com');
      expect((result.user as any)?.role).toBe('ADMIN');
      expect((result.user as any)?.plan).toBe('PRO');
    });

    it('should throw conflict when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'existing-user' });

      const createDto: CreateUserDto = {
        email: 'duplicate@example.com',
        password: 'Password123',
      };

      await expect(service.createUser(createDto, 'admin123')).rejects.toThrow(
        'Email already exists'
      );
    });

    it('should throw when default role is missing', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'admin123', role: { name: 'SUPER_ADMIN' } });
      mockPrisma.role.findUnique.mockResolvedValueOnce(null);

      const createDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'Password123',
      };

      await expect(service.createUser(createDto, 'admin123')).rejects.toThrow(
        'Requested role is not configured'
      );
    });

    it('should require super admin to assign elevated roles', async () => {
      const createDto: CreateUserDto = {
        email: 'teamlead@example.com',
        password: 'Password123',
        role: 'ADMIN',
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // user check
        .mockResolvedValueOnce({ id: 'admin456', role: { name: 'ADMIN' } }); // requesting admin

      await expect(service.createUser(createDto, 'admin456')).rejects.toThrow(
        'Only super admins can assign elevated roles'
      );
    });
  });

  describe('getUserDetails', () => {
    it('should return detailed user information', async () => {
      const userId = 'user123';
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        name: 'Test User',
        role: { name: 'USER' },
        isActive: true,
        suspendedAt: null,
      };

      const mockStats = [
        { total_links: 10, total_onelinks: 5, total_clicks: 100, total_qr_codes: 2 },
      ];
      const mockCurrentMonthUsage = [
        { links_this_month: 2, onelinks_this_month: 1, clicks_this_month: 20 },
      ];
      const mockRecentActivity = [
        { type: 'LINK_CREATED', timestamp: '2025-01-20T10:00:00Z', details: { linkId: 'link1' } },
      ];

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockCurrentMonthUsage)
        .mockResolvedValueOnce(mockRecentActivity);

      const result = await service.getUserDetails(userId, 'admin123');

      expect(result.user.id).toBe(userId);
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.role).toBe('USER');
      expect(result.usage.allTime.totalLinks).toBe(10);
      expect(result.recentActivity).toHaveLength(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserDetails('nonexistent', 'admin123')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('updateUser', () => {
    it('should update user with valid data', async () => {
      const userId = 'user123';
      const updateData: UpdateUserDto = {
        name: 'Updated Name',
        emailNotifications: false,
        plan: SubscriptionPlan.PRO,
      };

      const existingUser = {
        id: userId,
        email: 'old@example.com',
        name: 'Old Name',
        emailNotifications: true,
        plan: 'FREE',
        role: { name: 'USER' },
      };

      const updatedUser = {
        id: userId,
        name: 'Updated Name',
        email: 'old@example.com',
        emailNotifications: false,
        plan: SubscriptionPlan.PRO,
        role: { name: 'USER' },
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser(userId, updateData, 'admin123');

      expect(result.success).toBe(true);
      expect(result.user.name).toBe('Updated Name');
      expect(result.user.emailNotifications).toBe(false);
      expect((result.user as any).plan).toBe('PRO');
      expect(adminLoggingService.logAction).toHaveBeenCalledWith({
        adminId: 'admin123',
        action: AdminLogAction.EDIT_USER,
        targetId: userId,
        targetType: AdminLogTargetType.USER,
        metadata: expect.objectContaining({
          before: expect.any(Object),
          after: expect.any(Object),
        }),
      });
    });

    it('should allow super admin to change user role', async () => {
      const userId = 'user456';
      const updateData: UpdateUserDto = {
        role: 'ADMIN',
      };

      const existingUser = {
        id: userId,
        email: 'team@example.com',
        name: 'Team Member',
        emailNotifications: true,
        plan: 'FREE',
        role: { name: 'USER' },
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce({ id: 'admin123', role: { name: 'SUPER_ADMIN' } });
      mockPrisma.role.findUnique.mockResolvedValueOnce({ id: 'role-admin', name: 'ADMIN' });
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        role: { name: 'ADMIN' },
      });

      const result = await service.updateUser(userId, updateData, 'admin123');
      expect((result.user as any).role).toBe('ADMIN');
    });

    it('should throw when non super admin attempts role change', async () => {
      const userId = 'user789';
      const updateData: UpdateUserDto = {
        role: 'ADMIN',
      };

      const existingUser = {
        id: userId,
        email: 'basic@example.com',
        name: 'Basic User',
        emailNotifications: true,
        plan: 'FREE',
        role: { name: 'USER' },
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce({ id: 'admin456', role: { name: 'ADMIN' } });

      await expect(service.updateUser(userId, updateData, 'admin456')).rejects.toThrow(
        'Only super admins can change user roles'
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      const userId = 'user123';
      const updateData: UpdateUserDto = {
        email: 'existing@example.com',
      };

      const existingUser = {
        id: userId,
        email: 'old@example.com',
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce({ id: 'other', email: 'existing@example.com' });

      await expect(service.updateUser(userId, updateData, 'admin123')).rejects.toThrow(
        'Email already exists'
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUser('nonexistent', {}, 'admin123')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('suspendUser', () => {
    it('should suspend user with reason', async () => {
      const userId = 'user123';
      const suspendData: SuspendUserDto = {
        reason: 'Violation of terms',
        notifyUser: true,
      };

      const mockUser = {
        id: userId,
        email: 'user@example.com',
        role: { name: 'USER' },
        suspendedAt: null,
      };

      const suspendedUser = {
        ...mockUser,
        suspendedAt: new Date(),
        suspendedBy: 'admin123',
        suspensionReason: 'Violation of terms',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(suspendedUser);

      const result = await service.suspendUser(userId, suspendData, 'admin123');

      expect(result.success).toBe(true);
      expect(adminLoggingService.logAction).toHaveBeenCalledWith({
        adminId: 'admin123',
        action: AdminLogAction.SUSPEND_USER,
        targetId: userId,
        targetType: AdminLogTargetType.USER,
        metadata: {
          reason: 'Violation of terms',
          notifyUser: true,
        },
      });
    });

    it('should throw BadRequestException when user already suspended', async () => {
      const userId = 'user123';
      const suspendData: SuspendUserDto = {
        reason: 'Test reason',
      };

      const mockUser = {
        id: userId,
        suspendedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.suspendUser(userId, suspendData, 'admin123')).rejects.toThrow(
        'User is already suspended'
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.suspendUser('nonexistent', {} as any, 'admin123')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('activateUser', () => {
    it('should activate suspended user', async () => {
      const userId = 'user123';
      const activateData: ActivateUserDto = {
        notifyUser: true,
      };

      const mockUser = {
        id: userId,
        email: 'user@example.com',
        suspendedAt: new Date(),
      };

      const activatedUser = {
        ...mockUser,
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(activatedUser);

      const result = await service.activateUser(userId, activateData, 'admin123');

      expect(result.success).toBe(true);
      expect(adminLoggingService.logAction).toHaveBeenCalledWith({
        adminId: 'admin123',
        action: AdminLogAction.ACTIVATE_USER,
        targetId: userId,
        targetType: AdminLogTargetType.USER,
        metadata: {
          notifyUser: true,
        },
      });
    });

    it('should throw BadRequestException when user not suspended', async () => {
      const userId = 'user123';
      const mockUser = {
        id: userId,
        suspendedAt: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.activateUser(userId, {}, 'admin123')).rejects.toThrow(
        'User is not suspended'
      );
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user with confirmation', async () => {
      const userId = 'user123';
      const deleteData: DeleteUserDto = {
        confirm: 'DELETE',
        reason: 'User requested deletion',
      };

      const mockUser = {
        id: userId,
        email: 'user@example.com',
        role: { name: 'USER' },
      };

      const deletedUser = {
        ...mockUser,
        isActive: false,
        email: 'deleted_timestamp_user@example.com',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(deletedUser);
      mockPrisma.link.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.oneLink.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.deleteUser(userId, deleteData, 'admin123');

      expect(result.success).toBe(true);
      expect(mockPrisma.link.updateMany).toHaveBeenCalledWith({
        where: { userId },
        data: { isActive: false },
      });
      expect(adminLoggingService.logAction).toHaveBeenCalledWith({
        adminId: 'admin123',
        action: AdminLogAction.DELETE_USER,
        targetId: userId,
        targetType: AdminLogTargetType.USER,
        metadata: {
          reason: 'User requested deletion',
          userEmail: 'user@example.com',
          userName: undefined,
        },
      });
    });

    it('should throw BadRequestException when confirmation incorrect', async () => {
      const deleteData: DeleteUserDto = {
        confirm: 'WRONG',
        reason: 'Test',
      };

      await expect(service.deleteUser('user123', deleteData, 'admin123')).rejects.toThrow(
        'Confirmation text must be "DELETE"'
      );
    });

    it('should throw BadRequestException when trying to delete self', async () => {
      const deleteData: DeleteUserDto = {
        confirm: 'DELETE',
        reason: 'Test',
      };

      await expect(service.deleteUser('admin123', deleteData, 'admin123')).rejects.toThrow(
        'Cannot delete your own account'
      );
    });
  });

  describe('impersonateUser', () => {
    it('should generate impersonation token', async () => {
      const userId = 'user123';
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        role: { name: 'USER' },
        isActive: true,
        suspendedAt: null,
      };

      const mockToken = 'impersonation_token_123';
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.impersonateUser(userId, 'admin123');

      expect(result.token).toBe(mockToken);
      expect(result.expiresIn).toBe(900);
      expect(result.targetUser.id).toBe(userId);
      expect(result.targetUser.email).toBe('user@example.com');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: userId,
          email: 'user@example.com',
          isImpersonation: true,
          adminId: 'admin123',
        },
        { expiresIn: '15m' }
      );
      expect(adminLoggingService.logAction).toHaveBeenCalledWith({
        adminId: 'admin123',
        action: AdminLogAction.IMPERSONATE_USER,
        targetId: userId,
        targetType: AdminLogTargetType.USER,
        metadata: {
          impersonationTokenExpiry: expect.any(Date),
        },
      });
    });

    it('should throw ForbiddenException when trying to impersonate admin', async () => {
      const mockUser = {
        id: 'admin123',
        email: 'admin@example.com',
        role: { name: 'ADMIN' },
        isActive: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.impersonateUser('admin123', 'admin123')).rejects.toThrow(
        'Cannot impersonate admin users'
      );
    });

    it('should throw BadRequestException when user is suspended', async () => {
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        suspendedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.impersonateUser('user123', 'admin123')).rejects.toThrow(
        'Cannot impersonate inactive or suspended user'
      );
    });
  });

  describe('getPlanLimits', () => {
    it('should return correct plan limits for FREE plan', () => {
      const service = new AdminService(mockPrisma, mockJwtService, mockAdminLoggingService);
      const limits = (service as any).getPlanLimits('FREE');

      expect(limits).toEqual({
        links: 10,
        onelinks: 3,
        clicks: 1000,
      });
    });

    it('should return correct plan limits for STARTER plan', () => {
      const service = new AdminService(mockPrisma, mockJwtService, mockAdminLoggingService);
      const limits = (service as any).getPlanLimits('STARTER');

      expect(limits).toEqual({
        links: 50,
        onelinks: 15,
        clicks: 10000,
      });
    });

    it('should return correct plan limits for PRO plan', () => {
      const service = new AdminService(mockPrisma, mockJwtService, mockAdminLoggingService);
      const limits = (service as any).getPlanLimits('PRO');

      expect(limits).toEqual({
        links: 200,
        onelinks: 50,
        clicks: 50000,
      });
    });

    it('should return FREE plan limits for unknown plan', () => {
      const service = new AdminService(mockPrisma, mockJwtService, mockAdminLoggingService);
      const limits = (service as any).getPlanLimits('UNKNOWN');

      expect(limits).toEqual({
        links: 10,
        onelinks: 3,
        clicks: 1000,
      });
    });
  });
});
