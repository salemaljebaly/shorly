'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Zap, Server, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { adminApi } from '@/lib/api/admin';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);

  // System settings state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [apiVersion, setApiVersion] = useState('v1');

  // Security settings state
  const [sessionTimeout, setSessionTimeout] = useState('30');

  // Rate limiting state
  const [rateLimitEnabled, setRateLimitEnabled] = useState(true);
  const [requestsPerMinute, setRequestsPerMinute] = useState('100');

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await adminApi.getAllSettings();
        const settings = response.data.settings;

        // Set system settings
        setMaintenanceMode(settings.system.maintenance_mode);
        setApiVersion(settings.system.api_version);

        // Set security settings
        setSessionTimeout(String(settings.security.session_timeout_minutes));

        // Set rate limit settings
        setRateLimitEnabled(settings['rate-limit'].rate_limit_enabled);
        setRequestsPerMinute(String(settings['rate-limit'].rate_limit_requests_per_minute));
      } catch (error: any) {
        toast.error('Failed to load settings', {
          description: error.response?.data?.message || error.message,
        });
      } finally {
        setFetchingSettings(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSystemSettings = async () => {
    setLoading(true);
    try {
      const response = await adminApi.updateSystemSettings({
        maintenance_mode: maintenanceMode,
        api_version: apiVersion,
      });

      toast.success('System settings saved', {
        description: response.data.message || 'Settings have been updated successfully',
        icon: <CheckCircle2 className="h-5 w-5" />,
      });
    } catch (error: any) {
      toast.error('Failed to save settings', {
        description: error.response?.data?.message || error.message || 'An error occurred',
        icon: <XCircle className="h-5 w-5" />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecuritySettings = async () => {
    setLoading(true);
    try {
      const response = await adminApi.updateSecuritySettings({
        session_timeout_minutes: parseInt(sessionTimeout),
      });

      toast.success('Security settings saved', {
        description: response.data.message || 'Settings have been updated successfully',
        icon: <CheckCircle2 className="h-5 w-5" />,
      });
    } catch (error: any) {
      toast.error('Failed to save settings', {
        description: error.response?.data?.message || error.message || 'An error occurred',
        icon: <XCircle className="h-5 w-5" />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRateLimitSettings = async () => {
    setLoading(true);
    try {
      const response = await adminApi.updateRateLimitSettings({
        rate_limit_enabled: rateLimitEnabled,
        rate_limit_requests_per_minute: parseInt(requestsPerMinute),
      });

      toast.success('Rate limit settings saved', {
        description: response.data.message || 'Settings have been updated successfully',
        icon: <CheckCircle2 className="h-5 w-5" />,
      });
    } catch (error: any) {
      toast.error('Failed to save settings', {
        description: error.response?.data?.message || error.message || 'An error occurred',
        icon: <XCircle className="h-5 w-5" />,
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingSettings) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground">Configure system settings and preferences</p>
      </div>

      <Tabs defaultValue="system" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="system">
            <Server className="mr-2 h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="rate-limit">
            <Zap className="mr-2 h-4 w-4" />
            Rate Limiting
          </TabsTrigger>
        </TabsList>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>
                Manage system-wide configuration and maintenance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable maintenance mode to prevent user access
                  </p>
                </div>
                <Switch
                  id="maintenance-mode"
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="api-version">API Version</Label>
                <Select value={apiVersion} onValueChange={setApiVersion}>
                  <SelectTrigger id="api-version">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="v1">v1 (Current)</SelectItem>
                    <SelectItem value="v2">v2 (Beta)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Default API version for new integrations
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSystemSettings} disabled={loading}>
                  {loading ? 'Saving...' : 'Save System Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security and authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  min="5"
                  max="1440"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Users will be logged out after this period of inactivity
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSecuritySettings} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Security Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rate Limiting Tab */}
        <TabsContent value="rate-limit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting Configuration</CardTitle>
              <CardDescription>Configure API rate limiting to prevent abuse</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="rate-limit-enabled">Enable Rate Limiting</Label>
                  <p className="text-sm text-muted-foreground">
                    Protect the API from excessive requests
                  </p>
                </div>
                <Switch
                  id="rate-limit-enabled"
                  checked={rateLimitEnabled}
                  onCheckedChange={setRateLimitEnabled}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="requests-per-minute">Requests Per Minute</Label>
                <Input
                  id="requests-per-minute"
                  type="number"
                  min="10"
                  max="1000"
                  value={requestsPerMinute}
                  onChange={(e) => setRequestsPerMinute(e.target.value)}
                  disabled={!rateLimitEnabled}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of API requests allowed per minute per IP
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveRateLimitSettings} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Rate Limit Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
