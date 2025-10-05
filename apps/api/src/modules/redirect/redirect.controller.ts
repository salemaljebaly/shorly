import { Controller, Get, Param, Req, Res, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { LinksService } from '../links/links.service';
import { OneLinksService } from '../onelinks/onelinks.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Controller()
export class RedirectController {
  constructor(
    private readonly linksService: LinksService,
    private readonly oneLinksService: OneLinksService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get(':shortCode')
  async redirect(
    @Param('shortCode') shortCode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const isQrScan = typeof req.query.qr !== 'undefined';

    // Try to find a link first
    const link = await this.linksService.findByShortCode(shortCode);

    if (link) {
      // Check if link is active and not expired
      if (!link.isActive) {
        throw new NotFoundException('Link is inactive');
      }

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        throw new NotFoundException('Link has expired');
      }

      // Track the click
      await this.analyticsService.trackClick({
        linkId: link.id,
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'],
        headers: req.headers as Record<string, string | undefined>,
        device: isQrScan ? 'qr-scan' : undefined,
      });

      return res.redirect(302, link.destinationUrl);
    }

    // Try to find a onelink
    const oneLink = await this.oneLinksService.findByShortCode(shortCode);

    if (oneLink) {
      // Check if onelink is active
      if (!oneLink.isActive) {
        throw new NotFoundException('OneLink is inactive');
      }

      // Resolve the appropriate URL based on device type
      const userAgent = req.headers['user-agent'] || '';
      const destinationUrl = this.oneLinksService.resolveUrl(oneLink, userAgent);

      // Track the click
      await this.analyticsService.trackClick({
        oneLinkId: oneLink.id,
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'],
        headers: req.headers as Record<string, string | undefined>,
        device: isQrScan ? 'qr-scan' : undefined,
      });

      return res.redirect(302, destinationUrl);
    }

    throw new NotFoundException('Short code not found');
  }
}
