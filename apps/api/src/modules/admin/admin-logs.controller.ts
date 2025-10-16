import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RequirePermissions } from '../rbac/decorators';
import { Role, Permission } from '../rbac/enums';
import { AdminLoggingService } from '../rbac/admin-logging.service';
import { GetAdminLogsQueryDto } from './dto/get-admin-logs-query.dto';

@ApiTags('Admin - Audit Logs')
@ApiBearerAuth()
@Controller('admin/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminLogsController {
  constructor(private readonly adminLoggingService: AdminLoggingService) {}

  /**
   * Get filtered admin logs with pagination
   */
  @Get()
  @ApiOperation({ summary: 'Get admin audit logs with filters' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  @RequirePermissions(Permission.LOGS_READ)
  async getAdminLogs(@Query() query: GetAdminLogsQueryDto, @Request() req: any) {
    const { page, limit, adminId, action, targetType, targetId, startDate, endDate } = query;

    const filters: any = {};
    if (adminId) filters.adminId = adminId;
    if (action) filters.action = action;
    if (targetType) filters.targetType = targetType;
    if (targetId) filters.targetId = targetId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const result = await this.adminLoggingService.getFilteredLogs(
      filters,
      { page: page || 1, limit: limit || 50 }
    );

    const totalPages = Math.ceil(result.total / (limit || 50));

    // Transform logs to flatten admin data
    const transformedLogs = result.logs.map((log: any) => ({
      id: log.id,
      adminId: log.adminId,
      adminEmail: log.admin?.email || 'Unknown',
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      metadata: log.metadata,
      timestamp: log.createdAt,
    }));

    return {
      logs: transformedLogs,
      pagination: {
        total: result.total,
        page: page || 1,
        limit: limit || 50,
        totalPages,
        hasNext: (page || 1) < totalPages,
        hasPrev: (page || 1) > 1,
      },
    };
  }

  /**
   * Get recent admin activity
   */
  @Get('recent')
  @ApiOperation({ summary: 'Get recent admin activity' })
  @ApiResponse({ status: 200, description: 'Recent activity retrieved successfully' })
  @RequirePermissions(Permission.LOGS_READ)
  async getRecentActivity(@Request() req: any) {
    const logs = await this.adminLoggingService.getRecentActivity(24, 100);
    return { logs };
  }

  /**
   * Get admin action statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get admin action statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @RequirePermissions(Permission.LOGS_READ)
  async getActionStats(@Request() req: any) {
    const stats = await this.adminLoggingService.getActionStats(7);
    return { stats };
  }
}
