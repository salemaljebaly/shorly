import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { SettingsService } from '../settings.service';

/**
 * Dynamic rate limit guard that reads settings from database
 * If rate limiting is disabled in settings, bypasses the rate limit check
 * Otherwise uses the default ThrottlerGuard behavior
 */
@Injectable()
export class DynamicRateLimitGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly settingsService: SettingsService
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if rate limiting is enabled in settings
    const rateLimitEnabled = await this.settingsService.getSetting('rate_limit_enabled');

    if (rateLimitEnabled && rateLimitEnabled.value === false) {
      // Rate limiting is disabled, allow all requests
      return true;
    }

    // Rate limiting is enabled, use parent ThrottlerGuard logic
    return super.canActivate(context);
  }
}
