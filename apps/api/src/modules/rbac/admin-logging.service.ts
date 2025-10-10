import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

/**
 * Admin log action types
 */
export enum AdminLogAction {
  // User actions
  VIEW_USER = 'VIEW_USER',
  CREATE_USER = 'CREATE_USER',
  EDIT_USER = 'EDIT_USER',
  DELETE_USER = 'DELETE_USER',
  SUSPEND_USER = 'SUSPEND_USER',
  ACTIVATE_USER = 'ACTIVATE_USER',
  IMPERSONATE_USER = 'IMPERSONATE_USER',
  RESET_PASSWORD_USER = 'RESET_PASSWORD_USER',

  // Billing actions
  VIEW_BILLING = 'VIEW_BILLING',
  EDIT_SUBSCRIPTION = 'EDIT_SUBSCRIPTION',
  CANCEL_SUBSCRIPTION = 'CANCEL_SUBSCRIPTION',
  REFUND_PAYMENT = 'REFUND_PAYMENT',
  CREATE_INVOICE = 'CREATE_INVOICE',

  // System actions
  VIEW_LOGS = 'VIEW_LOGS',
  EDIT_SETTINGS = 'EDIT_SETTINGS',
  VIEW_METRICS = 'VIEW_METRICS',

  // Content actions
  CREATE_CONTENT = 'CREATE_CONTENT',
  EDIT_CONTENT = 'EDIT_CONTENT',
  DELETE_CONTENT = 'DELETE_CONTENT',

  // Support actions
  VIEW_TICKET = 'VIEW_TICKET',
  REPLY_TICKET = 'REPLY_TICKET',
  CLOSE_TICKET = 'CLOSE_TICKET',
  ASSIGN_TICKET = 'ASSIGN_TICKET',

  // FAQ actions
  CREATE_FAQ = 'CREATE_FAQ',
  EDIT_FAQ = 'EDIT_FAQ',
  DELETE_FAQ = 'DELETE_FAQ',
  PUBLISH_FAQ = 'PUBLISH_FAQ',

  // Role management
  ASSIGN_ROLE = 'ASSIGN_ROLE',
  CHANGE_PERMISSIONS = 'CHANGE_PERMISSIONS',
}

/**
 * Admin log target types
 */
export enum AdminLogTargetType {
  USER = 'USER',
  SUBSCRIPTION = 'SUBSCRIPTION',
  PAYMENT = 'PAYMENT',
  TICKET = 'TICKET',
  FAQ = 'FAQ',
  INVOICE = 'INVOICE',
  CONTENT = 'CONTENT',
  ROLE = 'ROLE',
}

/**
 * Interface for admin log data
 */
export interface AdminLogData {
  adminId: string;
  action: AdminLogAction;
  targetId?: string;
  targetType?: AdminLogTargetType;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Interface for admin logging metadata
 */
export interface AdminLoggingMetadata {
  action: AdminLogAction;
  targetType?: AdminLogTargetType;
  targetIdParam?: string; // Parameter name to extract target ID from route params
  getTargetId?: (request: Request) => string | undefined; // Custom function to get target ID
  logRequest?: boolean; // Whether to log request body
  logResponse?: boolean; // Whether to log response data
  sensitiveFields?: string[]; // Fields to exclude from logging (passwords, tokens, etc.)
}

/**
 * Service for logging admin actions to the audit trail
 */
@Injectable()
export class AdminLoggingService {
  private readonly logger = new Logger(AdminLoggingService.name);

  constructor(
    private prisma: PrismaClient
  ) {}

  /**
   * Log an admin action to the audit trail
   * @param data The admin log data
   * @returns Promise<void>
   */
  async logAction(data: AdminLogData): Promise<void> {
    try {
      await this.prisma.adminLog.create({
        data: {
          adminId: data.adminId,
          action: data.action,
          targetId: data.targetId,
          targetType: data.targetType,
          metadata: data.metadata || {},
          ipAddress: data.ipAddress,
        },
      });

      this.logger.debug(`Admin action logged: ${data.action} by admin ${data.adminId}`);
    } catch (error) {
      // Never throw errors from logging to avoid breaking main functionality
      this.logger.error(`Failed to log admin action: ${data.action}`, error);
    }
  }

