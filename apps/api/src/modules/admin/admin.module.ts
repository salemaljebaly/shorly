import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { RbacModule } from '../rbac/rbac.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    RbacModule,
    UsersModule,
    JwtModule.register({}), // Import JwtModule to provide JwtService
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}