import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Global()
@Module({
  providers: [
    {
      provide: PrismaClient,
      useFactory: () => {
        return new PrismaClient({
          log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
      },
    },
  ],
  exports: [PrismaClient],
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
  constructor(private prisma: PrismaClient) {}

  async onModuleInit() {
    await this.prisma.$connect();
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.log('✅ Database connected');
    }
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
