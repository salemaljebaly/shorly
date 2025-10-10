import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { isValidUrl, isSafeUrl } from '@shorly/utils';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { ShortCodeService } from '../shared/short-code.service';

@Injectable()
export class LinksService {
  constructor(
    private prisma: PrismaClient,
    @Inject('REDIS_CLIENT') private redis: Redis,
    private shortCodeService: ShortCodeService
  ) {}

  async create(userId: string, dto: CreateLinkDto) {
    // Validate destination URL
    if (!isValidUrl(dto.destinationUrl) || !isSafeUrl(dto.destinationUrl)) {
      throw new BadRequestException('Invalid or unsafe destination URL');
    }

    // Handle short code
    let shortCode: string;
    try {
      const validatedCode = this.shortCodeService.validateAndSanitizeShortCode(dto.shortCode);
      if (validatedCode) {
        shortCode = validatedCode;
        // Check if already exists
        const existing = await this.shortCodeService.findByShortCode(shortCode);
        if (existing) {
          throw new ConflictException('Short code already exists');
        }
      } else {
        // Generate unique short code
        shortCode = await this.shortCodeService.generateUniqueShortCode();
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }

    const link = await this.prisma.link.create({
      data: {
        shortCode,
        destinationUrl: dto.destinationUrl,
        title: dto.title,
        description: dto.description,
        tags: dto.tags || [],
        isActive: dto.isActive ?? true, // Default to true if not provided
        expiresAt: dto.expiresAt,
        userId,
      },
    });

    // Cache the link
    await this.shortCodeService.cacheLink(link);

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
        include: {
          _count: {
            select: { clicks: true },
          },
        },
      }),
      this.prisma.link.count({ where }),
    ]);

    // Transform to include clicks count
    const linksWithClicks = links.map((link) => ({
      ...link,
      clicks: link._count.clicks,
      _count: undefined,
    }));

    return {
      data: linksWithClicks,
      total,
      page,
      pageSize,
      hasNext: skip + pageSize < total,
    };
  }

  async findOne(userId: string, id: string) {
    const link = await this.prisma.link.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { clicks: true },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    return {
      ...link,
      clicks: link._count.clicks,
      _count: undefined,
    };
  }

  async findByShortCode(shortCode: string) {
    // Try cache first
    const cached = await this.redis.get(`link:${shortCode}`);
    if (cached) {
      const parsedLink = JSON.parse(cached);
      // Get fresh click count
      const clickCount = await this.prisma.clickEvent.count({
        where: { linkId: parsedLink.id },
      });
      return { ...parsedLink, clicks: clickCount };
    }

    // Fetch from database
    const link = await this.prisma.link.findUnique({
      where: { shortCode },
      include: {
        _count: {
          select: { clicks: true },
        },
      },
    });

    if (link) {
      const linkWithClicks = {
        ...link,
        clicks: link._count.clicks,
        _count: undefined,
      };
      await this.shortCodeService.cacheLink(linkWithClicks);
      return linkWithClicks;
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
    await this.shortCodeService.cacheLink(link);

    return link;
  }

  async remove(userId: string, id: string) {
    const link = await this.findOne(userId, id);

    await this.prisma.link.delete({
      where: { id },
    });

    // Remove from cache
    await this.shortCodeService.removeCachedLink(link.shortCode);

    return { message: 'Link deleted successfully' };
  }
}
