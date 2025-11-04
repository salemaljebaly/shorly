import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SettingsService } from '../settings.service';

/**
 * Dynamic rate limit guard that reads settings from database
 * If rate limiting is disabled in settings, bypasses the rate limit check
 * Otherwise uses the default ThrottlerGuard behavior
 */
@Injectable()
export class DynamicRateLimitGuard extends ThrottlerGuard {
  constructor(private readonly settingsService: SettingsService) {
    // Pass through to parent ThrottlerGuard with empty options
    super({} as any, null as any, null as any);
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