  /**
   * Log an admin action with request context
   * @param adminId The admin user ID
   * @param action The action performed
   * @param request The HTTP request object
   * @param targetId Optional target resource ID
   * @param targetType Optional target resource type
   * @param metadata Optional additional metadata
   * @returns Promise<void>
   */
  async logActionWithContext(
    adminId: string,
    action: AdminLogAction,
    request: Request,
    targetId?: string,
    targetType?: AdminLogTargetType,
    metadata?: Record<string, any>
  ): Promise<void> {
    const clientIp = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];

    await this.logAction({
      adminId,
      action,
      targetId,
      targetType,
      metadata: {
        ...metadata,
        userAgent,
        endpoint: request.url,
        method: request.method,
      },
      ipAddress: clientIp,
    });
  }

  /**
   * Get admin logs for a specific admin
   * @param adminId The admin ID
   * @param limit Optional limit for number of records
   * @param offset Optional offset for pagination
   * @returns Promise<Array<AdminLog>>
   */
  async getAdminLogs(adminId: string, limit = 50, offset = 0) {
    try {
      return await this.prisma.adminLog.findMany({
        where: { adminId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
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
    } catch (error) {
      this.logger.error(`Failed to get admin logs for admin ${adminId}:`, error);
      throw error;
    }
  }

  /**
   * Get admin logs for a specific target
   * @param targetId The target ID
   * @param targetType The target type
   * @param limit Optional limit for number of records
   * @returns Promise<Array<AdminLog>>
   */
  async getTargetLogs(targetId: string, targetType: AdminLogTargetType, limit = 50) {
    try {
      return await this.prisma.adminLog.findMany({
        where: {
          targetId,
          targetType,
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
    } catch (error) {
      this.logger.error(`Failed to get target logs for ${targetType} ${targetId}:`, error);
      throw error;
    }
  }

  /**
   * Get recent admin activity across all admins
   * @param hours Number of hours to look back
   * @param limit Optional limit for number of records
   * @returns Promise<Array<AdminLog>>
   */
  async getRecentActivity(hours = 24, limit = 100) {
    try {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      return await this.prisma.adminLog.findMany({
        where: {
          createdAt: {
            gte: since,
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
    } catch (error) {
      this.logger.error('Failed to get recent admin activity:', error);
      throw error;
    }
  }

  /**
   * Get admin action statistics
   * @param days Number of days to analyze
   * @returns Promise<Record<string, number>>
   */
  async getActionStats(days = 7) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const stats = await this.prisma.adminLog.groupBy({
        by: ['action'],
        where: {
          createdAt: {
            gte: since,
          },
        },
        _count: {
          action: true,
        },
      });

      return stats.reduce((acc, stat) => {
        acc[stat.action] = stat._count.action;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      this.logger.error('Failed to get admin action stats:', error);
      throw error;
    }
  }

  /**
   * Extract client IP from request
   * @param request The HTTP request object
   * @returns string The client IP address
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    const realIp = request.headers['x-real-ip'] as string;

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    if (realIp) {
      return realIp;
    }

    return request.ip || request.connection.remoteAddress || 'unknown';
  }

  /**
   * Get admin logs with filtering options
   * @param filters Optional filters
   * @param pagination Pagination options
   * @returns Promise<{logs: AdminLog[], total: number}>
   */
  async getFilteredLogs(
    filters: {
      adminId?: string;
      action?: AdminLogAction;
      targetType?: AdminLogTargetType;
      targetId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 50 }
  ) {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const where: any = {};

      if (filters.adminId) where.adminId = filters.adminId;
      if (filters.action) where.action = filters.action;
      if (filters.targetType) where.targetType = filters.targetType;
      if (filters.targetId) where.targetId = filters.targetId;

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const [logs, total] = await Promise.all([
        this.prisma.adminLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            admin: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.adminLog.count({ where }),
      ]);

      return { logs, total };
    } catch (error) {
      this.logger.error('Failed to get filtered admin logs:', error);
      throw error;
    }
  }
}
