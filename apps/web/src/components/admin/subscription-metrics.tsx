'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, DollarSign, CreditCard } from 'lucide-react';
import { SubscriptionMetrics } from '@/lib/api/admin';

interface SubscriptionMetricsProps {
  metrics: SubscriptionMetrics;
}

export function SubscriptionMetrics({ metrics }: SubscriptionMetricsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const cards = [
    {
      title: 'Total Subscriptions',
      value: formatNumber(metrics.totalSubscriptions),
      icon: Users,
      description: `${formatNumber(metrics.activeSubscriptions)} active`,
    },
    {
      title: 'Monthly Recurring Revenue',
      value: formatCurrency(metrics.monthlyRecurringRevenue),
      icon: DollarSign,
      description: `ARR: ${formatCurrency(metrics.annualRunRate)}`,
    },
    {
      title: 'New This Month',
      value: formatNumber(metrics.newSubscriptionsThisMonth),
      icon: TrendingUp,
      description: `Churned: ${formatNumber(metrics.churnedSubscriptionsThisMonth)}`,
    },
    {
      title: 'Trial Subscriptions',
      value: formatNumber(metrics.trialSubscriptions),
      icon: CreditCard,
      description: `Past due: ${formatNumber(metrics.pastDueSubscriptions)}`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}

      {/* Subscriptions by Plan */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Subscriptions by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.subscriptionsByPlan && Object.entries(metrics.subscriptionsByPlan).map(([plan, count]) => (
              <div key={plan} className="flex justify-between items-center">
                <span className="text-sm font-medium">{plan}</span>
                <span className="text-sm text-muted-foreground">
                  {formatNumber(count)} subscriptions
                </span>
              </div>
            ))}
            {!metrics.subscriptionsByPlan || Object.keys(metrics.subscriptionsByPlan).length === 0 && (
              <div className="text-sm text-muted-foreground">
                No subscription data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions by Status */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Subscriptions by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.subscriptionsByStatus && Object.entries(metrics.subscriptionsByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-sm font-medium">{status}</span>
                <span className="text-sm text-muted-foreground">
                  {formatNumber(count)} subscriptions
                </span>
              </div>
            ))}
            {!metrics.subscriptionsByStatus || Object.keys(metrics.subscriptionsByStatus).length === 0 && (
              <div className="text-sm text-muted-foreground">
                No subscription data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}