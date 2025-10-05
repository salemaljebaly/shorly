import { Controller, Get } from '@nestjs/common';
import { getHealthInfo } from '../../app-info';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return getHealthInfo();
  }
}
