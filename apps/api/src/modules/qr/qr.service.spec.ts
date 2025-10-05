import { Test, TestingModule } from '@nestjs/testing';
import { QrService } from './qr.service';
import QRCode from 'qrcode';

describe('QrService', () => {
  let service: QrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QrService],
    }).compile();

    service = module.get<QrService>(QrService);
  });

  describe('generateQrCode', () => {
    it('should generate PNG QR code by default', async () => {
      const url = 'https://test.example.com';

      const result = await service.generateQrCode(url);

      expect(result).toBeInstanceOf(Buffer);
      expect((result as Buffer).length).toBeGreaterThan(0);
    });

    it('should generate PNG QR code with custom size', async () => {
      const url = 'https://test.example.com';

      const result = await service.generateQrCode(url, { size: 500 });

      expect(result).toBeInstanceOf(Buffer);
      expect((result as Buffer).length).toBeGreaterThan(0);
    });

    it('should generate SVG QR code when format is svg', async () => {
      const url = 'https://test.example.com';

      const result = await service.generateQrCode(url, { format: 'svg' });

      expect(typeof result).toBe('string');
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
    });

    it('should generate QR code with custom colors', async () => {
      const url = 'https://test.example.com';

      const result = await service.generateQrCode(url, {
        color: {
          dark: '#FF0000',
          light: '#FFFFFF',
        },
      });

      expect(result).toBeInstanceOf(Buffer);
      expect((result as Buffer).length).toBeGreaterThan(0);
    });

    it('should generate QR code with custom margin', async () => {
      const url = 'https://test.example.com';

      const result = await service.generateQrCode(url, { margin: 2 });

      expect(result).toBeInstanceOf(Buffer);
      expect((result as Buffer).length).toBeGreaterThan(0);
    });

    it('should generate QR code with error correction level L', async () => {
      const url = 'https://test.example.com';

      const result = await service.generateQrCode(url, {
        errorCorrectionLevel: 'L',
      });

      expect(result).toBeInstanceOf(Buffer);
      expect((result as Buffer).length).toBeGreaterThan(0);
    });

    it('should generate QR code with error correction level M', async () => {
      const url = 'https://test.example.com';

      const result = await service.generateQrCode(url, {
        errorCorrectionLevel: 'M',
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate QR code with error correction level Q', async () => {
      const url = 'https://test.example.com';

      const result = await service.generateQrCode(url, {
        errorCorrectionLevel: 'Q',
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate QR code with error correction level H', async () => {
      const url = 'https://test.example.com';

      const result = await service.generateQrCode(url, {
        errorCorrectionLevel: 'H',
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate QR code with all options combined', async () => {
      const url = 'https://test.example.com';

      const result = await service.generateQrCode(url, {
        size: 400,
        margin: 3,
        format: 'png',
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      });

      expect(result).toBeInstanceOf(Buffer);
      expect((result as Buffer).length).toBeGreaterThan(0);
    });

    it('should generate different sized QR codes', async () => {
      const url = 'https://test.example.com';

      const small = await service.generateQrCode(url, { size: 200 });
      const large = await service.generateQrCode(url, { size: 600 });

      expect((small as Buffer).length).toBeLessThan((large as Buffer).length);
    });

    it('should handle long URLs', async () => {
      const longUrl = 'https://test.example.com/' + 'a'.repeat(500);

      const result = await service.generateQrCode(longUrl);

      expect(result).toBeInstanceOf(Buffer);
      expect((result as Buffer).length).toBeGreaterThan(0);
    });

    it('should generate QR code for URL with query parameters', async () => {
      const url = 'https://test.example.com?param1=value1&param2=value2';

      const result = await service.generateQrCode(url);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate QR code for URL with UTM parameters', async () => {
      const url = 'https://test.example.com?utm_source=qr&utm_medium=print&utm_campaign=test';

      const result = await service.generateQrCode(url);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should use default dark color when only light color provided', async () => {
      const url = 'https://test.example.com';

      const result = await service.generateQrCode(url, {
        color: {
          light: '#FFFFFF',
        },
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should use default light color when only dark color provided', async () => {
      const url = 'https://test.example.com';

      const result = await service.generateQrCode(url, {
        color: {
          dark: '#000000',
        },
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate SVG with custom options', async () => {
      const url = 'https://test.example.com';

      const result = await service.generateQrCode(url, {
        format: 'svg',
        size: 400,
        margin: 2,
        errorCorrectionLevel: 'H',
      });

      expect(typeof result).toBe('string');
      expect(result).toContain('<svg');
    });

    it('should handle URLs with special characters', async () => {
      const url = 'https://test.example.com/path?query=hello%20world&foo=bar#anchor';

      const result = await service.generateQrCode(url);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate consistent output for same input', async () => {
      const url = 'https://test.example.com/consistent';

      const result1 = await service.generateQrCode(url, { size: 300 });
      const result2 = await service.generateQrCode(url, { size: 300 });

      // QR codes for same URL and options should have similar size
      expect(Math.abs((result1 as Buffer).length - (result2 as Buffer).length)).toBeLessThan(100);
    });

    it('should handle PNG generation errors', async () => {
      const url = 'https://test.example.com';

      // Mock QRCode.toBuffer to trigger error callback
      const originalToBuffer = QRCode.toBuffer;
      QRCode.toBuffer = jest.fn((url: any, options: any, callback: any) => {
        callback(new Error('QR generation failed'), null);
      }) as any;

      await expect(service.generateQrCode(url, { format: 'png' })).rejects.toThrow(
        'QR generation failed',
      );

      // Restore original
      QRCode.toBuffer = originalToBuffer;
    });

    it('should handle SVG generation errors', async () => {
      const url = 'https://test.example.com';

      // Mock QRCode.toString to trigger error callback
      const originalToString = QRCode.toString;
      QRCode.toString = jest.fn((url: any, options: any, callback: any) => {
        callback(new Error('SVG generation failed'), null);
      }) as any;

      await expect(service.generateQrCode(url, { format: 'svg' })).rejects.toThrow(
        'SVG generation failed',
      );

      // Restore original
      QRCode.toString = originalToString;
    });
  });
});
