import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { OneLinksService } from './onelinks.service';
import { DeviceType } from '@shorly/types';

// Mock the utils module
jest.mock('@shorly/utils', () => ({
  ...jest.requireActual('@shorly/utils'),
  generateShortCode: jest.fn(),
}));

describe('OneLinksService', () => {
  let service: OneLinksService;
  let prisma: PrismaClient;
  let redisMock: any;
  const { generateShortCode } = require('@shorly/utils');

  // Helper function to create test user
  const createTestUser = async (email?: string) => {
    const user = await prisma.user.create({
      data: {
        email: email || `test-${Date.now()}-${Math.random()}@example.com`,
        password: 'hashed-password',
      },
    });
    return user.id;
  };

  beforeEach(async () => {
    // Reset mock to default implementation before each test
    generateShortCode.mockImplementation(() => jest.requireActual('@shorly/utils').generateShortCode());

    prisma = new PrismaClient();

    // Mock Redis with isolated state
    redisMock = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OneLinksService,
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

    service = module.get<OneLinksService>(OneLinksService);
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.oneLink.deleteMany({
      where: { shortCode: { contains: 'test' } },
    });
    await prisma.$disconnect();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create OneLink with custom short code', async () => {
      const userId = await createTestUser();
      const dto = {
        shortCode: `test-onelink-${Date.now()}`,
        targets: [
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/test' },
          { deviceType: DeviceType.ANDROID, url: 'https://play.google.com/test' },
        ],
        fallbackUrl: 'https://test.example.com',
        title: 'Test OneLink',
      };

      const result = await service.create(userId, dto);

      expect(result).toHaveProperty('id');
      expect(result.shortCode).toBe(dto.shortCode);
      expect(result.targets).toEqual(dto.targets);
      expect(result.fallbackUrl).toBe(dto.fallbackUrl);
      expect(result.userId).toBe(userId);
      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('should create OneLink with auto-generated short code', async () => {
      const userId = await createTestUser();
      const dto = {
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com' }],
        fallbackUrl: 'https://test.example.com',
      };

      const result = await service.create(userId, dto);

      expect(result).toHaveProperty('id');
      expect(result.shortCode).toBeDefined();
      expect(result.shortCode.length).toBeGreaterThan(0);
      expect(result.userId).toBe(userId);
    });

    it('should throw BadRequestException when targets are empty', async () => {
      const userId = await createTestUser();
      const dto = {
        targets: [],
        fallbackUrl: 'https://test.example.com',
      };

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid short code format', async () => {
      const userId = await createTestUser();
      const dto = {
        shortCode: 'invalid code!',
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com' }],
        fallbackUrl: 'https://test.example.com',
      };

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate short code', async () => {
      const userId = await createTestUser();
      const shortCode = `test-duplicate-onelink-${Date.now()}`;
      const dto = {
        shortCode,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com/1' }],
        fallbackUrl: 'https://test.example.com/1',
      };

      await service.create(userId, dto);

      const dto2 = {
        shortCode,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com/2' }],
        fallbackUrl: 'https://test.example.com/2',
      };

      await expect(service.create(userId, dto2)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for reserved short code', async () => {
      const userId = await createTestUser();
      const dto = {
        shortCode: 'admin', // Reserved
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com' }],
        fallbackUrl: 'https://test.example.com',
      };

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should create OneLink with multiple targets and priorities', async () => {
      const userId = await createTestUser();
      const dto = {
        shortCode: `test-multi-${Date.now()}`,
        targets: [
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/test', priority: 10 },
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/backup', priority: 5 },
          { deviceType: DeviceType.ANDROID, url: 'https://play.google.com/test' },
        ],
        fallbackUrl: 'https://test.example.com',
      };

      const result = await service.create(userId, dto);

      expect(result.targets).toHaveLength(3);
      expect(result.targets).toEqual(dto.targets);
    });
  });

  describe('findAll', () => {
    it('should return paginated OneLinks for user', async () => {
      const userId = await createTestUser();

      await service.create(userId, {
        shortCode: `test-findall-1-${Date.now()}`,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com/1' }],
        fallbackUrl: 'https://test.example.com/1',
      });
      await service.create(userId, {
        shortCode: `test-findall-2-${Date.now()}`,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com/2' }],
        fallbackUrl: 'https://test.example.com/2',
      });

      const result = await service.findAll(userId, 1, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result.data.length).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    it('should use default page and pageSize when not provided', async () => {
      const userId = await createTestUser();

      await service.create(userId, {
        shortCode: `test-defaults-${Date.now()}`,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com' }],
        fallbackUrl: 'https://test.example.com',
      });

      // Call without parameters to test defaults
      const result = await service.findAll(userId);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should handle pagination correctly', async () => {
      const userId = await createTestUser();

      for (let i = 0; i < 3; i++) {
        await service.create(userId, {
          shortCode: `test-page-onelink-${i}-${Date.now()}`,
          targets: [{ deviceType: DeviceType.WEB, url: `https://test.example.com/${i}` }],
          fallbackUrl: `https://test.example.com/${i}`,
        });
      }

      const page1 = await service.findAll(userId, 1, 2);
      const page2 = await service.findAll(userId, 2, 2);

      expect(page1.data.length).toBe(2);
      expect(page1.hasNext).toBe(true);
      expect(page2.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findOne', () => {
    it('should find OneLink by id for user', async () => {
      const userId = await createTestUser();
      const created = await service.create(userId, {
        shortCode: `test-findone-onelink-${Date.now()}`,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com' }],
        fallbackUrl: 'https://test.example.com',
      });

      const found = await service.findOne(userId, created.id);

      expect(found.id).toBe(created.id);
      expect(found.shortCode).toBe(created.shortCode);
    });

    it('should throw NotFoundException for non-existent OneLink', async () => {
      const userId = await createTestUser();

      await expect(service.findOne(userId, 'non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByShortCode', () => {
    it('should find OneLink by short code', async () => {
      const userId = await createTestUser();
      const shortCode = `test-shortcode-onelink-${Date.now()}`;

      await service.create(userId, {
        shortCode,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com' }],
        fallbackUrl: 'https://test.example.com',
      });

      const found = await service.findByShortCode(shortCode);

      expect(found).toBeDefined();
      expect(found?.shortCode).toBe(shortCode);
    });

    it('should return null for non-existent short code', async () => {
      const found = await service.findByShortCode(`non-existent-onelink-${Date.now()}`);

      expect(found).toBeNull();
    });

    it('should return cached OneLink on cache hit', async () => {
      const userId = await createTestUser();
      const shortCode = `test-cached-onelink-${Date.now()}`;

      const createdOneLink = await service.create(userId, {
        shortCode,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com' }],
        fallbackUrl: 'https://test.example.com',
      });

      // Mock cache hit
      redisMock.get.mockResolvedValueOnce(JSON.stringify(createdOneLink));

      const found = await service.findByShortCode(shortCode);

      expect(found).toBeDefined();
      expect(found?.shortCode).toBe(shortCode);
      expect(redisMock.get).toHaveBeenCalledWith(`onelink:${shortCode}`);
    });
  });

  describe('update', () => {
    it('should update OneLink successfully', async () => {
      const userId = await createTestUser();
      const created = await service.create(userId, {
        shortCode: `test-update-onelink-${Date.now()}`,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com' }],
        fallbackUrl: 'https://test.example.com',
        title: 'Original Title',
      });

      const updated = await service.update(userId, created.id, {
        title: 'Updated Title',
        description: 'New description',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('New description');
      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('should update targets successfully', async () => {
      const userId = await createTestUser();
      const created = await service.create(userId, {
        shortCode: `test-update-targets-${Date.now()}`,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com' }],
        fallbackUrl: 'https://test.example.com',
      });

      const newTargets = [
        { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/test' },
        { deviceType: DeviceType.ANDROID, url: 'https://play.google.com/test' },
      ];

      const updated = await service.update(userId, created.id, {
        targets: newTargets,
      });

      expect(updated.targets).toEqual(newTargets);
    });

    it('should throw BadRequestException when updating with empty targets', async () => {
      const userId = await createTestUser();
      const created = await service.create(userId, {
        shortCode: `test-empty-${Date.now()}`,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com' }],
        fallbackUrl: 'https://test.example.com',
      });

      await expect(
        service.update(userId, created.id, { targets: [] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete OneLink and clear cache', async () => {
      const userId = await createTestUser();
      const created = await service.create(userId, {
        shortCode: `test-remove-onelink-${Date.now()}`,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com' }],
        fallbackUrl: 'https://test.example.com',
      });

      const result = await service.remove(userId, created.id);

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('deleted');
      expect(redisMock.del).toHaveBeenCalledWith(`onelink:${created.shortCode}`);
    });
  });

  describe('resolveUrl', () => {
    it('should resolve iOS URL for iOS user agent', () => {
      const oneLink = {
        targets: [
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/test' },
          { deviceType: DeviceType.ANDROID, url: 'https://play.google.com/test' },
          { deviceType: DeviceType.WEB, url: 'https://test.example.com' },
        ],
        fallbackUrl: 'https://fallback.example.com',
      };

      const iosUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      const url = service.resolveUrl(oneLink, iosUserAgent);

      expect(url).toBe('https://apps.apple.com/test');
    });

    it('should resolve Android URL for Android user agent', () => {
      const oneLink = {
        targets: [
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/test' },
          { deviceType: DeviceType.ANDROID, url: 'https://play.google.com/test' },
        ],
        fallbackUrl: 'https://fallback.example.com',
      };

      const androidUserAgent = 'Mozilla/5.0 (Linux; Android 10)';
      const url = service.resolveUrl(oneLink, androidUserAgent);

      expect(url).toBe('https://play.google.com/test');
    });

    it('should resolve web URL for desktop user agent', () => {
      const oneLink = {
        targets: [
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/test' },
          { deviceType: DeviceType.WEB, url: 'https://test.example.com' },
        ],
        fallbackUrl: 'https://fallback.example.com',
      };

      const desktopUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const url = service.resolveUrl(oneLink, desktopUserAgent);

      expect(url).toBe('https://test.example.com');
    });

    it('should use fallback for bot user agents', () => {
      const oneLink = {
        targets: [
          { deviceType: DeviceType.WEB, url: 'https://test.example.com' },
        ],
        fallbackUrl: 'https://fallback.example.com',
      };

      const botUserAgent = 'Googlebot/2.1';
      const url = service.resolveUrl(oneLink, botUserAgent);

      expect(url).toBe('https://fallback.example.com');
    });

    it('should prioritize higher priority targets', () => {
      const oneLink = {
        targets: [
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/low', priority: 5 },
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/high', priority: 10 },
        ],
        fallbackUrl: 'https://fallback.example.com',
      };

      const iosUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      const url = service.resolveUrl(oneLink, iosUserAgent);

      expect(url).toBe('https://apps.apple.com/high');
    });

    it('should handle targets without priority (defaults to 0)', () => {
      const oneLink = {
        targets: [
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/no-priority' },
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/with-priority', priority: 1 },
        ],
        fallbackUrl: 'https://fallback.example.com',
      };

      const iosUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      const url = service.resolveUrl(oneLink, iosUserAgent);

      // Should pick the one with priority 1 over priority 0 (default)
      expect(url).toBe('https://apps.apple.com/with-priority');
    });

    it('should handle targets with first having priority and second without', () => {
      const oneLink = {
        targets: [
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/with-priority', priority: 1 },
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/no-priority' },
        ],
        fallbackUrl: 'https://fallback.example.com',
      };

      const iosUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      const url = service.resolveUrl(oneLink, iosUserAgent);

      // Should pick the one with priority 1 over priority 0 (default)
      expect(url).toBe('https://apps.apple.com/with-priority');
    });

    it('should fallback to web when mobile device has no specific target', () => {
      const oneLink = {
        targets: [
          { deviceType: DeviceType.WEB, url: 'https://test.example.com' },
        ],
        fallbackUrl: 'https://fallback.example.com',
      };

      const iosUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      const url = service.resolveUrl(oneLink, iosUserAgent);

      expect(url).toBe('https://test.example.com');
    });

    it('should use fallback when no matching target found', () => {
      const oneLink = {
        targets: [
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/test' },
        ],
        fallbackUrl: 'https://fallback.example.com',
      };

      const androidUserAgent = 'Mozilla/5.0 (Linux; Android 10)';
      const url = service.resolveUrl(oneLink, androidUserAgent);

      expect(url).toBe('https://fallback.example.com');
    });
  });

  describe('generateUniqueShortCode', () => {
    it('should throw error when unable to generate unique short code', async () => {
      const userId = await createTestUser();

      // Mock generateShortCode to always return the same code
      generateShortCode.mockReturnValue('same-code');

      // Create a onelink with this code first
      await service.create(userId, {
        shortCode: 'same-code',
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com' }],
        fallbackUrl: 'https://test.example.com',
      });

      // Now try to create another onelink without specifying shortCode
      // It will try to generate one, but always get 'same-code' which exists
      await expect(
        service.create(userId, {
          targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com/another' }],
          fallbackUrl: 'https://test.example.com/another',
        }),
      ).rejects.toThrow('Failed to generate unique short code');
    });
  });

  describe('environment variable fallbacks', () => {
    it('should use default REDIS_TTL when env var not set', async () => {
      const userId = await createTestUser();
      const originalTTL = process.env.REDIS_TTL;

      // Unset to test fallback
      delete process.env.REDIS_TTL;

      const result = await service.create(userId, {
        shortCode: `test-redis-ttl-${Date.now()}`,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://test.example.com' }],
        fallbackUrl: 'https://test.example.com',
      });

      expect(result).toBeDefined();
      expect(redisMock.setex).toHaveBeenCalledWith(
        `onelink:${result.shortCode}`,
        3600, // Default TTL
        expect.any(String),
      );

      // Restore
      if (originalTTL) process.env.REDIS_TTL = originalTTL;
    });
  });
});
