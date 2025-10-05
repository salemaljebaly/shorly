import { OneLinksService } from '../../src/modules/onelinks/onelinks.service';
import { IntegrationTestContext, setupIntegrationTest } from './test-helpers';
import { DeviceType } from '@shorly/types';

describe('OneLinksService Integration Tests', () => {
  let context: IntegrationTestContext;
  let service: OneLinksService;
  let userId: string;

  beforeAll(async () => {
    context = await setupIntegrationTest();
    service = new OneLinksService(context.prisma, context.redis);
  });

  beforeEach(async () => {
    userId = await context.createTestUser();
    await context.clearRedisCache();
  });

  afterAll(async () => {
    await context.cleanup();
  });

  describe('Cache Integration', () => {
    it('should cache onelink in Redis after creation', async () => {
      const dto = {
        shortCode: `onelink-${Date.now()}`,
        targets: [
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/app' },
          { deviceType: DeviceType.ANDROID, url: 'https://play.google.com/app' },
        ],
        fallbackUrl: 'https://example.com',
      };

      const oneLink = await service.create(userId, dto);

      // Verify cached in Redis
      const cached = await context.redis.get(`onelink:${oneLink.shortCode}`);
      expect(cached).toBeDefined();

      const cachedData = JSON.parse(cached!);
      expect(cachedData.id).toBe(oneLink.id);
      expect(cachedData.shortCode).toBe(oneLink.shortCode);
    });

    it('should update cache when onelink is updated', async () => {
      const shortCode = `update-${Date.now()}`;
      const created = await service.create(userId, {
        shortCode,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://example.com/old' }],
        fallbackUrl: 'https://example.com',
      });

      // Update
      await service.update(userId, created.id, {
        fallbackUrl: 'https://example.com/new',
      });

      // Verify cache updated
      const cached = await context.redis.get(`onelink:${shortCode}`);
      const cachedData = JSON.parse(cached!);
      expect(cachedData.fallbackUrl).toBe('https://example.com/new');
    });
  });

  describe('Database Integration', () => {
    it('should persist onelink with all targets to database', async () => {
      const dto = {
        shortCode: `persist-${Date.now()}`,
        targets: [
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/app', priority: 1 },
          { deviceType: DeviceType.ANDROID, url: 'https://play.google.com/app', priority: 2 },
          { deviceType: DeviceType.WEB, url: 'https://example.com', priority: 0 },
        ],
        fallbackUrl: 'https://example.com/fallback',
        title: 'Test OneLink',
      };

      const created = await service.create(userId, dto);

      // Verify in database
      const fromDb = await context.prisma.oneLink.findUnique({
        where: { id: created.id },
      });

      expect(fromDb).toBeDefined();
      expect(fromDb?.shortCode).toBe(dto.shortCode);
      expect(fromDb?.fallbackUrl).toBe(dto.fallbackUrl);
      expect(fromDb?.title).toBe(dto.title);
      expect(Array.isArray(fromDb?.targets)).toBe(true);
      expect((fromDb?.targets as any[]).length).toBe(3);
    });

    it('should enforce unique constraint on shortCode', async () => {
      const shortCode = `unique-${Date.now()}`;

      await service.create(userId, {
        shortCode,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://example.com/1' }],
        fallbackUrl: 'https://example.com',
      });

      // Try duplicate
      await expect(
        service.create(userId, {
          shortCode,
          targets: [{ deviceType: DeviceType.WEB, url: 'https://example.com/2' }],
          fallbackUrl: 'https://example.com',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent onelink creations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        service.create(userId, {
          targets: [{ deviceType: DeviceType.WEB, url: `https://example.com/${i}` }],
          fallbackUrl: 'https://example.com',
        }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      const shortCodes = results.map((r: any) => r.shortCode);
      expect(new Set(shortCodes).size).toBe(5);
    });
  });

  describe('Device Routing', () => {
    it('should route correctly based on device type', () => {
      const oneLink = {
        targets: [
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/app' },
          { deviceType: DeviceType.ANDROID, url: 'https://play.google.com/app' },
        ],
        fallbackUrl: 'https://example.com',
      };

      // iOS
      const iosUrl = service.resolveUrl(
        oneLink,
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      );
      expect(iosUrl).toBe('https://apps.apple.com/app');

      // Android
      const androidUrl = service.resolveUrl(oneLink, 'Mozilla/5.0 (Linux; Android 10)');
      expect(androidUrl).toBe('https://play.google.com/app');

      // Web/Unknown
      const webUrl = service.resolveUrl(oneLink, 'Mozilla/5.0 (Windows NT 10.0)');
      expect(webUrl).toBe('https://example.com');
    });

    it('should respect priority when multiple targets exist', () => {
      const oneLink = {
        targets: [
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/low', priority: 1 },
          { deviceType: DeviceType.IOS, url: 'https://apps.apple.com/high', priority: 10 },
        ],
        fallbackUrl: 'https://example.com',
      };

      const url = service.resolveUrl(
        oneLink,
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      );
      expect(url).toBe('https://apps.apple.com/high');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain consistency between cache and database', async () => {
      const shortCode = `integrity-${Date.now()}`;
      const dto = {
        shortCode,
        targets: [{ deviceType: DeviceType.WEB, url: 'https://example.com' }],
        fallbackUrl: 'https://example.com/fallback',
      };

      const created = await service.create(userId, dto);

      // Get from cache
      const cached = JSON.parse((await context.redis.get(`onelink:${shortCode}`))!);

      // Get from database
      const fromDb = await context.prisma.oneLink.findUnique({
        where: { id: created.id },
      });

      expect(cached.id).toBe(fromDb?.id);
      expect(cached.shortCode).toBe(fromDb?.shortCode);
      expect(cached.fallbackUrl).toBe(fromDb?.fallbackUrl);
    });
  });
});
