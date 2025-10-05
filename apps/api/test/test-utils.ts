import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

export class TestUtils {
  private static prisma: PrismaClient;
  private static redis: Redis;

  static async setupDatabase() {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL || 'postgresql://shorly:shorly_password@localhost:5432/shorly_test',
          },
        },
        log: [], // Disable logging in tests
      });

      await this.prisma.$connect();
    }

    if (!this.redis) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: parseInt(process.env.REDIS_DB || '1'), // Use DB 1 for tests
      });
    }

    return this.prisma;
  }

  static async cleanDatabase() {
    if (!this.prisma) return;

    try {
      // Delete in correct order due to foreign key constraints
      await this.prisma.clickEvent.deleteMany({});
      await this.prisma.link.deleteMany({});
      await this.prisma.oneLink.deleteMany({});
      await this.prisma.user.deleteMany({});

      // Clear Redis cache
      if (this.redis) {
        await this.redis.flushdb();
      }
    } catch (error) {
      console.error('Error cleaning database:', error);
      throw error;
    }
  }

  static async teardownDatabase() {
    if (!this.prisma) return;

    try {
      await this.cleanDatabase();
      await this.prisma.$disconnect();
      this.prisma = null as any;

      if (this.redis) {
        await this.redis.quit();
        this.redis = null as any;
      }
    } catch (error) {
      console.error('Error tearing down database:', error);
    }
  }

  static getPrisma() {
    return this.prisma;
  }
}
