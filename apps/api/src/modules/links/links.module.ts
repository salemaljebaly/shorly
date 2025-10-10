import { Module } from '@nestjs/common';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  controllers: [LinksController],
  providers: [LinksService],
  imports: [SharedModule],
  exports: [LinksService],
})
export class LinksModule {}
