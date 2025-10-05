import { LinksService } from '../../src/modules/links/links.service';
import { IntegrationTestContext, setupIntegrationTest } from './test-helpers';

describe('LinksService Integration Tests', () => {
  let context: IntegrationTestContext;
  let service: LinksService;
  let userId: string;

  beforeAll(async () => {
    context = await setupIntegrationTest();
    service = new LinksService(context.prisma, context.redis);
  });

  beforeEach(async () => {
    userId = await context.createTestUser();
    await context.clearRedisCache();
  });

  afterEach(async () => {
    // Cleanup is handled by context.cleanup()
  });

  afterAll(async () => {
    await context.cleanup();
  });

  describe('Cache Integration', () => {
    it('should cache link in Redis after creation', async () => {
      const dto = {
        shortCode: `test-${Date.now()}`,
        destinationUrl: 'https://example.com',
        title: 'Test Link',
      };

      const link = await service.create(userId, dto);

      // Verify link is cached in Redis
      const cached = await context.redis.get(`link:${link.shortCode}`);
      expect(cached).toBeDefined();

      const cachedData = JSON.parse(cached!);
      expect(cachedData.id).toBe(link.id);
      expect(cachedData.shortCode).toBe(link.shortCode);
      expect(cachedData.destinationUrl).toBe(link.destinationUrl);
    });

    it('should retrieve link from cache on second call', async () => {
      const shortCode = `test-cache-${Date.now()}`;
      const dto = {
        shortCode,
        destinationUrl: 'https://example.com/cache-test',
      };

      // First call - creates and caches
      await service.create(userId, dto);

      // Verify it's in cache
      const cached1 = await context.redis.get(`link:${shortCode}`);
      expect(cached1).toBeDefined();

      // Second call - should hit cache (we can verify by checking DB directly)
      const result = await service.findByShortCode(shortCode);

      expect(result).toBeDefined();
      expect(result?.shortCode).toBe(shortCode);

      // Cache should still exist
      const cached2 = await context.redis.get(`link:${shortCode}`);
      expect(cached2).toBe(cached1);
    });

    it('should update cache when link is updated', async () => {
      const shortCode = `test-update-${Date.now()}`;
      const dto = {
        shortCode,
        destinationUrl: 'https://example.com/original',
        title: 'Original Title',
      };

      const created = await service.create(userId, dto);

      // Verify original is cached
      const cachedBefore = await context.redis.get(`link:${shortCode}`);
      expect(JSON.parse(cachedBefore!).title).toBe('Original Title');

      // Update the link
      await service.update(userId, created.id, {
        title: 'Updated Title',
      });

      // Verify cache was updated
      const cachedAfter = await context.redis.get(`link:${shortCode}`);
      expect(JSON.parse(cachedAfter!).title).toBe('Updated Title');
    });

    it('should clear cache when link is deleted', async () => {
      const shortCode = `test-delete-${Date.now()}`;
      const dto = {
        shortCode,
        destinationUrl: 'https://example.com/delete',
      };

      const created = await service.create(userId, dto);

      // Verify it's cached
      const cachedBefore = await context.redis.get(`link:${shortCode}`);
      expect(cachedBefore).toBeDefined();

      // Delete the link
      await service.remove(userId, created.id);

      // Verify cache was cleared
      const cachedAfter = await context.redis.get(`link:${shortCode}`);
      expect(cachedAfter).toBeNull();
    });
  });

  describe('Database Integration', () => {
    it('should persist link to database with all fields', async () => {
      const expiresAt = new Date(Date.now() + 86400000);
      const dto = {
        shortCode: `test-persist-${Date.now()}`,
        destinationUrl: 'https://example.com/persist',
        title: 'Test Title',
        description: 'Test Description',
        tags: ['marketing', 'campaign'],
        expiresAt,
      };

      const created = await service.create(userId, dto);

      // Verify in database directly
      const fromDb = await context.prisma.link.findUnique({
        where: { id: created.id },
      });

      expect(fromDb).toBeDefined();
      expect(fromDb?.shortCode).toBe(dto.shortCode);
      expect(fromDb?.destinationUrl).toBe(dto.destinationUrl);
      expect(fromDb?.title).toBe(dto.title);
      expect(fromDb?.description).toBe(dto.description);
      expect(fromDb?.tags).toEqual(dto.tags);
      expect(fromDb?.userId).toBe(userId);
      expect(fromDb?.expiresAt?.toISOString()).toBe(expiresAt.toISOString());
    });

    it('should enforce unique constraint on shortCode at database level', async () => {
      const shortCode = `test-unique-${Date.now()}`;

      // Create first link
      await service.create(userId, {
        shortCode,
        destinationUrl: 'https://example.com/first',
      });

      // Try to create duplicate
      await expect(
        service.create(userId, {
          shortCode,
          destinationUrl: 'https://example.com/second',
        }),
      ).rejects.toThrow();
    });

    it('should cascade delete links when user is deleted', async () => {
      const dto = {
        shortCode: `test-cascade-${Date.now()}`,
        destinationUrl: 'https://example.com/cascade',
      };

      const link = await service.create(userId, dto);

      // Verify link exists
      const linkBefore = await context.prisma.link.findUnique({
        where: { id: link.id },
      });
      expect(linkBefore).toBeDefined();

      // Delete user
      await context.prisma.user.delete({
        where: { id: userId },
      });

      // Verify link was cascade deleted
      const linkAfter = await context.prisma.link.findUnique({
        where: { id: link.id },
      });
      expect(linkAfter).toBeNull();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent link creations without collisions', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.create(userId, {
          destinationUrl: `https://example.com/concurrent-${i}`,
        }),
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(10);

      // All short codes should be unique
      const shortCodes = results.map((r: any) => r.shortCode);
      expect(new Set(shortCodes).size).toBe(10);

      // All should be in database
      const fromDb = await context.prisma.link.findMany({
        where: {
          id: { in: results.map((r: any) => r.id) },
        },
      });
      expect(fromDb).toHaveLength(10);
    });

    it('should handle concurrent reads from cache correctly', async () => {
      const shortCode = `test-concurrent-read-${Date.now()}`;
      await service.create(userId, {
        shortCode,
        destinationUrl: 'https://example.com/concurrent-read',
      });

      // Make 20 concurrent reads
      const promises = Array.from({ length: 20 }, () =>
        service.findByShortCode(shortCode),
      );

      const results = await Promise.all(promises);

      // All should return the same link
      expect(results).toHaveLength(20);
      results.forEach((result: any) => {
        expect(result?.shortCode).toBe(shortCode);
      });
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data consistency between cache and database', async () => {
      const shortCode = `test-integrity-${Date.now()}`;
      const dto = {
        shortCode,
        destinationUrl: 'https://example.com/integrity',
        title: 'Original',
      };

      const created = await service.create(userId, dto);

      // Get from cache
      const cachedData = await context.redis.get(`link:${shortCode}`);
      const cached = JSON.parse(cachedData!);

      // Get from database
      const fromDb = await context.prisma.link.findUnique({
        where: { id: created.id },
      });

      // Both should match
      expect(cached.id).toBe(fromDb?.id);
      expect(cached.shortCode).toBe(fromDb?.shortCode);
      expect(cached.destinationUrl).toBe(fromDb?.destinationUrl);
      expect(cached.title).toBe(fromDb?.title);
      expect(cached.userId).toBe(fromDb?.userId);
    });
  });
});
