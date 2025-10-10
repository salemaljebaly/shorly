import { IsEmail, IsOptional, IsString, MinLength, IsBoolean, Matches, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'User display name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ description: 'Temporary password for the new user', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

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

  @ApiPropertyOptional({ description: 'User timezone (IANA format e.g. UTC, Europe/Berlin)' })
  @IsOptional()
  @IsString()
  @Matches(/^([A-Za-z]+\/[A-Za-z0-9_\-+]+|UTC)$/)
  timezone?: string;

  @ApiPropertyOptional({ description: 'User language (en or ar)' })
  @IsOptional()
  @IsEnum(['en', 'ar'])
  language?: string;

  @ApiPropertyOptional({ description: 'Whether user receives email notifications', default: true })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Whether analytics tracking is enabled', default: true })
  @IsOptional()
  @IsBoolean()
  analyticsTracking?: boolean;

  @ApiPropertyOptional({ description: 'Whether the account is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'User role', enum: ['USER', 'ADMIN', 'SUPER_ADMIN'] })
  @IsOptional()
  @IsEnum(['USER', 'ADMIN', 'SUPER_ADMIN'])
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';

  @ApiPropertyOptional({ description: 'User subscription plan', enum: ['FREE', 'STARTER', 'PRO'] })
  @IsOptional()
  @IsEnum(['FREE', 'STARTER', 'PRO'])
  plan?: 'FREE' | 'STARTER' | 'PRO';
}
