# Next Steps: Missing Features & Implementation Guide

This document outlines all missing features in the SmartShort application that need to be implemented. The application is a URL shortener with analytics, QR codes, and OneLinks (device-based routing).

## Table of Contents

- [Current State](#current-state)
- [Missing Backend APIs](#missing-backend-apis)
- [Missing Frontend UIs](#missing-frontend-uis)
- [Testing Requirements](#testing-requirements)
- [Implementation Guidelines](#implementation-guidelines)

---

## Current State

### ✅ Fully Implemented Features

1. **Authentication**
   - Login page: `/apps/web/src/app/[locale]/(auth)/login/page.tsx`
   - Register page: `/apps/web/src/app/[locale]/(auth)/register/page.tsx`
   - Backend: `/apps/api/src/modules/auth/`
   - Endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`

2. **Links Management**
   - Links page: `/apps/web/src/app/[locale]/dashboard/links/page.tsx`
   - Components: `/apps/web/src/components/links/`
   - Backend: `/apps/api/src/modules/links/`
   - Full CRUD functionality (Create, Read, Update, Delete)
   - Features: Custom short codes, expiration dates, active/inactive status, title, description, tags

3. **Analytics**
   - Analytics page: `/apps/web/src/app/[locale]/dashboard/analytics/page.tsx`
   - Backend: `/apps/api/src/modules/analytics/`
   - Endpoint: `GET /analytics/links/:linkId`
   - Features: Total clicks, unique visitors, clicks by date/country/device/browser/referrer

4. **QR Code Generation**
   - QR page: `/apps/web/src/app/[locale]/dashboard/qr/page.tsx`
   - Backend: `/apps/api/src/modules/qr/`
   - Endpoint: `POST /qr/links/:shortCode`
   - Features: Custom size, format (PNG/SVG), colors, error correction level

5. **Dashboard**
   - Dashboard page: `/apps/web/src/app/[locale]/dashboard/page.tsx`
   - Connected to real API
   - Features: Stats cards, quick create link, recent links table

---

## Missing Backend APIs

### 1. User Profile Management

**Location:** Create new controller at `/apps/api/src/modules/users/users.controller.ts`

#### Required Endpoints:

```typescript
// Get current user profile
GET /users/profile
@UseGuards(JwtAuthGuard)
Response: {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  // Optional: avatar, bio, etc.
}

// Update user profile
PATCH /users/profile
@UseGuards(JwtAuthGuard)
Body: {
  name?: string;
  email?: string;
  // Optional: bio, avatar, etc.
}
Response: Updated user object

// Upload avatar
POST /users/profile/avatar
@UseGuards(JwtAuthGuard)
Content-Type: multipart/form-data
Body: { file: File }
Response: { avatarUrl: string }
```

#### Implementation Notes:

- Create `UsersModule`, `UsersService`, `UsersController`
- Use DTOs: `UpdateProfileDto`
- Email change should verify new email (send confirmation email)
- Avatar upload should use file validation (max 2MB, JPG/PNG only)
- Store avatar in `/uploads/avatars/` or cloud storage

---

### 2. Password Management

**Location:** Extend `/apps/api/src/modules/auth/auth.controller.ts`

#### Required Endpoints:

```typescript
// Change password (authenticated)
POST /auth/change-password
@UseGuards(JwtAuthGuard)
Body: {
  currentPassword: string;
  newPassword: string;
}
Response: { message: 'Password changed successfully' }

// Forgot password (send reset email)
POST /auth/forgot-password
Body: { email: string }
Response: { message: 'Password reset email sent' }

// Reset password (with token)
POST /auth/reset-password
Body: {
  token: string;
  password: string;
}
Response: { message: 'Password reset successfully' }
```

#### Implementation Notes:

- Change password: Verify current password with bcrypt before updating
- Forgot password: Generate unique token, store in Redis with 1-hour expiry, send email
- Reset password: Verify token from Redis, hash new password, invalidate token
- Email service: Use Nodemailer or similar (configure SMTP in .env)

---

### 3. User Settings

**Location:** Create new controller at `/apps/api/src/modules/users/settings.controller.ts`

#### Required Endpoints:

```typescript
// Get user settings
GET /users/settings
@UseGuards(JwtAuthGuard)
Response: {
  emailNotifications: boolean;
  analyticsEnabled: boolean;
  customDomain?: string;
}

// Update user settings
PATCH /users/settings
@UseGuards(JwtAuthGuard)
Body: {
  emailNotifications?: boolean;
  analyticsEnabled?: boolean;
  customDomain?: string;
}
Response: Updated settings object
```

#### Implementation Notes:

- Add `UserSettings` table in Prisma schema or add fields to `User` table
- Custom domain should validate domain ownership (DNS TXT record)

---

### 4. Account Deletion

**Location:** Add to `/apps/api/src/modules/users/users.controller.ts`

#### Required Endpoint:

```typescript
// Delete user account (soft delete)
DELETE /users/account
@UseGuards(JwtAuthGuard)
Body: { password: string } // Confirmation
Response: { message: 'Account deleted successfully' }
```

#### Implementation Notes:

- Verify password before deletion
- Soft delete: Set `deletedAt` timestamp instead of hard delete
- Cascade delete all user's links, onelinks, analytics data
- Invalidate all user's tokens

---

### 5. User Statistics

**Location:** Add to `/apps/api/src/modules/users/users.controller.ts`

#### Required Endpoint:

```typescript
// Get user statistics for profile page
GET /users/stats
@UseGuards(JwtAuthGuard)
Response: {
  totalLinks: number;
  totalOneLinks: number;
  totalClicks: number;
  memberSince: Date;
  accountType: string; // 'free' | 'pro' | 'enterprise'
}
```

---

## Missing Frontend UIs

### 1. User Profile Page

**File:** `/apps/web/src/app/[locale]/dashboard/profile/page.tsx`

**Current Status:**

- UI exists but uses mock data
- No API integration

**Required Changes:**

```typescript
// 1. Fetch user profile on mount
useEffect(() => {
  const fetchProfile = async () => {
    const profile = await usersApi.getProfile();
    setName(profile.name);
    setEmail(profile.email);
    // ... set other fields
  };
  fetchProfile();
}, []);

// 2. Implement handleUpdateProfile
const handleUpdateProfile = async () => {
  try {
    await usersApi.updateProfile({ name, email });
    toast.success('Profile updated successfully!');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to update profile');
  }
};

// 3. Implement handleChangePassword
const handleChangePassword = async () => {
  if (newPassword !== confirmPassword) {
    toast.error('Passwords do not match');
    return;
  }
  try {
    await authApi.changePassword({ currentPassword, newPassword });
    toast.success('Password changed successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to change password');
  }
};

// 4. Implement avatar upload
const handleAvatarUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const result = await usersApi.uploadAvatar(formData);
    setAvatarUrl(result.avatarUrl);
    toast.success('Avatar updated successfully!');
  } catch (error) {
    toast.error('Failed to upload avatar');
  }
};

// 5. Fetch user stats for Account Information section
const fetchStats = async () => {
  const stats = await usersApi.getStats();
  // Update member since, account type, total links
};
```

**New API Client:**

Create `/apps/web/src/lib/api/users.ts`:

```typescript
export const usersApi = {
  getProfile: async () => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: { name?: string; email?: string }) => {
    const response = await apiClient.patch('/users/profile', data);
    return response.data;
  },

  uploadAvatar: async (formData: FormData) => {
    const response = await apiClient.post('/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/users/stats');
    return response.data;
  },

  deleteAccount: async (password: string) => {
    const response = await apiClient.delete('/users/account', { data: { password } });
    return response.data;
  },
};
```

---

### 2. User Settings Page

**File:** `/apps/web/src/app/[locale]/dashboard/settings/page.tsx`

**Current Status:**

- UI exists but has no backend integration
- Only shows toast on save

**Required Changes:**

```typescript
// 1. Fetch settings on mount
useEffect(() => {
  const fetchSettings = async () => {
    const settings = await usersApi.getSettings();
    setEmailNotifications(settings.emailNotifications);
    setAnalyticsEnabled(settings.analyticsEnabled);
    setCustomDomain(settings.customDomain || '');
  };
  fetchSettings();
}, []);

// 2. Implement handleSave
const handleSave = async () => {
  try {
    await usersApi.updateSettings({
      emailNotifications,
      analyticsEnabled,
      customDomain: customDomain || undefined,
    });
    toast.success('Settings saved successfully!');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to save settings');
  }
};

// 3. Implement delete account with confirmation
const handleDeleteAccount = async () => {
  // Show AlertDialog for confirmation
  // Prompt for password
  try {
    await usersApi.deleteAccount(password);
    toast.success('Account deleted successfully');
    // Clear tokens and redirect to login
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  } catch (error) {
    toast.error('Failed to delete account');
  }
};
```

**New API Methods:**

Add to `/apps/web/src/lib/api/users.ts`:

```typescript
getSettings: async () => {
  const response = await apiClient.get('/users/settings');
  return response.data;
},

updateSettings: async (data: {
  emailNotifications?: boolean;
  analyticsEnabled?: boolean;
  customDomain?: string;
}) => {
  const response = await apiClient.patch('/users/settings', data);
  return response.data;
},
```

**UI Components Needed:**

- AlertDialog for delete account confirmation (already exists in shadcn)
- Password input dialog for account deletion confirmation

---

### 3. OneLinks CRUD UI Components

**File:** `/apps/web/src/app/[locale]/dashboard/onelinks/page.tsx`

**Current Status:**

- Page displays OneLinks data
- "Create OneLink" button exists but does nothing
- "Edit" button exists but does nothing
- No delete functionality

**Required Components:**

#### A. Create OneLink Dialog

Create `/apps/web/src/components/onelinks/create-onelink-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { oneLinksApi } from '@/lib/api';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const createOneLinkSchema = z.object({
  shortCode: z
    .string()
    .optional()
    .refine((val) => !val || /^[a-zA-Z0-9_-]+$/.test(val), {
      message: 'Only letters, numbers, hyphens and underscores allowed',
    }),
  title: z.string().optional(),
  iosUrl: z.string().url('Please enter a valid URL').optional(),
  androidUrl: z.string().url('Please enter a valid URL').optional(),
  webUrl: z.string().url('Please enter a valid URL'),
  isActive: z.boolean().default(true),
});

type CreateOneLinkFormValues = z.infer<typeof createOneLinkSchema>;

interface CreateOneLinkDialogProps {
  onSuccess?: () => void;
}

export function CreateOneLinkDialog({ onSuccess }: CreateOneLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateOneLinkFormValues>({
    resolver: zodResolver(createOneLinkSchema),
    defaultValues: {
      shortCode: '',
      title: '',
      iosUrl: '',
      androidUrl: '',
      webUrl: '',
      isActive: true,
    },
  });

  const onSubmit = async (data: CreateOneLinkFormValues) => {
    setIsLoading(true);
    try {
      await oneLinksApi.create({
        shortCode: data.shortCode || undefined,
        title: data.title || undefined,
        targets: {
          ios: data.iosUrl || undefined,
          android: data.androidUrl || undefined,
          web: data.webUrl,
        },
        isActive: data.isActive,
      });

      toast.success('OneLink created successfully!');
      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error((error as any)?.response?.data?.message || 'Failed to create OneLink');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create OneLink
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create OneLink</DialogTitle>
          <DialogDescription>
            Create a smart link that routes users based on their device type
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="shortCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Short Code (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="my-onelink" {...field} />
                  </FormControl>
                  <FormDescription>
                    Leave empty to auto-generate
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
                  <FormLabel>Title (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="My App Download Link" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="webUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Web URL (Required)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Fallback URL for desktop and other devices
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="androidUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Android URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://play.google.com/store/apps/..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Google Play Store or Android deep link
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="iosUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>iOS URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://apps.apple.com/..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    App Store or iOS deep link
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Enable this OneLink immediately after creation
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create OneLink'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

#### B. Edit OneLink Dialog

Create `/apps/web/src/components/onelinks/edit-onelink-dialog.tsx`:

Similar structure to create dialog, but:

- Populate form with existing OneLink data
- Call `oneLinksApi.update(id, data)` instead of `create()`
- Use `PATCH` method

#### C. OneLinks Table Component

Create `/apps/web/src/components/onelinks/onelinks-table.tsx`:

Similar to `/apps/web/src/components/links/links-table.tsx`:

- Display OneLinks in table format
- Actions dropdown: Copy link, View Analytics, Generate QR, Edit, Toggle Status, Delete
- Delete confirmation dialog
- Copy to clipboard functionality

---

### 4. Forgot Password & Reset Password Pages

**Files:**

- `/apps/web/src/app/[locale]/(auth)/forgot-password/page.tsx`
- `/apps/web/src/app/[locale]/(auth)/reset-password/page.tsx`

**Current Status:**

- Pages exist but have no implementation
- Frontend API methods exist but backend endpoints missing

**Forgot Password Page Implementation:**

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { Link2, ArrowLeft } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(data);
      setEmailSent(true);
      toast.success('Password reset email sent!');
    } catch (error) {
      toast.error((error as any)?.response?.data?.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Link2 className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">Shorly</span>
            </div>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We've sent password reset instructions to {form.getValues('email')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Link2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Shorly</span>
          </div>
          <CardTitle className="text-2xl text-center">Forgot Password?</CardTitle>
          <CardDescription className="text-center">
            Enter your email and we'll send you reset instructions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              <ArrowLeft className="inline h-3 w-3 mr-1" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Reset Password Page Implementation:**

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { Link2 } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      toast.error('Invalid reset token');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({ token, password: data.password });
      toast.success('Password reset successfully!');
      router.push('/login');
    } catch (error) {
      toast.error((error as any)?.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Link2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Shorly</span>
          </div>
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Testing Requirements

### MANDATORY: All new features MUST include comprehensive tests

For **EVERY** new endpoint and feature, you must write:

1. **Unit Tests** (`.spec.ts` files next to source)
2. **Integration Tests** (`/apps/api/test/integration/*.integration-spec.ts`)
3. **E2E Tests** (`/apps/api/test/e2e/*.e2e-spec.ts`)

### Test Coverage Target: 100%

Run coverage to verify:

```bash
pnpm --filter @shorly/api test:cov
```

Must achieve:

- Statements: 100%
- Branches: 100%
- Functions: 100%
- Lines: 100%

---

### 1. User Profile Tests

#### Unit Tests: `/apps/api/src/modules/users/users.service.spec.ts`

```typescript
describe('UsersService', () => {
  describe('getProfile', () => {
    it('should return user profile', async () => {
      // Test implementation
    });

    it('should throw NotFoundException if user not found', async () => {
      // Test implementation
    });
  });

  describe('updateProfile', () => {
    it('should update user name', async () => {
      // Test implementation
    });

    it('should update user email', async () => {
      // Test implementation
    });

    it('should send verification email when email changed', async () => {
      // Test implementation
    });

    it('should throw ConflictException if email already exists', async () => {
      // Test implementation
    });
  });

  describe('uploadAvatar', () => {
    it('should upload and save avatar', async () => {
      // Test implementation
    });

    it('should validate file size (max 2MB)', async () => {
      // Test implementation
    });

    it('should validate file type (JPG/PNG only)', async () => {
      // Test implementation
    });

    it('should delete old avatar when uploading new one', async () => {
      // Test implementation
    });
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      // Test total links, clicks, member since, etc.
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete user account', async () => {
      // Test implementation
    });

    it('should verify password before deletion', async () => {
      // Test implementation
    });

    it('should cascade delete user data', async () => {
      // Test links, onelinks, analytics deletion
    });

    it('should throw UnauthorizedException if password wrong', async () => {
      // Test implementation
    });
  });
});
```

#### Integration Tests: `/apps/api/test/integration/users.integration-spec.ts`

```typescript
describe('Users Integration', () => {
  it('should update profile and persist to database', async () => {
    // Test with real Prisma + Redis
  });

  it('should upload avatar file to storage', async () => {
    // Test file system or S3 integration
  });

  it('should cascade delete all user data', async () => {
    // Create user, links, onelinks, analytics
    // Delete user
    // Verify all data deleted
  });
});
```

#### E2E Tests: `/apps/api/test/e2e/users.e2e-spec.ts`

```typescript
describe('Users E2E', () => {
  it('GET /users/profile should return user profile', () => {
    return request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBeDefined();
        expect(res.body.name).toBeDefined();
      });
  });

  it('PATCH /users/profile should update profile', () => {
    return request(app.getHttpServer())
      .patch('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name' })
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe('Updated Name');
      });
  });

  it('POST /users/profile/avatar should upload avatar', () => {
    return request(app.getHttpServer())
      .post('/users/profile/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', 'test/fixtures/avatar.jpg')
      .expect(201)
      .expect((res) => {
        expect(res.body.avatarUrl).toBeDefined();
      });
  });

  it('GET /users/stats should return statistics', () => {
    return request(app.getHttpServer())
      .get('/users/stats')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.totalLinks).toBeDefined();
        expect(res.body.totalClicks).toBeDefined();
      });
  });

  it('DELETE /users/account should delete user', () => {
    return request(app.getHttpServer())
      .delete('/users/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: 'correct-password' })
      .expect(200);
  });

  it('DELETE /users/account should fail with wrong password', () => {
    return request(app.getHttpServer())
      .delete('/users/account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: 'wrong-password' })
      .expect(401);
  });
});
```

---

### 2. Password Management Tests

#### E2E Tests: `/apps/api/test/e2e/auth.e2e-spec.ts` (extend existing)

```typescript
describe('Password Management E2E', () => {
  it('POST /auth/change-password should change password', () => {
    return request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'old-password',
        newPassword: 'new-password',
      })
      .expect(200);
  });

  it('POST /auth/change-password should fail with wrong current password', () => {
    return request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      })
      .expect(401);
  });

  it('POST /auth/forgot-password should send reset email', () => {
    return request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'test@example.com' })
      .expect(200);
  });

  it('POST /auth/forgot-password should not reveal if email exists', () => {
    // Should return 200 even if email doesn't exist (security)
    return request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' })
      .expect(200);
  });

  it('POST /auth/reset-password should reset password with valid token', async () => {
    // Generate reset token
    const resetToken = 'valid-token-from-redis';

    return request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: resetToken,
        password: 'new-password',
      })
      .expect(200);
  });

  it('POST /auth/reset-password should fail with invalid token', () => {
    return request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: 'invalid-token',
        password: 'new-password',
      })
      .expect(401);
  });

  it('POST /auth/reset-password should fail with expired token', () => {
    // Test token that expired (older than 1 hour)
  });
});
```

---

### 3. User Settings Tests

#### E2E Tests: `/apps/api/test/e2e/settings.e2e-spec.ts`

```typescript
describe('Settings E2E', () => {
  it('GET /users/settings should return settings', () => {
    return request(app.getHttpServer())
      .get('/users/settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.emailNotifications).toBeDefined();
        expect(res.body.analyticsEnabled).toBeDefined();
      });
  });

  it('PATCH /users/settings should update settings', () => {
    return request(app.getHttpServer())
      .patch('/users/settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        emailNotifications: false,
        analyticsEnabled: true,
      })
      .expect(200);
  });

  it('PATCH /users/settings should validate custom domain', () => {
    return request(app.getHttpServer())
      .patch('/users/settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customDomain: 'invalid-domain',
      })
      .expect(400);
  });
});
```

---

### 4. OneLinks CRUD Tests (Frontend)

Even though backend tests exist, add frontend integration tests:

Create `/apps/web/src/components/onelinks/__tests__/create-onelink-dialog.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateOneLinkDialog } from '../create-onelink-dialog';

describe('CreateOneLinkDialog', () => {
  it('should render dialog when button clicked', () => {
    render(<CreateOneLinkDialog />);
    const button = screen.getByText('Create OneLink');
    fireEvent.click(button);
    expect(screen.getByText('Create a smart link')).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    render(<CreateOneLinkDialog />);
    // Submit without webUrl
    // Should show validation error
  });

  it('should submit form with valid data', async () => {
    render(<CreateOneLinkDialog onSuccess={jest.fn()} />);
    // Fill form
    // Submit
    // Verify API call
    // Verify onSuccess callback
  });
});
```

---

## Implementation Guidelines

### 1. UI/UX Standards

**Use shadcn/ui 3.4.0 components ONLY:**

```bash
# Available components (already installed):
- Dialog
- Form
- Input
- Button
- Card
- Switch
- Select
- Label
- Separator
- Avatar
- Badge
- Table
- AlertDialog
- Tabs
- Textarea
- Tooltip
- Dropdown Menu
- Popover
- Calendar
- Checkbox
- Scroll Area
- Sheet
- Skeleton
- Sonner (toast)
```

**DO NOT:**

- Install new packages without approval
- Use native HTML elements (like `<input type="file">`, `<select>`, etc.)
- Use other UI libraries

**DO:**

- Use shadcn components for all UI elements
- Follow existing component patterns in `/apps/web/src/components/`
- Maintain consistent styling with Tailwind CSS
- Ensure responsive design (mobile, tablet, desktop)
- Use proper TypeScript types

---

### 2. API Client Pattern

Follow existing pattern in `/apps/web/src/lib/api/`:

```typescript
// Example: /apps/web/src/lib/api/users.ts
import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export const usersApi = {
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    const response = await apiClient.patch('/users/profile', data);
    return response.data;
  },

  // ... other methods
};
```

Export from `/apps/web/src/lib/api/index.ts`:

```typescript
export * from './users';
```

---

### 3. Backend Module Structure

Follow NestJS conventions:

```
/apps/api/src/modules/users/
├── users.module.ts          # Module definition
├── users.controller.ts      # HTTP endpoints
├── users.service.ts         # Business logic
├── users.service.spec.ts    # Unit tests
├── dto/
│   ├── update-profile.dto.ts
│   └── user-stats.dto.ts
└── entities/
    └── user.entity.ts       # If needed
```

**DTOs must use class-validator:**

```typescript
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'User full name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ description: 'User email address' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
```

---

### 4. Prisma Schema Updates

If new tables needed, update `/apps/api/prisma/schema.prisma`:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String?
  avatar        String?   // Add avatar field
  refreshToken  String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime? // Add for soft delete

  // Add settings relation
  settings      UserSettings?

  links         Link[]
  oneLinks      OneLink[]
}

// Add new UserSettings table
model UserSettings {
  id                  String   @id @default(cuid())
  userId              String   @unique
  emailNotifications  Boolean  @default(true)
  analyticsEnabled    Boolean  @default(true)
  customDomain        String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

After schema changes:

```bash
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate
```

---

### 5. Email Service Setup

For password reset emails, create email service:

```typescript
// /apps/api/src/modules/email/email.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: 'Reset Your Password',
      html: `
        <h1>Password Reset Request</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  }
}
```

Add to `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@shorly.com
FRONTEND_URL=http://localhost:3000
```

---

### 6. File Upload Setup

For avatar uploads:

```typescript
// /apps/api/src/modules/users/users.controller.ts
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Post('profile/avatar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `avatar-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
        cb(new BadRequestException('Only JPG and PNG files allowed'), false);
      } else {
        cb(null, true);
      }
    },
  })
)
uploadAvatar(
  @CurrentUser('id') userId: string,
  @UploadedFile() file: Express.Multer.File
) {
  return this.usersService.uploadAvatar(userId, file);
}
```

Install multer types:

```bash
cd apps/api
pnpm add -D @types/multer
```

Create uploads directory:

```bash
mkdir -p apps/api/uploads/avatars
```

Add to `.gitignore`:

```
uploads/
```

Serve static files in `main.ts`:

```typescript
app.useStaticAssets(join(__dirname, '..', 'uploads'), {
  prefix: '/uploads/',
});
```

---

### 7. Error Handling

Use proper NestJS exceptions:

```typescript
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

// Examples:
throw new NotFoundException('User not found');
throw new ConflictException('Email already exists');
throw new UnauthorizedException('Invalid password');
throw new BadRequestException('Invalid file type');
```

---

### 8. Validation

Always validate DTOs:

```typescript
// Enable global validation in main.ts (already done)
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  })
);
```

---

### 9. Testing Best Practices

**Unit Tests:**

- Mock all dependencies (Prisma, Redis, EmailService)
- Test business logic in isolation
- Test edge cases and error handling
- Use `jest.mock()` for external services

**Integration Tests:**

- Use real database (test database)
- Use real Redis
- Test service interactions
- Test transactions and race conditions

**E2E Tests:**

- Test complete HTTP flows
- Test authentication/authorization
- Test validation errors
- Use `supertest` for HTTP requests
- Clean up test data in `afterEach`

**Run tests:**

```bash
# Unit tests with coverage
pnpm --filter @shorly/api test:cov

