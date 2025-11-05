import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AdminLogAction, AdminLogTargetType } from '../../rbac/admin-logging.service';

export class GetAdminLogsQueryDto {
  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiProperty({ required: false, description: 'Filter by admin ID' })
  @IsOptional()
  @IsString()
  adminId?: string;

  @ApiProperty({ required: false, enum: AdminLogAction, description: 'Filter by action type' })
  @IsOptional()
  @IsEnum(AdminLogAction)
  action?: AdminLogAction;

  @ApiProperty({ required: false, enum: AdminLogTargetType, description: 'Filter by target type' })
  @IsOptional()
  @IsEnum(AdminLogTargetType)
  targetType?: AdminLogTargetType;

  @ApiProperty({ required: false, description: 'Filter by target ID' })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiProperty({ required: false, description: 'Filter by start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, description: 'Filter by end date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
