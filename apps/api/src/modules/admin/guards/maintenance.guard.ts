import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SettingsService } from '../settings.service';

export const SKIP_MAINTENANCE = 'skipMaintenance';
export const SkipMaintenance = () => SetMetadata(SKIP_MAINTENANCE, true);

/**
 * Guard to check if the system is in maintenance mode
 * Blocks all requests except those with SkipMaintenance decorator
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private settingsService: SettingsService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipMaintenance = this.reflector.getAllAndOverride<boolean>(SKIP_MAINTENANCE, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the route is marked to skip maintenance check, allow it
    if (skipMaintenance) {
      return true;
    }

    // Check if maintenance mode is enabled
    const isMaintenanceMode = await this.settingsService.isMaintenanceModeEnabled();

    if (isMaintenanceMode) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        message: 'System is currently under maintenance. Please try again later.',
        error: 'Service Unavailable',
      });
    }

    return true;
  }
}
