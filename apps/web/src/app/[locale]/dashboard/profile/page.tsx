'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function ProfilePage() {
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john@example.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = () => {
    toast.success('Profile updated successfully!');
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    toast.success('Password changed successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="mt-2 text-muted-foreground">Manage your profile information and security</p>
      </div>

      <div className="space-y-6">
        {/* Profile Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src="/avatar.png" />
                <AvatarFallback className="text-lg">
                  {name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm">
                  Change Photo
                </Button>
                <p className="text-sm text-muted-foreground mt-1">JPG, PNG or GIF. Max 2MB</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button onClick={handleUpdateProfile}>Update Profile</Button>
          </div>
        </Card>

        {/* Change Password */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Change Password</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Current Password</Label>
              <Input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new">New Password</Label>
              <Input
                id="new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm New Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button onClick={handleChangePassword}>Change Password</Button>
          </div>
        </Card>

        {/* Account Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Account Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since:</span>
              <span className="font-medium">January 2025</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account type:</span>
              <span className="font-medium">Pro</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total links:</span>
              <span className="font-medium">42</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
