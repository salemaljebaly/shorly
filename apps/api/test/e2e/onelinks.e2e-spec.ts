import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, RequestMethod } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestUtils } from '../test-utils';

describe('OneLinks (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    await TestUtils.setupDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'onelinkuser@example.com',
      password: 'SecurePass123!',
    });

    accessToken = response.body.accessToken;
  });

  beforeEach(async () => {
    const prisma = TestUtils.getPrisma();
    await prisma.oneLink.deleteMany({});
    await prisma.clickEvent.deleteMany({});

    // Clear Redis cache for onelinks
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL);
    const keys = await redis.keys('onelink:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.disconnect();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await TestUtils.teardownDatabase();
  });

  describe('/api/v1/onelinks (POST)', () => {
    it('should create a OneLink with device-based routing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          shortCode: 'myapp',
          title: 'My App',
          description: 'Download my app',
          targets: [
            {
              deviceType: 'android',
              url: 'https://play.google.com/store/apps/details?id=com.myapp',
            },
            {
              deviceType: 'ios',
              url: 'https://apps.apple.com/app/myapp/id123456',
            },
            {
              deviceType: 'web',
              url: 'https://myapp.com',
            },
          ],
          fallbackUrl: 'https://myapp.com',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.shortCode).toBe('myapp');
          expect(res.body.targets).toHaveLength(3);
          expect(res.body.fallbackUrl).toBe('https://myapp.com');
        });
    });

    it('should create OneLink with auto-generated short code', () => {
      return request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          targets: [{ deviceType: 'android', url: 'https://play.google.com' }],
          fallbackUrl: 'https://example.com',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.shortCode).toBeDefined();
          expect(res.body.shortCode.length).toBeGreaterThan(0);
        });
    });

    it('should reject duplicate short code', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          shortCode: 'duplicate',
          targets: [{ deviceType: 'web', url: 'https://example.com' }],
          fallbackUrl: 'https://example.com',
        });

      return request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          shortCode: 'duplicate',
          targets: [{ deviceType: 'web', url: 'https://other.com' }],
          fallbackUrl: 'https://other.com',
        })
        .expect(409);
    });

    it('should reject OneLink without targets', () => {
      return request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          targets: [],
          fallbackUrl: 'https://example.com',
        })
        .expect(400);
    });

    it('should reject invalid device type', () => {
      return request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          targets: [{ deviceType: 'invalid', url: 'https://example.com' }],
          fallbackUrl: 'https://example.com',
        })
        .expect(400);
    });

    it('should reject invalid target URL', () => {
      return request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          targets: [{ deviceType: 'android', url: 'not-a-url' }],
          fallbackUrl: 'https://example.com',
        })
        .expect(400);
    });

    it('should reject without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .send({
          targets: [{ deviceType: 'web', url: 'https://example.com' }],
          fallbackUrl: 'https://example.com',
        })
        .expect(401);
    });
  });

  describe('/api/v1/onelinks (GET)', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          shortCode: 'onelink1',
          targets: [{ deviceType: 'web', url: 'https://example1.com' }],
          fallbackUrl: 'https://example1.com',
        });

      await request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          shortCode: 'onelink2',
          targets: [{ deviceType: 'web', url: 'https://example2.com' }],
          fallbackUrl: 'https://example2.com',
        });
    });

    it('should get all user OneLinks', () => {
      return request(app.getHttpServer())
        .get('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.total).toBe(2);
          expect(res.body.page).toBe(1);
          expect(res.body.pageSize).toBeGreaterThanOrEqual(2);
          expect(res.body.data.length).toBe(2);
        });
    });

    it('should reject unauthenticated request', () => {
      return request(app.getHttpServer()).get('/api/v1/onelinks').expect(401);
    });
  });

  describe('/api/v1/onelinks/:id (GET)', () => {
    let oneLinkId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          shortCode: 'testonelink',
          title: 'Test OneLink',
          targets: [{ deviceType: 'web', url: 'https://example.com' }],
          fallbackUrl: 'https://example.com',
        });

      oneLinkId = response.body.id;
    });

    it('should get OneLink by ID', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/onelinks/${oneLinkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(oneLinkId);
          expect(res.body.shortCode).toBe('testonelink');
        });
    });

    it('should return 404 for non-existent OneLink', () => {
      return request(app.getHttpServer())
        .get('/api/v1/onelinks/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/onelinks/:id (PATCH)', () => {
    let oneLinkId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Original Title',
          targets: [{ deviceType: 'web', url: 'https://example.com' }],
          fallbackUrl: 'https://example.com',
        });

      oneLinkId = response.body.id;
    });

    it('should update OneLink title', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/onelinks/${oneLinkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Updated Title',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated Title');
        });
    });

    it('should update OneLink targets', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/onelinks/${oneLinkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          targets: [
            { deviceType: 'android', url: 'https://play.google.com' },
            { deviceType: 'ios', url: 'https://apps.apple.com' },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.targets).toHaveLength(2);
        });
    });

    it('should update fallback URL', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/onelinks/${oneLinkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fallbackUrl: 'https://newfallback.com',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.fallbackUrl).toBe('https://newfallback.com');
        });
    });

    it('should deactivate OneLink', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/onelinks/${oneLinkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          isActive: false,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.isActive).toBe(false);
        });
    });
  });

  describe('/api/v1/onelinks/:id (DELETE)', () => {
    let oneLinkId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          targets: [{ deviceType: 'web', url: 'https://example.com' }],
          fallbackUrl: 'https://example.com',
        });

      oneLinkId = response.body.id;
    });

    it('should delete OneLink', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/onelinks/${oneLinkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      return request(app.getHttpServer())
        .get(`/api/v1/onelinks/${oneLinkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/onelinks/code/:shortCode (GET)', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          shortCode: 'getbycode',
          targets: [{ deviceType: 'web', url: 'https://example.com' }],
          fallbackUrl: 'https://example.com',
        });
    });

    it('should get OneLink by short code', () => {
      return request(app.getHttpServer())
        .get('/api/v1/onelinks/code/getbycode')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.shortCode).toBe('getbycode');
        });
    });

    it('should return 404 for non-existent short code', () => {
      return request(app.getHttpServer())
        .get('/api/v1/onelinks/code/nonexistent')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Device Type Routing', () => {
    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/onelinks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          shortCode: 'deviceroute',
          targets: [
            { deviceType: 'android', url: 'https://android.app' },
            { deviceType: 'ios', url: 'https://ios.app' },
            { deviceType: 'web', url: 'https://web.app' },
          ],
          fallbackUrl: 'https://fallback.com',
        })
        .expect(201);

      if (response.status !== 201) {
        console.log('Failed to create deviceroute onelink:', response.body);
      }
    });

    it('should route Android user agent to Android URL', () => {
      return request(app.getHttpServer())
        .get('/api/v1/deviceroute')
        .set('User-Agent', 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36')
        .expect(302)
        .expect('Location', 'https://android.app');
    });

    it('should route iOS user agent to iOS URL', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/deviceroute')
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');

      if (response.status === 500) {
        console.log('iOS routing error:', response.body);
      }

      expect(response.status).toBe(302);
      expect(response.headers['location']).toBe('https://ios.app');
    });

    it('should route desktop user agent to Web URL', () => {
      return request(app.getHttpServer())
        .get('/api/v1/deviceroute')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
        .expect(302)
        .expect('Location', 'https://web.app');
    });

    it('should use fallback for unknown user agent', () => {
      return request(app.getHttpServer())
        .get('/api/v1/deviceroute')
        .set('User-Agent', 'UnknownBot/1.0')
        .expect(302)
        .expect('Location', 'https://fallback.com');
    });
  });
});
