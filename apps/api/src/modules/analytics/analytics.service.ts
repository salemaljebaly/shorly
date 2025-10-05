import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { parseUserAgent, parseReferrer, extractIpAddress, anonymizeIp, groupByDate, countUnique } from '@shorly/utils';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaClient) {}

  async trackClick(params: {
    linkId?: string;
    oneLinkId?: string;
    userAgent?: string;
    referer?: string;
    country?: string;
    city?: string;
    device?: string;
    headers: Record<string, string | undefined>;
  }) {
    const { linkId, oneLinkId, userAgent, referer, country, city, device, headers } = params;

    if (!linkId && !oneLinkId) {
      throw new BadRequestException('Either linkId or oneLinkId is required');
    }

    const ip = extractIpAddress(headers);
    const parsed = userAgent ? parseUserAgent(userAgent) : null;
    const deviceValue = device || parsed?.deviceType || parsed?.device;

    return await this.prisma.clickEvent.create({
      data: {
        linkId,
        oneLinkId,
        ip: ip ? anonymizeIp(ip) : undefined,
        userAgent,
        referer: parseReferrer(referer),
        browser: parsed?.browser,
        os: parsed?.os,
        device: deviceValue,
        country: country,
        city: city,
      },
    });
  }

  async getLinkAnalytics(linkIdentifier: string, startDate?: Date, endDate?: Date) {
    const link = await this.resolveLink(linkIdentifier);
    const where: any = { linkId: link.id };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const clicks = await this.prisma.clickEvent.findMany({ where });

    return this.buildAnalyticsSummary(clicks);
  }

  async getOneLinkAnalytics(oneLinkId: string, startDate?: Date, endDate?: Date) {
    const where: any = { oneLinkId };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const clicks = await this.prisma.clickEvent.findMany({ where });

    return this.buildAnalyticsSummary(clicks);
  }

  async getLinkTimeSeries(linkIdentifier: string, interval: string) {
    const link = await this.resolveLink(linkIdentifier);
    const clicks = await this.prisma.clickEvent.findMany({
      where: { linkId: link.id },
      orderBy: { timestamp: 'asc' },
    });

    return this.groupByInterval(clicks, interval);
  }

  private buildAnalyticsSummary(clicks: any[]) {
    const byCountry: Record<string, number> = {};
    const byDevice: Record<string, number> = {};
    const byBrowser: Record<string, number> = {};
    const byReferer: Record<string, number> = {};
    const byCity: Record<string, number> = {};

    let qrScans = 0;

    for (const click of clicks) {
      if (click.country) {
        byCountry[click.country] = (byCountry[click.country] || 0) + 1;
      }
      if (click.city) {
        byCity[click.city] = (byCity[click.city] || 0) + 1;
      }
      if (click.device) {
        byDevice[click.device] = (byDevice[click.device] || 0) + 1;
        if (click.device === 'qr-scan') {
          qrScans += 1;
        }
      }
      if (click.browser) {
        byBrowser[click.browser] = (byBrowser[click.browser] || 0) + 1;
      }
      if (click.referer) {
        byReferer[click.referer] = (byReferer[click.referer] || 0) + 1;
      }
    }

    const timestamps = clicks.map((c) => c.timestamp);
    const ips = clicks.map((c) => c.ip).filter(Boolean);

    return {
      totalClicks: clicks.length,
      uniqueClicks: countUnique(ips),
      byCountry,
      byCity,
      byDevice,
      byBrowser,
      byReferer,
      clicksByDate: groupByDate(timestamps),
      qrScans,
    };
  }

  private async resolveLink(identifier: string) {
    const link = await this.prisma.link.findFirst({
      where: {
        OR: [{ id: identifier }, { shortCode: identifier }],
      },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    return link;
  }

  private groupByInterval(clicks: any[], interval: string) {
    const grouped: any[] = [];

    for (const click of clicks) {
      const date = new Date(click.timestamp);
      let key: string;

      if (interval === 'hour') {
        key = date.toISOString().slice(0, 13) + ':00:00';
      } else if (interval === 'day') {
        key = date.toISOString().slice(0, 10);
      } else if (interval === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else {
        key = date.toISOString().slice(0, 7);
      }

      const existing = grouped.find((g) => g.date === key);
      if (existing) {
        existing.count++;
      } else {
        grouped.push({ date: key, count: 1 });
      }
    }

    return grouped;
  }
}
