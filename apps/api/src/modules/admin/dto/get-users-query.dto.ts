import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum UserPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class GetUsersQueryDto {
  @ApiPropertyOptional({ description: 'Page number (default: 1)', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (default: 20, max: 100)', minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Search by email, name, or ID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by plan', enum: UserPlan })
  @IsOptional()
  @IsEnum(UserPlan)
  plan?: UserPlan;

  @ApiPropertyOptional({ description: 'Filter by status', enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Field to sort by', enum: ['createdAt', 'email', 'name', 'total_links', 'total_clicks'] })
  @IsOptional()
  @IsEnum(['createdAt', 'email', 'name', 'total_links', 'total_clicks'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort direction', enum: SortOrder })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
