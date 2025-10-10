'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Calendar,
  Link2,
  BarChart3,
  Edit,
  Save,
  X,
  MapPin,
  Globe,
  Bell,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { User as UserType, UserDetails, UpdateUserData, CreateUserData } from '@/lib/api/admin';
import { useToast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/api/admin';

type UserDialogMode = 'view' | 'edit' | 'create';
type UserFormState = Partial<UpdateUserData> & {
  password?: string;
  confirmPassword?: string;
  email?: string;
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  plan?: 'FREE' | 'STARTER' | 'PRO';
};

interface UserDialogProps {
  mode: UserDialogMode;
  user: UserType | null;
  userDetails?: UserDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onUpdated?: () => void;
  onCreated?: () => void;
}

export function UserDialog({
  mode,
  user,
  userDetails,
  open,
  onOpenChange,
  onEdit,
  onUpdated,
  onCreated,
}: UserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserFormState>({});
  const { toast } = useToast();

  const formatNumber = (value?: number) => Number(value ?? 0).toLocaleString();

  const buildPayload = () => {
    const payload: Record<string, any> = {};

    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'password' || key === 'confirmPassword') {
        return;
      }

      if (value === undefined || value === null) {
        return;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') {
          return;
        }
        payload[key] = trimmed;
        return;
      }

      payload[key] = value;
    });

    return payload;
  };

  useEffect(() => {
    if (mode === 'create') {
      setFormData({
        name: '',
        email: '',
        bio: '',
        location: '',
        website: '',
        timezone: 'UTC',
        language: 'en',
        emailNotifications: true,
        analyticsTracking: true,
        isActive: true,
        role: 'USER' as const,
        plan: 'FREE' as const,
        password: '',
        confirmPassword: '',
      });
      return;
    }

    if (user && mode === 'edit') {
      const details = userDetails?.user;
      setFormData({
        name: details?.name ?? user.name ?? '',
        email: details?.email ?? user.email,
        bio: details?.bio ?? '',
        location: details?.location ?? '',
        website: details?.website ?? '',
        timezone: details?.timezone ?? 'UTC',
        language: details?.language ?? 'en',
        emailNotifications: details?.emailNotifications ?? true,
        analyticsTracking: details?.analyticsTracking ?? true,
        isActive: details?.isActive ?? (user.status !== 'INACTIVE'),
        role: (details?.role ?? user.role ?? 'USER') as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
        plan: (details?.plan ?? user.plan ?? 'FREE') as 'FREE' | 'STARTER' | 'PRO',
      });
    }
  }, [user, mode, userDetails, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (mode === 'create') {
        const email = formData.email?.trim();
        if (!email) {
          toast({
            title: 'Error',
            description: 'Email is required',
            variant: 'destructive',
          });
          return;
        }

        if (!formData.password || formData.password.trim().length < 8) {
          toast({
            title: 'Error',
            description: 'Password must be at least 8 characters long',
            variant: 'destructive',
          });
          return;
        }

        if (formData.password.trim() !== (formData.confirmPassword || '').trim()) {
          toast({
            title: 'Error',
            description: 'Passwords do not match',
            variant: 'destructive',
          });
          return;
        }

        const payload = buildPayload();
        const createPayload: CreateUserData = {
          ...(payload as UpdateUserData),
          email,
          password: formData.password.trim(),
        };

        const response = await adminApi.createUser(createPayload);
        toast({
          title: 'Success',
          description: response.data.message || 'User created successfully',
        });
        onCreated?.();
        onOpenChange(false);
        return;
      }

      if (!user) {
        return;
      }

      const payload = buildPayload();

      if (Object.keys(payload).length === 0) {
        toast({
          title: 'No changes detected',
          description: 'Update at least one field before saving',
        });
        return;
      }

      const response = await adminApi.updateUser(user.id, payload as UpdateUserData);
      toast({
        title: 'Success',
        description: response.data.message || 'User updated successfully',
      });
      onUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user && mode !== 'create') return null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ACTIVE: 'default',
      SUSPENDED: 'destructive',
      INACTIVE: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'view' && (
              <>
                <User className="h-5 w-5" />
                User Details
              </>
            )}
            {mode === 'edit' && (
              <>
                <Edit className="h-5 w-5" />
                Edit User
              </>
            )}
            {mode === 'create' && (
              <>
                <UserPlus className="h-5 w-5" />
                Add User
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Header */}
          {user && (
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar || undefined} alt={user.name || ''} />
                <AvatarFallback className="text-lg">
                  {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{user.name || 'No Name'}</h3>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(user.status)}
                  <Badge variant="outline">{user.role}</Badge>
                  <Badge variant="outline">{user.plan}</Badge>
                </div>
              </div>
              {mode === 'view' && (
                <Button onClick={onEdit} variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          )}

          <Separator />

          {mode === 'view' ? (
            /* View Mode */
            <Tabs defaultValue="profile" className="w-full">
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="usage">Usage Statistics</TabsTrigger>
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">User Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user?.email ?? 'Not available'}</span>
                      </div>
                      {userDetails?.user.name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{userDetails.user.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Joined{' '}
                          {user
                            ? new Date(user.createdAt).toLocaleDateString()
                            : 'Not available'}
                        </span>
                      </div>
                      {userDetails?.user.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{userDetails.user.location}</span>
                        </div>
                      )}
                      {userDetails?.user.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={userDetails.user.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {userDetails.user.website}
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Email Notifications:</span>
                        <Badge variant={userDetails?.user.emailNotifications ? 'default' : 'secondary'}>
                          {userDetails?.user.emailNotifications ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Analytics Tracking:</span>
                        <Badge variant={userDetails?.user.analyticsTracking ? 'default' : 'secondary'}>
                          {userDetails?.user.analyticsTracking ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Timezone:</span>
                        <span className="text-sm">{userDetails?.user.timezone || 'UTC'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Language:</span>
                        <span className="text-sm">{userDetails?.user.language || 'en'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {userDetails?.user.bio && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Bio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{userDetails.user.bio}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="usage" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">All Time Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Total Links:</span>
                        <span className="font-semibold">
                          {formatNumber(userDetails?.usage.allTime.totalLinks)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Total OneLinks:</span>
                        <span className="font-semibold">
                          {formatNumber(userDetails?.usage.allTime.totalOneLinks)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Total Clicks:</span>
                        <span className="font-semibold">
                          {formatNumber(userDetails?.usage.allTime.totalClicks)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">This Month</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Links Created:</span>
                        <span className="font-semibold">
                          {formatNumber(userDetails?.usage.currentMonth.linksThisMonth)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">OneLinks Created:</span>
                        <span className="font-semibold">
                          {formatNumber(userDetails?.usage.currentMonth.oneLinksThisMonth)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Clicks Received:</span>
                        <span className="font-semibold">
                          {formatNumber(userDetails?.usage.currentMonth.clicksThisMonth)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userDetails?.recentActivity && userDetails.recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {userDetails.recentActivity.map((activity, index) => (
                          <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{activity.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(activity.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            /* Edit Mode */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role || 'USER'}
                    onValueChange={(value) => handleInputChange('role', value as 'USER' | 'ADMIN' | 'SUPER_ADMIN')}
                    disabled={loading}
                  >
                    <SelectTrigger id="role" className="w-full" disabled={loading}>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Role changes require SUPER_ADMIN privileges.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Select
                    value={formData.plan || 'FREE'}
                    onValueChange={(value) => handleInputChange('plan', value as 'FREE' | 'STARTER' | 'PRO')}
                    disabled={loading}
                  >
                    <SelectTrigger id="plan" className="w-full" disabled={loading}>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">Free</SelectItem>
                      <SelectItem value="STARTER">Starter</SelectItem>
                      <SelectItem value="PRO">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Billing plans are informational until subscriptions launch.
                  </p>
                </div>
              </div>

              {mode === 'create' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter temporary password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword || ''}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  value={formData.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Enter bio"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Enter location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="Enter website URL"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={formData.timezone || ''}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    placeholder="Enter timezone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    value={formData.language || ''}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                    placeholder="Enter language code"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications about account&apos;s activity
                    </p>
                  </div>
                  <Switch
                    checked={formData.emailNotifications ?? false}
                    onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analytics Tracking</Label>
                    <p className="text-sm text-muted-foreground">
                      Track analytics for this user&apos;s links
                    </p>
                  </div>
                  <Switch
                    checked={formData.analyticsTracking ?? false}
                    onCheckedChange={(checked) => handleInputChange('analyticsTracking', checked)}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Account Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Whether this user can access their account
                    </p>
                  </div>
                  <Switch
                    checked={formData.isActive ?? false}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : mode === 'create' ? (
                    <UserPlus className="h-4 w-4 mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {loading
                    ? mode === 'create'
                      ? 'Creating...'
                      : 'Saving...'
                    : mode === 'create'
                      ? 'Create User'
                      : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
