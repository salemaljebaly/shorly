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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, User } from 'lucide-react';
import { adminApi, CreateManualSubscriptionData } from '@/lib/api/admin';
import { useToast } from '@/hooks/use-toast';

interface CreateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateSubscriptionDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState('');
  const [plan, setPlan] = useState<'STARTER' | 'PRO'>('STARTER');
  const [trialPeriodDays, setTrialPeriodDays] = useState<number | undefined>(undefined);
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customer) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a customer email or ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const subscriptionData: CreateManualSubscriptionData = {
        customer,
        plan,
        ...(trialPeriodDays && trialPeriodDays > 0 && { trialPeriodDays }),
        ...(Object.keys(metadata).length > 0 && { metadata }),
      };

      await adminApi.createManualSubscription(subscriptionData);

      toast({
        title: 'Subscription Created',
        description: `Manual ${plan} subscription has been created successfully`,
      });

      onCreated();
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create subscription',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCustomer('');
    setPlan('STARTER');
    setTrialPeriodDays(undefined);
    setMetadata({});
    setMetadataKey('');
    setMetadataValue('');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  const addMetadata = () => {
    if (metadataKey && metadataValue) {
      setMetadata(prev => ({ ...prev, [metadataKey]: metadataValue }));
      setMetadataKey('');
      setMetadataValue('');
    }
  };

  const removeMetadata = (key: string) => {
    setMetadata(prev => {
      const newMetadata = { ...prev };
      delete newMetadata[key];
      return newMetadata;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Manual Subscription</DialogTitle>
          <DialogDescription>
            Create a manual subscription for a customer without going through Stripe checkout
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <CreditCard className="h-4 w-4" />
            <AlertDescription>
              Manual subscriptions are created outside of Stripe and are typically used for custom deals or special arrangements.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="customer">
              <User className="inline h-4 w-4 mr-1" />
              Customer
            </Label>
            <Input
              id="customer"
              type="email"
              placeholder="user@example.com"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the customer's email address or user ID
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">Subscription Plan</Label>
            <Select
              value={plan}
              onValueChange={(value: 'STARTER' | 'PRO') => setPlan(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STARTER">
                  Starter - $9.99/month
                </SelectItem>
                <SelectItem value="PRO">
                  Pro - $29.99/month
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trialPeriodDays">Trial Period (Optional)</Label>
            <Input
              id="trialPeriodDays"
              type="number"
              min="0"
              max="365"
              placeholder="e.g., 30"
              value={trialPeriodDays || ''}
              onChange={(e) => {
                const value = e.target.value;
                setTrialPeriodDays(value ? parseInt(value) : undefined);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Number of days for the trial period (0 for no trial)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Additional Metadata (Optional)</Label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Key"
                  value={metadataKey}
                  onChange={(e) => setMetadataKey(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Value"
                  value={metadataValue}
                  onChange={(e) => setMetadataValue(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMetadata}
                  disabled={!metadataKey || !metadataValue}
                >
                  Add
                </Button>
              </div>

              {Object.keys(metadata).length > 0 && (
                <div className="space-y-1">
                  {Object.entries(metadata).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span className="text-sm">
                        <strong>{key}:</strong> {value}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMetadata(key)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Add custom metadata for internal tracking (e.g., source: "manual_admin", discount: "special_deal")
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !customer}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Subscription
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}