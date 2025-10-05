import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

/**
 * Create isolated test context for integration tests
 * Each test gets unique user to avoid conflicts in parallel execution
 */
export class IntegrationTestContext {
  prisma: PrismaClient;
  redis: Redis;
  testUserId?: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Create a unique test user for this test context
   */
  async createTestUser(email?: string): Promise<string> {
    const uniqueEmail = email || `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

    const user = await this.prisma.user.create({
      data: {
        email: uniqueEmail,
        password: '$2b$10$YourHashedPasswordHere', // bcrypt hash of 'password123'
        name: 'Test User',
      },
    });

    this.testUserId = user.id;
    return user.id;
  }

  /**
   * Clean up all test data created in this context
   */
  async cleanup(): Promise<void> {
    if (this.testUserId) {
      // Delete user's data (cascades will handle related records)
      await this.prisma.user.delete({
        where: { id: this.testUserId },
      }).catch(() => {
        // Ignore errors if already deleted
      });
    }

    await this.prisma.$disconnect();

    // Only quit Redis if it's still connected
    if (this.redis.status === 'ready') {
      await this.redis.quit();
    }
  }

  /**
   * Clear all Redis cache
   */
  async clearRedisCache(): Promise<void> {
    // Only clear if Redis is connected
    if (this.redis.status === 'ready') {
      const keys = await this.redis.keys('*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}

/**
 * Create test context and ensure cleanup
 */
export async function setupIntegrationTest(): Promise<IntegrationTestContext> {
  const context = new IntegrationTestContext();
  return context;
}
