import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaClient,
          useValue: prisma,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: {
            get: jest.fn(),
            setex: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } },
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getProfile', () => {
    it('should return user profile when user exists', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          email: 'test-profile@example.com',
          password: 'hashedpassword',
          name: 'Test User',
          bio: 'Test bio',
          location: 'Test location',
          website: 'https://test.com',
          timezone: 'UTC',
          language: 'en',
          emailNotifications: true,
          analyticsTracking: true,
        },
      });

      const result = await service.getProfile(user.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(user.id);
      expect(result.email).toBe(user.email);
      expect(result.name).toBe(user.name);
      expect(result.bio).toBe(user.bio);
      expect(result.location).toBe(user.location);
      expect(result.website).toBe(user.website);
      expect(result.timezone).toBe(user.timezone);
      expect(result.language).toBe(user.language);
      expect(result.emailNotifications).toBe(true);
      expect(result.analyticsTracking).toBe(true);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      await expect(service.getProfile('non-existent-id')).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          email: 'test-update@example.com',
          password: 'hashedpassword',
          name: 'Original Name',
        },
      });

      const updateData = {
        name: 'Updated Name',
        bio: 'Updated bio',
        location: 'Updated location',
        website: 'https://updated.com',
        timezone: 'America/New_York',
        language: 'es',
        emailNotifications: false,
        analyticsTracking: false,
      };

      const result = await service.updateProfile(user.id, updateData);

      expect(result.name).toBe(updateData.name);
      expect(result.bio).toBe(updateData.bio);
      expect(result.location).toBe(updateData.location);
      expect(result.website).toBe(updateData.website);
      expect(result.timezone).toBe(updateData.timezone);
      expect(result.language).toBe(updateData.language);
      expect(result.emailNotifications).toBe(updateData.emailNotifications);
      expect(result.analyticsTracking).toBe(updateData.analyticsTracking);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      await expect(service.updateProfile('non-existent-id', { name: 'Test' })).rejects.toThrow(
        'User not found'
      );
    });

    it('should handle empty update data', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test-empty@example.com',
          password: 'hashedpassword',
          name: 'Test User',
        },
      });

      const result = await service.updateProfile(user.id, {});

      expect(result.id).toBe(user.id);
      expect(result.name).toBe(user.name);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test-avatar@example.com',
          password: 'hashedpassword',
          name: 'Test User',
        },
      });

      const mockDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ';

      const result = await service.uploadAvatar(user.id, mockDataUrl);

      expect(result.avatar).toBe(mockDataUrl);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const mockDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ';

      await expect(service.uploadAvatar('non-existent-id', mockDataUrl)).rejects.toThrow(
        'User not found'
      );
    });

    it('should handle very long data URLs', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test-long-avatar@example.com',
          password: 'hashedpassword',
          name: 'Test User',
        },
      });

      const veryLongDataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(1000000);

      const result = await service.uploadAvatar(user.id, veryLongDataUrl);

      expect(result.avatar).toBe(veryLongDataUrl);
    });
  });

  describe('changePassword', () => {
    let user: any;

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {
          email: 'test-password@example.com',
          password: '$2b$10$hashedpassword',
        },
      });
    });

    it('should change password successfully', async () => {
      const changePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$newhashedpassword');

      const result = await service.changePassword(user.id, changePasswordDto);

      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('oldpassword', user.password);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
    });

    it('should throw BadRequestException when current password is incorrect', async () => {
      const changePasswordDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(user.id, changePasswordDto)).rejects.toThrow(
        'Current password is incorrect'
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const changePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      await expect(service.changePassword('non-existent-id', changePasswordDto)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw BadRequestException when new password is same as current', async () => {
      const changePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'oldpassword',
      };

      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.changePassword(user.id, changePasswordDto)).rejects.toThrow(
        'New password must be different from current password'
      );
    });
  });

  describe('deleteAccount', () => {
    let user: any;

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {
          email: 'test-delete@example.com',
          password: '$2b$10$hashedpassword',
        },
      });
    });

    it('should delete account successfully with correct password', async () => {
      const password = 'correctpassword';

      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.deleteAccount(user.id, password);

      expect(result).toEqual({ message: 'Account deleted successfully' });

      // Verify user is deleted
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should throw NotFoundException when user is not found', async () => {
      const password = 'anypassword';

      await expect(service.deleteAccount('non-existent-id', password)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw BadRequestException when password is incorrect', async () => {
      const password = 'wrongpassword';

      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.deleteAccount(user.id, password)).rejects.toThrow('Invalid password');

      // Verify user is not deleted
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(existingUser).toBeDefined();
    });
  });
});
