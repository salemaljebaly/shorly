import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles, RequirePermissions } from '../rbac/decorators';
import { Role, Permission } from '../rbac/enums';
import { SettingsService } from './settings.service';
import {
  AdminLoggingService,
  AdminLogAction,
  AdminLogTargetType,
} from '../rbac/admin-logging.service';
import { SkipMaintenance } from './guards/maintenance.guard';
import {
  UpdateSystemSettingsDto,
  UpdateSecuritySettingsDto,
  UpdateRateLimitSettingsDto,
} from './dto/update-settings.dto';

@ApiTags('Admin - Settings')
@ApiBearerAuth()
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@SkipMaintenance() // Settings endpoints should always be accessible to admins
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly adminLoggingService: AdminLoggingService
  ) {}

  /**
   * Get all settings
   */
  @Get()
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  @RequirePermissions(Permission.SETTINGS_READ)
  async getAllSettings() {
    const settings = await this.settingsService.getAllSettings();
    return { success: true, settings };
  }

  /**
   * Get settings by category
   */
  @Get(':category')
  @ApiOperation({ summary: 'Get settings by category' })
  @ApiResponse({ status: 200, description: 'Category settings retrieved successfully' })
  @RequirePermissions(Permission.SETTINGS_READ)
  async getSettingsByCategory(@Request() req: any) {
    const category = req.params.category;
    const settings = await this.settingsService.getSettingsByCategory(category);
    return { success: true, settings };
  }

  /**
   * Update system settings
   */
  @Patch('system')
  @ApiOperation({ summary: 'Update system settings' })
  @ApiResponse({ status: 200, description: 'System settings updated successfully' })
  @RequirePermissions(Permission.SETTINGS_WRITE)
  async updateSystemSettings(@Body() dto: UpdateSystemSettingsDto, @Request() req: any) {
    const adminId = req.user.sub;

    // Get current settings for logging
    const currentSettings = await this.settingsService.getAllSettings();

    await this.settingsService.updateSettings(dto);

    // Log the action
    await this.adminLoggingService.logAction({
      adminId,
      action: AdminLogAction.EDIT_SETTINGS,
      targetType: AdminLogTargetType.CONTENT,
      targetId: 'system',
      metadata: {
        category: 'system',
        before: currentSettings.system,
        after: dto,
      },
    });

    return {
      success: true,
      message: 'System settings updated successfully',
    };
  }

  /**
   * Update security settings
   */
  @Patch('security')
  @ApiOperation({ summary: 'Update security settings' })
  @ApiResponse({ status: 200, description: 'Security settings updated successfully' })
  @RequirePermissions(Permission.SETTINGS_WRITE)
  async updateSecuritySettings(@Body() dto: UpdateSecuritySettingsDto, @Request() req: any) {
    const adminId = req.user.sub;

    const currentSettings = await this.settingsService.getAllSettings();

    await this.settingsService.updateSettings(dto);

    await this.adminLoggingService.logAction({
      adminId,
      action: AdminLogAction.EDIT_SETTINGS,
      targetType: AdminLogTargetType.CONTENT,
      targetId: 'security',
      metadata: {
        category: 'security',
        before: currentSettings.security,
        after: dto,
      },
    });

    return {
      success: true,
      message: 'Security settings updated successfully',
    };
  }

  /**
   * Update rate limit settings
   */
  @Patch('rate-limit')
  @ApiOperation({ summary: 'Update rate limiting settings' })
  @ApiResponse({ status: 200, description: 'Rate limit settings updated successfully' })
  @RequirePermissions(Permission.SETTINGS_WRITE)
  async updateRateLimitSettings(@Body() dto: UpdateRateLimitSettingsDto, @Request() req: any) {
    const adminId = req.user.sub;

    const currentSettings = await this.settingsService.getAllSettings();

    await this.settingsService.updateSettings(dto);

    await this.adminLoggingService.logAction({
      adminId,
      action: AdminLogAction.EDIT_SETTINGS,
      targetType: AdminLogTargetType.CONTENT,
      targetId: 'rate-limit',
      metadata: {
        category: 'rate-limit',
        before: currentSettings['rate-limit'],
        after: dto,
      },
    });

    return {
      success: true,
      message: 'Rate limit settings updated successfully',
    };
  }
}
