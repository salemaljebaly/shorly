import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuspendUserDto {
  @ApiProperty({ description: 'Reason for suspension' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Whether to notify user via email', default: true })
  @IsOptional()
  @IsBoolean()
  notifyUser?: boolean = true;
}

export class ActivateUserDto {
  @ApiPropertyOptional({ description: 'Whether to notify user via email', default: true })
  @IsOptional()
  @IsBoolean()
  notifyUser?: boolean = true;
}

export class DeleteUserDto {
  @ApiProperty({ description: 'Confirmation text must be "DELETE"' })
  @IsString()
  confirm: string;

  @ApiProperty({ description: 'Reason for deletion' })
  @IsString()
  reason: string;
}