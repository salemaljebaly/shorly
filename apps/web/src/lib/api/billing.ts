import { apiClient } from './client';

export interface SubscriptionPlan {
  id: 'STARTER' | 'PRO';
  name: string;
  price: number;
  interval: string;
  features: string[];
}

export interface CheckoutSessionResponse {
  success: boolean;
  sessionId: string;
  url: string;
}

export interface CustomerPortalResponse {
  success: boolean;
  url: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  plan: 'FREE' | 'STARTER' | 'PRO';
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'PAUSED' | 'INACTIVE';
  provider?: string;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckoutData {
  plan: 'STARTER' | 'PRO';
  successUrl?: string;
  cancelUrl?: string;
}

export const billingApi = {
  // Get available plans
  getPlans: () =>
    apiClient.get<{ success: boolean; plans: SubscriptionPlan[] }>('/billing/plans'),

  // Get current user's subscription
  getSubscription: () =>
    apiClient.get<{ success: boolean; subscription: UserSubscription | null }>('/billing/subscription'),

  // Create checkout session
  createCheckoutSession: (data: CreateCheckoutData) =>
    apiClient.post<CheckoutSessionResponse>('/billing/checkout', data),

  // Create customer portal session
  createCustomerPortalSession: () =>
    apiClient.post<CustomerPortalResponse>('/billing/customer-portal'),
};