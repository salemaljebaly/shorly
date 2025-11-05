import { Controller, Get, Redirect } from '@nestjs/common';
import { getApiInfo, getHealthInfo, getOpenApiDocument } from './app-info';
import { SkipMaintenance } from './modules/admin/guards/maintenance.guard';

@Controller()
export class AppController {
  @Get()
  root() {
    return getApiInfo();
  }

  @Get('health')
  @SkipMaintenance()
  health() {
    // Root-level health check for load balancers (excluded from /api/v1 prefix)
    return getHealthInfo();
  }

  @Get('api/docs')
  @Redirect('/api/v1/docs', 301)
  redirectDocs() {
    return;
  }

  @Get('api/docs-json')
  docsJson() {
    return getOpenApiDocument();
  }
}
