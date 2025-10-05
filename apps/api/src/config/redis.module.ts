import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
          throw new Error('REDIS_URL is not defined');
        }

        const client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          lazyConnect: false,
        });

        client.on('connect', () => {
          if (process.env.NODE_ENV !== 'test') {
            console.log('✅ Redis connected');
          }
        });

        client.on('error', (err) => {
          if (process.env.NODE_ENV !== 'test') {
            console.error('❌ Redis error:', err);
          }
        });

        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
