import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './config/prisma.module';
import { RedisModule } from './config/redis.module';
import { LinksModule } from './modules/links/links.module';
import { OneLinksModule } from './modules/onelinks/onelinks.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { QrModule } from './modules/qr/qr.module';
import { AuthModule } from './modules/auth/auth.module';
import { RedirectModule } from './modules/redirect/redirect.module';
import { HealthModule } from './modules/health/health.module';
import { AppController } from './app.controller';
import { AppHttpSetupService } from './app-http-setup.service';
import { UsersModule } from './modules/users/users.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    HealthModule,
    LinksModule,
    OneLinksModule,
    AnalyticsModule,
    QrModule,
    RedirectModule,
    UsersModule,
    RbacModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppHttpSetupService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
