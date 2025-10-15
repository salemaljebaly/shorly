'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Subscription } from '@/lib/api/admin';

interface SubscriptionDetailsDialogProps {
  open: boolean;
  subscription: Subscription | null;
  onOpenChange: (open: boolean) => void;
}

const formatDateTime = (date?: string | null) => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export function SubscriptionDetailsDialog({
  open,
  subscription,
  onOpenChange,
}: SubscriptionDetailsDialogProps) {
  if (!subscription) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Subscription Details</DialogTitle>
          <DialogDescription>
            Detailed information for {subscription.user.name?.trim() || subscription.user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">User</p>
            <p className="font-medium">{subscription.user.name?.trim() || 'N/A'}</p>
            <p className="text-muted-foreground">{subscription.user.email}</p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Plan</p>
              <Badge>{subscription.plan}</Badge>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Status</p>
              <Badge variant="secondary">{subscription.status}</Badge>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Provider</p>
              <p className="font-medium">{subscription.provider ?? 'MANUAL'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Provider Subscription ID</p>
              <p className="font-medium break-words">
                {subscription.providerSubscriptionId ?? '—'}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Current Period Start</p>
              <p className="font-medium">{formatDateTime(subscription.currentPeriodStart)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Current Period End</p>
              <p className="font-medium">{formatDateTime(subscription.currentPeriodEnd)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Trial Ends</p>
              <p className="font-medium">{formatDateTime(subscription.trialEnd)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Cancelled At</p>
              <p className="font-medium">{formatDateTime(subscription.canceledAt)}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">Metadata</p>
            {subscription.metadata && Object.keys(subscription.metadata).length > 0 ? (
              <div className="rounded border p-3 space-y-2 bg-muted/40">
                {Object.entries(subscription.metadata).map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium break-words text-right">
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No metadata recorded</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
