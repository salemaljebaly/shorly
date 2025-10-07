'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [customDomain, setCustomDomain] = useState('');

  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">General</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Custom Domain</Label>
              <Input
                id="domain"
                placeholder="yourdomain.com"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Use your own domain for shortened links
              </p>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about your links
                </p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
          </div>
        </Card>

        {/* Privacy */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Privacy</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Analytics Tracking</Label>
                <p className="text-sm text-muted-foreground">Enable click tracking and analytics</p>
              </div>
              <Switch checked={analyticsEnabled} onCheckedChange={setAnalyticsEnabled} />
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 border-destructive">
          <h2 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h2>
          <div className="space-y-4">
            <div>
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Permanently delete your account and all data
              </p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
