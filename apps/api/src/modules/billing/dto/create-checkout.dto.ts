import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SubscriptionPlan {
  STARTER = 'STARTER',
  PRO = 'PRO',
}

export class CreateCheckoutDto {
  @ApiProperty({
    description: 'Subscription plan',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.PRO,
  })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'Success URL (overrides default)',
    example: 'https://yourapp.com/billing/success',
  })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({
    description: 'Cancel URL (overrides default)',
    example: 'https://yourapp.com/billing',
  })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Customer email',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Customer name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateManualSubscriptionDto {
  @ApiProperty({
    description: 'Customer email or ID',
    example: 'user@example.com',
  })
  @IsString()
  customer: string;

  @ApiProperty({
    description: 'Subscription plan',
    enum: SubscriptionPlan,
    example: SubscriptionPlan.PRO,
  })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiPropertyOptional({
    description: 'Trial period in days',
    example: 30,
  })
  @IsOptional()
  trialPeriodDays?: number;

  @ApiPropertyOptional({
    description: 'Custom metadata for the subscription',
    example: { source: 'manual_admin', discount: 'special_deal' },
  })
  @IsOptional()
  metadata?: Record<string, string>;
}