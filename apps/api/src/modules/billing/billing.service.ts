import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, PrismaClient, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import * as bcrypt from 'bcrypt';
import { StripeService } from './stripe.service';
import { CreateCheckoutDto, CreateManualSubscriptionDto, SubscriptionPlan as StripePlan } from './dto/create-checkout.dto';

export interface SubscriptionMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  canceledSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  monthlyRecurringRevenue: number;
  annualRunRate: number;
  subscriptionsByPlan: Record<string, number>;
  subscriptionsByStatus: Record<string, number>;
  newSubscriptionsThisMonth: number;
  churnedSubscriptionsThisMonth: number;
}

export interface SubscriptionDetails {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  provider?: string | null;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEnd?: Date | null;
  canceledAt?: Date | null;
  cancelAtPeriodEnd: boolean;
  metadata?: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaClient,
    private stripeService: StripeService,
  ) {}

  private readonly planPricing: Record<SubscriptionPlan, number> = {
    [SubscriptionPlan.FREE]: 0,
    [SubscriptionPlan.STARTER]: 9.99,
    [SubscriptionPlan.PRO]: 29.99,
  };

  private get priceIdMap(): Record<StripePlan, string | undefined> {
    return {
      [StripePlan.STARTER]: process.env.STRIPE_STARTER_PRICE_ID,
      [StripePlan.PRO]: process.env.STRIPE_PRO_PRICE_ID,
    };
  }

  /**
   * Get price ID for a plan
   */
  private getPriceId(plan: StripePlan): string {
    const priceId = this.priceIdMap[plan];
    if (!priceId) {
      throw new BadRequestException(`No price ID configured for plan: ${plan}`);
    }

    return priceId;
  }

  private mapPriceIdToSubscriptionPlan(priceId?: string | null): SubscriptionPlan {
    if (!priceId) {
      return SubscriptionPlan.FREE;
    }

    const normalizedMap = Object.entries(this.priceIdMap).reduce<Record<string, SubscriptionPlan>>(
      (acc, [plan, id]) => {
        if (id) {
          acc[id] = SubscriptionPlan[plan as keyof typeof SubscriptionPlan];
        }
        return acc;
      },
      {},
    );

    return normalizedMap[priceId] ?? SubscriptionPlan.FREE;
  }

  private toDateFromUnix(unix?: number | null): Date | null {
    if (!unix) {
      return null;
    }
    return new Date(unix * 1000);
  }

  private extractCustomerId(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
  ): string | undefined {
    if (!customer) {
      return undefined;
    }

    if (typeof customer === 'string') {
      return customer;
    }

    return customer.id;
  }

  private getSubscriptionPeriod(
    subscription: Stripe.Subscription,
    key: 'start' | 'end',
  ): number | null | undefined {
    const legacyValue = (subscription as any)?.[`current_period_${key}`];
    if (typeof legacyValue === 'number') {
      return legacyValue;
    }

    const period = (subscription as any)?.current_period;
    if (period && typeof period === 'object') {
      const value = period[key];
      if (typeof value === 'number') {
        return value;
      }
    }

    return null;
  }

  private getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
    const raw =
      (invoice as any)?.subscription ??
      invoice.parent?.subscription_details?.subscription ??
      (invoice as any)?.subscription_details?.subscription;

    if (!raw) {
      return undefined;
    }

    return typeof raw === 'string' ? raw : raw.id;
  }

  /**
   * Create a Stripe checkout session for subscription
   */
  async createCheckoutSession(userId: string, dto: CreateCheckoutDto): Promise<{ sessionId: string; url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingActiveSubscription = await this.getActiveSubscription(userId);
    if (existingActiveSubscription) {
      throw new BadRequestException('You already have an active subscription');
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const fallbackToManualSubscription = async () => {
      await this.createManualSubscription('system', {
        customer: user.email,
        plan: dto.plan,
        metadata: { source: 'stripe_fallback' },
      });

      return {
        sessionId: 'MANUAL_SUBSCRIPTION',
        url: `${appUrl}/billing?manual=success`,
      };
    };

    if (!this.stripeService.isConfigured) {
      this.logger.warn('Stripe not configured. Falling back to manual subscription flow.');
      return fallbackToManualSubscription();
    }

    const priceId = this.getPriceId(dto.plan);

    try {
      const session = await this.stripeService.createCheckoutSession({
        userId,
        userEmail: user.email,
        priceId,
        successUrl: dto.successUrl || `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: dto.cancelUrl || `${appUrl}/billing`,
      });

      return {
        sessionId: session.id,
        url: session.url || '',
      };
    } catch (error) {
      if (this.isStripeAuthError(error)) {
        this.logger.warn(
          `Stripe checkout creation failed due to authentication error for user ${userId}. Falling back to manual subscription.`,
          error as Error,
        );
        return fallbackToManualSubscription();
      }

      throw error;
    }
  }

  /**
   * Create a customer portal session
   */
  async createCustomerPortalSession(userId: string): Promise<{ url: string }> {
    if (!this.stripeService.isConfigured) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    const subscription = await this.getActiveSubscription(userId);

    if (!subscription?.providerCustomerId) {
      throw new BadRequestException('No active subscription found');
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const session = await this.stripeService.createCustomerPortalSession({
      customerId: subscription.providerCustomerId,
      returnUrl: `${appUrl}/billing`,
    });

    return { url: session.url };
  }

  async handleStripeWebhook(payload: Buffer | undefined, signature: string) {
    if (!this.stripeService.isConfigured) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header');
    }

    const rawPayload = payload ?? Buffer.alloc(0);
    if (!rawPayload.length) {
      throw new BadRequestException('Webhook payload is empty');
    }

    try {
      const event = this.stripeService.constructWebhookEvent(rawPayload, signature);
      await this.processStripeEvent(event);
    } catch (error) {
      this.logger.error('Stripe webhook handling failed', error as Error);
      throw new BadRequestException('Unable to process Stripe webhook');
    }

    return { received: true };
  }

  private async processStripeEvent(event: Stripe.Event) {
    this.logger.debug(`Processing Stripe event ${event.type} (${event.id})`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionMutation(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type ${event.type}`);
        break;
    }
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const userId = (session.metadata?.userId as string) || session.client_reference_id || undefined;
    if (!userId) {
      this.logger.warn(`Checkout session ${session.id} missing user context`);
      return;
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      this.logger.warn(`Checkout session ${session.id} missing subscription reference`);
      return;
    }

    let stripeSubscription: Stripe.Subscription;
    if (typeof session.subscription === 'string') {
      stripeSubscription = await this.stripeService.retrieveSubscription(session.subscription);
    } else {
      stripeSubscription = session.subscription as Stripe.Subscription;
    }

    const customerId = this.extractCustomerId(session.customer) ?? this.extractCustomerId(stripeSubscription.customer);
    await this.upsertSubscriptionFromStripe(userId, stripeSubscription, customerId ?? undefined);
  }

  private async handleSubscriptionMutation(subscription: Stripe.Subscription) {
    const existing = await this.findSubscriptionByProviderId(subscription.id);
    const userId =
      existing?.userId ||
      (subscription.metadata?.userId as string | undefined) ||
      (await this.prisma.subscription.findFirst({
        where: {
          providerCustomerId: this.extractCustomerId(subscription.customer),
        },
        select: { userId: true },
      }))?.userId;

    if (!userId) {
      this.logger.warn(`No local subscription mapping found for Stripe subscription ${subscription.id}`);
      return;
    }

    const customerId = this.extractCustomerId(subscription.customer) ?? existing?.providerCustomerId;
    await this.upsertSubscriptionFromStripe(userId, subscription, customerId ?? undefined);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const existing = await this.findSubscriptionByProviderId(subscription.id);
    const userId =
      existing?.userId ||
      (subscription.metadata?.userId as string | undefined);

    if (!userId) {
      this.logger.warn(`Cannot mark cancellation for Stripe subscription ${subscription.id} - user not found`);
      return;
    }

    const canceledAt = this.toDateFromUnix(subscription.canceled_at) ?? new Date();
    const customerId = this.extractCustomerId(subscription.customer) ?? existing?.providerCustomerId;

    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: true,
        canceledAt,
        providerSubscriptionId: subscription.id,
        providerCustomerId: customerId,
      },
      create: {
        userId,
        plan: this.mapPriceIdToSubscriptionPlan(subscription.items.data[0]?.price?.id),
        status: SubscriptionStatus.CANCELED,
        currentPeriodStart: this.toDateFromUnix(this.getSubscriptionPeriod(subscription, 'start')),
        currentPeriodEnd: this.toDateFromUnix(this.getSubscriptionPeriod(subscription, 'end')),
        cancelAtPeriodEnd: true,
        canceledAt,
        provider: 'stripe',
        providerSubscriptionId: subscription.id,
        providerCustomerId: customerId,
        metadata:
          Object.keys(subscription.metadata || {}).length > 0
            ? { ...subscription.metadata }
            : Prisma.JsonNull,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { plan: SubscriptionPlan.FREE },
    });
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const providerSubscriptionId = this.getInvoiceSubscriptionId(invoice);

    if (!providerSubscriptionId) {
      return;
    }

    const subscription = await this.findSubscriptionByProviderId(providerSubscriptionId);
    if (!subscription) {
      this.logger.warn(`Received payment success for unknown subscription ${providerSubscriptionId}`);
      return;
    }

    const period = invoice.lines.data[0]?.period;
    const updateData: Prisma.SubscriptionUpdateInput = {
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
    };

    const startDate = this.toDateFromUnix(period?.start);
    const endDate = this.toDateFromUnix(period?.end);
    if (startDate) {
      updateData.currentPeriodStart = startDate;
    }
    if (endDate) {
      updateData.currentPeriodEnd = endDate;
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: updateData,
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const providerSubscriptionId = this.getInvoiceSubscriptionId(invoice);

    if (!providerSubscriptionId) {
      return;
    }

    const subscription = await this.findSubscriptionByProviderId(providerSubscriptionId);
    if (!subscription) {
      this.logger.warn(`Received payment failure for unknown subscription ${providerSubscriptionId}`);
      return;
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });
  }

  private async upsertSubscriptionFromStripe(
    userId: string,
    stripeSubscription: Stripe.Subscription,
    customerId?: string,
  ) {
    const plan = this.mapPriceIdToSubscriptionPlan(stripeSubscription.items.data?.[0]?.price?.id);
    const status = this.mapStripeStatusToSubscriptionStatus(stripeSubscription.status);
    const currentPeriodStart = this.toDateFromUnix(this.getSubscriptionPeriod(stripeSubscription, 'start'));
    const currentPeriodEnd = this.toDateFromUnix(this.getSubscriptionPeriod(stripeSubscription, 'end'));
    const trialEnd = this.toDateFromUnix(stripeSubscription.trial_end);
    const canceledAt = this.toDateFromUnix(stripeSubscription.canceled_at);
    const providerCustomerId =
      customerId ?? this.extractCustomerId(stripeSubscription.customer);
    const metadata =
      stripeSubscription.metadata && Object.keys(stripeSubscription.metadata).length > 0
        ? { ...stripeSubscription.metadata }
        : null;

    await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        plan,
        status,
        provider: 'stripe',
        providerSubscriptionId: stripeSubscription.id,
        providerCustomerId,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? false,
        trialEnd,
        canceledAt,
        metadata: metadata ?? Prisma.JsonNull,
      },
      create: {
        userId,
        plan,
        status,
        provider: 'stripe',
        providerSubscriptionId: stripeSubscription.id,
        providerCustomerId,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? false,
        trialEnd,
        canceledAt,
        metadata: metadata ?? Prisma.JsonNull,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { plan },
    });
  }

  /**
   * Get user's active subscription
   */
  async getActiveSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get all subscriptions for admin
   */
  async getAllSubscriptions(params: {
    page?: number;
    pageSize?: number;
    status?: SubscriptionStatus;
    plan?: SubscriptionPlan;
    search?: string;
    sortBy?: 'createdAt' | 'currentPeriodStart' | 'plan' | 'status';
    sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
  } = {}): Promise<PaginationResult<SubscriptionDetails>> {
    const {
      page = 1,
      pageSize = 20,
      status,
      plan,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * pageSize;
    const normalizedSortOrder = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const where: Prisma.SubscriptionWhereInput = {};

    if (status) {
      where.status = status;
    }
    if (plan) {
      where.plan = plan;
    }
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const orderBy: Prisma.SubscriptionOrderByWithRelationInput = {
      [sortBy]: normalizedSortOrder,
    } as Prisma.SubscriptionOrderByWithRelationInput;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: subscriptions as SubscriptionDetails[],
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Create a manual subscription (for custom deals) - works without Stripe
   */
  async createManualSubscription(_adminId: string, dto: CreateManualSubscriptionDto) {
    try {
      const customerIdentifier = dto.customer.trim();
      const filters: Prisma.UserWhereInput[] = [];

      if (customerIdentifier.includes('@')) {
        filters.push({ email: { equals: customerIdentifier, mode: 'insensitive' } });
      }

      filters.push({ id: customerIdentifier });

      let user = await this.prisma.user.findFirst({
        where: {
          OR: filters,
        },
      });

      if (!user) {
        if (!customerIdentifier.includes('@')) {
          throw new NotFoundException('User not found');
        }

        const normalizedEmail = customerIdentifier.toLowerCase();
        const passwordHash = await bcrypt.hash(`TempPassword-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, 10);

        try {
          user = await this.prisma.user.create({
            data: {
              email: normalizedEmail,
              name: normalizedEmail,
              password: passwordHash,
              plan: SubscriptionPlan.FREE,
            },
          });

          this.logger.log(`Created placeholder user ${user.id} for manual subscription (${normalizedEmail})`);
        } catch (createError: any) {
          this.logger.error(`Failed to auto-create user for manual subscription (${normalizedEmail}):`, createError as Error);

          if (createError?.code === 'P2002') {
            user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
          }

          if (!user) {
            throw new NotFoundException('User not found');
          }
        }
      }

      const plan = this.mapStripePlanToSubscriptionPlan(dto.plan);
      const now = new Date();
      const trialPeriodDays = dto.trialPeriodDays && dto.trialPeriodDays > 0 ? dto.trialPeriodDays : 0;
      const trialEnd = trialPeriodDays > 0 ? new Date(now.getTime() + trialPeriodDays * 24 * 60 * 60 * 1000) : null;
      const status = trialEnd ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE;
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // default 30 days cycle

      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { userId: user.id },
      });

      const activeStatuses = new Set<SubscriptionStatus>([
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIALING,
        SubscriptionStatus.PAST_DUE,
      ]);

      if (
        existingSubscription &&
        activeStatuses.has(existingSubscription.status) &&
        !existingSubscription.cancelAtPeriodEnd
      ) {
        throw new BadRequestException('User already has an active subscription');
      }

      const providerSubscriptionId =
        existingSubscription?.providerSubscriptionId ??
        `manual_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const subscription = await this.prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          plan,
          status,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          provider: 'MANUAL',
          providerSubscriptionId,
          providerCustomerId: existingSubscription?.providerCustomerId ?? user.id,
          trialEnd,
          canceledAt: null,
          metadata: dto.metadata ?? undefined,
        },
        create: {
          userId: user.id,
          plan,
          status,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          provider: 'MANUAL',
          providerSubscriptionId,
          providerCustomerId: user.id,
          trialEnd,
          metadata: dto.metadata ?? Prisma.JsonNull,
        },
      });

      // Update user's plan
      await this.prisma.user.update({
        where: { id: user.id },
        data: { plan },
      });

      this.logger.log(`Created manual subscription ${subscription.id} for user ${user.id}`);

      return {
        success: true,
        subscriptionId: subscription.id,
        customerId: user.id,
      };
    } catch (error) {
      this.logger.error('Error creating manual subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, immediate = false, _adminId?: string) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { user: true },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      const isStripeProvider = (subscription.provider ?? 'stripe').toLowerCase() === 'stripe';
      if (subscription.providerSubscriptionId && isStripeProvider) {
        if (this.stripeService.isConfigured) {
          try {
            await this.stripeService.cancelSubscription(subscription.providerSubscriptionId, immediate);
          } catch (error) {
            this.logger.error(
              `Stripe cancellation failed for ${subscription.providerSubscriptionId}:`,
              error as Error,
            );
            throw new BadRequestException('Unable to cancel Stripe subscription. Please verify Stripe configuration.');
          }
        } else {
          this.logger.warn(
            `Stripe cancellation skipped for ${subscription.providerSubscriptionId} because Stripe is not configured.`,
          );
        }
      }

      const updateData: Prisma.SubscriptionUpdateInput = immediate
        ? {
            status: SubscriptionStatus.CANCELED,
            canceledAt: new Date(),
            cancelAtPeriodEnd: false,
          }
        : {
            cancelAtPeriodEnd: true,
          };

      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: updateData,
      });

      if (immediate) {
        await this.prisma.user.update({
          where: { id: subscription.userId },
          data: { plan: SubscriptionPlan.FREE },
        });
      }

      this.logger.log(`Cancelled subscription ${subscriptionId} for user ${subscription.userId}`);

      return { success: true };
    } catch (error) {
      this.logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription metrics
   */
  async getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [allSubscriptions, totalSubscriptions] = await Promise.all([
        this.prisma.subscription.findMany({
          select: {
            plan: true,
            status: true,
            createdAt: true,
            canceledAt: true,
          },
        }),
        this.prisma.subscription.count(),
      ]);

      const subscriptionsByStatus: Record<string, number> = {};
      const statusCounts = {
        [SubscriptionStatus.ACTIVE]: 0,
        [SubscriptionStatus.CANCELED]: 0,
        [SubscriptionStatus.TRIALING]: 0,
        [SubscriptionStatus.PAST_DUE]: 0,
        [SubscriptionStatus.PAUSED]: 0,
      };

      allSubscriptions.forEach((sub) => {
        statusCounts[sub.status]++;
        subscriptionsByStatus[sub.status] = (subscriptionsByStatus[sub.status] || 0) + 1;
      });

      const subscriptionsByPlan: Record<string, number> = {};

      let monthlyRecurringRevenue = 0;

      allSubscriptions.forEach((sub) => {
        subscriptionsByPlan[sub.plan] = (subscriptionsByPlan[sub.plan] || 0) + 1;

        if (sub.status === SubscriptionStatus.ACTIVE) {
          monthlyRecurringRevenue += this.planPricing[sub.plan] || 0;
        }
      });

      const newSubscriptionsThisMonth = allSubscriptions.filter(
        (sub) => sub.createdAt >= startOfMonth,
      ).length;

      const churnedSubscriptionsThisMonth = allSubscriptions.filter(
        (sub) => sub.canceledAt && sub.canceledAt >= startOfMonth,
      ).length;

      return {
        totalSubscriptions,
        activeSubscriptions: statusCounts[SubscriptionStatus.ACTIVE],
        canceledSubscriptions: statusCounts[SubscriptionStatus.CANCELED],
        trialSubscriptions: statusCounts[SubscriptionStatus.TRIALING],
        pastDueSubscriptions: statusCounts[SubscriptionStatus.PAST_DUE],
        monthlyRecurringRevenue,
        annualRunRate: monthlyRecurringRevenue * 12,
        subscriptionsByPlan,
        subscriptionsByStatus,
        newSubscriptionsThisMonth,
        churnedSubscriptionsThisMonth,
      };
    } catch (error) {
      this.logger.error('Error getting subscription metrics:', error);

      // Return empty metrics on error
      return {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        canceledSubscriptions: 0,
        trialSubscriptions: 0,
        pastDueSubscriptions: 0,
        monthlyRecurringRevenue: 0,
        annualRunRate: 0,
        subscriptionsByPlan: {},
        subscriptionsByStatus: {},
        newSubscriptionsThisMonth: 0,
        churnedSubscriptionsThisMonth: 0,
      };
    }
  }

  /**
   * Seed subscriptions for testing
   */
  async seedSubscriptions() {
    try {
      this.logger.log('Starting subscription seeding...');

      // Get all users and filter those without subscriptions
      const allUsers = await this.prisma.user.findMany({
        take: 10 // Get more users to find ones without subscriptions
      });

      // Get user IDs that already have subscriptions
      const usersWithSubscriptions = await this.prisma.subscription.findMany({
        select: { userId: true },
        distinct: ['userId']
      });

      const userIdsWithSubscriptions = new Set(usersWithSubscriptions.map(u => u.userId));
      const usersWithoutSubscriptions = allUsers.filter(u => !userIdsWithSubscriptions.has(u.id)).slice(0, 5);

      const plans = [SubscriptionPlan.FREE, SubscriptionPlan.STARTER, SubscriptionPlan.PRO];
      const statuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE];

      for (const user of usersWithoutSubscriptions) {
        const randomPlan = plans[Math.floor(Math.random() * plans.length)];
        const randomStatus = randomPlan === SubscriptionPlan.FREE ? SubscriptionStatus.ACTIVE :
                            statuses[Math.floor(Math.random() * statuses.length)];

        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

        await this.prisma.subscription.create({
          data: {
            userId: user.id,
            plan: randomPlan,
            status: randomStatus,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: Math.random() > 0.8, // 20% chance of cancel at period end
            provider: randomPlan === SubscriptionPlan.FREE ? 'SYSTEM' : 'MANUAL',
            providerSubscriptionId: `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            trialEnd: randomStatus === SubscriptionStatus.TRIALING ?
                     new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : null, // 7 days trial
          },
        });

        // Update user's plan
        await this.prisma.user.update({
          where: { id: user.id },
          data: { plan: randomPlan },
        });

        this.logger.log(`Seeded subscription for user ${user.email} with plan ${randomPlan}`);
      }

      this.logger.log('Subscription seeding completed successfully');
      return { success: true, seeded: usersWithoutSubscriptions.length };
    } catch (error) {
      this.logger.error('Error seeding subscriptions:', error);
      throw error;
    }
  }

  /**
   * Map Stripe lookup_key to our SubscriptionPlan enum
   */
  private mapStripePlanToSubscriptionPlan(lookupKey?: string): SubscriptionPlan {
    switch (lookupKey) {
      case 'STARTER':
        return SubscriptionPlan.STARTER;
      case 'PRO':
        return SubscriptionPlan.PRO;
      default:
        return SubscriptionPlan.FREE;
    }
  }

  /**
   * Map Stripe status to our SubscriptionStatus enum
   */
  private mapStripeStatusToSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'paused':
        return SubscriptionStatus.PAUSED;
      default:
        return SubscriptionStatus.CANCELED;
    }
  }

  private async findSubscriptionByProviderId(providerSubscriptionId: string) {
    return this.prisma.subscription.findFirst({
      where: { providerSubscriptionId },
    });
  }

  private isStripeAuthError(error: any): boolean {
    if (!error) {
      return false;
    }

    const type = typeof error.type === 'string' ? error.type : undefined;
    if (type && (type === 'StripeAuthenticationError' || type === 'StripePermissionError')) {
      return true;
    }

    if (typeof error.statusCode === 'number' && error.statusCode === 401) {
      return true;
    }

    const message = typeof error.message === 'string' ? error.message : undefined;
    if (message && message.toLowerCase().includes('invalid api key')) {
      return true;
    }

    return false;
  }
}
