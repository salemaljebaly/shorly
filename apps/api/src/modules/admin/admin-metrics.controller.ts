import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../rbac/decorators';
import { Role } from '../rbac/enums';
import { AdminService } from './admin.service';

@ApiTags('Admin - Metrics')
@ApiBearerAuth()
@Controller('admin/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminMetricsController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get admin dashboard metrics
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  async getDashboardMetrics(@Request() req: any) {
    return this.adminService.getDashboardMetrics(req.user.id);
  }

  /**
   * Get monitoring data (users at risk, heavy users, system health)
   */
  @Get('monitoring')
  @ApiOperation({ summary: 'Get monitoring dashboard data' })
  @ApiResponse({ status: 200, description: 'Monitoring data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  async getMonitoringData(@Request() req: any) {
    return this.adminService.getMonitoringData(req.user.id);
  }
}
