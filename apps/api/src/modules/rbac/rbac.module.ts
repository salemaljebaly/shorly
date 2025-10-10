import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { AdminLoggingService } from './admin-logging.service';
import { RolesGuard } from './guards';
import { AdminLoggingInterceptor } from './interceptors';
import { RedisModule } from '../../config/redis.module';

@Module({
  imports: [RedisModule],
  providers: [RbacService, AdminLoggingService, RolesGuard, AdminLoggingInterceptor],
  exports: [RbacService, AdminLoggingService, RolesGuard, AdminLoggingInterceptor],
})
export class RbacModule {}