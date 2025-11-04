import { IsBoolean, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateSystemSettingsDto {
  @ApiProperty({ required: false, description: 'Enable or disable maintenance mode' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  maintenance_mode?: boolean;

  @ApiProperty({ required: false, description: 'Default API version' })
  @IsOptional()
  @IsString()
  api_version?: string;
}

export class UpdateEmailSettingsDto {
  @ApiProperty({ required: false, description: 'Enable or disable email notifications' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  email_notifications_enabled?: boolean;

  @ApiProperty({ required: false, description: 'Enable or disable admin alerts' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  admin_alerts_enabled?: boolean;
}

export class UpdateSecuritySettingsDto {
  @ApiProperty({
    required: false,
    description: 'Session timeout in minutes',
    minimum: 5,
    maximum: 1440,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(5)
  @Max(1440)
  session_timeout_minutes?: number;

  @ApiProperty({ required: false, description: 'Require 2FA for admin accounts' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  require_2fa_for_admins?: boolean;
}

export class UpdateRateLimitSettingsDto {
  @ApiProperty({ required: false, description: 'Enable or disable rate limiting' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  rate_limit_enabled?: boolean;

  @ApiProperty({
    required: false,
    description: 'Maximum requests per minute',
    minimum: 10,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(10)
  @Max(1000)
  rate_limit_requests_per_minute?: number;
}
