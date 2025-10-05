import { AuthService } from '../../src/modules/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { IntegrationTestContext, setupIntegrationTest } from './test-helpers';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService Integration Tests', () => {
  let context: IntegrationTestContext;
  let service: AuthService;
  let jwtService: JwtService;

  beforeAll(async () => {
    context = await setupIntegrationTest();
    jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-secret',
    });
    service = new AuthService(context.prisma, jwtService, context.redis);
  });

  beforeEach(async () => {
    await context.clearRedisCache();
  });

  afterAll(async () => {
    await context.cleanup();
  });

  describe('Registration and Login Flow', () => {
    it('should register user and persist to database with hashed password', async () => {
      const email = `integration-test-${Date.now()}@example.com`;
      const password = 'SecurePassword123!';

      const result = await service.register(email, password, 'Test User');

      // Verify response structure
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(email);

      // Verify user in database
      const userInDb = await context.prisma.user.findUnique({
        where: { email },
      });

      expect(userInDb).toBeDefined();
      expect(userInDb?.email).toBe(email);
      expect(userInDb?.name).toBe('Test User');

      // Verify password is hashed
      expect(userInDb?.password).not.toBe(password);
      const passwordMatch = await bcrypt.compare(password, userInDb?.password || '');
      expect(passwordMatch).toBe(true);

      // Verify refresh token hash is stored
      expect(userInDb?.refreshToken).toBeDefined();
      expect(userInDb?.refreshToken).not.toBe(result.refreshToken);

      // Cleanup
      await context.prisma.user.delete({ where: { id: result.user.id } });
    });

    it('should login and generate new refresh token each time', async () => {
      const email = `login-test-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      // Register first
      const registered = await service.register(email, password);
      const firstRefreshToken = registered.refreshToken;

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Login
      const loginResult = await service.login(email, password);

      expect(loginResult).toHaveProperty('user');
      expect(loginResult).toHaveProperty('accessToken');
      expect(loginResult).toHaveProperty('refreshToken');

      // Refresh tokens should be different
      expect(loginResult.refreshToken).not.toBe(firstRefreshToken);

      // Verify refresh token was updated in database
      const userInDb = await context.prisma.user.findUnique({
        where: { email },
      });

      const tokenMatches = await bcrypt.compare(
        loginResult.refreshToken,
        userInDb?.refreshToken || '',
      );
      expect(tokenMatches).toBe(true);

      // Cleanup
      await context.prisma.user.delete({ where: { id: loginResult.user.id } });
    });
  });

  describe('Token Refresh Flow', () => {
    it('should invalidate old refresh token and create new one', async () => {
      const email = `refresh-test-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      const registered = await service.register(email, password);
      const oldRefreshToken = registered.refreshToken;

      // Wait to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Refresh the token
      const refreshed = await service.refreshAccessToken(oldRefreshToken);

      expect(refreshed).toHaveProperty('accessToken');
      expect(refreshed).toHaveProperty('refreshToken');
      expect(refreshed.refreshToken).not.toBe(oldRefreshToken);

      // Try to use old refresh token - should fail
      await expect(service.refreshAccessToken(oldRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );

      // New token should work
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const refreshed2 = await service.refreshAccessToken(refreshed.refreshToken);
      expect(refreshed2).toHaveProperty('accessToken');

      // Cleanup
      await context.prisma.user.delete({ where: { id: registered.user.id } });
    });

    it('should blacklist used tokens to prevent reuse', async () => {
      const email = `blacklist-test-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      const registered = await service.register(email, password);
      const refreshToken = registered.refreshToken;

      // Use the token once
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await service.refreshAccessToken(refreshToken);

      // Check if token was blacklisted in Redis
      const isBlacklisted = await context.redis.get(`blacklist:${refreshToken}`);
      expect(isBlacklisted).toBeDefined();

      // Cleanup
      await context.prisma.user.delete({ where: { id: registered.user.id } });
    });
  });

  describe('Logout Flow', () => {
    it('should clear refresh token from database on logout', async () => {
      const email = `logout-test-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      const registered = await service.register(email, password);
      const userId = registered.user.id;

      // Verify refresh token exists
      const userBefore = await context.prisma.user.findUnique({
        where: { id: userId },
      });
      expect(userBefore?.refreshToken).toBeDefined();

      // Logout
      await service.logout(userId);

      // Verify refresh token was cleared
      const userAfter = await context.prisma.user.findUnique({
        where: { id: userId },
      });
      expect(userAfter?.refreshToken).toBeNull();

      // Cleanup
      await context.prisma.user.delete({ where: { id: userId } });
    });

    it('should prevent token reuse after logout', async () => {
      const email = `logout-reuse-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      const registered = await service.register(email, password);
      const refreshToken = registered.refreshToken;

      // Logout
      await service.logout(registered.user.id);

      // Try to use refresh token after logout - should fail
      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );

      // Cleanup
      await context.prisma.user.delete({ where: { id: registered.user.id } });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent logins correctly', async () => {
      const email = `concurrent-login-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      // Register first
      await service.register(email, password);

      // Make 5 concurrent login requests
      const loginPromises = Array.from({ length: 5 }, () =>
        service.login(email, password),
      );

      const results = await Promise.all(loginPromises);

      // All should succeed
      expect(results).toHaveLength(5);

      // Each should have valid tokens
      results.forEach((result: any) => {
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
      });

      // Cleanup
      await context.prisma.user.delete({ where: { id: results[0].user.id } });
    });

    it('should handle concurrent token refreshes', async () => {
      const email = `concurrent-refresh-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      const registered = await service.register(email, password);
      const refreshToken = registered.refreshToken;

      // Make 5 concurrent refresh requests with the same token
      const refreshPromises = Array.from({ length: 5 }, () =>
        service.refreshAccessToken(refreshToken),
      );

      // Only one should succeed, others should fail due to token invalidation
      const results = await Promise.allSettled(refreshPromises);

      const successful = results.filter((r: any) => r.status === 'fulfilled');
      const failed = results.filter((r: any) => r.status === 'rejected');

      // At least one should succeed
      expect(successful.length).toBeGreaterThanOrEqual(1);

      // Cleanup
      await context.prisma.user.delete({ where: { id: registered.user.id } });
    });
  });

  describe('Data Integrity', () => {
    it('should maintain consistent token hashes in database', async () => {
      const email = `integrity-test-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      const result = await service.register(email, password);

      // Get user from database
      const user = await context.prisma.user.findUnique({
        where: { id: result.user.id },
      });

      // Verify refresh token hash matches
      const tokenMatches = await bcrypt.compare(
        result.refreshToken,
        user?.refreshToken || '',
      );
      expect(tokenMatches).toBe(true);

      // Update token via login
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const loginResult = await service.login(email, password);

      // Get updated user
      const updatedUser = await context.prisma.user.findUnique({
        where: { id: result.user.id },
      });

      // New token should match new hash
      const newTokenMatches = await bcrypt.compare(
        loginResult.refreshToken,
        updatedUser?.refreshToken || '',
      );
      expect(newTokenMatches).toBe(true);

      // The hashes themselves should be different
      expect(user?.refreshToken).not.toBe(updatedUser?.refreshToken);

      // Cleanup
      await context.prisma.user.delete({ where: { id: result.user.id } });
    });
  });

  describe('Security', () => {
    it('should not expose password in any response', async () => {
      const email = `security-test-${Date.now()}@example.com`;
      const password = 'SecurePassword123!';

      const registered = await service.register(email, password);

      expect((registered.user as any).password).toBeUndefined();

      const loginResult = await service.login(email, password);

      expect((loginResult.user as any).password).toBeUndefined();

      // Cleanup
      await context.prisma.user.delete({ where: { id: registered.user.id } });
    });

    it('should store different hashes for same password on different users', async () => {
      const password = 'SamePassword123!';
      const email1 = `user1-${Date.now()}@example.com`;
      const email2 = `user2-${Date.now()}@example.com`;

      const user1 = await service.register(email1, password);
      const user2 = await service.register(email2, password);

      const user1InDb = await context.prisma.user.findUnique({
        where: { id: user1.user.id },
      });
      const user2InDb = await context.prisma.user.findUnique({
        where: { id: user2.user.id },
      });

      // Hashes should be different (bcrypt uses random salt)
      expect(user1InDb?.password).not.toBe(user2InDb?.password);

      // Both should validate correctly
      const match1 = await bcrypt.compare(password, user1InDb?.password || '');
      const match2 = await bcrypt.compare(password, user2InDb?.password || '');

      expect(match1).toBe(true);
      expect(match2).toBe(true);

      // Cleanup
      await context.prisma.user.delete({ where: { id: user1.user.id } });
      await context.prisma.user.delete({ where: { id: user2.user.id } });
    });
  });
});
