import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RedisModule } from '../../config/redis.module';

@Module({
  imports: [
    RedisModule,
    MulterModule.register({
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
      },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
