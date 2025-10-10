import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { detectDeviceType, isBot } from '@shorly/utils';
import { DeviceType } from '@shorly/types';
import { CreateOneLinkDto } from './dto/create-onelink.dto';
import { UpdateOneLinkDto } from './dto/update-onelink.dto';
import { ShortCodeService } from '../shared/short-code.service';

@Injectable()
export class OneLinksService {
  constructor(
    private prisma: PrismaClient,
    @Inject('REDIS_CLIENT') private redis: Redis,
    private shortCodeService: ShortCodeService
  ) {}

  async create(userId: string, dto: CreateOneLinkDto) {
    // Validate targets
    if (!dto.targets || dto.targets.length === 0) {
      throw new BadRequestException('At least one target is required');
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
        shortCode = await this.shortCodeService.generateUniqueShortCode();
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }

    const oneLink = await this.prisma.oneLink.create({
      data: {
        shortCode,
        title: dto.title,
        description: dto.description,
        targets: dto.targets as any,
        fallbackUrl: dto.fallbackUrl,
        userId,
      },
    });

    // Cache the onelink
    await this.shortCodeService.cacheOneLink(oneLink);

    return oneLink;
  }

  async findAll(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [oneLinks, total] = await Promise.all([
      this.prisma.oneLink.findMany({
        where: { userId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.oneLink.count({ where: { userId } }),
    ]);

    return {
      data: oneLinks,
      total,
      page,
      pageSize,
      hasNext: skip + pageSize < total,
    };
  }

  async findOne(userId: string, id: string) {
    const oneLink = await this.prisma.oneLink.findFirst({
      where: { id, userId },
    });

    if (!oneLink) {
      throw new NotFoundException('OneLink not found');
    }

    return oneLink;
  }

  async findByShortCode(shortCode: string) {
    // Try cache first
    const cached = await this.redis.get(`onelink:${shortCode}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const oneLink = await this.prisma.oneLink.findUnique({
      where: { shortCode },
    });

    if (oneLink) {
      await this.shortCodeService.cacheOneLink(oneLink);
    }

    return oneLink;
  }

  async update(userId: string, id: string, dto: UpdateOneLinkDto) {
    await this.findOne(userId, id);

    if (dto.targets && dto.targets.length === 0) {
      throw new BadRequestException('At least one target is required');
    }

    const updateData: any = { ...dto };
    if (dto.targets) {
      updateData.targets = dto.targets as any;
    }

    const oneLink = await this.prisma.oneLink.update({
      where: { id },
      data: updateData,
    });

    // Update cache
    await this.shortCodeService.cacheOneLink(oneLink);

    return oneLink;
  }

  async remove(userId: string, id: string) {
    const oneLink = await this.findOne(userId, id);

    await this.prisma.oneLink.delete({
      where: { id },
    });

    // Remove from cache
    await this.redis.del(`onelink:${oneLink.shortCode}`);

    return { message: 'OneLink deleted successfully' };
  }

  /**
   * Resolve the correct URL based on device type
   */
  resolveUrl(oneLink: any, userAgent: string): string {
    if (isBot(userAgent)) {
      return oneLink.fallbackUrl;
    }

    const deviceType = detectDeviceType(userAgent);
    const targets = oneLink.targets as any[];

    // Find matching target for device type
    const matchingTargets = targets
      .filter((t) => t.deviceType === deviceType)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (matchingTargets.length > 0) {
      return matchingTargets[0].url;
    }

    // Fallback to web if device is mobile but no specific target
    if (deviceType !== DeviceType.WEB) {
      const webTarget = targets.find((t) => t.deviceType === DeviceType.WEB);
      if (webTarget) {
        return webTarget.url;
      }
    }

    return oneLink.fallbackUrl;
  }
}
