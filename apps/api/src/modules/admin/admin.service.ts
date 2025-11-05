import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaClient, SubscriptionPlan } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { GetUsersQueryDto, UserStatus, SortOrder } from './dto/get-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SuspendUserDto, ActivateUserDto, DeleteUserDto } from './dto/suspend-user.dto';
import {
  AdminLoggingService,
  AdminLogAction,
  AdminLogTargetType,
} from '../rbac/admin-logging.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaClient,
    private jwtService: JwtService,
    private adminLoggingService: AdminLoggingService
  ) {}

  /**
   * Get paginated list of users with filters and search
   * Task 2.1: User List API
   */
  async getUserList(query: GetUsersQueryDto, adminId: string) {
    const {
      page = 1,
      pageSize = 20,
      search,
      plan,
      status,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC,
    } = query;

    const offset = (page - 1) * pageSize;
    const limit = Math.min(pageSize, 100);

    try {
      // Build WHERE conditions
      const whereConditions: string[] = [];
      const params: Array<string | number> = [];

      // Search condition (email, name, or ID)
      if (search) {
        const searchParamIndex = params.length + 1;
        whereConditions.push(`(
          u.email ILIKE $${searchParamIndex} OR
          u.name ILIKE $${searchParamIndex} OR
          u.id = $${searchParamIndex}
        )`);
        params.push(`%${search}%`);
      }

      // Plan filter
      if (plan) {
        whereConditions.push(`u.plan = $${params.length + 1}::"SubscriptionPlan"`);
        params.push(plan);
      }

      // Status filter
      if (status) {
        if (status === UserStatus.ACTIVE) {
          whereConditions.push(`u."suspendedAt" IS NULL AND u."isActive" = true`);
        } else if (status === UserStatus.SUSPENDED) {
          whereConditions.push(`u."suspendedAt" IS NOT NULL`);
        } else if (status === UserStatus.INACTIVE) {
          whereConditions.push(`u."isActive" = false`);
        }
      }

      const whereClause =
        whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const sortFieldMap = {
        createdAt: 'u."createdAt"',
        email: 'u."email"',
        name: 'u."name"',
        total_links: 'total_links',
        total_clicks: 'total_clicks',
      };
      const sortField = sortFieldMap[sortBy as keyof typeof sortFieldMap] || 'u.createdAt';

      const orderClause = `ORDER BY ${sortField} ${sortOrder}`;

      // Main query with optimized SQL using CTE for user stats
      const usersQuery = `
        WITH user_stats AS (
          SELECT
            u.id,
            COUNT(DISTINCT l.id) as total_links,
            COUNT(DISTINCT o.id) as total_onelinks,
            COUNT(DISTINCT c.id) as total_clicks
          FROM users u
          LEFT JOIN links l ON u.id = l."userId" AND l."isActive" = true
          LEFT JOIN onelinks o ON u.id = o."userId" AND o."isActive" = true
          LEFT JOIN click_events c ON (l.id = c."linkId" OR o.id = c."oneLinkId")
          GROUP BY u.id
        )
        SELECT
          u.id,
          u.email,
          u.name,
          u.avatar,
          u."createdAt",
          u."updatedAt",
          u."isActive",
          u."suspendedAt",
          u."suspendedBy",
          u."suspensionReason",
          r.name as role,
          u.plan as plan,
          CASE
            WHEN u."suspendedAt" IS NOT NULL THEN 'SUSPENDED'
            WHEN u."isActive" = false THEN 'INACTIVE'
            ELSE 'ACTIVE'
          END as status,
          COALESCE(us.total_links, 0) as total_links,
          COALESCE(us.total_onelinks, 0) as total_onelinks,
          COALESCE(us.total_clicks, 0) as total_clicks
        FROM users u
        LEFT JOIN roles r ON u."roleId" = r.id
        LEFT JOIN user_stats us ON u.id = us.id
        ${whereClause}
        ${orderClause}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      // Count query for pagination
      const countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        LEFT JOIN roles r ON u."roleId" = r.id
        ${whereClause}
      `;

      // Execute queries
      const [users, countResult] = await Promise.all([
        this.prisma.$queryRawUnsafe(usersQuery, ...params, limit, offset),
        this.prisma.$queryRawUnsafe(countQuery, ...params),
      ]);

      const normalizedUsers = (users as any[]).map((user) => ({
        ...user,
        plan: String(user.plan || 'FREE'),
        total_links: Number(user.total_links || 0),
        total_onelinks: Number(user.total_onelinks || 0),
        total_clicks: Number(user.total_clicks || 0),
      }));

      const total = Number((countResult as any[])[0]?.total || 0);
      const totalPages = Math.ceil(total / limit);

      return {
        data: normalizedUsers,
        pagination: {
          total,
          page: Number(page),
          pageSize: Number(limit),
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get user list for admin ${adminId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new user account
   */
  async createUser(createData: CreateUserDto, adminId: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: createData.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
        include: {
          role: {
            select: { name: true },
          },
        },
      });

      if (!admin) {
        throw new ForbiddenException('Admin context not found');
      }

      const isSuperAdmin = admin.role?.name === 'SUPER_ADMIN';
      const requestedRoleName = createData.role || 'USER';

      if (requestedRoleName !== 'USER' && !isSuperAdmin) {
        throw new ForbiddenException('Only super admins can assign elevated roles');
      }

      const targetRole = await this.prisma.role.findUnique({
        where: { name: requestedRoleName },
      });

      if (!targetRole) {
        throw new BadRequestException('Requested role is not configured');
      }

      const hashedPassword = await bcrypt.hash(createData.password, 10);

      const user = await this.prisma.user.create({
        data: {
          email: createData.email,
          password: hashedPassword,
          name: createData.name,
          bio: createData.bio,
          location: createData.location,
          website: createData.website,
          timezone: createData.timezone || 'UTC',
          language: createData.language || 'en',
          emailNotifications: createData.emailNotifications ?? true,
          analyticsTracking: createData.analyticsTracking ?? true,
          isActive: createData.isActive ?? true,
          plan: (createData.plan as SubscriptionPlan) || SubscriptionPlan.FREE,
          roleId: targetRole.id,
        },
        include: {
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      await this.adminLoggingService.logAction({
        adminId,
        action: AdminLogAction.CREATE_USER,
        targetId: user.id,
        targetType: AdminLogTargetType.USER,
        metadata: {
          email: user.email,
        },
      });

      const sanitizedUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        website: user.website,
        timezone: user.timezone,
        language: user.language,
        emailNotifications: user.emailNotifications,
        analyticsTracking: user.analyticsTracking,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        suspendedAt: user.suspendedAt,
        suspendedBy: user.suspendedBy,
        suspensionReason: user.suspensionReason,
        isActive: user.isActive,
        role: user.role?.name || 'USER',
        plan: user.plan,
        status: user.suspendedAt ? 'SUSPENDED' : user.isActive ? 'ACTIVE' : 'INACTIVE',
        total_links: 0,
        total_onelinks: 0,
        total_clicks: 0,
      };

      return {
        success: true,
        message: 'User created successfully',
        user: sanitizedUser,
      };
    } catch (error) {
      this.logger.error(`Failed to create user for admin ${adminId}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed user information with stats and subscription
   * Task 2.2: User Details API
   */
  async getUserDetails(userId: string, adminId: string) {
    try {
      // Get user with role (no subscription table yet)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            select: { name: true },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get user statistics
      const statsQuery = `
        SELECT
          COUNT(DISTINCT l.id) as total_links,
          COUNT(DISTINCT o.id) as total_onelinks,
          COUNT(DISTINCT c.id) as total_clicks,
          0 as total_qr_codes
        FROM users u
        LEFT JOIN links l ON u.id = l."userId" AND l."isActive" = true
        LEFT JOIN onelinks o ON u.id = o."userId" AND o."isActive" = true
        LEFT JOIN click_events c ON (l.id = c."linkId" OR o.id = c."oneLinkId")
        WHERE u.id = $1
      `;

      const stats = await this.prisma.$queryRawUnsafe(statsQuery, userId);

      // Get current month usage
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);

      const currentMonthQuery = `
        SELECT
          COUNT(DISTINCT l.id) as links_this_month,
          COUNT(DISTINCT o.id) as onelinks_this_month,
          COUNT(DISTINCT c.id) as clicks_this_month
        FROM users u
        LEFT JOIN links l ON u.id = l."userId" AND l."createdAt" >= $2
        LEFT JOIN onelinks o ON u.id = o."userId" AND o."createdAt" >= $2
        LEFT JOIN click_events c ON (l.id = c."linkId" OR o.id = c."oneLinkId") AND c."timestamp" >= $2
        WHERE u.id = $1
      `;

      const currentMonthUsage = await this.prisma.$queryRawUnsafe(
        currentMonthQuery,
        userId,
        currentMonthStart
      );

      const planLimits = this.getPlanLimits('FREE'); // All users are FREE for now

      // Get recent activity (last 10 actions)
      const recentActivityQuery = `
        (SELECT 'LINK_CREATED' as type, "createdAt" as timestamp,
                json_build_object('linkId', id, 'shortCode', "shortCode") as details
         FROM links WHERE "userId" = $1 AND "createdAt" >= NOW() - INTERVAL '30 days'
         ORDER BY "createdAt" DESC LIMIT 5)
        UNION ALL
        (SELECT 'LINK_DELETED' as type, "updatedAt" as timestamp,
                json_build_object('linkId', id, 'shortCode', "shortCode") as details
         FROM links WHERE "userId" = $1 AND "isActive" = false AND "updatedAt" >= NOW() - INTERVAL '30 days'
         ORDER BY "updatedAt" DESC LIMIT 5)
        UNION ALL
        (SELECT 'CLICK_TRACKED' as type,
                MAX(c."timestamp") as timestamp,
                json_build_object(
                  'count', COUNT(*),
                  'date', DATE(c."timestamp")
                ) as details
         FROM click_events c
         JOIN links l ON c."linkId" = l.id
         WHERE l."userId" = $1 AND c."timestamp" >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(c."timestamp")
         ORDER BY MAX(c."timestamp") DESC LIMIT 3)
        ORDER BY timestamp DESC
        LIMIT 10
      `;

      const recentActivity = await this.prisma.$queryRawUnsafe(recentActivityQuery, userId);

      const statsRow = (stats as any[])[0] || {};
      const currentMonthRow = (currentMonthUsage as any[])[0] || {};

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          bio: user.bio,
          location: user.location,
          website: user.website,
          timezone: user.timezone,
          language: user.language,
          emailNotifications: user.emailNotifications,
          analyticsTracking: user.analyticsTracking,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          suspendedAt: user.suspendedAt,
          suspendedBy: user.suspendedBy,
          suspensionReason: user.suspensionReason,
          role: user.role?.name || 'USER',
          plan: user.plan,
          status: user.suspendedAt ? 'SUSPENDED' : user.isActive ? 'ACTIVE' : 'INACTIVE',
        },
        subscription: null, // No subscription table yet
        usage: {
          currentMonth: {
            linksThisMonth: Number(currentMonthRow.links_this_month || 0),
            oneLinksThisMonth: Number(currentMonthRow.onelinks_this_month || 0),
            clicksThisMonth: Number(currentMonthRow.clicks_this_month || 0),
          },
          allTime: {
            totalLinks: Number(statsRow.total_links || 0),
            totalOneLinks: Number(statsRow.total_onelinks || 0),
            totalClicks: Number(statsRow.total_clicks || 0),
          },
          limits: {
            links: planLimits.links,
            onelinks: planLimits.onelinks,
            clicks: planLimits.clicks,
          },
        },
        recentActivity: (recentActivity as any[]).map((activity: any) => ({
          type: activity.type,
          timestamp: activity.timestamp,
          details: activity.details,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get user details ${userId} for admin ${adminId}:`, error);
      throw error;
    }
  }

  /**
   * Update user information
   * Task 2.7: Update User endpoint
   */
  async updateUser(userId: string, updateData: UpdateUserDto, adminId: string) {
    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            select: { name: true },
          },
        },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      // Check email uniqueness if email is being updated
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await this.prisma.user.findUnique({
          where: { email: updateData.email },
        });

        if (emailExists) {
          throw new ConflictException('Email already exists');
        }
      }

      let roleIdToUpdate: string | undefined;

      if (updateData.role) {
        const admin = await this.prisma.user.findUnique({
          where: { id: adminId },
          include: {
            role: {
              select: { name: true },
            },
          },
        });

        if (!admin || admin.role?.name !== 'SUPER_ADMIN') {
          throw new ForbiddenException('Only super admins can change user roles');
        }

        const targetRole = await this.prisma.role.findUnique({
          where: { name: updateData.role },
        });

        if (!targetRole) {
          throw new BadRequestException('Requested role is not configured');
        }

        roleIdToUpdate = targetRole.id;
      }

      // Filter allowed fields only
      const allowedFields = [
        'name',
        'email',
        'timezone',
        'language',
        'emailNotifications',
        'analyticsTracking',
        'bio',
        'location',
        'website',
        'isActive',
        'plan',
      ];
      const filteredData: any = Object.keys(updateData)
        .filter((key) => allowedFields.includes(key))
        .reduce((obj: any, key: string) => {
          obj[key] = (updateData as any)[key];
          return obj;
        }, {});

      if (Object.keys(filteredData).length === 0 && !roleIdToUpdate) {
        throw new BadRequestException('No valid fields to update');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...filteredData,
          ...(roleIdToUpdate ? { roleId: roleIdToUpdate } : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          bio: true,
          location: true,
          website: true,
          timezone: true,
          language: true,
          emailNotifications: true,
          analyticsTracking: true,
          createdAt: true,
          updatedAt: true,
          suspendedAt: true,
          suspendedBy: true,
          suspensionReason: true,
          isActive: true,
          plan: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      // Log admin action
      await this.adminLoggingService.logAction({
        adminId,
        action: AdminLogAction.EDIT_USER,
        targetId: userId,
        targetType: AdminLogTargetType.USER,
        metadata: {
          before: {
            name: existingUser.name,
            email: existingUser.email,
            timezone: existingUser.timezone,
            language: existingUser.language,
            emailNotifications: existingUser.emailNotifications,
            analyticsTracking: existingUser.analyticsTracking,
            role: existingUser.role?.name,
            plan: existingUser.plan,
          },
          after: {
            ...filteredData,
            ...(roleIdToUpdate
              ? {
                  role: updateData.role,
                }
              : {
                  role: existingUser.role?.name,
                }),
            plan: filteredData.plan ?? existingUser.plan,
          },
        },
      });

      return {
        success: true,
        message: 'User updated successfully',
        user: {
          ...updatedUser,
          role: updatedUser.role?.name || 'USER',
        },
      };
    } catch (error) {
      this.logger.error(`Failed to update user ${userId} for admin ${adminId}:`, error);
      throw error;
    }
  }

  /**
   * Suspend user account
   * Task 2.4: Suspend User endpoint
   */
  async suspendUser(userId: string, suspendData: SuspendUserDto, adminId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.suspendedAt) {
        throw new BadRequestException('User is already suspended');
      }

      // Cannot suspend other admins (only SUPER_ADMIN can)
      if (user.role?.name === 'SUPER_ADMIN' || user.role?.name === 'ADMIN') {
        throw new ForbiddenException('Cannot suspend admin users');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          suspendedAt: new Date(),
          suspendedBy: adminId,
          suspensionReason: suspendData.reason,
        },
      });

      // Log admin action
      await this.adminLoggingService.logAction({
        adminId,
        action: AdminLogAction.SUSPEND_USER,
        targetId: userId,
        targetType: AdminLogTargetType.USER,
        metadata: {
          reason: suspendData.reason,
          notifyUser: suspendData.notifyUser,
        },
      });

      // TODO: Send email notification if notifyUser is true

      return { success: true, user: updatedUser };
    } catch (error) {
      this.logger.error(`Failed to suspend user ${userId} for admin ${adminId}:`, error);
      throw error;
    }
  }

  /**
   * Activate suspended user account
   * Task 2.4: Activate User endpoint
   */
  async activateUser(userId: string, activateData: ActivateUserDto, adminId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.suspendedAt) {
        throw new BadRequestException('User is not suspended');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          suspendedAt: null,
          suspendedBy: null,
          suspensionReason: null,
        },
      });

      // Log admin action
      await this.adminLoggingService.logAction({
        adminId,
        action: AdminLogAction.ACTIVATE_USER,
        targetId: userId,
        targetType: AdminLogTargetType.USER,
        metadata: {
          notifyUser: activateData.notifyUser,
        },
      });

      // TODO: Send email notification if notifyUser is true

      return { success: true, user: updatedUser };
    } catch (error) {
      this.logger.error(`Failed to activate user ${userId} for admin ${adminId}:`, error);
      throw error;
    }
  }

  /**
   * Delete user account (soft delete)
   * Task 2.5: Delete User endpoint
   */
  async deleteUser(userId: string, deleteData: DeleteUserDto, adminId: string) {
    try {
      if (deleteData.confirm !== 'DELETE') {
        throw new BadRequestException('Confirmation text must be "DELETE"');
      }

      if (userId === adminId) {
        throw new BadRequestException('Cannot delete your own account');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Cannot delete other admins (only SUPER_ADMIN can)
      if (user.role?.name === 'SUPER_ADMIN' || user.role?.name === 'ADMIN') {
        throw new ForbiddenException('Cannot delete admin users');
      }

      // Soft delete by marking as inactive and adding deletion timestamp
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          suspendedAt: new Date(),
          suspendedBy: adminId,
          suspensionReason: `ACCOUNT_DELETED: ${deleteData.reason}`,
          email: `deleted_${Date.now()}_${user.email}`, // Make email unique
        },
      });

      // Deactivate all links and onelinks
      await Promise.all([
        this.prisma.link.updateMany({
          where: { userId },
          data: { isActive: false },
        }),
        this.prisma.oneLink.updateMany({
          where: { userId },
          data: { isActive: false },
        }),
      ]);

      // Log admin action
      await this.adminLoggingService.logAction({
        adminId,
        action: AdminLogAction.DELETE_USER,
        targetId: userId,
        targetType: AdminLogTargetType.USER,
        metadata: {
          reason: deleteData.reason,
          userEmail: user.email,
          userName: user.name,
        },
      });

      return { success: true, user: updatedUser };
    } catch (error) {
      this.logger.error(`Failed to delete user ${userId} for admin ${adminId}:`, error);
      throw error;
    }
  }

  /**
   * Generate impersonation token
   * Task 2.6: User Impersonation
   */
  async impersonateUser(userId: string, adminId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.isActive || user.suspendedAt) {
        throw new BadRequestException('Cannot impersonate inactive or suspended user');
      }

      // Cannot impersonate other admins
      if (user.role?.name === 'SUPER_ADMIN' || user.role?.name === 'ADMIN') {
        throw new ForbiddenException('Cannot impersonate admin users');
      }

      // Generate impersonation token (15 minutes)
      const payload = {
        sub: user.id,
        email: user.email,
        isImpersonation: true,
        adminId,
      };

      const token = this.jwtService.sign(payload, { expiresIn: '15m' });

      // Log admin action
      await this.adminLoggingService.logAction({
        adminId,
        action: AdminLogAction.IMPERSONATE_USER,
        targetId: userId,
        targetType: AdminLogTargetType.USER,
        metadata: {
          impersonationTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      return {
        token,
        expiresIn: 900, // 15 minutes in seconds
        targetUser: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to impersonate user ${userId} for admin ${adminId}:`, error);
      throw error;
    }
  }

  /**
   * Get admin dashboard metrics
   */
  async getDashboardMetrics(adminId: string) {
    try {
      // Get user statistics
      const userStatsQuery = `
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE "createdAt" >= CURRENT_DATE - INTERVAL '7 days') as new_this_week,
          COUNT(*) FILTER (WHERE "createdAt" >= DATE_TRUNC('month', CURRENT_DATE)) as new_this_month,
          COUNT(*) FILTER (WHERE "isActive" = true AND "suspendedAt" IS NULL) as active_users
        FROM users
      `;

      // Get usage statistics
      const usageStatsQuery = `
        SELECT
          (SELECT COUNT(*) FROM links WHERE "isActive" = true) as total_links,
          (SELECT COUNT(*) FROM onelinks WHERE "isActive" = true) as total_onelinks,
          (SELECT COUNT(*) FROM click_events) as total_clicks,
          (SELECT COUNT(*) FROM click_events WHERE timestamp >= CURRENT_DATE) as clicks_today
      `;

      // Get signups by day (last 30 days)
      const signupsByDayQuery = `
        SELECT
          DATE("createdAt") as date,
          COUNT(*) as count
        FROM users
        WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `;

      // Get recent activity (last 10 events)
      const recentActivityQuery = `
        (SELECT 'USER_REGISTERED' as type, "createdAt" as timestamp,
                json_build_object('userId', id, 'email', email, 'name', name) as details
         FROM users
         ORDER BY "createdAt" DESC LIMIT 5)
        UNION ALL
        (SELECT 'LINK_CREATED' as type, "createdAt" as timestamp,
                json_build_object('linkId', id, 'shortCode', "shortCode") as details
         FROM links
         ORDER BY "createdAt" DESC LIMIT 5)
        ORDER BY timestamp DESC
        LIMIT 10
      `;

      // Execute all queries in parallel
      const [userStats, usageStats, signupsByDay, recentActivity] = await Promise.all([
        this.prisma.$queryRawUnsafe(userStatsQuery),
        this.prisma.$queryRawUnsafe(usageStatsQuery),
        this.prisma.$queryRawUnsafe(signupsByDayQuery),
        this.prisma.$queryRawUnsafe(recentActivityQuery),
      ]);

      const userStatsRow = (userStats as any[])[0] || {};
      const usageStatsRow = (usageStats as any[])[0] || {};

      return {
        users: {
          total: Number(userStatsRow.total_users || 0),
          newThisWeek: Number(userStatsRow.new_this_week || 0),
          newThisMonth: Number(userStatsRow.new_this_month || 0),
          active: Number(userStatsRow.active_users || 0),
        },
        usage: {
          totalLinks: Number(usageStatsRow.total_links || 0),
          totalOneLinks: Number(usageStatsRow.total_onelinks || 0),
          totalClicks: Number(usageStatsRow.total_clicks || 0),
          clicksToday: Number(usageStatsRow.clicks_today || 0),
        },
        signupsByDay: (signupsByDay as any[]).map((row) => ({
          date: row.date,
          count: Number(row.count || 0),
        })),
        recentActivity: (recentActivity as any[]).map((activity) => ({
          type: activity.type,
          timestamp: activity.timestamp,
          details: activity.details,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard metrics for admin ${adminId}:`, error);
      throw error;
    }
  }

  /**
   * Get monitoring dashboard data
   */
  async getMonitoringData(adminId: string) {
    try {
      // Get users at risk (80%+ usage)
      const usersAtRiskQuery = `
        WITH user_limits AS (
          SELECT
            u.id,
            u.email,
            u.name,
            u.plan,
            CASE u.plan
              WHEN 'FREE' THEN 10
              WHEN 'STARTER' THEN 50
              WHEN 'PRO' THEN 200
            END as links_limit,
            CASE u.plan
              WHEN 'FREE' THEN 1000
              WHEN 'STARTER' THEN 10000
              WHEN 'PRO' THEN 50000
            END as clicks_limit,
            COUNT(DISTINCT l.id) FILTER (WHERE l."createdAt" >= DATE_TRUNC('month', CURRENT_DATE)) as links_used,
            COUNT(DISTINCT c.id) FILTER (WHERE c."timestamp" >= DATE_TRUNC('month', CURRENT_DATE)) as clicks_used
          FROM users u
          LEFT JOIN links l ON u.id = l."userId" AND l."isActive" = true
          LEFT JOIN click_events c ON l.id = c."linkId"
          WHERE u."isActive" = true AND u."suspendedAt" IS NULL
          GROUP BY u.id, u.email, u.name, u.plan
        )
        SELECT
          id,
          email,
          name,
          plan,
          links_used,
          links_limit,
          clicks_used,
          clicks_limit,
          ROUND(links_used * 100.0 / NULLIF(links_limit, 0), 2) as links_usage_percentage,
          ROUND(clicks_used * 100.0 / NULLIF(clicks_limit, 0), 2) as clicks_usage_percentage
        FROM user_limits
        WHERE (links_used * 100.0 / NULLIF(links_limit, 0) >= 80)
           OR (clicks_used * 100.0 / NULLIF(clicks_limit, 0) >= 80)
        ORDER BY clicks_usage_percentage DESC
        LIMIT 50
      `;

      // Get heavy users (top 10 by usage)
      const heavyUsersQuery = `
        SELECT
          u.id,
          u.email,
          u.name,
          u.plan,
          COUNT(DISTINCT l.id) as total_links,
          COUNT(DISTINCT o.id) as total_onelinks,
          COUNT(DISTINCT c.id) as total_clicks
        FROM users u
        LEFT JOIN links l ON u.id = l."userId" AND l."isActive" = true
        LEFT JOIN onelinks o ON u.id = o."userId" AND o."isActive" = true
        LEFT JOIN click_events c ON (l.id = c."linkId" OR o.id = c."oneLinkId")
        WHERE u."isActive" = true AND u."suspendedAt" IS NULL
        GROUP BY u.id, u.email, u.name, u.plan
        ORDER BY total_clicks DESC
        LIMIT 10
      `;

      // Get system health stats
      const systemHealthQuery = `
        SELECT
          (SELECT COUNT(*) FROM users WHERE "isActive" = true) as active_users,
          (SELECT COUNT(*) FROM links WHERE "isActive" = true) as active_links,
          (SELECT COUNT(*) FROM click_events WHERE "timestamp" >= CURRENT_DATE) as clicks_today,
          (SELECT COUNT(*) FROM click_events WHERE "timestamp" >= CURRENT_TIMESTAMP - INTERVAL '1 hour') as clicks_last_hour
      `;

      // Execute queries in parallel
      const [usersAtRisk, heavyUsers, systemHealth] = await Promise.all([
        this.prisma.$queryRawUnsafe(usersAtRiskQuery),
        this.prisma.$queryRawUnsafe(heavyUsersQuery),
        this.prisma.$queryRawUnsafe(systemHealthQuery),
      ]);

      const systemHealthRow = (systemHealth as any[])[0] || {};

      return {
        usersAtRisk: (usersAtRisk as any[]).map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          linksUsed: Number(user.links_used || 0),
          linksLimit: Number(user.links_limit || 0),
          clicksUsed: Number(user.clicks_used || 0),
          clicksLimit: Number(user.clicks_limit || 0),
          linksUsagePercentage: Number(user.links_usage_percentage || 0),
          clicksUsagePercentage: Number(user.clicks_usage_percentage || 0),
        })),
        heavyUsers: (heavyUsers as any[]).map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          totalLinks: Number(user.total_links || 0),
          totalOneLinks: Number(user.total_onelinks || 0),
          totalClicks: Number(user.total_clicks || 0),
        })),
        systemHealth: {
          activeUsers: Number(systemHealthRow.active_users || 0),
          activeLinks: Number(systemHealthRow.active_links || 0),
          clicksToday: Number(systemHealthRow.clicks_today || 0),
          clicksLastHour: Number(systemHealthRow.clicks_last_hour || 0),
          database: { status: 'healthy' },
          redis: { status: 'healthy' },
          api: { status: 'healthy' },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get monitoring data for admin ${adminId}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to get plan limits
   */
  private getPlanLimits(plan: string): { links: number; onelinks: number; clicks: number } {
    const limits = {
      FREE: { links: 10, onelinks: 3, clicks: 1000 },
      STARTER: { links: 50, onelinks: 15, clicks: 10000 },
      PRO: { links: 200, onelinks: 50, clicks: 50000 },
    };

    return limits[plan as keyof typeof limits] || limits.FREE;
  }
}
