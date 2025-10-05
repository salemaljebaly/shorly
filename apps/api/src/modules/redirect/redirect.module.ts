import { Module } from '@nestjs/common';
import { RedirectController } from './redirect.controller';
import { LinksModule } from '../links/links.module';
import { OneLinksModule } from '../onelinks/onelinks.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [LinksModule, OneLinksModule, AnalyticsModule],
  controllers: [RedirectController],
})
export class RedirectModule {}
