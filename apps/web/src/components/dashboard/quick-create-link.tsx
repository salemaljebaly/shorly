'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { linksApi } from '@/lib/api';

const quickLinkSchema = z.object({
  destinationUrl: z.string().url('Please enter a valid URL'),
  shortCode: z
    .string()
    .optional()
    .refine((val) => !val || /^[a-zA-Z0-9_-]+$/.test(val), {
      message: 'Only letters, numbers, hyphens and underscores allowed',
    }),
});

type QuickLinkFormValues = z.infer<typeof quickLinkSchema>;

interface QuickCreateLinkProps {
  onSuccess?: () => void;
}

export function QuickCreateLink({ onSuccess }: QuickCreateLinkProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<QuickLinkFormValues>({
    resolver: zodResolver(quickLinkSchema),
    defaultValues: {
      destinationUrl: '',
      shortCode: '',
    },
  });

  const onSubmit = async (data: QuickLinkFormValues) => {
    setIsLoading(true);
    try {
      await linksApi.create({
        destinationUrl: data.destinationUrl,
        shortCode: data.shortCode || undefined,
      });

      toast.success('Link created successfully!');
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error((error as any)?.response?.data?.message || 'Failed to create link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Quick Create Link
        </CardTitle>
        <CardDescription>Shorten a URL quickly from your dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="destinationUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Long URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/very-long-url" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shortCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Short Code (Optional)</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input placeholder="my-link" {...field} />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const randomCode = Math.random().toString(36).substring(2, 8);
                          form.setValue('shortCode', randomCode);
                        }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Short Link'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
