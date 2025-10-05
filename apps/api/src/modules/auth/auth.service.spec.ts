import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaClient;
  let jwtService: JwtService;
  let redisMock: any;

  beforeEach(async () => {
    prisma = new PrismaClient();
    jwtService = new JwtService({
      secret: 'test-secret',
    });

    // Mock Redis client
    redisMock = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaClient,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: redisMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } },
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } },
    });
    await prisma.$disconnect();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const email = 'test-register@example.com';
      const password = 'SecurePass123!';
      const name = 'Test User';

      const result = await service.register(email, password, name);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(email);
      expect(result.user.name).toBe(name);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw ConflictException if email already exists', async () => {
      const email = 'test-duplicate@example.com';
      const password = 'SecurePass123!';

      await service.register(email, password);

      await expect(service.register(email, password)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash the password before storing', async () => {
      const email = 'test-hash@example.com';
      const password = 'SecurePass123!';

      await service.register(email, password);

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user?.password).not.toBe(password);
      expect(await bcrypt.compare(password, user?.password || '')).toBe(true);
    });

    it('should generate valid JWT tokens', async () => {
      const email = 'test-jwt@example.com';
      const password = 'SecurePass123!';

      const result = await service.register(email, password);

      const decodedAccess = jwtService.decode(result.accessToken) as any;
      const decodedRefresh = jwtService.decode(result.refreshToken) as any;

      expect(decodedAccess.email).toBe(email);
      expect(decodedRefresh.type).toBe('refresh');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await service.register('test-login@example.com', 'SecurePass123!', 'Test User');
    });

    it('should login user with correct credentials', async () => {
      const result = await service.login('test-login@example.com', 'SecurePass123!');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test-login@example.com');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      await expect(
        service.login('nonexistent@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      await expect(
        service.login('test-login@example.com', 'WrongPassword123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should generate new refresh token on each login', async () => {
      const result1 = await service.login('test-login@example.com', 'SecurePass123!');

      // Wait 1 second to ensure different iat timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result2 = await service.login('test-login@example.com', 'SecurePass123!');

      expect(result1.refreshToken).not.toBe(result2.refreshToken);
    });
  });

  describe('refreshAccessToken', () => {
    let refreshToken: string;
    let userId: string;

    beforeEach(async () => {
      const result = await service.register('test-refresh@example.com', 'SecurePass123!');
      refreshToken = result.refreshToken;
      userId = result.user.id;
    });

    it('should generate new tokens with valid refresh token', async () => {
      // Wait 1 second to ensure different iat timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await service.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.refreshToken).not.toBe(refreshToken);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      await expect(
        service.refreshAccessToken('invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      const expiredToken = jwtService.sign(
        { sub: userId, type: 'refresh' },
        { expiresIn: '0s', secret: process.env.JWT_REFRESH_SECRET },
      );

      await expect(
        service.refreshAccessToken(expiredToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should store new refresh token hash in database', async () => {
      // Wait 1 second to ensure different iat timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      const user = await prisma.user.findUnique({
        where: { email: 'test-refresh@example.com' },
      });
      const oldHash = user?.refreshToken;

      const newTokens = await service.refreshAccessToken(refreshToken);

      const updatedUser = await prisma.user.findUnique({
        where: { email: 'test-refresh@example.com' },
      });

      // Hash should be updated
      expect(updatedUser?.refreshToken).not.toBe(oldHash);
      expect(updatedUser?.refreshToken).toBeDefined();

      // New refresh token should work
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result = await service.refreshAccessToken(newTokens.refreshToken);
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException when using blacklisted token', async () => {
      // Mock Redis to return blacklisted
      redisMock.get.mockResolvedValueOnce('1');

      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong token type', async () => {
      // Create a token with the refresh secret but WITHOUT type: 'refresh'
      const accessPayload = {
        sub: userId,
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        // Missing: type: 'refresh'
      };
      const accessToken = jwtService.sign(accessPayload, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
        expiresIn: '7d',
      });

      await expect(service.refreshAccessToken(accessToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user has no stored refresh token', async () => {
      // Clear the user's refresh token
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });

      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token does not match stored hash', async () => {
      // Manually update the user's stored refresh token hash to a hash of a different string
      // This simulates a scenario where the stored hash doesn't match the token
      const fakeHash = await bcrypt.hash('completely-different-token-that-will-never-match', 10);
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: fakeHash },
      });

      // Now try to use the real refresh token - it won't match the fake hash
      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh token on logout', async () => {
      const result = await service.register('test-logout@example.com', 'SecurePass123!');

      await service.logout(result.user.id);

      const user = await prisma.user.findUnique({
        where: { id: result.user.id },
      });

      expect(user?.refreshToken).toBeNull();
    });

    it('should return success message', async () => {
      const result = await service.register('test-logout2@example.com', 'SecurePass123!');

      const logoutResult = await service.logout(result.user.id);

      expect(logoutResult).toHaveProperty('message');
      expect(logoutResult.message).toBe('Logged out successfully');
    });
  });

  describe('validateUser', () => {
    it('should return user for valid userId', async () => {
      const result = await service.register('test-validate@example.com', 'SecurePass123!');

      const user = await service.validateUser(result.user.id);

      expect(user).toBeDefined();
      expect(user?.email).toBe('test-validate@example.com');
    });

    it('should return null for invalid userId', async () => {
      const user = await service.validateUser('invalid-id');

      expect(user).toBeNull();
    });
  });

  describe('environment variable fallbacks', () => {
    it('should use default JWT_REFRESH_SECRET when env var not set', async () => {
      // Save original env vars
      const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;
      const originalRefreshExpires = process.env.JWT_REFRESH_EXPIRES_IN;

      // Unset env vars to test fallback
      delete process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_REFRESH_EXPIRES_IN;

      const result = await service.register(
        'test-env-fallback@example.com',
        'SecurePass123!',
      );

      expect(result).toHaveProperty('refreshToken');
      expect(result.refreshToken).toBeDefined();

      // Token should work with default secret
      await expect(service.refreshAccessToken(result.refreshToken)).resolves.toHaveProperty(
        'accessToken',
      );

      // Restore env vars
      if (originalRefreshSecret) process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
      if (originalRefreshExpires) process.env.JWT_REFRESH_EXPIRES_IN = originalRefreshExpires;
    });

    it('should use default JWT_REFRESH_EXPIRES_IN when env var not set', async () => {
      // Save original
      const originalExpires = process.env.JWT_REFRESH_EXPIRES_IN;

      // Unset to test fallback
      delete process.env.JWT_REFRESH_EXPIRES_IN;

      const email = 'test-env-expires@example.com';
      await service.register(email, 'SecurePass123!');

      const result = await service.login(email, 'SecurePass123!');

      expect(result).toHaveProperty('refreshToken');

      // Restore
      if (originalExpires) process.env.JWT_REFRESH_EXPIRES_IN = originalExpires;
    });

    it('should use default JWT_REFRESH_SECRET in login when env var not set', async () => {
      // Save original
      const originalSecret = process.env.JWT_REFRESH_SECRET;

      // Unset to test fallback
      delete process.env.JWT_REFRESH_SECRET;

      const email = 'test-login-secret@example.com';
      await service.register(email, 'SecurePass123!');

      const result = await service.login(email, 'SecurePass123!');

      expect(result).toHaveProperty('refreshToken');

      // Restore
      if (originalSecret) process.env.JWT_REFRESH_SECRET = originalSecret;
    });
  });
});
