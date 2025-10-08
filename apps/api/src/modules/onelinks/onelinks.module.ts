import { Module } from '@nestjs/common';
import { OneLinksController } from './onelinks.controller';
import { OneLinksService } from './onelinks.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  controllers: [OneLinksController],
  providers: [OneLinksService],
  imports: [SharedModule],
  exports: [OneLinksService],
})
export class OneLinksModule {}
