import { IsUrl, IsString, IsOptional, IsArray, IsDate, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLinkDto {
  @ApiPropertyOptional({
    description: 'Custom short code (optional, auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  shortCode?: string;

  @ApiProperty({ description: 'Destination URL', example: 'https://example.com' })
  @IsUrl()
  destinationUrl: string;

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

  @ApiPropertyOptional({ description: 'Active status (default: true)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}
