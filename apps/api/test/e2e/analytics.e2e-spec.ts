import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestUtils } from '../test-utils';

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let linkId: string;
  let oneLinkId: string;

  beforeAll(async () => {
    await TestUtils.setupDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const authResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'analyticsuser@example.com',
        password: 'SecurePass123!',
      });

    accessToken = authResponse.body.accessToken;

    // Create a link for testing
    const linkResponse = await request(app.getHttpServer())
      .post('/api/v1/links')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        destinationUrl: 'https://example.com',
        shortCode: 'analytics-link',
      });

    linkId = linkResponse.body.id;

    // Create a OneLink for testing
    const oneLinkResponse = await request(app.getHttpServer())
      .post('/api/v1/onelinks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        shortCode: 'analytics-onelink',
        targets: [{ deviceType: 'web', url: 'https://example.com' }],
        fallbackUrl: 'https://example.com',
      });

    oneLinkId = oneLinkResponse.body.id;
  });

  beforeEach(async () => {
    const prisma = TestUtils.getPrisma();
    await prisma.clickEvent.deleteMany({});
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await TestUtils.teardownDatabase();
  });

  describe('/api/v1/analytics/track (POST)', () => {
    it('should track link click event', () => {
      return request(app.getHttpServer())
        .post('/api/v1/analytics/track')
        .send({
          linkId,
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          referer: 'https://google.com',
          country: 'US',
          city: 'New York',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.linkId).toBe(linkId);
        });
    });

    it('should track OneLink click event', () => {
      return request(app.getHttpServer())
        .post('/api/v1/analytics/track')
        .send({
          oneLinkId,
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.oneLinkId).toBe(oneLinkId);
        });
    });

    it('should extract device info from user agent', () => {
      return request(app.getHttpServer())
        .post('/api/v1/analytics/track')
        .send({
          linkId,
          userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.device).toBe('android');
          expect(res.body.os).toBeDefined();
        });
    });

    it('should anonymize IP address', () => {
      return request(app.getHttpServer())
        .post('/api/v1/analytics/track')
        .send({
          linkId,
          ip: '192.168.1.100',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.ip).not.toBe('192.168.1.100');
          expect(res.body.ip).toMatch(/192\.168\.1\./);
        });
    });

    it('should accept optional fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/analytics/track')
        .send({
          linkId,
        })
        .expect(201);
    });

    it('should reject without linkId or oneLinkId', () => {
      return request(app.getHttpServer())
        .post('/api/v1/analytics/track')
        .send({
          ip: '192.168.1.1',
        })
        .expect(400);
    });
  });

  describe('/api/v1/analytics/links/:linkId (GET)', () => {
    beforeEach(async () => {
      // Create some test analytics data
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/analytics/track')
          .send({
            linkId,
            ip: `192.168.1.${i}`,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            country: i % 2 === 0 ? 'US' : 'UK',
          });
      }
    });

    it('should get analytics for link', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/analytics/links/${linkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalClicks');
          expect(res.body.totalClicks).toBe(5);
          expect(res.body).toHaveProperty('byCountry');
          expect(res.body).toHaveProperty('byDevice');
        });
    });

    it('should filter analytics by date range', () => {
      const startDate = new Date(Date.now() - 86400000).toISOString();
      const endDate = new Date().toISOString();

      return request(app.getHttpServer())
        .get(`/api/v1/analytics/links/${linkId}?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.totalClicks).toBeGreaterThan(0);
        });
    });

    it('should group analytics by country', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/analytics/links/${linkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.byCountry).toBeDefined();
          expect(Object.keys(res.body.byCountry).length).toBeGreaterThan(0);
        });
    });

    it('should return 404 for non-existent link', () => {
      return request(app.getHttpServer())
        .get('/api/v1/analytics/links/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should reject unauthenticated request', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/analytics/links/${linkId}`)
        .expect(401);
    });
  });

  describe('/api/v1/analytics/onelinks/:oneLinkId (GET)', () => {
    beforeEach(async () => {
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/analytics/track')
          .send({
            oneLinkId,
            userAgent: i === 0 ? 'Android' : i === 1 ? 'iPhone' : 'Windows',
          });
      }
    });

    it('should get analytics for OneLink', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/analytics/onelinks/${oneLinkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalClicks');
          expect(res.body.totalClicks).toBe(3);
          expect(res.body).toHaveProperty('byDevice');
        });
    });

    it('should group by device type', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/analytics/onelinks/${oneLinkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.byDevice).toBeDefined();
        });
    });
  });

  describe('Analytics Aggregation', () => {
    beforeEach(async () => {
      const testData = [
        { country: 'US', city: 'New York', device: 'android' },
        { country: 'US', city: 'Los Angeles', device: 'ios' },
        { country: 'UK', city: 'London', device: 'web' },
        { country: 'US', city: 'New York', device: 'android' },
      ];

      for (const data of testData) {
        await request(app.getHttpServer())
          .post('/api/v1/analytics/track')
          .send({
            linkId,
            country: data.country,
            city: data.city,
            device: data.device,
          });
      }
    });

    it('should aggregate clicks by country', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/analytics/links/${linkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.byCountry.US).toBe(3);
          expect(res.body.byCountry.UK).toBe(1);
        });
    });

    it('should aggregate clicks by device', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/analytics/links/${linkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.byDevice).toBeDefined();
          expect(res.body.byDevice.android).toBe(2);
          expect(res.body.byDevice.ios).toBe(1);
          expect(res.body.byDevice.web).toBe(1);
        });
    });

    it('should aggregate clicks by city', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/analytics/links/${linkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.byCity).toBeDefined();
          expect(res.body.byCity['New York']).toBe(2);
        });
    });
  });

  describe('Click Time Series', () => {
    it('should provide time series data', async () => {
      // Create clicks over time
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/analytics/track')
          .send({ linkId });
      }

      return request(app.getHttpServer())
        .get(`/api/v1/analytics/links/${linkId}/timeseries?interval=hour`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should support daily interval', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/analytics/links/${linkId}/timeseries?interval=day`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Referrer Tracking', () => {
    beforeEach(async () => {
      const referrers = [
        'https://google.com',
        'https://google.com',
        'https://facebook.com',
        'https://twitter.com',
      ];

      for (const referer of referrers) {
        await request(app.getHttpServer())
          .post('/api/v1/analytics/track')
          .send({ linkId, referer });
      }
    });

    it('should track and aggregate referrers', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/analytics/links/${linkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.byReferer).toBeDefined();
          expect(res.body.byReferer['google.com']).toBe(2);
        });
    });
  });
});
