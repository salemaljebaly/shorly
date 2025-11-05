import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;

  constructor() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY environment variable is not set. Stripe functionality will be limited.');
      return;
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-09-30.clover',
    });
  }

  /**
   * Check if Stripe is properly configured
   */
  get isConfigured(): boolean {
    return this.stripe !== null;
  }

  /**
   * Get the Stripe client instance
   */
  get client(): Stripe {
    if (!this.isConfigured || !this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
    return this.stripe;
  }

  /**
   * Create a Stripe checkout session for subscription
   */
  async createCheckoutSession(params: {
    userId: string;
    userEmail: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    try {
      const client = this.client;

      const session = await client.checkout.sessions.create({
        customer_email: params.userEmail,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: params.priceId, quantity: 1 }],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: { userId: params.userId },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        client_reference_id: params.userId,
      });

      this.logger.log(`Created checkout session ${session.id} for user ${params.userId}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create checkout session for user ${params.userId}:`, error);
      throw error;
    }
  }

  /**
   * Create a customer portal session
   */
  async createCustomerPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }) {
    try {
      const client = this.client;

      const session = await client.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: params.returnUrl,
      });

      this.logger.log(`Created customer portal session ${session.id} for customer ${params.customerId}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create customer portal session for customer ${params.customerId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a checkout session
   */
  async retrieveCheckoutSession(sessionId: string) {
    try {
      const client = this.client;

      const session = await client.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      this.logger.error(`Failed to retrieve checkout session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a subscription
   */
  async retrieveSubscription(subscriptionId: string) {
    try {
      const client = this.client;

      const subscription = await client.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to retrieve subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, immediate = false) {
    try {
      const client = this.client;

      const subscription = immediate
        ? await client.subscriptions.cancel(subscriptionId)
        : await client.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
          });

      this.logger.log(`Cancelled subscription ${subscriptionId} (immediate: ${immediate})`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Create a manual subscription (for custom deals)
   */
  async createManualSubscription(params: {
    customerId: string;
    priceId: string;
    metadata?: Record<string, string>;
  }) {
    try {
      const client = this.client;

      const subscription = await client.subscriptions.create({
        customer: params.customerId,
        items: [{ price: params.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: params.metadata,
      });

      this.logger.log(`Created manual subscription ${subscription.id} for customer ${params.customerId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to create manual subscription for customer ${params.customerId}:`, error);
      throw error;
    }
  }

  /**
   * Get subscription metrics (MRR, active subscriptions)
   */
  async getSubscriptionMetrics() {
    try {
      // This is a simplified version - in production you might want to use
      // Stripe's reporting API or build more sophisticated queries
      const client = this.client;

      const subscriptions = await client.subscriptions.list({
        status: 'active',
        limit: 100,
      });

      let mrr = 0;
      const activeSubscriptions = subscriptions.data.length;

      subscriptions.data.forEach((sub) => {
        if (sub.items.data.length > 0) {
          const price = sub.items.data[0].price;
          if (price.unit_amount && price.recurring?.interval === 'month') {
            mrr += price.unit_amount;
          } else if (price.unit_amount && price.recurring?.interval === 'year') {
            mrr += Math.floor(price.unit_amount / 12); // Convert annual to monthly
          }
        }
      });

      return {
        mrr: mrr / 100, // Convert from cents to dollars
        arr: (mrr / 100) * 12, // Annual recurring revenue
        activeSubscriptions,
      };
    } catch (error) {
      this.logger.error('Failed to get subscription metrics:', error);
      throw error;
    }
  }

  /**
   * List all subscriptions with pagination
   */
  async listSubscriptions(params: {
    limit?: number;
    startingAfter?: string;
    status?: string;
  } = {}) {
    try {
      const client = this.client;
      const subscriptions = await client.subscriptions.list({
        limit: params.limit || 20,
        starting_after: params.startingAfter,
        status: params.status as Stripe.SubscriptionListParams.Status,
        expand: ['data.customer', 'data.items.data.price'],
      });

      return subscriptions;
    } catch (error) {
      this.logger.error('Failed to list subscriptions:', error);
      throw error;
    }
  }

  /**
   * Create a customer (useful for manual subscriptions)
   */
  async createCustomer(params: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }) {
    try {
      const client = this.client;

      const customer = await client.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata,
      });

      this.logger.log(`Created customer ${customer.id} for email ${params.email}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to create customer for email ${params.email}:`, error);
      throw error;
    }
  }

  /**
   * Construct webhook event from raw payload
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    try {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
      }

      const client = this.client;

      return client.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      this.logger.error('Failed to construct webhook event:', error);
      throw error;
    }
  }
}
