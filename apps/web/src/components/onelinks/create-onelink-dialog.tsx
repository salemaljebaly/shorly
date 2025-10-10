'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sparkles } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Smartphone, Tablet, Monitor } from 'lucide-react';
import { oneLinksApi, DeviceType, type OneLinkTarget, type CreateOneLinkRequest } from '@/lib/api';
import { toast } from 'sonner';

const createOneLinkSchema = z.object({
  shortCode: z
    .string()
    .optional()
    .refine((val) => !val || /^[a-zA-Z0-9_-]+$/.test(val), {
      message: 'Only letters, numbers, hyphens and underscores allowed',
    })
    .refine((val) => !val || val.length <= 50, {
      message: 'Short code must be less than 50 characters',
    }),
  title: z.string().optional(),
  description: z.string().optional(),
  fallbackUrl: z.string().min(1, 'Fallback URL is required').url('Please enter a valid URL'),
  targets: z
    .array(
      z.object({
        deviceType: z.enum([DeviceType.ANDROID, DeviceType.IOS, DeviceType.WEB]),
        url: z.string().min(1, 'Target URL is required').url('Please enter a valid URL'),
        priority: z.number().optional(),
      })
    )
    .min(1, 'At least one device target is required'),
});

type CreateOneLinkFormValues = z.infer<typeof createOneLinkSchema>;

interface CreateOneLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateOneLinkDialog({ open, onOpenChange, onSuccess }: CreateOneLinkDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateOneLinkFormValues>({
    resolver: zodResolver(createOneLinkSchema),
    defaultValues: {
      shortCode: '',
      title: '',
      description: '',
      fallbackUrl: '',
      targets: [
        { deviceType: DeviceType.WEB, url: '', priority: 1 },
        { deviceType: DeviceType.ANDROID, url: '', priority: 2 },
        { deviceType: DeviceType.IOS, url: '', priority: 3 },
      ],
    },
  });

  const targets = form.watch('targets');

  const addTarget = (deviceType: DeviceType) => {
    const existingTarget = targets.find((t) => t.deviceType === deviceType);
    if (!existingTarget) {
      const newTargets = [...targets, { deviceType, url: '', priority: targets.length + 1 }];
      form.setValue('targets', newTargets);
    }
  };

  const removeTarget = (index: number) => {
    const newTargets = targets.filter((_, i) => i !== index);
    form.setValue('targets', newTargets);
  };

  const updateTarget = (index: number, field: keyof OneLinkTarget, value: string | number) => {
    const newTargets = [...targets];
    newTargets[index] = { ...newTargets[index], [field]: value };
    form.setValue('targets', newTargets);
  };

  const generateRandomCode = () => {
    const randomCode = Math.random().toString(36).substring(2, 8);
    form.setValue('shortCode', randomCode);
  };

  const onSubmit = async (values: CreateOneLinkFormValues) => {
    setIsLoading(true);
    try {
      // The form schema already validates required fields
      const createData: CreateOneLinkRequest = {
        shortCode: values.shortCode || undefined,
        title: values.title,
        description: values.description,
        fallbackUrl: values.fallbackUrl,
        targets: values.targets.filter((target) => target.url.trim() !== ''),
      };

      await oneLinksApi.create(createData);
      toast.success('OneLink created successfully!');
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create OneLink');
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: DeviceType) => {
    switch (deviceType) {
      case DeviceType.ANDROID:
        return <Smartphone className="h-4 w-4" />;
      case DeviceType.IOS:
        return <Tablet className="h-4 w-4" />;
      case DeviceType.WEB:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getDeviceName = (deviceType: DeviceType) => {
    switch (deviceType) {
      case DeviceType.ANDROID:
        return 'Android';
      case DeviceType.IOS:
        return 'iOS';
      case DeviceType.WEB:
        return 'Web';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create OneLink</DialogTitle>
          <DialogDescription>
            Create a smart link that routes users based on their device type
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4">
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
                    <FormDescription>
                      Leave blank for auto-generated code. This will be part of your URL:
                      shorly.app/{field.value || 'short-code'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="My App Download" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional description for your OneLink" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fallbackUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fallback URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Default URL when no device-specific target matches
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Device Targets</CardTitle>
                <p className="text-sm text-muted-foreground">Add URLs for different device types</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="targets"
                  render={({ fieldState }) => (
                    <>
                      {fieldState.error && (
                        <p className="text-sm text-red-500 mb-2">{fieldState.error.message}</p>
                      )}
                      {targets.map((target, index) => (
                        <FormField
                          key={index}
                          control={form.control}
                          name={`targets.${index}.url`}
                          render={({ field, fieldState }) => (
                            <div className="space-y-2">
                              <div className="flex items-center gap-4 p-4 border rounded-lg">
                                <div className="flex items-center gap-2 flex-1">
                                  {getDeviceIcon(target.deviceType)}
                                  <span className="font-medium">
                                    {getDeviceName(target.deviceType)}
                                  </span>
                                </div>
                                <div className="flex-2">
                                  <Input
                                    placeholder={`https://${target.deviceType.toLowerCase()}.example.com`}
                                    {...field}
                                    className={fieldState.error ? 'border-red-500' : ''}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTarget(index)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              {fieldState.error && (
                                <p className="text-xs text-red-500 ml-20">
                                  {fieldState.error.message}
                                </p>
                              )}
                            </div>
                          )}
                        />
                      ))}

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTarget(DeviceType.ANDROID)}
                          disabled={targets.some((t) => t.deviceType === DeviceType.ANDROID)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Android Target
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTarget(DeviceType.IOS)}
                          disabled={targets.some((t) => t.deviceType === DeviceType.IOS)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add iOS Target
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTarget(DeviceType.WEB)}
                          disabled={targets.some((t) => t.deviceType === DeviceType.WEB)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Web Target
                        </Button>
                      </div>
                    </>
                  )}
                />
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create OneLink'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
