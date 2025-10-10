import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { ShortCodeService } from './short-code.service';
import { BadRequestException } from '@nestjs/common';

// Mock the utils module
jest.mock('@shorly/utils', () => ({
  ...jest.requireActual('@shorly/utils'),
  generateShortCode: jest.fn(),
}));

const { generateShortCode } = require('@shorly/utils');

describe('ShortCodeService', () => {
  let service: ShortCodeService;
  let prisma: PrismaClient;
  let redisMock: any;
  let testUserId: string;

  beforeEach(async () => {
    // Reset mock to default implementation before each test
    generateShortCode.mockImplementation(() =>
      jest.requireActual('@shorly/utils').generateShortCode()
    );

    prisma = new PrismaClient();

    // Mock Redis with isolated state per test
    redisMock = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShortCodeService,
        {
          provide: PrismaClient,
          useValue: prisma,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: redisMock,
        },
      ],
    }).compile();

    service = module.get<ShortCodeService>(ShortCodeService);

    // Create test user for foreign key constraints
    const user = await prisma.user.create({
      data: {
        email: `test-user-${Date.now()}@example.com`,
        password: 'hashedpassword',
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test data with unique identifier
    await prisma.link.deleteMany({
      where: {
        OR: [
          { shortCode: { contains: 'test' } },
          { destinationUrl: { contains: 'test.example.com' } },
        ],
      },
    });
    await prisma.oneLink.deleteMany({
      where: {
        OR: [{ shortCode: { contains: 'test' } }],
      },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-user-' } },
    });
    await prisma.$disconnect();
    jest.clearAllMocks();
  });

  describe('validateAndSanitizeShortCode', () => {
    it('should return null for empty input', () => {
      const result = service.validateAndSanitizeShortCode('');
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = service.validateAndSanitizeShortCode(undefined);
      expect(result).toBeNull();
    });

    it('should return sanitized code for valid input', () => {
      const result = service.validateAndSanitizeShortCode('Test-Code');
      expect(result).toBe('test-code');
    });

    it('should throw error for invalid format', () => {
      expect(() => service.validateAndSanitizeShortCode('invalid code!')).toThrow(
        'Invalid short code format'
      );
    });

    it('should throw error for reserved code', () => {
      expect(() => service.validateAndSanitizeShortCode('api')).toThrow('Short code is reserved');
    });
  });

  describe('generateUniqueShortCode', () => {
    it('should generate unique short code', async () => {
      const result = await service.generateUniqueShortCode();
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error when unable to generate unique short code', async () => {
      // Mock generateShortCode to always return the same code
      generateShortCode.mockReturnValue('same-code');

      // Create a link with this code first
      await prisma.link.create({
        data: {
          shortCode: 'same-code',
          destinationUrl: 'https://test.example.com',
          userId: testUserId,
        },
      });

      // Now try to generate another - it should fail
      await expect(service.generateUniqueShortCode()).rejects.toThrow(
        'Failed to generate unique short code'
      );
    });
  });

  describe('findByShortCode', () => {
    it('should find link by short code', async () => {
      // Create test link
      const link = await prisma.link.create({
        data: {
          shortCode: 'test-find-link',
          destinationUrl: 'https://test.example.com',
          userId: testUserId,
        },
      });

      const result = await service.findByShortCode('test-find-link');

      expect(result).toBeDefined();
      expect(result?.type).toBe('link');
      expect(result?.data.id).toBe(link.id);
    });

    it('should find OneLink by short code', async () => {
      // Create test OneLink
      const oneLink = await prisma.oneLink.create({
        data: {
          shortCode: 'test-find-onelink',
          userId: testUserId,
          targets: [
            { device: 'android', url: 'https://android.example.com' },
            { device: 'ios', url: 'https://ios.example.com' },
            { device: 'web', url: 'https://web.example.com' },
          ],
          fallbackUrl: 'https://fallback.example.com',
        },
      });

      const result = await service.findByShortCode('test-find-onelink');

      expect(result).toBeDefined();
      expect(result?.type).toBe('onelink');
      expect(result?.data.id).toBe(oneLink.id);
    });

    it('should return null for non-existent short code', async () => {
      const result = await service.findByShortCode('non-existent-code');
      expect(result).toBeNull();
    });

    it('should prioritize link over onelink if both exist with same code', async () => {
      // Create both link and OneLink with same short code
      const link = await prisma.link.create({
        data: {
          shortCode: 'test-priority',
          destinationUrl: 'https://test.example.com',
          userId: testUserId,
        },
      });

      await prisma.oneLink.create({
        data: {
          shortCode: 'test-priority',
          userId: testUserId,
          targets: [
            { device: 'android', url: 'https://android.example.com' },
            { device: 'ios', url: 'https://ios.example.com' },
            { device: 'web', url: 'https://web.example.com' },
          ],
          fallbackUrl: 'https://fallback.example.com',
        },
      });

      const result = await service.findByShortCode('test-priority');

      expect(result).toBeDefined();
      expect(result?.type).toBe('link'); // Link should have priority
      expect(result?.data.id).toBe(link.id);
    });
  });

  describe('cacheLink', () => {
    it('should cache link with correct TTL', async () => {
      const testLink = {
        id: 'test-id',
        shortCode: 'test-cache-link',
        destinationUrl: 'https://test.example.com',
      };

      await service.cacheLink(testLink);

      expect(redisMock.setex).toHaveBeenCalledWith(
        `link:${testLink.shortCode}`,
        3600, // Default TTL
        JSON.stringify(testLink)
      );
    });

    it('should use custom TTL from environment', async () => {
      const originalTTL = process.env.REDIS_TTL;
      process.env.REDIS_TTL = '7200';

      const testLink = {
        id: 'test-id',
        shortCode: 'test-cache-custom-ttl',
        destinationUrl: 'https://test.example.com',
      };

      await service.cacheLink(testLink);

      expect(redisMock.setex).toHaveBeenCalledWith(
        `link:${testLink.shortCode}`,
        7200, // Custom TTL
        JSON.stringify(testLink)
      );

      // Restore original TTL
      if (originalTTL) {
        process.env.REDIS_TTL = originalTTL;
      } else {
        delete process.env.REDIS_TTL;
      }
    });
  });

  describe('cacheOneLink', () => {
    it('should cache OneLink with correct TTL', async () => {
      const testOneLink = {
        id: 'test-id',
        shortCode: 'test-cache-onelink',
        androidTarget: 'https://android.example.com',
        iosTarget: 'https://ios.example.com',
        webTarget: 'https://web.example.com',
      };

      await service.cacheOneLink(testOneLink);

      expect(redisMock.setex).toHaveBeenCalledWith(
        `onelink:${testOneLink.shortCode}`,
        3600, // Default TTL
        JSON.stringify(testOneLink)
      );
    });
  });

  describe('removeCachedLink', () => {
    it('should remove cached link', async () => {
      const shortCode = 'test-remove-cache';

      await service.removeCachedLink(shortCode);

      expect(redisMock.del).toHaveBeenCalledWith(`link:${shortCode}`);
    });
  });

  describe('removeCachedOneLink', () => {
    it('should remove cached OneLink', async () => {
      const shortCode = 'test-remove-onelink-cache';

      await service.removeCachedOneLink(shortCode);

      expect(redisMock.del).toHaveBeenCalledWith(`onelink:${shortCode}`);
    });
  });
});
