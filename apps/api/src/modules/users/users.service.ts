import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaClient,
    @Inject('REDIS_CLIENT') private redis: Redis
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        location: true,
        website: true,
        timezone: true,
        language: true,
        emailNotifications: true,
        analyticsTracking: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        location: true,
        website: true,
        timezone: true,
        language: true,
        emailNotifications: true,
        analyticsTracking: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async uploadAvatar(userId: string, dataUrl: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: dataUrl },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        location: true,
        website: true,
        timezone: true,
        language: true,
        emailNotifications: true,
        analyticsTracking: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(changePasswordDto.newPassword, user.password);

    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Clear refresh token from database and invalidate all refresh tokens for this user
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    await this.redis.del(`refresh_token:${userId}`);

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      // Always return success to prevent email enumeration
      return {
        message: 'If an account with that email exists, a password reset link has been sent',
      };
    }

    // Generate reset token (valid for 1 hour)
    const resetToken =
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Store reset token in Redis with 1 hour expiration
    await this.redis.setex(`reset_token:${resetToken}`, 3600, user.id);

    // TODO: Send email with reset link
    // For now, just return the token for testing (remove in production)
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`Reset token for ${user.email}: ${resetToken}`);
    }

    return {
      message: 'If an account with that email exists, a password reset link has been sent',
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const userId = await this.redis.get(`reset_token:${resetPasswordDto.token}`);

    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedNewPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Delete the reset token
    await this.redis.del(`reset_token:${resetPasswordDto.token}`);

    // Clear refresh token from database and invalidate all refresh tokens for this user
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    await this.redis.del(`refresh_token:${userId}`);

    return { message: 'Password reset successfully' };
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Password is incorrect');
    }

    // Delete user (cascade deletes will handle links and other data)
    await this.prisma.user.delete({
      where: { id: userId },
    });

    // Clean up Redis
    await this.redis.del(`refresh_token:${userId}`);

    return { message: 'Account deleted successfully' };
  }
}
