import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private jwtService: JwtService,
    @Inject('REDIS_CLIENT') private redis: Redis
  ) {}

  async register(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
    };
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshPayload = {
      sub: user.id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      jti: Math.random().toString(36).substring(7), // Add unique ID
    };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    // Hash and store refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
    };
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshPayload = {
      sub: user.id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      jti: Math.random().toString(36).substring(7), // Add unique ID
    };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    // Hash and store refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    };
  }

  async validateUser(userId: string) {
    return await this.prisma.user.findUnique({ where: { id: userId } });
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if token is blacklisted (already used)
      const isBlacklisted = await this.redis.get(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Refresh token already used');
      }

      // Find user and verify refresh token
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify stored refresh token matches
      const valid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!valid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Blacklist the current token immediately to prevent reuse
      const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
      await this.redis.setex(`blacklist:${refreshToken}`, expiresIn, '1');

      // Generate new tokens
      const accessPayload = {
        sub: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
      };
      const accessToken = this.jwtService.sign(accessPayload);

      const newRefreshPayload = {
        sub: user.id,
        type: 'refresh',
        jti: `${user.id}-${Date.now()}-${Math.random()}`,
        iat: Math.floor(Date.now() / 1000),
      };
      const newRefreshToken = this.jwtService.sign(newRefreshPayload, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      });

      // Hash and store new refresh token
      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefreshToken },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }
}
