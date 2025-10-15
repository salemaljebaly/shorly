'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Plus, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SubscriptionsTable } from '@/components/admin/subscriptions-table';
import { SubscriptionMetrics } from '@/components/admin/subscription-metrics';
import { CreateSubscriptionDialog } from '@/components/admin/create-subscription-dialog';
import { adminApi, Subscription, SubscriptionMetrics as SubscriptionMetricsType } from '@/lib/api/admin';
import { useToast } from '@/hooks/use-toast';

export default function AdminSubscriptionsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [metrics, setMetrics] = useState<SubscriptionMetricsType | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const { toast } = useToast();

  const fetchMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const response = await adminApi.getSubscriptionMetrics();
      setMetrics(response.data.metrics);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch subscription metrics',
        variant: 'destructive',
      });
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleSubscriptionCreated = () => {
    setIsCreateDialogOpen(false);
    // Refresh both metrics and subscriptions table
    fetchMetrics();
    window.dispatchEvent(new Event('subscriptionsTableRefresh'));
  };

  const handleSubscriptionCancelled = () => {
    // Refresh both metrics and subscriptions table
    fetchMetrics();
    window.dispatchEvent(new Event('subscriptionsTableRefresh'));
  };

  // Fetch metrics on component mount
  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <p className="text-muted-foreground">
          View and manage all user subscriptions and billing information
        </p>
      </div>

      {/* Metrics Cards */}
      {metrics && !loadingMetrics && (
        <SubscriptionMetrics metrics={metrics} />
      )}

      {/* Subscriptions Table */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            All Subscriptions
          </CardTitle>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Manual Subscription
          </Button>
        </CardHeader>
        <CardContent>
          <SubscriptionsTable
            onSubscriptionCancelled={handleSubscriptionCancelled}
          />
        </CardContent>
      </Card>

      {/* Create Subscription Dialog */}
      <CreateSubscriptionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={handleSubscriptionCreated}
      />
    </div>
  );
}