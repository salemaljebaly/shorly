import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { BillingModule } from './modules/billing/billing.module';
import { MaintenanceGuard } from './modules/admin/guards/maintenance.guard';
import { DynamicRateLimitGuard } from './modules/admin/guards/dynamic-rate-limit.guard';

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
    BillingModule,
  ],
  controllers: [AppController],
  providers: [
    AppHttpSetupService,
    { provide: APP_GUARD, useClass: MaintenanceGuard },
    { provide: APP_GUARD, useClass: DynamicRateLimitGuard },
  ],
})
export class AppModule {}
