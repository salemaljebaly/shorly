import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  BadRequestException,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { Response } from 'express';
import { QrService } from './qr.service';
import { LinksService } from '../links/links.service';
import { OneLinksService } from '../onelinks/onelinks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsArray, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

class BatchQrDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  shortCodes: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  format?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(1000)
  size?: number;
}

const QR_CACHE = new Map<string, { data: Buffer; contentType: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

@ApiTags('QR Codes')
@Controller('qr')
export class QrController {
  constructor(
    private readonly qrService: QrService,
    private readonly linksService: LinksService,
    private readonly oneLinksService: OneLinksService,
  ) {}

  @Get('link/:shortCode')
  @ApiOperation({ summary: 'Generate QR code for a link' })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @ApiQuery({ name: 'format', required: false, enum: ['png', 'svg'] })
  @ApiQuery({ name: 'download', required: false, type: Boolean })
  @ApiQuery({ name: 'dark', required: false, type: String })
  @ApiQuery({ name: 'light', required: false, type: String })
  @ApiQuery({ name: 'errorCorrectionLevel', required: false, enum: ['L', 'M', 'Q', 'H'] })
  @ApiQuery({ name: 'logo', required: false, type: Boolean })
  @ApiQuery({ name: 'utm_source', required: false, type: String })
  @ApiQuery({ name: 'utm_medium', required: false, type: String })
  async generateLinkQr(
    @Param('shortCode') shortCode: string,
    @Query('size') size?: number,
    @Query('format') format?: 'png' | 'svg',
    @Query('download') download?: boolean,
    @Query('dark') dark?: string,
    @Query('light') light?: string,
    @Query('errorCorrectionLevel') errorCorrectionLevel?: string,
    @Query('utm_source') utmSource?: string,
    @Query('utm_medium') utmMedium?: string,
    @Query('track') track?: string,
    @Res() res?: Response
  ): Promise<void> {
    // Verify link exists
    const link = await this.linksService.findByShortCode(shortCode);
    if (!link) {
      throw new NotFoundException('Link not found');
    }

    return this.generateQrCode({
      shortCode,
      size,
      format,
      download,
      dark,
      light,
      errorCorrectionLevel,
      extraQuery: {
        utm_source: utmSource,
        utm_medium: utmMedium,
        ...(track && (track === 'true' || track === '1') ? { qr: '1' } : {}),
      },
      res,
    });
  }

  @Get('onelink/:shortCode')
  @ApiOperation({ summary: 'Generate QR code for a OneLink' })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @ApiQuery({ name: 'format', required: false, enum: ['png', 'svg'] })
  @ApiQuery({ name: 'download', required: false, type: Boolean })
  async generateOneLinkQr(
    @Param('shortCode') shortCode: string,
    @Query('size') size?: number,
    @Query('format') format?: 'png' | 'svg',
    @Query('download') download?: boolean,
    @Res() res?: Response
  ): Promise<void> {
    // Verify onelink exists
    const oneLink = await this.oneLinksService.findByShortCode(shortCode);
    if (!oneLink) {
      throw new NotFoundException('OneLink not found');
    }

    return this.generateQrCode({ shortCode, size, format, download, res });
  }

  @Post('batch')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate multiple QR codes' })
  async generateBatchQr(@Body() dto: BatchQrDto) {
    if (dto.shortCodes.length > 100) {
      throw new BadRequestException('Maximum 100 QR codes per request');
    }

    const results = [];

    for (const shortCode of dto.shortCodes) {
      const destinationUrl = this.buildDestinationUrl(shortCode, {});
      const qrCode = await this.qrService.generateQrCode(destinationUrl, {
        size: dto.size,
        format: (dto.format as 'png' | 'svg') || 'png',
      });

      results.push({
        shortCode,
        qrCode: (typeof qrCode === 'string' ? Buffer.from(qrCode) : qrCode).toString('base64'),
      });
    }

    return results;
  }

  private async generateQrCode(options: {
    shortCode: string;
    size?: number;
    format?: 'png' | 'svg';
    download?: boolean;
    dark?: string;
    light?: string;
    errorCorrectionLevel?: string;
    extraQuery?: Record<string, string | undefined>;
    res?: Response;
  }): Promise<void> {
    const { shortCode, size, format, download, dark, light, errorCorrectionLevel, extraQuery, res } = options;

    if (!res) {
      throw new Error('Response object is required');
    }

    // Validate size
    if (size && (size < 100 || size > 2000)) {
      throw new BadRequestException('Size must be between 100 and 2000');
    }

    // Validate format
    if (format && !['png', 'svg'].includes(format)) {
      throw new BadRequestException('Format must be png or svg');
    }

    // Validate error correction level
    if (errorCorrectionLevel && !['L', 'M', 'Q', 'H'].includes(errorCorrectionLevel)) {
      throw new BadRequestException('Error correction level must be L, M, Q, or H');
    }

    // Validate color format (hex)
    if (dark && !/^[0-9A-Fa-f]{6}$/.test(dark)) {
      throw new BadRequestException('Dark color must be a valid hex color');
    }
    if (light && !/^[0-9A-Fa-f]{6}$/.test(light)) {
      throw new BadRequestException('Light color must be a valid hex color');
    }

    const destinationUrl = this.buildDestinationUrl(shortCode, extraQuery || {});

    const cacheKey = JSON.stringify({ shortCode, size, format, dark, light, errorCorrectionLevel, destinationUrl });
    const cached = QR_CACHE.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      this.sendQrResponse(res, cached.data, cached.contentType, download, format, shortCode);
      return;
    }

    if (cached && cached.expiresAt <= now) {
      QR_CACHE.delete(cacheKey);
    }

    const qrCode = await this.qrService.generateQrCode(destinationUrl, {
      size: size ? parseInt(size as any) : undefined,
      format: format || 'png',
      color: {
        dark: dark ? `#${dark}` : undefined,
        light: light ? `#${light}` : undefined,
      },
      errorCorrectionLevel: errorCorrectionLevel as any,
    });

    const buffer = typeof qrCode === 'string' ? Buffer.from(qrCode) : qrCode;
    const contentType = format === 'svg' ? 'image/svg+xml' : 'image/png';

    QR_CACHE.set(cacheKey, {
      data: buffer,
      contentType,
      expiresAt: now + CACHE_TTL_MS,
    });

    this.sendQrResponse(res, buffer, contentType, download, format, shortCode);
  }

  private buildDestinationUrl(shortCode: string, params: Record<string, string | undefined>) {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const baseUrl = base.endsWith('/') ? base : `${base}/`;
    const url = new URL(shortCode, baseUrl);

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  }

  private sendQrResponse(
    res: Response,
    data: Buffer,
    contentType: string,
    download?: boolean,
    format?: string,
    shortCode?: string
  ) {
    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="${shortCode}-qr.${format || 'png'}"`);
    }

    res.setHeader('Content-Type', contentType);
    res.send(data);
  }
}
