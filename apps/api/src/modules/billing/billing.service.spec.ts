import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaClient, SubscriptionPlan as PrismaSubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { SubscriptionPlan as CheckoutSubscriptionPlan } from './dto/create-checkout.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

class StripeServiceMock {
  configured = true;
  createCheckoutSession = jest.fn();
  createCustomerPortalSession = jest.fn();
  retrieveSubscription = jest.fn();
  cancelSubscription = jest.fn();
  constructWebhookEvent = jest.fn();

  get isConfigured() {
    return this.configured;
  }
}

describe('BillingService', () => {
  let service: BillingService;
  let stripeService: StripeServiceMock;
  let prisma: any;

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_STARTER_PRICE_ID = 'price_starter';
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro';

    stripeService = new StripeServiceMock();

    prisma = {
      subscription: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaClient, useValue: prisma as PrismaClient },
        { provide: StripeService, useValue: stripeService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createManualSubscription', () => {
    it('creates a manual trial subscription when trialPeriodDays provided', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
      } as any);
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.subscription.upsert.mockResolvedValue({
        id: 'sub_manual',
        userId: 'user_1',
      } as any);

      await service.createManualSubscription('admin_1', {
        customer: 'user@example.com',
        plan: CheckoutSubscriptionPlan.STARTER,
        trialPeriodDays: 14,
        metadata: { source: 'manual-test' },
      });

      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            userId: 'user_1',
            plan: PrismaSubscriptionPlan.STARTER,
            status: SubscriptionStatus.TRIALING,
            metadata: { source: 'manual-test' },
          }),
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_1' },
          data: { plan: PrismaSubscriptionPlan.STARTER },
        }),
      );
    });

    it('auto-creates a user when email does not exist', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValue({
        id: 'user_new',
        email: 'new@example.com',
      } as any);
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.subscription.upsert.mockResolvedValue({
        id: 'sub_manual',
        userId: 'user_new',
      } as any);

      await service.createManualSubscription('admin_1', {
        customer: 'new@example.com',
        plan: CheckoutSubscriptionPlan.PRO,
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
          }),
        }),
      );
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_new' },
        }),
      );
    });

    it('throws when user already has active subscription', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user_existing',
        email: 'existing@example.com',
      } as any);
      prisma.subscription.findUnique.mockResolvedValue({
        id: 'sub_existing',
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
      } as any);

      await expect(
        service.createManualSubscription('admin_1', {
          customer: 'existing@example.com',
          plan: CheckoutSubscriptionPlan.STARTER,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    });
  });

  describe('createCheckoutSession', () => {
    it('throws when user already has active subscription', async () => {
      prisma.user.findUnique.mockResolvedValue({
        email: 'user@example.com',
        name: 'User',
      } as any);
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_existing',
        status: SubscriptionStatus.ACTIVE,
      } as any);

      await expect(
        service.createCheckoutSession('user_1', {
          plan: CheckoutSubscriptionPlan.STARTER,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(stripeService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('falls back to manual subscription when Stripe is not configured', async () => {
      stripeService.configured = false;
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        name: 'User',
      } as any);
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
      } as any);
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.subscription.upsert.mockResolvedValue({
        id: 'sub_manual',
        userId: 'user_1',
      } as any);
      prisma.user.update.mockResolvedValue({} as any);

      const result = await service.createCheckoutSession('user_1', {
        plan: CheckoutSubscriptionPlan.STARTER,
      });

      expect(result.sessionId).toBe('MANUAL_SUBSCRIPTION');
      expect(prisma.subscription.upsert).toHaveBeenCalled();
    });

    it('falls back to manual subscription on Stripe authentication error', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
        name: 'User',
      } as any);
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({
        id: 'user_1',
        email: 'user@example.com',
      } as any);
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.subscription.upsert.mockResolvedValue({
        id: 'sub_manual',
        userId: 'user_1',
      } as any);
      prisma.user.update.mockResolvedValue({} as any);

      stripeService.createCheckoutSession.mockRejectedValue({
        type: 'StripeAuthenticationError',
        statusCode: 401,
        message: 'Invalid API Key',
      });

      const result = await service.createCheckoutSession('user_1', {
        plan: CheckoutSubscriptionPlan.PRO,
      });

      expect(result.sessionId).toBe('MANUAL_SUBSCRIPTION');
      expect(prisma.subscription.upsert).toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    it('performs immediate cancellation via Stripe and downgrades user', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        providerSubscriptionId: 'sub_stripe_1',
        user: { id: 'user_1' },
      } as any);

      await service.cancelSubscription('sub_1', true, 'admin_1');

      expect(stripeService.cancelSubscription).toHaveBeenCalledWith('sub_stripe_1', true);
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub_1' },
          data: expect.objectContaining({
            status: SubscriptionStatus.CANCELED,
            cancelAtPeriodEnd: false,
          }),
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_1' },
          data: { plan: PrismaSubscriptionPlan.FREE },
        }),
      );
    });
  });

  describe('handleStripeWebhook', () => {
    it('processes subscription.created event and upserts subscription', async () => {
      const stripeEvent = {
        id: 'evt_1',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            items: {
              data: [
                {
                  price: { id: 'price_starter' },
                },
              ],
            },
            current_period_start: 1_700_000_000,
            current_period_end: 1_700_086_400,
            cancel_at_period_end: false,
            trial_end: null,
            canceled_at: null,
            customer: 'cus_123',
            metadata: { userId: 'user_1' },
          },
        },
      } as unknown as Stripe.Event;

      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.subscription.upsert.mockResolvedValue({
        id: 'sub_local',
        userId: 'user_1',
      } as any);

      stripeService.constructWebhookEvent.mockReturnValue(stripeEvent);

      await service.handleStripeWebhook(Buffer.from('{}'), 'sig_123');

      expect(stripeService.constructWebhookEvent).toHaveBeenCalled();
      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_1' },
          create: expect.objectContaining({
            plan: PrismaSubscriptionPlan.STARTER,
            status: SubscriptionStatus.ACTIVE,
            providerSubscriptionId: 'sub_123',
          }),
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_1' },
          data: { plan: PrismaSubscriptionPlan.STARTER },
        }),
      );
    });

    it('throws BadRequestException when signature verification fails', async () => {
      stripeService.constructWebhookEvent.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(
        service.handleStripeWebhook(Buffer.from('{}'), 'sig_invalid'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
