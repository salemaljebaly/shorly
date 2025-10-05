import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { generateShortCode, isValidShortCode, sanitizeShortCode, isReservedShortCode, isValidUrl, isSafeUrl } from '@shorly/utils';
import { APP_CONSTANTS } from '@shorly/config';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

@Injectable()
export class LinksService {
  constructor(
    private prisma: PrismaClient,
    @Inject('REDIS_CLIENT') private redis: Redis
  ) {}

  async create(userId: string, dto: CreateLinkDto) {
    // Validate destination URL
    if (!isValidUrl(dto.destinationUrl) || !isSafeUrl(dto.destinationUrl)) {
      throw new BadRequestException('Invalid or unsafe destination URL');
    }

    // Handle short code
    let shortCode: string;
    if (dto.shortCode) {
      // Validate original input first
      if (!isValidShortCode(dto.shortCode)) {
        throw new BadRequestException('Invalid short code format');
      }

      shortCode = sanitizeShortCode(dto.shortCode);

      if (isReservedShortCode(shortCode)) {
        throw new BadRequestException('Short code is reserved');
      }

      // Check if already exists
      const existing = await this.findByShortCode(shortCode);
      if (existing) {
        throw new ConflictException('Short code already exists');
      }
    } else {
      // Generate unique short code
      shortCode = await this.generateUniqueShortCode();
    }

    const link = await this.prisma.link.create({
      data: {
        shortCode,
        destinationUrl: dto.destinationUrl,
        title: dto.title,
        description: dto.description,
        tags: dto.tags || [],
        expiresAt: dto.expiresAt,
        userId,
      },
    });

    // Cache the link
    await this.cacheLink(link);

    return link;
  }

  async findAll(userId: string, page = 1, pageSize = 20, tag?: string) {
    const skip = (page - 1) * pageSize;

    const where: any = { userId };
    if (tag) {
      where.tags = { has: tag };
    }

    const [links, total] = await Promise.all([
      this.prisma.link.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.link.count({ where }),
    ]);

    return {
      data: links,
      total,
      page,
      pageSize,
      hasNext: skip + pageSize < total,
    };
  }

  async findOne(userId: string, id: string) {
    const link = await this.prisma.link.findFirst({
      where: { id, userId },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    return link;
  }

  async findByShortCode(shortCode: string) {
    // Try cache first
    const cached = await this.redis.get(`link:${shortCode}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const link = await this.prisma.link.findUnique({
      where: { shortCode },
    });

    if (link) {
      await this.cacheLink(link);
    }

    return link;
  }

  async update(userId: string, id: string, dto: UpdateLinkDto) {
    await this.findOne(userId, id);

    if (dto.destinationUrl) {
      if (!isValidUrl(dto.destinationUrl) || !isSafeUrl(dto.destinationUrl)) {
        throw new BadRequestException('Invalid or unsafe destination URL');
      }
    }

    const link = await this.prisma.link.update({
      where: { id },
      data: dto,
    });

    // Update cache
    await this.cacheLink(link);

    return link;
  }

  async remove(userId: string, id: string) {
    const link = await this.findOne(userId, id);

    await this.prisma.link.delete({
      where: { id },
    });

    // Remove from cache
    await this.redis.del(`link:${link.shortCode}`);

    return { message: 'Link deleted successfully' };
  }

  private async generateUniqueShortCode(): Promise<string> {
    for (let i = 0; i < APP_CONSTANTS.MAX_SHORT_CODE_ATTEMPTS; i++) {
      const code = generateShortCode();
      const existing = await this.findByShortCode(code);
      if (!existing) {
        return code;
      }
    }

    throw new Error('Failed to generate unique short code');
  }

  private async cacheLink(link: any): Promise<void> {
    const ttl = parseInt(process.env.REDIS_TTL || '3600');
    await this.redis.setex(`link:${link.shortCode}`, ttl, JSON.stringify(link));
  }
}
