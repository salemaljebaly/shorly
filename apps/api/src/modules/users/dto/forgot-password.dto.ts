import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsString()
  email: string;
}
