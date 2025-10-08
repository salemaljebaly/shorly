import { Module } from '@nestjs/common';
import { ShortCodeService } from './short-code.service';

@Module({
  providers: [ShortCodeService],
  exports: [ShortCodeService],
})
export class SharedModule {}
