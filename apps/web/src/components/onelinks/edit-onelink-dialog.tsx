'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Smartphone, Tablet, Monitor } from 'lucide-react';
import {
  oneLinksApi,
  DeviceType,
  type OneLinkTarget,
  type OneLink,
  type UpdateOneLinkRequest,
} from '@/lib/api';
import { toast } from 'sonner';

const updateOneLinkSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  fallbackUrl: z.string().url('Please enter a valid URL'),
  isActive: z.boolean(),
  targets: z
    .array(
      z.object({
        deviceType: z.enum([DeviceType.ANDROID, DeviceType.IOS, DeviceType.WEB]),
        url: z.string().url('Please enter a valid URL'),
        priority: z.number().optional(),
      })
    )
    .min(1, 'At least one target is required'),
});

type UpdateOneLinkFormValues = z.infer<typeof updateOneLinkSchema>;

interface EditOneLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oneLink: OneLink | null;
  onSuccess?: () => void;
}

export function EditOneLinkDialog({
  open,
  onOpenChange,
  oneLink,
  onSuccess,
}: EditOneLinkDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UpdateOneLinkFormValues>({
    resolver: zodResolver(updateOneLinkSchema),
    defaultValues: {
      title: '',
      description: '',
      fallbackUrl: '',
      isActive: true,
      targets: [
        { deviceType: DeviceType.WEB, url: '', priority: 1 },
        { deviceType: DeviceType.ANDROID, url: '', priority: 2 },
        { deviceType: DeviceType.IOS, url: '', priority: 3 },
      ],
    },
  });

  useEffect(() => {
    if (oneLink && open) {
      form.reset({
        title: oneLink.title || '',
        description: oneLink.description || '',
        fallbackUrl: oneLink.fallbackUrl,
        isActive: oneLink.isActive,
        targets:
          oneLink.targets.length > 0
            ? oneLink.targets
            : [
                { deviceType: DeviceType.WEB, url: '', priority: 1 },
                { deviceType: DeviceType.ANDROID, url: '', priority: 2 },
                { deviceType: DeviceType.IOS, url: '', priority: 3 },
              ],
      });
    }
  }, [oneLink, open, form]);

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

  const onSubmit = async (values: UpdateOneLinkFormValues) => {
    if (!oneLink) return;

    setIsLoading(true);
    try {
      // Filter out targets with empty URLs
      const validTargets = values.targets.filter((target) => target.url.trim() !== '');

      if (validTargets.length === 0) {
        toast.error('At least one target with a valid URL is required');
        return;
      }

      const updateData: UpdateOneLinkRequest = {
        title: values.title,
        description: values.description,
        fallbackUrl: values.fallbackUrl,
        isActive: values.isActive,
        targets: validTargets,
      };

      await oneLinksApi.update(oneLink.id, updateData);
      toast.success('OneLink updated successfully!');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update OneLink');
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

  if (!oneLink) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit OneLink</DialogTitle>
          <DialogDescription>Update your OneLink settings and device targets</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4">
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

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>Enable or disable this OneLink</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Device Targets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {targets.map((target, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-2 flex-1">
                      {getDeviceIcon(target.deviceType)}
                      <span className="font-medium">{getDeviceName(target.deviceType)}</span>
                    </div>
                    <Input
                      placeholder={`https://${target.deviceType.toLowerCase()}.example.com`}
                      value={target.url}
                      onChange={(e) => updateTarget(index, 'url', e.target.value)}
                      className="flex-2"
                    />
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
                {isLoading ? 'Updating...' : 'Update OneLink'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
