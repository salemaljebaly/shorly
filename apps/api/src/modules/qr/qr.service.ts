import { Injectable } from '@nestjs/common';
import QRCode from 'qrcode';
import { APP_CONSTANTS } from '@shorly/config';

@Injectable()
export class QrService {
  async generateQrCode(
    url: string,
    options?: {
      size?: number;
      margin?: number;
      format?: 'png' | 'svg';
      color?: {
        dark?: string;
        light?: string;
      };
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    }
  ): Promise<Buffer | string> {
    const size = options?.size || APP_CONSTANTS.DEFAULT_QR_SIZE;
    const margin = options?.margin || APP_CONSTANTS.DEFAULT_QR_MARGIN;
    const format = options?.format || 'png';
    const errorCorrectionLevel = options?.errorCorrectionLevel || 'M';

    const qrOptions: any = {
      width: size,
      margin,
      errorCorrectionLevel,
    };

    if (options?.color) {
      qrOptions.color = {
        dark: options.color.dark || '#000000',
        light: options.color.light || '#FFFFFF',
      };
    }

    if (format === 'svg') {
      return new Promise<string>((resolve, reject) => {
        QRCode.toString(url, {
          ...qrOptions,
          type: 'svg',
        }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    }

    return new Promise<Buffer>((resolve, reject) => {
      QRCode.toBuffer(url, qrOptions, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
}
