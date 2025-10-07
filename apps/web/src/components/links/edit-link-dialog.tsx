'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { toast } from 'sonner';
import { linksApi, type Link } from '@/lib/api';

const editLinkSchema = z.object({
  destinationUrl: z.string().url('Please enter a valid URL'),
  title: z.string().optional(),
  expiresAt: z.date().optional().nullable(),
  isActive: z.boolean(),
});

type EditLinkFormValues = z.infer<typeof editLinkSchema>;

interface EditLinkDialogProps {
  link: Link;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function EditLinkDialog({ link, open, onOpenChange, onUpdate }: EditLinkDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditLinkFormValues>({
    resolver: zodResolver(editLinkSchema),
    defaultValues: {
      destinationUrl: link.destinationUrl,
      title: link.title || '',
      expiresAt: link.expiresAt ? new Date(link.expiresAt) : undefined,
      isActive: link.isActive,
    },
  });

  // Update form when link changes
  useEffect(() => {
    form.reset({
      destinationUrl: link.destinationUrl,
      title: link.title || '',
      expiresAt: link.expiresAt ? new Date(link.expiresAt) : undefined,
      isActive: link.isActive,
    });
  }, [link, form]);

  const onSubmit = async (data: EditLinkFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        destinationUrl: data.destinationUrl,
        title: data.title || undefined,
        expiresAt: data.expiresAt ? data.expiresAt.toISOString() : undefined,
        isActive: data.isActive,
      };
      await linksApi.update(link.id, payload);
      toast.success('Link updated successfully!');
      onOpenChange(false);
      onUpdate?.();
    } catch (error) {
      toast.error((error as any)?.response?.data?.message || 'Failed to update link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Link</DialogTitle>
          <DialogDescription>Update your link settings for /{link.shortCode}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-lg border bg-muted p-3">
              <div className="text-sm font-medium">Short Code</div>
              <div className="text-sm text-muted-foreground">
                /{link.shortCode} (cannot be changed)
              </div>
            </div>

            <FormField
              control={form.control}
              name="destinationUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination URL*</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/very-long-url" {...field} />
                  </FormControl>
                  <FormDescription>The long URL this link redirects to</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="My Campaign Link" {...field} />
                  </FormControl>
                  <FormDescription>A friendly name to help you identify this link</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date (Optional)</FormLabel>
                  <FormControl>
                    <DateTimePicker date={field.value || undefined} onDateChange={field.onChange} />
                  </FormControl>
                  <FormDescription>
                    Link will automatically deactivate after this date
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>Enable or disable this link</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="rounded-lg border bg-muted p-3">
              <div className="text-sm font-medium">Statistics</div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Clicks:</span>{' '}
                  <span className="font-medium">{link.clicks.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{' '}
                  <span className="font-medium">
                    {new Date(link.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
