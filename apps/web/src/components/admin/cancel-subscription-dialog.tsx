'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { adminApi, Subscription, CancelSubscriptionData } from '@/lib/api/admin';
import { useToast } from '@/hooks/use-toast';

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription | null;
  onCancelled: () => void;
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  subscription,
  onCancelled,
}: CancelSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [immediate, setImmediate] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subscription) return;

    // Validate confirmation email matches user email
    if (confirmEmail !== subscription.user.email) {
      toast({
        title: 'Validation Error',
        description: 'Please enter the correct user email to confirm cancellation',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const cancelData: CancelSubscriptionData = {
        immediate,
        reason: reason || undefined,
      };

      await adminApi.cancelSubscription(subscription.id, cancelData);

      toast({
        title: 'Subscription Cancelled',
        description: `Subscription for ${subscription.user.email} has been cancelled successfully`,
      });

      onCancelled();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setImmediate(false);
      setReason('');
      setConfirmEmail('');
      onOpenChange(false);
    }
  };

  if (!subscription) return null;

  const canBeCancelled = subscription.status !== 'CANCELED' && subscription.status !== 'INACTIVE';

  return (
    <Dialog open={open && canBeCancelled} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>
            Cancel subscription for {subscription.user.name || subscription.user.email}
          </DialogDescription>
        </DialogHeader>

        {!canBeCancelled ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This subscription cannot be cancelled because it&apos;s already{' '}
              {subscription.status.toLowerCase()}.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Cancelling a subscription is irreversible. Please confirm this action carefully.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Current Subscription Details</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  <strong>Plan:</strong> {subscription.plan}
                </div>
                <div>
                  <strong>Status:</strong> {subscription.status}
                </div>
                <div>
                  <strong>User:</strong> {subscription.user.email}
                </div>
                {subscription.currentPeriodEnd && (
                  <div>
                    <strong>Current Period Ends:</strong>{' '}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="immediate">Cancellation Timing</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="immediate"
                    checked={immediate}
                    onCheckedChange={(checked) => setImmediate(checked as boolean)}
                  />
                  <Label htmlFor="immediate" className="text-sm font-normal">
                    Cancel immediately (revokes access right away)
                  </Label>
                </div>
                {!immediate && (
                  <p className="text-sm text-muted-foreground">
                    If not checked, subscription will remain active until the end of the current
                    billing period (
                    {subscription.currentPeriodEnd &&
                      new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    )
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Cancellation (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for cancellation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmEmail">Confirmation Required</Label>
              <p className="text-sm text-muted-foreground">
                Type the user&apos;s email address to confirm cancellation:
              </p>
              <Input
                id="confirmEmail"
                type="email"
                placeholder={subscription.user.email}
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Close
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={loading || confirmEmail !== subscription.user.email}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel Subscription
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
