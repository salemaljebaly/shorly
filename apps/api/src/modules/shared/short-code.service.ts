import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import {
  generateShortCode,
  isValidShortCode,
  sanitizeShortCode,
  isReservedShortCode,
} from '@shorly/utils';
import { APP_CONSTANTS } from '@shorly/config';

@Injectable()
export class ShortCodeService {
  constructor(
    private prisma: PrismaClient,
    @Inject('REDIS_CLIENT') private redis: Redis
  ) {}

  /**
   * Validates and sanitizes a custom short code
   */
  validateAndSanitizeShortCode(customCode?: string): string | null {
    if (!customCode) {
      return null;
    }

    // Validate original input first
    if (!isValidShortCode(customCode)) {
      throw new Error('Invalid short code format');
    }

    const sanitizedCode = sanitizeShortCode(customCode);

    if (isReservedShortCode(sanitizedCode)) {
      throw new Error('Short code is reserved');
    }

    return sanitizedCode;
  }

  /**
   * Generates a unique short code that doesn't conflict with existing links or OneLinks
   */
  async generateUniqueShortCode(): Promise<string> {
    for (let i = 0; i < APP_CONSTANTS.MAX_SHORT_CODE_ATTEMPTS; i++) {
      const code = generateShortCode();
      const existing = await this.findByShortCode(code);
      if (!existing) {
        return code;
      }
    }

    throw new Error('Failed to generate unique short code');
  }

  /**
   * Checks if a short code exists in either links or OneLinks
   */
  async findByShortCode(shortCode: string) {
    // Check for regular Link first
    const link = await this.prisma.link.findUnique({
      where: { shortCode },
    });

    if (link) {
      return { type: 'link', data: link };
    }

    // Check for OneLink
    const oneLink = await this.prisma.oneLink.findUnique({
      where: { shortCode },
    });

    if (oneLink) {
      return { type: 'onelink', data: oneLink };
    }

    return null;
  }

  /**
   * Caches a link in Redis
   */
  async cacheLink(link: any): Promise<void> {
    const ttl = parseInt(process.env.REDIS_TTL || '3600');
    await this.redis.setex(`link:${link.shortCode}`, ttl, JSON.stringify(link));
  }

  /**
   * Caches a OneLink in Redis
   */
  async cacheOneLink(oneLink: any): Promise<void> {
    const ttl = parseInt(process.env.REDIS_TTL || '3600');
    await this.redis.setex(`onelink:${oneLink.shortCode}`, ttl, JSON.stringify(oneLink));
  }

  /**
   * Removes a link from cache
   */
  async removeCachedLink(shortCode: string): Promise<void> {
    await this.redis.del(`link:${shortCode}`);
  }

  /**
   * Removes a OneLink from cache
   */
  async removeCachedOneLink(shortCode: string): Promise<void> {
    await this.redis.del(`onelink:${shortCode}`);
  }
}