# Integration tests
pnpm --filter @shorly/api test:integration

# E2E tests
pnpm --filter @shorly/api test:e2e

# All tests
pnpm --filter @shorly/api test:all
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Create `UsersModule`, `UsersController`, `UsersService`
- [ ] Add user profile endpoints (GET, PATCH)
- [ ] Add avatar upload endpoint
- [ ] Add user stats endpoint
- [ ] Add delete account endpoint
- [ ] Add change password endpoint to AuthController
- [ ] Add forgot password endpoint to AuthController
- [ ] Add reset password endpoint to AuthController
- [ ] Create `EmailService` for password reset emails
- [ ] Add user settings endpoints (GET, PATCH)
- [ ] Update Prisma schema (avatar, deletedAt, UserSettings table)
- [ ] Run Prisma migration
- [ ] Set up file upload middleware (multer)
- [ ] Configure email service (SMTP)
- [ ] Write unit tests for all new services
- [ ] Write integration tests for all new features
- [ ] Write E2E tests for all new endpoints
- [ ] Verify 100% test coverage with `pnpm test:cov`
- [ ] Update Swagger documentation

### Frontend Tasks

- [ ] Create `/apps/web/src/lib/api/users.ts` with all user endpoints
- [ ] Update profile page to fetch and display real user data
- [ ] Implement profile update functionality
- [ ] Implement avatar upload with file picker
- [ ] Implement change password functionality
- [ ] Fetch and display user stats in profile page
- [ ] Update settings page to fetch and save settings
- [ ] Implement delete account with confirmation dialog
- [ ] Create `CreateOneLinkDialog` component
- [ ] Create `EditOneLinkDialog` component
- [ ] Create `OneLinksTable` component
- [ ] Integrate OneLinks CRUD in OneLinks page
- [ ] Implement forgot password page
- [ ] Implement reset password page
- [ ] Add forgot password link to login page
- [ ] Test all forms with validation
- [ ] Test error handling and toast notifications
- [ ] Test responsive design on mobile/tablet/desktop
- [ ] Verify all shadcn components used correctly

