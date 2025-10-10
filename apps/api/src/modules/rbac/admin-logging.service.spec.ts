import { Test, TestingModule } from '@nestjs/testing';
import { AdminLoggingService, AdminLogAction, AdminLogTargetType } from './admin-logging.service';
import { PrismaClient } from '@prisma/client';

describe('AdminLoggingService', () => {
  let service: AdminLoggingService;
  let prisma: PrismaClient;

  const mockPrisma = {
    adminLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminLoggingService,
        {
          provide: PrismaClient,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AdminLoggingService>(AdminLoggingService);
    prisma = module.get<PrismaClient>(PrismaClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logAction', () => {
    it('should log admin action successfully', async () => {
      const logData = {
        adminId: 'admin123',
        action: AdminLogAction.VIEW_USER,
        targetId: 'user456',
        targetType: AdminLogTargetType.USER,
        metadata: { test: 'data' },
        ipAddress: '192.168.1.1',
      };

      mockPrisma.adminLog.create.mockResolvedValue({ id: 'log1' });

      await service.logAction(logData);

      expect(prisma.adminLog.create).toHaveBeenCalledWith({
        data: {
          adminId: logData.adminId,
          action: logData.action,
          targetId: logData.targetId,
          targetType: logData.targetType,
          metadata: logData.metadata,
          ipAddress: logData.ipAddress,
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      const logData = {
        adminId: 'admin123',
        action: AdminLogAction.VIEW_USER,
      };

      mockPrisma.adminLog.create.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.logAction(logData)).resolves.toBeUndefined();
    });

    it('should use default metadata when not provided', async () => {
      const logData = {
        adminId: 'admin123',
        action: AdminLogAction.VIEW_USER,
      };

      mockPrisma.adminLog.create.mockResolvedValue({ id: 'log1' });

      await service.logAction(logData);

      expect(prisma.adminLog.create).toHaveBeenCalledWith({
        data: {
          adminId: logData.adminId,
          action: logData.action,
          targetId: undefined,
          targetType: undefined,
          metadata: {},
          ipAddress: undefined,
        },
      });
    });
  });

  describe('logActionWithContext', () => {
    it('should log action with request context', async () => {
      const adminId = 'admin123';
      const action = AdminLogAction.EDIT_USER;
      const request = {
        method: 'POST',
        url: '/api/admin/users/user456',
        headers: { 'user-agent': 'Mozilla/5.0' },
        ip: '192.168.1.1',
      } as any;

      mockPrisma.adminLog.create.mockResolvedValue({ id: 'log1' });

      await service.logActionWithContext(adminId, action, request, 'user456', AdminLogTargetType.USER);

      expect(prisma.adminLog.create).toHaveBeenCalledWith({
        data: {
          adminId,
          action,
          targetId: 'user456',
          targetType: AdminLogTargetType.USER,
          metadata: {
            userAgent: 'Mozilla/5.0',
            endpoint: '/api/admin/users/user456',
            method: 'POST',
          },
          ipAddress: '192.168.1.1',
        },
      });
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const request = {
        method: 'GET',
        url: '/api/test',
        headers: {
          'x-forwarded-for': '10.0.0.1, 192.168.1.1',
          'user-agent': 'TestAgent',
        },
      } as any;

      mockPrisma.adminLog.create.mockResolvedValue({ id: 'log1' });

      await service.logActionWithContext('admin123', AdminLogAction.VIEW_USER, request);

      expect(prisma.adminLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '10.0.0.1',
          }),
        })
      );
    });

    it('should extract IP from x-real-ip header', async () => {
      const request = {
        method: 'GET',
        url: '/api/test',
        headers: {
          'x-real-ip': '10.0.0.2',
          'user-agent': 'TestAgent',
        },
      } as any;

      mockPrisma.adminLog.create.mockResolvedValue({ id: 'log1' });

      await service.logActionWithContext('admin123', AdminLogAction.VIEW_USER, request);

      expect(prisma.adminLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '10.0.0.2',
          }),
        })
      );
    });

    it('should return unknown IP when no IP found', async () => {
      const request = {
        method: 'GET',
        url: '/api/test',
        headers: { 'user-agent': 'TestAgent' },
        ip: undefined,
        connection: { remoteAddress: undefined },
      } as any;

      mockPrisma.adminLog.create.mockResolvedValue({ id: 'log1' });

      await service.logActionWithContext('admin123', AdminLogAction.VIEW_USER, request);

      expect(prisma.adminLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: 'unknown',
          }),
        })
      );
    });
  });

  describe('getAdminLogs', () => {
    it('should get admin logs with pagination', async () => {
      const adminId = 'admin123';
      const expectedLogs = [
        { id: 'log1', action: AdminLogAction.VIEW_USER },
        { id: 'log2', action: AdminLogAction.EDIT_USER },
      ];

      mockPrisma.adminLog.findMany.mockResolvedValue(expectedLogs);

      const result = await service.getAdminLogs(adminId, 50, 0);

      expect(result).toEqual(expectedLogs);
      expect(prisma.adminLog.findMany).toHaveBeenCalledWith({
        where: { adminId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it('should use default pagination values', async () => {
      const adminId = 'admin123';
      const expectedLogs = [{ id: 'log1' }];

      mockPrisma.adminLog.findMany.mockResolvedValue(expectedLogs);

      const result = await service.getAdminLogs(adminId);

      expect(result).toEqual(expectedLogs);
      expect(prisma.adminLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        })
      );
    });

    it('should handle database errors', async () => {
      const adminId = 'admin123';

      mockPrisma.adminLog.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getAdminLogs(adminId)).rejects.toThrow('Database error');
    });
  });

  describe('getTargetLogs', () => {
    it('should get logs for specific target', async () => {
      const targetId = 'user456';
      const targetType = AdminLogTargetType.USER;
      const expectedLogs = [
        { id: 'log1', action: AdminLogAction.VIEW_USER },
        { id: 'log2', action: AdminLogAction.EDIT_USER },
      ];

      mockPrisma.adminLog.findMany.mockResolvedValue(expectedLogs);

      const result = await service.getTargetLogs(targetId, targetType, 100);

      expect(result).toEqual(expectedLogs);
      expect(prisma.adminLog.findMany).toHaveBeenCalledWith({
        where: {
          targetId,
          targetType,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it('should use default limit', async () => {
      const targetId = 'user456';
      const targetType = AdminLogTargetType.USER;
      const expectedLogs = [{ id: 'log1' }];

      mockPrisma.adminLog.findMany.mockResolvedValue(expectedLogs);

      const result = await service.getTargetLogs(targetId, targetType);

      expect(result).toEqual(expectedLogs);
      expect(prisma.adminLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });
  });

  describe('getRecentActivity', () => {
    it('should get recent admin activity', async () => {
      const hours = 24;
      const limit = 100;
      const expectedLogs = [
        { id: 'log1', action: AdminLogAction.VIEW_USER },
        { id: 'log2', action: AdminLogAction.EDIT_USER },
      ];

      mockPrisma.adminLog.findMany.mockResolvedValue(expectedLogs);

      const result = await service.getRecentActivity(hours, limit);

      expect(result).toEqual(expectedLogs);
      expect(prisma.adminLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it('should use default values', async () => {
      const expectedLogs = [{ id: 'log1' }];

      mockPrisma.adminLog.findMany.mockResolvedValue(expectedLogs);

      const result = await service.getRecentActivity();

      expect(result).toEqual(expectedLogs);
      expect(prisma.adminLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });
  });

  describe('getActionStats', () => {
    it('should get action statistics', async () => {
      const days = 7;
      const mockStats = [
        { action: AdminLogAction.VIEW_USER, _count: { action: 15 } },
        { action: AdminLogAction.EDIT_USER, _count: { action: 8 } },
      ];

      mockPrisma.adminLog.groupBy.mockResolvedValue(mockStats);

      const result = await service.getActionStats(days);

      expect(result).toEqual({
        [AdminLogAction.VIEW_USER]: 15,
        [AdminLogAction.EDIT_USER]: 8,
      });
      expect(prisma.adminLog.groupBy).toHaveBeenCalledWith({
        by: ['action'],
        where: {
          createdAt: {
            gte: expect.any(Date),
          },
        },
        _count: {
          action: true,
        },
      });
    });

    it('should use default days value', async () => {
      mockPrisma.adminLog.groupBy.mockResolvedValue([]);

      const result = await service.getActionStats();

      expect(result).toEqual({});
      expect(prisma.adminLog.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: expect.any(Date),
            },
          },
        })
      );
    });
  });

  describe('getFilteredLogs', () => {
    it('should get filtered logs with pagination', async () => {
      const filters = {
        adminId: 'admin123',
        action: AdminLogAction.VIEW_USER,
        targetType: AdminLogTargetType.USER,
      };
      const pagination = { page: 2, limit: 25 };
      const expectedLogs = [{ id: 'log1' }];
      const expectedTotal = 50;

      mockPrisma.adminLog.findMany.mockResolvedValue(expectedLogs);
      mockPrisma.adminLog.count.mockResolvedValue(expectedTotal);

      const result = await service.getFilteredLogs(filters, pagination);

      expect(result).toEqual({ logs: expectedLogs, total: expectedTotal });
      expect(prisma.adminLog.findMany).toHaveBeenCalledWith({
        where: {
          adminId: 'admin123',
          action: AdminLogAction.VIEW_USER,
          targetType: AdminLogTargetType.USER,
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
        skip: 25,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it('should handle date filters', async () => {
      const filters = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
      };
      const pagination = { page: 1, limit: 50 };

      mockPrisma.adminLog.findMany.mockResolvedValue([]);
      mockPrisma.adminLog.count.mockResolvedValue(0);

      await service.getFilteredLogs(filters, pagination);

      expect(prisma.adminLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it('should use default values', async () => {
      mockPrisma.adminLog.findMany.mockResolvedValue([]);
      mockPrisma.adminLog.count.mockResolvedValue(0);

      const result = await service.getFilteredLogs();

      expect(result).toEqual({ logs: [], total: 0 });
      expect(prisma.adminLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });
  });
});