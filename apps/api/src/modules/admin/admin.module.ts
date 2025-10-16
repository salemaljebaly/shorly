import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminMetricsController } from './admin-metrics.controller';
import { AdminLogsController } from './admin-logs.controller';
import { RbacModule } from '../rbac/rbac.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    RbacModule,
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
    }),
  ],
  controllers: [AdminController, AdminMetricsController, AdminLogsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}