### Documentation Tasks

- [ ] Update API documentation (if using external docs)
- [ ] Update README with new features
- [ ] Document email configuration in deployment guide
- [ ] Document file upload configuration

---

## Testing Verification Commands

After implementing all features, run these commands to verify:

```bash
# 1. Backend tests
cd apps/api

# Unit tests with coverage
pnpm test:cov
# ✓ Should show 100% coverage

# Integration tests
pnpm test:integration
# ✓ All tests should pass

# E2E tests
pnpm test:e2e
# ✓ All tests should pass

# 2. Type checking
cd ../..
pnpm type-check
# ✓ No TypeScript errors

# 3. Linting
pnpm lint
# ✓ No linting errors

# 4. Build
pnpm build
# ✓ All apps build successfully

# 5. Start development servers
pnpm dev
# ✓ API runs on http://localhost:3001
# ✓ Web runs on http://localhost:3000
```

---

## Additional Notes

### Security Considerations

1. **Password Reset Tokens:**
   - Generate cryptographically secure tokens
   - Store in Redis with 1-hour expiration
   - One-time use only (delete after use)

2. **File Uploads:**
   - Validate file types (whitelist JPG/PNG)
   - Limit file size (2MB max)
   - Sanitize filenames
   - Store outside webroot if possible

3. **Email Change:**
   - Send verification email to new address
   - Keep old email until verified
   - Prevent email enumeration

