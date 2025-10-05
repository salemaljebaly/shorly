import { IsString, IsOptional, IsArray, ValidateNested, IsUrl, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType } from '@shorly/types';

class OneLinkTargetDto {
  @ApiProperty({ enum: DeviceType, description: 'Device type' })
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @ApiProperty({ description: 'Target URL for this device type' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ description: 'Priority (higher = preferred)', default: 0 })
  @IsOptional()
  priority?: number;
}

export class CreateOneLinkDto {
  @ApiPropertyOptional({ description: 'Custom short code (optional, auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  shortCode?: string;

  @ApiPropertyOptional({ description: 'OneLink title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'OneLink description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Target URLs per device type', type: [OneLinkTargetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OneLinkTargetDto)
  targets: OneLinkTargetDto[];

  @ApiProperty({ description: 'Fallback URL if no device match', example: 'https://example.com' })
  @IsUrl()
  fallbackUrl: string;
}
