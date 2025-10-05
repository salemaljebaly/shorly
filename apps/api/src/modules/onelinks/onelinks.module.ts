import { Module } from '@nestjs/common';
import { OneLinksController } from './onelinks.controller';
import { OneLinksService } from './onelinks.service';

@Module({
  controllers: [OneLinksController],
  providers: [OneLinksService],
  exports: [OneLinksService],
})
export class OneLinksModule {}
