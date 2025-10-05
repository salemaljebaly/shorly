import { IsUrl, IsString, IsOptional, IsArray, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLinkDto {
  @ApiPropertyOptional({ description: 'Destination URL' })
  @IsOptional()
  @IsUrl()
  destinationUrl?: string;

  @ApiPropertyOptional({ description: 'Link title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Link description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}
