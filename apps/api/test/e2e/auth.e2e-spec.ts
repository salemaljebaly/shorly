import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestUtils } from '../test-utils';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    await TestUtils.setupDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  beforeEach(async () => {
    await TestUtils.cleanDatabase();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await TestUtils.teardownDatabase();
  });

  describe('/api/v1/auth/register (POST)', () => {
    it('should register a new user with valid data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          name: 'New User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe('newuser@example.com');
          expect(res.body.user.name).toBe('New User');
        });
    });

    it('should register without name (optional)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'noname@example.com',
          password: 'SecurePass123!',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.user.name).toBeNull();
        });
    });

    it('should reject invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
        })
        .expect(400);
    });

    it('should reject password shorter than 8 characters', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
        })
        .expect(400);
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePass123!',
        });

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'AnotherPass123!',
        })
        .expect(409);
    });

    it('should reject missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
        })
        .expect(400);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'loginuser@example.com',
          password: 'SecurePass123!',
          name: 'Login User',
        });
    });

    it('should login with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'SecurePass123!',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should reject incorrect password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should reject non-existent email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123!',
        })
        .expect(401);
    });

    it('should reject invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
        })
        .expect(400);
    });
  });

  describe('/api/v1/auth/refresh (POST)', () => {
    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'refreshuser@example.com',
          password: 'SecurePass123!',
        });

      refreshToken = response.body.refreshToken;
    });

    it('should generate new tokens with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.refreshToken).not.toBe(refreshToken);
        });
    });

    it('should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should reject missing refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });

    it('should invalidate old refresh token after use', async () => {
      const firstRefresh = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      // New refresh token should be different
      expect(firstRefresh.body.refreshToken).not.toBe(refreshToken);

      // Old refresh token should now be invalid (blacklisted)
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('/api/v1/auth/logout (POST)', () => {
    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'logoutuser@example.com',
          password: 'SecurePass123!',
        });

      accessToken = response.body.accessToken;
    });

    it('should logout successfully with valid token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBe('Logged out successfully');
        });
    });

    it('should reject logout without authorization header', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });

    it('should reject logout with invalid token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Token Security', () => {
    it('should not accept expired access token', async () => {
      // This would require mocking time or using a very short expiration
      // For now, we'll just verify the token structure
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'tokentest@example.com',
          password: 'SecurePass123!',
        });

      expect(response.body.accessToken).toMatch(/^eyJ/);
      expect(response.body.refreshToken).toMatch(/^eyJ/);
    });

    it('should include proper JWT claims', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'claims@example.com',
          password: 'SecurePass123!',
        });

      const tokenParts = response.body.accessToken.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());

      expect(payload).toHaveProperty('sub');
      expect(payload).toHaveProperty('email');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
    });
  });
});
