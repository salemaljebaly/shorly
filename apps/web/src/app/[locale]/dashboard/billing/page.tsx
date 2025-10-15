'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Crown, Zap, Check, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { billingApi, SubscriptionPlan, UserSubscription } from '@/lib/api/billing';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function BillingPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useCurrentUser();

  useEffect(() => {
    fetchPlans();
    fetchSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const response = await billingApi.getPlans();
      setPlans(response.data.plans);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch subscription plans',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      setLoadingSubscription(true);
      const response = await billingApi.getSubscription();
      setCurrentSubscription(response.data.subscription);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch current subscription',
        variant: 'destructive',
      });
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleUpgrade = async (plan: 'STARTER' | 'PRO') => {
    try {
      setProcessing(true);
      const response = await billingApi.createCheckoutSession({ plan });

      if (response.data.sessionId === 'MANUAL_SUBSCRIPTION') {
        toast({
          title: 'Subscription Updated',
          description: 'Your subscription has been upgraded successfully.',
        });
        await fetchSubscription();
        return;
      }

      window.location.href = response.data.url;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create checkout session',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setProcessing(true);
      const response = await billingApi.createCustomerPortalSession();

      // Redirect to Customer Portal
      window.location.href = response.data.url;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create customer portal session',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'TRIALING':
        return 'secondary';
      case 'PAST_DUE':
        return 'destructive';
      case 'CANCELED':
        return 'outline';
      case 'PAUSED':
        return 'secondary';
      case 'INACTIVE':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  const currentPlan = currentSubscription?.plan || 'FREE';
  const isSubscribed = currentSubscription && currentSubscription.status === 'ACTIVE';
  const isTrialing = currentSubscription?.status === 'TRIALING';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSubscription ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : currentSubscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{currentSubscription.plan}</span>
                    <Badge variant={getStatusBadgeVariant(currentSubscription.status)}>
                      {currentSubscription.status}
                    </Badge>
                    {isTrialing && (
                      <Badge variant="secondary">Trial</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {currentSubscription.provider === 'stripe' ? 'Managed via Stripe' : 'Manual subscription'}
                  </p>
                </div>
                {(currentSubscription.provider === 'stripe' || isSubscribed) && (
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    )}
                    Manage Subscription
                  </Button>
                )}
              </div>

              {currentSubscription.currentPeriodEnd && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current period:</span>
                    <span>{formatDate(currentSubscription.currentPeriodStart)} - {formatDate(currentSubscription.currentPeriodEnd)}</span>
                  </div>
                  {currentSubscription.cancelAtPeriodEnd && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Your subscription will be canceled at the end of the current billing period (
                        {formatDate(currentSubscription.currentPeriodEnd)}).
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">FREE</span>
                <Badge variant="outline">Free Plan</Badge>
              </div>
              <p className="text-muted-foreground">
                You are currently on the free plan. Upgrade to unlock premium features.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        {loadingPlans ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-6 w-16" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[...Array(5)].map((_, j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Free Plan */}
            <Card className={currentPlan === 'FREE' ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Free
                </CardTitle>
                <CardDescription>
                  Perfect for getting started
                </CardDescription>
                <div className="text-3xl font-bold">$0<span className="text-lg font-normal text-muted-foreground">/month</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    10 links per month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    3 OneLinks
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    1,000 clicks
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Basic analytics
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                {currentPlan === 'FREE' ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Downgrade to Free
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Paid Plans */}
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan === plan.id;
              const isUpgrade = plan.id === 'PRO' && currentPlan === 'STARTER';
              const canUpgrade = !isCurrentPlan && (!isSubscribed || isUpgrade);

              return (
                <Card key={plan.id} className={isCurrentPlan ? 'border-primary' : ''}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5" />
                      {plan.name}
                      {isCurrentPlan && (
                        <Badge variant="default">Current</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {plan.id === 'STARTER' ? 'For growing creators' : 'For professionals'}
                    </CardDescription>
                    <div className="text-3xl font-bold">
                      ${plan.price}<span className="text-lg font-normal text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {canUpgrade ? (
                      <Button
                        className="w-full"
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={processing}
                      >
                        {processing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          `Upgrade to ${plan.name}`
                        )}
                      </Button>
                    ) : isCurrentPlan ? (
                      <Button className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        {isUpgrade ? 'Contact Support' : 'Cannot downgrade'}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Billing Information */}
      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertDescription>
          All billing is processed securely through Stripe. You can manage your subscription, update payment methods, and view invoices through the customer portal.
        </AlertDescription>
      </Alert>
    </div>
  );
}
