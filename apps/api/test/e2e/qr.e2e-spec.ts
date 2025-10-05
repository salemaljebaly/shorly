import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestUtils } from '../test-utils';

describe('QR Code (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let linkShortCode: string;
  let oneLinkShortCode: string;

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
        email: 'qruser@example.com',
        password: 'SecurePass123!',
      });

    accessToken = authResponse.body.accessToken;

    // Create a link
    const linkResponse = await request(app.getHttpServer())
      .post('/api/v1/links')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        destinationUrl: 'https://example.com',
        shortCode: 'qr-link',
      });

    linkShortCode = linkResponse.body.shortCode;

    // Create a OneLink
    const oneLinkResponse = await request(app.getHttpServer())
      .post('/api/v1/onelinks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        shortCode: 'qr-onelink',
        targets: [{ deviceType: 'web', url: 'https://example.com' }],
        fallbackUrl: 'https://example.com',
      });

    oneLinkShortCode = oneLinkResponse.body.shortCode;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await TestUtils.teardownDatabase();
  });

  describe('/api/v1/qr/link/:shortCode (GET)', () => {
    it('should generate QR code for link', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}`)
        .expect(200)
        .expect('Content-Type', /image\/png/)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Buffer);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should support custom size', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?size=500`)
        .expect(200)
        .expect('Content-Type', /image\/png/);
    });

    it('should support different formats', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?format=svg`)
        .expect(200)
        .expect('Content-Type', /image\/svg/);
    });

    it('should support custom colors', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?dark=000000&light=ffffff`)
        .expect(200)
        .expect('Content-Type', /image\/png/);
    });

    it('should support error correction levels', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?errorCorrectionLevel=H`)
        .expect(200);
    });

    it('should return 404 for non-existent link', () => {
      return request(app.getHttpServer())
        .get('/api/v1/qr/link/nonexistent')
        .expect(404);
    });

    it('should cache QR codes', async () => {
      const first = await request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}`)
        .expect(200);

      const second = await request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}`)
        .expect(200);

      // Both responses should be identical (served from cache)
      expect(first.body).toEqual(second.body);
      expect(first.text).toEqual(second.text);
    });
  });

  describe('/api/v1/qr/onelink/:shortCode (GET)', () => {
    it('should generate QR code for OneLink', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/onelink/${oneLinkShortCode}`)
        .expect(200)
        .expect('Content-Type', /image\/png/)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Buffer);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should support custom size for OneLink', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/onelink/${oneLinkShortCode}?size=400`)
        .expect(200)
        .expect('Content-Type', /image\/png/);
    });

    it('should return 404 for non-existent OneLink', () => {
      return request(app.getHttpServer())
        .get('/api/v1/qr/onelink/nonexistent')
        .expect(404);
    });
  });

  describe('QR Code Validation', () => {
    it('should reject invalid size (too small)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?size=50`)
        .expect(400);
    });

    it('should reject invalid size (too large)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?size=5000`)
        .expect(400);
    });

    it('should reject invalid format', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?format=invalid`)
        .expect(400);
    });

    it('should reject invalid error correction level', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?errorCorrectionLevel=X`)
        .expect(400);
    });

    it('should reject invalid color format', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?dark=invalidcolor`)
        .expect(400);
    });
  });

  describe('QR Code Download', () => {
    it('should provide correct headers for download', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?download=true`)
        .expect(200)
        .expect('Content-Disposition', /attachment/)
        .expect('Content-Type', /image\/png/);
    });

    it('should use short code in filename', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?download=true`)
        .expect(200)
        .expect('Content-Disposition', new RegExp(linkShortCode));
    });
  });

  describe('QR Code with Logo', () => {
    it('should support adding logo to QR code', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?logo=true`)
        .expect(200)
        .expect('Content-Type', /image\/png/);
    });
  });

  describe('Batch QR Generation', () => {
    it('should generate multiple QR codes', () => {
      return request(app.getHttpServer())
        .post('/api/v1/qr/batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          shortCodes: [linkShortCode, oneLinkShortCode],
          format: 'png',
          size: 300,
        })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);
        });
    });

    it('should reject batch generation without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/qr/batch')
        .send({
          shortCodes: [linkShortCode],
        })
        .expect(401);
    });

    it('should limit batch size', () => {
      const largeBatch = Array(101).fill(linkShortCode);

      return request(app.getHttpServer())
        .post('/api/v1/qr/batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          shortCodes: largeBatch,
        })
        .expect(400);
    });
  });

  describe('Dynamic QR Codes', () => {
    it('should generate QR with UTM parameters', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?utm_source=qr&utm_medium=print`)
        .expect(200)
        .expect('Content-Type', /image\/png/);
    });

    it('should include tracking in QR URL', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}?track=true`)
        .expect(200);
    });
  });

  describe('QR Code Analytics', () => {
    it('should track QR code scans separately', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/qr/link/${linkShortCode}`)
        .expect(200);

      // Click the link with QR tracking
      await request(app.getHttpServer())
        .get(`/api/v1/${linkShortCode}?qr=1`)
        .expect(302);

      return request(app.getHttpServer())
        .get(`/api/v1/analytics/links/${linkShortCode}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.qrScans).toBeGreaterThan(0);
        });
    });
  });
});
