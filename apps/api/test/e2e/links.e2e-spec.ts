import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestUtils } from '../test-utils';

describe('Links (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    await TestUtils.setupDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Register and login to get access token
    const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'linkuser@example.com',
      password: 'SecurePass123!',
    });

    accessToken = response.body.accessToken;
    userId = response.body.user.id;
  });

  beforeEach(async () => {
    await TestUtils.cleanDatabase();

    // Re-create user
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'linkuser@example.com',
        password: 'SecurePass123!',
      })
      .then((res) => {
        accessToken = res.body.accessToken;
        userId = res.body.user.id;
      });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await TestUtils.teardownDatabase();
  });

  describe('/api/v1/links (POST)', () => {
    it('should create a link with auto-generated short code', () => {
      return request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example.com',
          title: 'Example Link',
          description: 'Test description',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('shortCode');
          expect(res.body.destinationUrl).toBe('https://example.com');
          expect(res.body.title).toBe('Example Link');
          expect(res.body.isActive).toBe(true);
        });
    });

    it('should create a link with custom short code', () => {
      return request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example.com',
          shortCode: 'mycustom',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.shortCode).toBe('mycustom');
        });
    });

    it('should reject duplicate short code', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example.com',
          shortCode: 'duplicate',
        });

      return request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example2.com',
          shortCode: 'duplicate',
        })
        .expect(409);
    });

    it('should reject invalid destination URL', () => {
      return request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'not-a-url',
        })
        .expect(400);
    });

    it('should reject unsafe URL (localhost)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'http://localhost:3000',
        })
        .expect(400);
    });

    it('should reject reserved short codes', () => {
      return request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example.com',
          shortCode: 'api',
        })
        .expect(400);
    });

    it('should create link with tags', () => {
      return request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example.com',
          tags: ['marketing', 'campaign'],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.tags).toEqual(['marketing', 'campaign']);
        });
    });

    it('should create link with expiration date', () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString();

      return request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example.com',
          expiresAt,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.expiresAt).toBeDefined();
        });
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/links')
        .send({
          destinationUrl: 'https://example.com',
        })
        .expect(401);
    });
  });

  describe('/api/v1/links (GET)', () => {
    beforeEach(async () => {
      // Create test links
      await request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ destinationUrl: 'https://example1.com', title: 'Link 1' });

      await request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ destinationUrl: 'https://example2.com', title: 'Link 2' });
    });

    it('should get all user links', () => {
      return request(app.getHttpServer())
        .get('/api/v1/links')
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

    it('should filter links by tag', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://tagged.com',
          tags: ['special'],
        });

      return request(app.getHttpServer())
        .get('/api/v1/links?tag=special')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBeGreaterThan(0);
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].tags).toContain('special');
        });
    });

    it('should reject unauthenticated request', () => {
      return request(app.getHttpServer()).get('/api/v1/links').expect(401);
    });
  });

  describe('/api/v1/links/:id (GET)', () => {
    let linkId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example.com',
          title: 'Single Link',
        });

      linkId = response.body.id;
    });

    it('should get link by ID', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/links/${linkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(linkId);
          expect(res.body.title).toBe('Single Link');
        });
    });

    it('should return 404 for non-existent link', () => {
      return request(app.getHttpServer())
        .get('/api/v1/links/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should not allow access to other user links', async () => {
      // Create another user
      const otherUserResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'otheruser@example.com',
          password: 'SecurePass123!',
        });

      return request(app.getHttpServer())
        .get(`/api/v1/links/${linkId}`)
        .set('Authorization', `Bearer ${otherUserResponse.body.accessToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/links/:id (PATCH)', () => {
    let linkId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example.com',
          title: 'Original Title',
        })
        .expect(201);

      linkId = response.body.id;
      expect(linkId).toBeDefined();
    });

    it('should update link title', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/links/${linkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Updated Title',
        });

      if (response.status !== 200) {
        console.log('PATCH failed:', {
          status: response.status,
          body: response.body,
          linkId,
          accessToken: accessToken?.substring(0, 20) + '...',
        });
      }

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
    });

    it('should update link destination URL', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/links/${linkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://newdestination.com',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.destinationUrl).toBe('https://newdestination.com');
        });
    });

    it('should deactivate link', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/links/${linkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          isActive: false,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.isActive).toBe(false);
        });
    });

    it('should update tags', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/links/${linkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          tags: ['updated', 'tags'],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.tags).toEqual(['updated', 'tags']);
        });
    });

    it('should return 404 for non-existent link', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/links/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'New Title' })
        .expect(404);
    });
  });

  describe('/api/v1/links/:id (DELETE)', () => {
    let linkId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example.com',
        });

      linkId = response.body.id;
    });

    it('should delete link', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/links/${linkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      return request(app.getHttpServer())
        .get(`/api/v1/links/${linkId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent link', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/links/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/links/code/:shortCode (GET)', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example.com',
          shortCode: 'testcode',
        });
    });

    it('should get link by short code', () => {
      return request(app.getHttpServer())
        .get('/api/v1/links/code/testcode')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.shortCode).toBe('testcode');
        });
    });

    it('should return 404 for non-existent short code', () => {
      return request(app.getHttpServer())
        .get('/api/v1/links/code/nonexistent')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Short Code Validation', () => {
    it('should sanitize short code to lowercase', () => {
      return request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example.com',
          shortCode: 'MixedCase',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.shortCode).toBe('mixedcase');
        });
    });

    it('should reject short code with invalid characters', () => {
      return request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example.com',
          shortCode: 'invalid@code',
        })
        .expect(400);
    });

    it('should reject very short codes', () => {
      return request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          destinationUrl: 'https://example.com',
          shortCode: 'ab',
        })
        .expect(400);
    });
  });
});
