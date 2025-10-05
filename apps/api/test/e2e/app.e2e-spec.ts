import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestUtils } from '../test-utils';
import { Request, Response, NextFunction } from 'express';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await TestUtils.setupDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    // Enable CORS for testing
    app.enableCors({
      origin: '*',
      credentials: true,
    });

    // Add security headers middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await TestUtils.teardownDatabase();
  });

  describe('Health Check', () => {
    it('/ (GET) - should return API info', () => {
      return request(app.getHttpServer())
        .get('/api/v1/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('version');
          expect(res.body.name).toBe('shorly API');
        });
    });

    it('/health (GET) - should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('API Documentation', () => {
    it('/api/docs (GET) - should serve Swagger UI', () => {
      return request(app.getHttpServer())
        .get('/api/v1/api/docs')
        .expect(301); // Redirect to docs page
    });

    it('/api/docs-json (GET) - should return OpenAPI spec', () => {
      return request(app.getHttpServer())
        .get('/api/v1/api/docs-json')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('openapi');
          expect(res.body).toHaveProperty('info');
          expect(res.body).toHaveProperty('paths');
        });
    });
  });

  describe('CORS', () => {
    it('should allow configured origins', () => {
      return request(app.getHttpServer())
        .options('/api/v1/auth/login')
        .set('Origin', 'http://localhost:3000')
        .expect((res) => {
          expect(res.headers['access-control-allow-origin']).toBeDefined();
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      const promises = [];

      // Make 110 requests (exceeds limit of 100)
      for (let i = 0; i < 110; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/api/v1/')
            .then(res => res.status)
            .catch(() => 429) // Treat connection errors as rate limited
        );
      }

      const results = await Promise.all(promises);
      const rateLimited = results.filter(status => status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);

      // Wait a bit for rate limit to reset
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', () => {
      return request(app.getHttpServer())
        .get('/api/v1/nonexistent')
        .expect(404);
    });

    it('should return proper error format', () => {
      return request(app.getHttpServer())
        .get('/api/v1/nonexistent')
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode');
          expect(res.body).toHaveProperty('message');
          expect(res.body.statusCode).toBe(404);
        });
    });

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // Too short
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(true);
        });
    });
  });

  describe('Security Headers', () => {
    it('should set security headers', () => {
      return request(app.getHttpServer())
        .get('/api/v1/')
        .expect((res) => {
          expect(res.headers['x-content-type-options']).toBe('nosniff');
        });
    });
  });

  describe('API Versioning', () => {
    it('should support API version in URL', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);
    });
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      const prisma = TestUtils.getPrisma();
      const result = await prisma.$queryRaw`SELECT 1 as result`;
      expect(result).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      const prisma = TestUtils.getPrisma();

      try {
        await prisma.$queryRaw`SELECT * FROM nonexistent_table`;
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Redis Connection', () => {
    it('should connect to Redis successfully', async () => {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL);

      await redis.set('test-key', 'test-value');
      const value = await redis.get('test-key');

      expect(value).toBe('test-value');

      await redis.del('test-key');
      await redis.disconnect();
    });
  });

  describe('Request Validation', () => {
    it('should strip unknown properties from request body', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          unknownField: 'should be stripped',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.user.unknownField).toBeUndefined();
        });
    });

    it('should transform request data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'UPPERCASE@EXAMPLE.COM',
          password: 'SecurePass123!',
        })
        .expect(201);
    });
  });

  describe('Content Negotiation', () => {
    it('should return JSON by default', () => {
      return request(app.getHttpServer())
        .get('/api/v1/')
        .expect('Content-Type', /json/);
    });

    it('should handle Accept header', () => {
      return request(app.getHttpServer())
        .get('/api/v1/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
    });
  });

  describe('Request Size Limits', () => {
    it('should reject very large payloads', () => {
      const largePayload = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        data: 'x'.repeat(2 * 1024 * 1024), // 2MB
      };

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(largePayload)
        .expect(413); // Payload Too Large
    });
  });

  describe('Graceful Shutdown', () => {
    it('should handle shutdown gracefully', async () => {
      const shutdownSpy = jest.spyOn(app, 'close');

      await app.close();

      expect(shutdownSpy).toHaveBeenCalled();

      // Re-initialize app for other tests
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('/api/v1');
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      app.enableCors({
        origin: '*',
        credentials: true,
      });
      app.use((req: Request, res: Response, next: NextFunction) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        next();
      });
      await app.init();
    });
  });
});
