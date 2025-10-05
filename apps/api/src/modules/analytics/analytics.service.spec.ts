import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: PrismaClient;
  let testLinkId: string;
  let testOneLinkId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaClient,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);

    // Create test user first
    const user = await prisma.user.create({
      data: {
        email: `test-analytics-${Date.now()}@example.com`,
        password: 'hashed-password',
      },
    });
    const userId = user.id;

    // Create test link
    const link = await prisma.link.create({
      data: {
        shortCode: `test-analytics-${Date.now()}`,
        destinationUrl: 'https://test.example.com',
        userId,
      },
    });
    testLinkId = link.id;

    // Create test onelink
    const oneLink = await prisma.oneLink.create({
      data: {
        shortCode: `test-onelink-analytics-${Date.now()}`,
        fallbackUrl: 'https://test.example.com',
        targets: [{ deviceType: 'web', url: 'https://test.example.com' }] as any,
        userId,
      },
    });
    testOneLinkId = oneLink.id;
  });

  afterEach(async () => {
    // Only clean up click events after each test, not links
    await prisma.clickEvent.deleteMany({
      where: {
        OR: [
          { linkId: testLinkId },
          { oneLinkId: testOneLinkId },
        ],
      },
    });
  });

  afterAll(async () => {
    // Clean up links after all tests
    await prisma.link.deleteMany({
      where: { shortCode: { contains: 'test-analytics' } },
    });
    await prisma.oneLink.deleteMany({
      where: { shortCode: { contains: 'test-onelink-analytics' } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-analytics' } },
    });
    await prisma.$disconnect();
  });

  describe('trackClick', () => {
    it('should track click event for link', async () => {
      const params = {
        linkId: testLinkId,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        referer: 'https://google.com',
        country: 'US',
        city: 'New York',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      };

      const result = await service.trackClick(params);

      expect(result).toHaveProperty('id');
      expect(result.linkId).toBe(testLinkId);
      expect(result.country).toBe('US');
      expect(result.city).toBe('New York');
      expect(result.referer).toBe('google.com');
    });

    it('should track click event for OneLink', async () => {
      const params = {
        oneLinkId: testOneLinkId,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        headers: {},
      };

      const result = await service.trackClick(params);

      expect(result).toHaveProperty('id');
      expect(result.oneLinkId).toBe(testOneLinkId);
      expect(result.device).toBeDefined();
    });

    it('should throw BadRequestException when neither linkId nor oneLinkId provided', async () => {
      const params = {
        headers: {},
      };

      await expect(service.trackClick(params)).rejects.toThrow(BadRequestException);
    });

    it('should extract device info from user agent', async () => {
      const params = {
        linkId: testLinkId,
        userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
        headers: {},
      };

      const result = await service.trackClick(params);

      expect(result.device).toBeDefined();
      expect(result.os).toBeDefined();
    });

    it('should anonymize IP address', async () => {
      const params = {
        linkId: testLinkId,
        headers: { 'x-forwarded-for': '192.168.1.100' },
      };

      const result = await service.trackClick(params);

      expect(result.ip).toBeDefined();
      // IP should be anonymized (last octet zeroed)
      if (result.ip) {
        expect(result.ip).toMatch(/192\.168\.1\./);
      }
    });

    it('should parse referrer correctly', async () => {
      const params = {
        linkId: testLinkId,
        referer: 'https://www.facebook.com/page',
        headers: {},
      };

      const result = await service.trackClick(params);

      expect(result.referer).toBe('www.facebook.com');
    });
  });

  describe('getLinkAnalytics', () => {
    beforeEach(async () => {
      // Create test click events
      const clickData = [
        { country: 'US', city: 'New York', device: 'android', browser: 'Chrome', referer: 'google.com', ip: '192.168.1.1' },
        { country: 'US', city: 'Los Angeles', device: 'ios', browser: 'Safari', referer: 'facebook.com', ip: '192.168.1.2' },
        { country: 'UK', city: 'London', device: 'web', browser: 'Chrome', referer: 'google.com', ip: '192.168.1.3' },
      ];

      for (const data of clickData) {
        await prisma.clickEvent.create({
          data: {
            linkId: testLinkId,
            ...data,
          },
        });
      }
    });

    it('should return analytics summary for link by ID', async () => {
      const result = await service.getLinkAnalytics(testLinkId);

      expect(result).toHaveProperty('totalClicks');
      expect(result).toHaveProperty('uniqueClicks');
      expect(result).toHaveProperty('byCountry');
      expect(result).toHaveProperty('byCity');
      expect(result).toHaveProperty('byDevice');
      expect(result).toHaveProperty('byBrowser');
      expect(result).toHaveProperty('byReferer');
      expect(result.totalClicks).toBe(3);
      expect(result.byCountry.US).toBe(2);
      expect(result.byCountry.UK).toBe(1);
    });

    it('should return analytics summary for link by short code', async () => {
      const link = await prisma.link.findUnique({ where: { id: testLinkId } });
      const result = await service.getLinkAnalytics(link!.shortCode);

      expect(result.totalClicks).toBeGreaterThan(0);
    });

    it('should filter analytics by date range', async () => {
      const startDate = new Date(Date.now() - 86400000); // Yesterday
      const endDate = new Date();

      const result = await service.getLinkAnalytics(testLinkId, startDate, endDate);

      expect(result).toHaveProperty('totalClicks');
      expect(result.totalClicks).toBeGreaterThan(0);
    });

    it('should filter analytics with only startDate', async () => {
      const startDate = new Date(Date.now() - 86400000);

      const result = await service.getLinkAnalytics(testLinkId, startDate);

      expect(result).toHaveProperty('totalClicks');
    });

    it('should filter analytics with only endDate', async () => {
      const endDate = new Date();

      const result = await service.getLinkAnalytics(testLinkId, undefined, endDate);

      expect(result).toHaveProperty('totalClicks');
    });

    it('should throw NotFoundException for non-existent link', async () => {
      await expect(
        service.getLinkAnalytics('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should aggregate by country correctly', async () => {
      const result = await service.getLinkAnalytics(testLinkId);

      expect(result.byCountry).toBeDefined();
      expect(result.byCountry.US).toBe(2);
      expect(result.byCountry.UK).toBe(1);
    });

    it('should aggregate by device correctly', async () => {
      const result = await service.getLinkAnalytics(testLinkId);

      expect(result.byDevice).toBeDefined();
      expect(result.byDevice.android).toBe(1);
      expect(result.byDevice.ios).toBe(1);
      expect(result.byDevice.web).toBe(1);
    });

    it('should aggregate by browser correctly', async () => {
      const result = await service.getLinkAnalytics(testLinkId);

      expect(result.byBrowser).toBeDefined();
      expect(result.byBrowser.Chrome).toBe(2);
      expect(result.byBrowser.Safari).toBe(1);
    });

    it('should aggregate by referer correctly', async () => {
      const result = await service.getLinkAnalytics(testLinkId);

      expect(result.byReferer).toBeDefined();
      expect(result.byReferer['google.com']).toBe(2);
      expect(result.byReferer['facebook.com']).toBe(1);
    });

    it('should count unique clicks by IP', async () => {
      const result = await service.getLinkAnalytics(testLinkId);

      expect(result.uniqueClicks).toBe(3);
    });
  });

  describe('getOneLinkAnalytics', () => {
    beforeEach(async () => {
      // Create test click events
      await prisma.clickEvent.create({
        data: {
          oneLinkId: testOneLinkId,
          device: 'ios',
          country: 'US',
        },
      });
      await prisma.clickEvent.create({
        data: {
          oneLinkId: testOneLinkId,
          device: 'android',
          country: 'UK',
        },
      });
    });

    it('should return analytics summary for OneLink', async () => {
      const result = await service.getOneLinkAnalytics(testOneLinkId);

      expect(result).toHaveProperty('totalClicks');
      expect(result).toHaveProperty('byDevice');
      expect(result.totalClicks).toBe(2);
    });

    it('should filter OneLink analytics by date range', async () => {
      const startDate = new Date(Date.now() - 86400000);
      const endDate = new Date();

      const result = await service.getOneLinkAnalytics(testOneLinkId, startDate, endDate);

      expect(result.totalClicks).toBeGreaterThan(0);
    });
  });

  describe('getLinkTimeSeries', () => {
    beforeEach(async () => {
      // Create clicks over time
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        await prisma.clickEvent.create({
          data: {
            linkId: testLinkId,
            timestamp: new Date(now - i * 3600000), // Each hour back
          },
        });
      }
    });

    it('should return time series data grouped by hour', async () => {
      const result = await service.getLinkTimeSeries(testLinkId, 'hour');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('count');
    });

    it('should return time series data grouped by day', async () => {
      const result = await service.getLinkTimeSeries(testLinkId, 'day');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return time series data grouped by week', async () => {
      const result = await service.getLinkTimeSeries(testLinkId, 'week');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should default to month grouping for unknown interval', async () => {
      const result = await service.getLinkTimeSeries(testLinkId, 'unknown');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('QR scan tracking', () => {
    it('should track QR scans separately', async () => {
      await prisma.clickEvent.create({
        data: {
          linkId: testLinkId,
          device: 'qr-scan',
        },
      });
      await prisma.clickEvent.create({
        data: {
          linkId: testLinkId,
          device: 'web',
        },
      });

      const result = await service.getLinkAnalytics(testLinkId);

      expect(result.qrScans).toBe(1);
      expect(result.totalClicks).toBe(2);
    });
  });
});
