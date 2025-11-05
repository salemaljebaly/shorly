import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Req,
  Headers,
  BadRequestException,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiHeader, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PublicGuard } from '../auth/guards/public.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles, RequirePermissions } from '../rbac/decorators';
import { Role, Permission } from '../rbac/enums';
import { BillingService } from './billing.service';
import { CreateCheckoutDto, CreateManualSubscriptionDto, SubscriptionPlan } from './dto/create-checkout.dto';
import { SubscriptionPlan as PrismaSubscriptionPlan, SubscriptionStatus as PrismaSubscriptionStatus } from '@prisma/client';

@ApiTags('Billing - Subscriptions & Payments')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(PublicGuard, RolesGuard)
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billingService: BillingService) {}

  /**
   * Stripe webhook endpoint (public)
   */
  @Post('webhooks/stripe')
  @Public()
  @ApiExcludeEndpoint()
  @ApiHeader({ name: 'stripe-signature', required: true, description: 'Stripe webhook signature' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    try {
      return await this.billingService.handleStripeWebhook(req.rawBody, signature);
    } catch (error) {
      this.logger.error('Stripe webhook processing failed:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Stripe webhook processing failed');
    }
  }

  /**
   * Create a checkout session for subscription
   */
  @Post('checkout')
  @ApiOperation({ summary: 'Create Stripe checkout session for subscription' })
  @ApiResponse({ status: 201, description: 'Checkout session created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createCheckoutSession(
    @Body() createCheckoutDto: CreateCheckoutDto,
    @Request() req: any,
  ) {
    try {
      const session = await this.billingService.createCheckoutSession(
        req.user.id,
        createCheckoutDto,
      );

      return {
        success: true,
        sessionId: session.sessionId,
        url: session.url,
      };
    } catch (error) {
      this.logger.error('Failed to create checkout session:', error);
      throw error;
    }
  }

  /**
   * Create customer portal session
   */
  @Post('customer-portal')
  @ApiOperation({ summary: 'Create Stripe Customer Portal session' })
  @ApiResponse({ status: 201, description: 'Customer portal session created successfully' })
  @ApiResponse({ status: 400, description: 'No active subscription found' })
  async createCustomerPortalSession(@Request() req: any) {
    try {
      const session = await this.billingService.createCustomerPortalSession(req.user.id);

      return {
        success: true,
        url: session.url,
      };
    } catch (error) {
      this.logger.error('Failed to create customer portal session:', error);
      throw error;
    }
  }

  /**
   * Get current user's subscription
   */
  @Get('subscription')
  @ApiOperation({ summary: 'Get current user subscription details' })
  @ApiResponse({ status: 200, description: 'Subscription details retrieved successfully' })
  async getUserSubscription(@Request() req: any) {
    try {
      const subscription = await this.billingService.getActiveSubscription(req.user.id);

      return {
        success: true,
        subscription,
      };
    } catch (error) {
      this.logger.error('Failed to get user subscription:', error);
      throw error;
    }
  }

  /**
   * Get all subscriptions (Admin only)
   */
  @Get('admin/subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions with pagination (Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'PAUSED'], description: 'Filter by status' })
  @ApiQuery({ name: 'plan', required: false, enum: ['FREE', 'STARTER', 'PRO'], description: 'Filter by plan' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by user email or name' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'currentPeriodStart', 'plan', 'status'], description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc', 'ASC', 'DESC'], description: 'Sort direction' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.BILLING_READ)
  async getAllSubscriptions(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    try {
      const allowedStatuses = new Set(Object.values(PrismaSubscriptionStatus));
      const allowedPlans = new Set(Object.values(PrismaSubscriptionPlan));
      const allowedSortFields = new Set(['createdAt', 'currentPeriodStart', 'plan', 'status']);
      const allowedSortOrders = new Set(['asc', 'desc', 'ASC', 'DESC']);

      const normalizedStatus = status && allowedStatuses.has(status as PrismaSubscriptionStatus)
        ? (status as PrismaSubscriptionStatus)
        : undefined;
      const normalizedPlan = plan && allowedPlans.has(plan as PrismaSubscriptionPlan)
        ? (plan as PrismaSubscriptionPlan)
        : undefined;
      const normalizedSortBy = sortBy && allowedSortFields.has(sortBy)
        ? (sortBy as 'createdAt' | 'currentPeriodStart' | 'plan' | 'status')
        : undefined;
      const normalizedSortOrder = sortOrder && allowedSortOrders.has(sortOrder)
        ? (sortOrder as 'asc' | 'desc' | 'ASC' | 'DESC')
        : undefined;

      const result = await this.billingService.getAllSubscriptions({
        page: page ? parseInt(page, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        status: normalizedStatus,
        plan: normalizedPlan,
        search,
        sortBy: normalizedSortBy,
        sortOrder: normalizedSortOrder,
      });

      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      this.logger.error('Failed to get all subscriptions:', error);
      throw error;
    }
  }

  /**
   * Create manual subscription (Admin only)
   */
  @Post('admin/subscriptions/manual')
  @ApiOperation({ summary: 'Create manual subscription for custom deals (Admin only)' })
  @ApiResponse({ status: 201, description: 'Manual subscription created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.BILLING_WRITE)
  async createManualSubscription(
    @Body() createManualDto: CreateManualSubscriptionDto,
    @Request() req: any,
  ) {
    try {
      const result = await this.billingService.createManualSubscription(
        req.user.id,
        createManualDto,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to create manual subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription (Admin only)
   */
  @Delete('admin/subscriptions/:id')
  @ApiOperation({ summary: 'Cancel subscription (Admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiQuery({ name: 'immediate', required: false, type: Boolean, description: 'Cancel immediately or at period end' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.BILLING_WRITE)
  async cancelSubscription(
    @Request() req: any,
    @Param('id') id: string,
    @Query('immediate') immediate?: string,
  ) {
    try {
      const result = await this.billingService.cancelSubscription(
        id,
        immediate === 'true',
        req.user.id,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription metrics (Admin only)
   */
  @Get('admin/metrics')
  @ApiOperation({ summary: 'Get subscription metrics (MRR, ARR, active subscriptions) - Admin only' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.BILLING_READ)
  async getSubscriptionMetrics() {
    try {
      const metrics = await this.billingService.getSubscriptionMetrics();

      return {
        success: true,
        metrics,
      };
    } catch (error) {
      this.logger.error('Failed to get subscription metrics:', error);
      throw error;
    }
  }

  
  /**
   * Get available subscription plans
   */
  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async getPlans() {
    try {
      const plans = [
        {
          id: SubscriptionPlan.STARTER,
          name: 'Starter',
          price: 9.99,
          interval: 'month',
          features: [
            '50 links per month',
            '15 OneLinks',
            '10,000 clicks',
            'Basic analytics',
            'Email support',
          ],
        },
        {
          id: SubscriptionPlan.PRO,
          name: 'Pro',
          price: 29.99,
          interval: 'month',
          features: [
            '200 links per month',
            '50 OneLinks',
            '50,000 clicks',
            'Advanced analytics',
            'Custom domains',
            'Priority support',
            'API access',
          ],
        },
        ];

      return {
        success: true,
        plans,
      };
    } catch (error) {
      this.logger.error('Failed to get plans:', error);
      throw error;
    }
  }

  /**
   * Seed subscriptions (Admin only, for testing)
   */
  @Post('admin/seed-subscriptions')
  @ApiOperation({ summary: 'Seed subscription data for testing (Admin only)' })
  @ApiResponse({ status: 201, description: 'Subscriptions seeded successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @RequirePermissions(Permission.BILLING_WRITE)
  async seedSubscriptions() {
    try {
      const result = await this.billingService.seedSubscriptions();

      return {
        success: true,
        message: `Successfully seeded ${result.seeded} subscriptions`,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to seed subscriptions:', error);
      throw error;
    }
  }
}
