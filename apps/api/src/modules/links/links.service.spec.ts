import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LinksService } from './links.service';

// Mock the utils module
jest.mock('@shorly/utils', () => ({
  ...jest.requireActual('@shorly/utils'),
  generateShortCode: jest.fn(),
}));

describe('LinksService', () => {
  let service: LinksService;
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

    // Mock Redis with isolated state per test
    redisMock = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
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

    service = module.get<LinksService>(LinksService);
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
    await prisma.$disconnect();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a link with custom short code', async () => {
      const userId = await createTestUser();
      const dto = {
        shortCode: `test-${Date.now()}`,
        destinationUrl: 'https://test.example.com',
        title: 'Test Link',
      };

      const result = await service.create(userId, dto);

      expect(result).toHaveProperty('id');
      expect(result.shortCode).toBe(dto.shortCode);
      expect(result.destinationUrl).toBe(dto.destinationUrl);
      expect(result.title).toBe(dto.title);
      expect(result.userId).toBe(userId);
      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('should create a link with auto-generated short code', async () => {
      const userId = await createTestUser();
      const dto = {
        destinationUrl: 'https://test.example.com/auto',
      };

      const result = await service.create(userId, dto);

      expect(result).toHaveProperty('id');
      expect(result.shortCode).toBeDefined();
      expect(result.shortCode.length).toBeGreaterThan(0);
      expect(result.destinationUrl).toBe(dto.destinationUrl);
      expect(result.userId).toBe(userId);
    });

    it('should throw BadRequestException for invalid URL', async () => {
      const userId = await createTestUser();
      const dto = {
        destinationUrl: 'not-a-url',
      };

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid short code format', async () => {
      const userId = await createTestUser();
      const dto = {
        shortCode: 'invalid code!',
        destinationUrl: 'https://test.example.com',
      };

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate short code', async () => {
      const userId = await createTestUser();
      const shortCode = `test-duplicate-${Date.now()}`;
      const dto = {
        shortCode,
        destinationUrl: 'https://test.example.com/1',
      };

      await service.create(userId, dto);

      const dto2 = {
        shortCode,
        destinationUrl: 'https://test.example.com/2',
      };

      await expect(service.create(userId, dto2)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for reserved short code', async () => {
      const userId = await createTestUser();
      const dto = {
        shortCode: 'api', // Reserved shortcode
        destinationUrl: 'https://test.example.com',
      };

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for unsafe URL', async () => {
      const userId = await createTestUser();
      const dto = {
        shortCode: `test-unsafe-${Date.now()}`,
        destinationUrl: 'javascript:alert(1)', // Unsafe URL
      };

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should create link with tags and expiry', async () => {
      const userId = await createTestUser();
      const expiresAt = new Date(Date.now() + 86400000);
      const dto = {
        shortCode: `test-tags-${Date.now()}`,
        destinationUrl: 'https://test.example.com/tags',
        tags: ['marketing', 'campaign'],
        expiresAt,
      };

      const result = await service.create(userId, dto);

      expect(result.tags).toEqual(dto.tags);
      expect(result.expiresAt).toEqual(expiresAt);
    });
  });

  describe('findAll', () => {
    it('should return paginated links for user', async () => {
      const userId = await createTestUser();

      // Create test links
      await service.create(userId, {
        shortCode: `test-findall-1-${Date.now()}`,
        destinationUrl: 'https://test.example.com/1',
      });
      await service.create(userId, {
        shortCode: `test-findall-2-${Date.now()}`,
        destinationUrl: 'https://test.example.com/2',
      });

      const result = await service.findAll(userId, 1, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('hasNext');
      expect(result.data.length).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    it('should use default page and pageSize when not provided', async () => {
      const userId = await createTestUser();

      await service.create(userId, {
        shortCode: `test-defaults-${Date.now()}`,
        destinationUrl: 'https://test.example.com',
      });

      // Call without page and pageSize parameters to test defaults
      const result = await service.findAll(userId);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter links by tag', async () => {
      const userId = await createTestUser();

      await service.create(userId, {
        shortCode: `test-tag-1-${Date.now()}`,
        destinationUrl: 'https://test.example.com/tagged',
        tags: ['special'],
      });
      await service.create(userId, {
        shortCode: `test-tag-2-${Date.now()}`,
        destinationUrl: 'https://test.example.com/normal',
      });

      const result = await service.findAll(userId, 1, 10, 'special');

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.data[0].tags).toContain('special');
    });

    it('should handle pagination correctly', async () => {
      const userId = await createTestUser();

      // Create 3 links
      for (let i = 0; i < 3; i++) {
        await service.create(userId, {
          shortCode: `test-page-${Date.now()}-${i}`,
          destinationUrl: `https://test.example.com/page-${i}`,
        });
        // Small delay to ensure unique timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const page1 = await service.findAll(userId, 1, 2);
      const page2 = await service.findAll(userId, 2, 2);

      expect(page1.data.length).toBe(2);
      expect(page1.hasNext).toBe(true);
      expect(page2.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findOne', () => {
    it('should find link by id for user', async () => {
      const userId = await createTestUser();
      const created = await service.create(userId, {
        shortCode: `test-findone-${Date.now()}`,
        destinationUrl: 'https://test.example.com/findone',
      });

      const found = await service.findOne(userId, created.id);

      expect(found.id).toBe(created.id);
      expect(found.shortCode).toBe(created.shortCode);
    });

    it('should throw NotFoundException for non-existent link', async () => {
      const userId = await createTestUser();

      await expect(service.findOne(userId, 'non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when accessing another user link', async () => {
      const userId1 = await createTestUser();
      const userId2 = await createTestUser();

      const created = await service.create(userId1, {
        shortCode: `test-ownership-${Date.now()}`,
        destinationUrl: 'https://test.example.com/ownership',
      });

      await expect(service.findOne(userId2, created.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByShortCode', () => {
    it('should find link by short code from database', async () => {
      const userId = await createTestUser();
      const shortCode = `test-shortcode-${Date.now()}`;

      await service.create(userId, {
        shortCode,
        destinationUrl: 'https://test.example.com/shortcode',
      });

      const found = await service.findByShortCode(shortCode);

      expect(found).toBeDefined();
      expect(found?.shortCode).toBe(shortCode);
      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('should return cached link on second call', async () => {
      const userId = await createTestUser();
      const shortCode = `test-cache-${Date.now()}`;

      const created = await service.create(userId, {
        shortCode,
        destinationUrl: 'https://test.example.com/cache',
      });

      // Mock cache hit
      redisMock.get.mockResolvedValueOnce(JSON.stringify(created));

      const found = await service.findByShortCode(shortCode);

      expect(found).toBeDefined();
      expect(redisMock.get).toHaveBeenCalledWith(`link:${shortCode}`);
    });

    it('should return null for non-existent short code', async () => {
      const found = await service.findByShortCode(`non-existent-${Date.now()}`);

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update link successfully', async () => {
      const userId = await createTestUser();
      const created = await service.create(userId, {
        shortCode: `test-update-${Date.now()}`,
        destinationUrl: 'https://test.example.com/original',
        title: 'Original Title',
      });

      const updated = await service.update(userId, created.id, {
        title: 'Updated Title',
        description: 'New description',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('New description');
      expect(updated.destinationUrl).toBe(created.destinationUrl);
      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid destination URL update', async () => {
      const userId = await createTestUser();
      const created = await service.create(userId, {
        shortCode: `test-invalid-${Date.now()}`,
        destinationUrl: 'https://test.example.com/valid',
      });

      await expect(
        service.update(userId, created.id, {
          destinationUrl: 'invalid-url',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for unsafe destination URL update', async () => {
      const userId = await createTestUser();
      const created = await service.create(userId, {
        shortCode: `test-unsafe-update-${Date.now()}`,
        destinationUrl: 'https://test.example.com/valid',
      });

      await expect(
        service.update(userId, created.id, {
          destinationUrl: 'http://127.0.0.1/admin',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for localhost URL update', async () => {
      const userId = await createTestUser();
      const created = await service.create(userId, {
        shortCode: `test-localhost-${Date.now()}`,
        destinationUrl: 'https://test.example.com/valid',
      });

      await expect(
        service.update(userId, created.id, {
          destinationUrl: 'https://localhost:3000/admin',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update link without changing destinationUrl', async () => {
      const userId = await createTestUser();
      const created = await service.create(userId, {
        shortCode: `test-no-url-${Date.now()}`,
        destinationUrl: 'https://test.example.com',
        title: 'Original',
      });

      // Update only title, not destinationUrl (tests the if branch)
      const updated = await service.update(userId, created.id, {
        title: 'Updated',
      });

      expect(updated.title).toBe('Updated');
      expect(updated.destinationUrl).toBe(created.destinationUrl);
    });

    it('should update link with valid and safe destinationUrl', async () => {
      const userId = await createTestUser();
      const created = await service.create(userId, {
        shortCode: `test-valid-safe-${Date.now()}`,
        destinationUrl: 'https://test.example.com/original',
        title: 'Original',
      });

      const updated = await service.update(userId, created.id, {
        destinationUrl: 'https://example.com/updated',
        title: 'Updated',
      });

      expect(updated.destinationUrl).toBe('https://example.com/updated');
      expect(updated.title).toBe('Updated');
    });

    it('should use default REDIS_TTL when env var not set', async () => {
      const userId = await createTestUser();
      const originalTTL = process.env.REDIS_TTL;

      // Unset to test fallback
      delete process.env.REDIS_TTL;

      const result = await service.create(userId, {
        shortCode: `test-redis-ttl-${Date.now()}`,
        destinationUrl: 'https://test.example.com',
      });

      expect(result).toBeDefined();
      expect(redisMock.setex).toHaveBeenCalledWith(
        `link:${result.shortCode}`,
        3600, // Default TTL
        expect.any(String),
      );

      // Restore
      if (originalTTL) process.env.REDIS_TTL = originalTTL;
    });

    it('should throw NotFoundException when updating non-existent link', async () => {
      const userId = await createTestUser();

      await expect(
        service.update(userId, 'non-existent-id', { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete link and clear cache', async () => {
      const userId = await createTestUser();
      const created = await service.create(userId, {
        shortCode: `test-remove-${Date.now()}`,
        destinationUrl: 'https://test.example.com/remove',
      });

      const result = await service.remove(userId, created.id);

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('deleted');
      expect(redisMock.del).toHaveBeenCalledWith(`link:${created.shortCode}`);

      await expect(service.findOne(userId, created.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when deleting non-existent link', async () => {
      const userId = await createTestUser();

      await expect(service.remove(userId, 'non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateUniqueShortCode', () => {
    it('should throw error when unable to generate unique short code', async () => {
      const userId = await createTestUser();

      // Mock generateShortCode to always return the same code
      generateShortCode.mockReturnValue('same-code');

      // Create a link with this code first
      await service.create(userId, {
        shortCode: 'same-code',
        destinationUrl: 'https://test.example.com',
      });

      // Now try to create another link without specifying shortCode
      // It will try to generate one, but always get 'same-code' which exists
      await expect(
        service.create(userId, {
          destinationUrl: 'https://test.example.com/another',
        }),
      ).rejects.toThrow('Failed to generate unique short code');
    });
  });
});
