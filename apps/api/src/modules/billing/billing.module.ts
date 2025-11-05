import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    RbacModule,
  ],
  controllers: [BillingController],
  providers: [
    StripeService,
    BillingService,
  ],
  exports: [
    StripeService,
    BillingService,
  ],
})
export class BillingModule {}