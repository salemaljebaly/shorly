import { IsOptional, IsString, IsEmail, IsBoolean, MinLength, Matches, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User display name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ description: 'User email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'User timezone (IANA format)' })
  @IsOptional()
  @IsString()
  @Matches(/^([A-Za-z]+\/[A-Za-z0-9_\-+]+|UTC)$/)
  timezone?: string;

  @ApiPropertyOptional({ description: 'User language (en or ar)' })
  @IsOptional()
  @IsEnum(['en', 'ar'])
  language?: string;

  @ApiPropertyOptional({ description: 'User bio' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'User location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'User website URL' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Whether user receives email notifications' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Whether user agrees to analytics tracking' })
  @IsOptional()
  @IsBoolean()
  analyticsTracking?: boolean;

  @ApiPropertyOptional({ description: 'Whether the account is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Assign a new role to the user', enum: ['USER', 'ADMIN', 'SUPER_ADMIN'] })
  @IsOptional()
  @IsEnum(['USER', 'ADMIN', 'SUPER_ADMIN'])
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';

  @ApiPropertyOptional({ description: 'Update the user subscription plan', enum: ['FREE', 'STARTER', 'PRO'] })
  @IsOptional()
  @IsEnum(['FREE', 'STARTER', 'PRO'])
  plan?: 'FREE' | 'STARTER' | 'PRO';
}