4. **Account Deletion:**
   - Require password confirmation
   - Use soft delete (keep data for 30 days)
   - Provide data export option (GDPR)

### Performance Considerations

1. **Avatar Storage:**
   - Consider using CDN or S3 for production
   - Implement image optimization/resizing
   - Cache avatar URLs

2. **Email Sending:**
   - Use queue (Bull/BullMQ) for async email sending
   - Implement retry logic
   - Rate limit to prevent spam

### Accessibility

- All forms must have proper labels
- Error messages must be descriptive
- Keyboard navigation must work
- Screen reader friendly
- Color contrast WCAG AA compliant

### Responsive Design

- Test on mobile (320px - 768px)
- Test on tablet (768px - 1024px)
- Test on desktop (1024px+)
- Use shadcn responsive utilities
- Touch-friendly tap targets (min 44px)

---

## Success Criteria

✅ All features implemented and working
✅ 100% test coverage achieved
✅ All tests passing (unit, integration, E2E)
✅ No TypeScript errors
✅ No linting errors
✅ Build succeeds without errors
✅ All pages responsive
✅ All forms validated
✅ Error handling complete
✅ Documentation updated

---

## Questions or Issues?

If you encounter any issues or have questions:

1. Check existing code patterns in the codebase
2. Review `/docs/TESTING.md` for testing guidelines
3. Review `/docs/ARCHITECTURE.md` for architecture details
4. Check Prisma schema for data models
5. Refer to shadcn/ui documentation: https://ui.shadcn.com

**Good luck with the implementation! 🚀**
