import { IsString, IsOptional, IsArray, ValidateNested, IsUrl, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType } from '@shorly/types';

class OneLinkTargetDto {
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @IsUrl()
  url: string;

  @IsOptional()
  priority?: number;
}

export class UpdateOneLinkDto {
  @ApiPropertyOptional({ description: 'OneLink title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'OneLink description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Target URLs per device type', type: [OneLinkTargetDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OneLinkTargetDto)
  targets?: OneLinkTargetDto[];

  @ApiPropertyOptional({ description: 'Fallback URL' })
  @IsOptional()
  @IsUrl()
  fallbackUrl?: string;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
