import { Controller, Get } from '@nestjs/common';
import { getHealthInfo } from '../../app-info';
import { SkipMaintenance } from '../admin/guards/maintenance.guard';

@Controller('health')
@SkipMaintenance()
export class HealthController {
  @Get()
  health() {
    return getHealthInfo();
  }
}
