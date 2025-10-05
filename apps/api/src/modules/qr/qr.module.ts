import { Module } from '@nestjs/common';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';
import { LinksModule } from '../links/links.module';
import { OneLinksModule } from '../onelinks/onelinks.module';

@Module({
  imports: [LinksModule, OneLinksModule],
  controllers: [QrController],
  providers: [QrService],
})
export class QrModule {}
