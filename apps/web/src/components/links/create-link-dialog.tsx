'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sparkles } from 'lucide-react';
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
import { linksApi } from '@/lib/api';

const createLinkSchema = z.object({
  destinationUrl: z.string().url('Please enter a valid URL'),
  shortCode: z
    .string()
    .optional()
    .refine((val) => !val || /^[a-zA-Z0-9_-]+$/.test(val), {
      message: 'Only letters, numbers, hyphens and underscores allowed',
    }),
  title: z.string().optional(),
  expiresAt: z.date().optional(),
  isActive: z.boolean().default(true),
});

type CreateLinkFormValues = {
  destinationUrl: string;
  shortCode?: string;
  title?: string;
  expiresAt?: Date;
  isActive: boolean;
};

interface CreateLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLinkDialog({ open, onOpenChange }: CreateLinkDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateLinkFormValues>({
    resolver: zodResolver(createLinkSchema) as any,
    defaultValues: {
      destinationUrl: '',
      shortCode: '',
      title: '',
      expiresAt: undefined,
      isActive: true,
    },
  });

  const onSubmit = async (data: CreateLinkFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        destinationUrl: data.destinationUrl,
        shortCode: data.shortCode || undefined,
        title: data.title || undefined,
        expiresAt: data.expiresAt ? data.expiresAt.toISOString() : undefined,
        isActive: data.isActive,
      };
      await linksApi.create(payload);
      toast.success('Link created successfully!');
      form.reset();
      onOpenChange(false);
      window.location.reload(); // Refresh to show new link
    } catch (error) {
      toast.error((error as any)?.response?.data?.message || 'Failed to create link');
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomCode = () => {
    const randomCode = Math.random().toString(36).substring(2, 8);
    form.setValue('shortCode', randomCode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Link</DialogTitle>
          <DialogDescription>Create a shortened link with optional customization</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="destinationUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination URL*</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/very-long-url" {...field} />
                  </FormControl>
                  <FormDescription>The long URL you want to shorten</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shortCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Short Code</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input placeholder="my-link" {...field} />
                      <Button type="button" variant="outline" onClick={generateRandomCode}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Random
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>Leave blank for auto-generated code</FormDescription>
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
                    <DateTimePicker date={field.value} onDateChange={field.onChange} />
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
                    <FormDescription>Link will be accessible immediately</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Link'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
