import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'User password (minimum 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;
}

class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'User password',
  })
  @IsString()
  password: string;
}

class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token received from login or register',
  })
  @IsString()
  refreshToken: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Create a new user account and receive a JWT token',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.name);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login',
    description: 'Authenticate with email and password to receive JWT tokens',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get a new access token using a valid refresh token',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout',
    description: 'Invalidate the refresh token and logout the user',
  })
  logout(@Request() req: any) {
    return this.authService.logout(req.user.id);
  }
}
