import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { LinksService } from '../../src/modules/links/links.service';
import { IntegrationTestContext, setupIntegrationTest } from './test-helpers';

describe('AnalyticsService Integration Tests', () => {
  let context: IntegrationTestContext;
  let analyticsService: AnalyticsService;
  let linksService: LinksService;
  let userId: string;

  beforeAll(async () => {
    context = await setupIntegrationTest();
    analyticsService = new AnalyticsService(context.prisma);
    linksService = new LinksService(context.prisma, context.redis);
  });

  beforeEach(async () => {
    userId = await context.createTestUser();
  });

  afterAll(async () => {
    await context.cleanup();
  });

  describe('Click Tracking', () => {
    it('should track and persist click events to database', async () => {
      const link = await linksService.create(userId, {
        shortCode: `analytics-${Date.now()}`,
        destinationUrl: 'https://example.com',
      });

      // Track click
      await analyticsService.trackClick({
        linkId: link.id,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        referer: 'https://google.com',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      // Verify in database
      const events = await context.prisma.clickEvent.findMany({
        where: { linkId: link.id },
      });

      expect(events).toHaveLength(1);
      expect(events[0].linkId).toBe(link.id);
    });

    it('should handle multiple clicks for same link', async () => {
      const link = await linksService.create(userId, {
        shortCode: `multi-click-${Date.now()}`,
        destinationUrl: 'https://example.com',
      });

      // Track 5 clicks
      for (let i = 0; i < 5; i++) {
        await analyticsService.trackClick({
          linkId: link.id,
          userAgent: 'Mozilla/5.0',
          headers: { 'x-forwarded-for': `192.168.1.${i}` },
        });
      }

      // Verify all tracked
      const events = await context.prisma.clickEvent.findMany({
        where: { linkId: link.id },
      });

      expect(events).toHaveLength(5);
    });
  });

  describe('Concurrent Click Tracking', () => {
    it('should handle concurrent click tracking', async () => {
      const link = await linksService.create(userId, {
        shortCode: `concurrent-${Date.now()}`,
        destinationUrl: 'https://example.com',
      });

      // Track 10 concurrent clicks
      const promises = Array.from({ length: 10 }, (_, i) =>
        analyticsService.trackClick({
          linkId: link.id,
          userAgent: 'Mozilla/5.0',
          headers: { 'x-forwarded-for': `192.168.1.${i}` },
        }),
      );

      await Promise.all(promises);

      // Verify all clicks tracked
      const events = await context.prisma.clickEvent.findMany({
        where: { linkId: link.id },
      });

      expect(events).toHaveLength(10);
    });
  });

  describe('Data Integrity', () => {
    it('should cascade delete click events when link is deleted', async () => {
      const link = await linksService.create(userId, {
        shortCode: `cascade-${Date.now()}`,
        destinationUrl: 'https://example.com',
      });

      // Track clicks
      await analyticsService.trackClick({
        linkId: link.id,
        userAgent: 'Mozilla/5.0',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      // Verify click exists
      const eventsBefore = await context.prisma.clickEvent.findMany({
        where: { linkId: link.id },
      });
      expect(eventsBefore).toHaveLength(1);

      // Delete link
      await linksService.remove(userId, link.id);

      // Verify click events were cascade deleted
      const eventsAfter = await context.prisma.clickEvent.findMany({
        where: { linkId: link.id },
      });
      expect(eventsAfter).toHaveLength(0);
    });
  });
});
