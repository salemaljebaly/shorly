'use client';

import { useState } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UsersTable } from '@/components/admin/users-table';
import { User, UserDetails } from '@/lib/api/admin';
import { UserDialog } from '@/components/admin/user-dialog';
import { useToast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/api/admin';

export default function AdminUsersPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create' | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const openUserDialog = async (user: User, mode: 'view' | 'edit') => {
    try {
      setLoading(true);
      setSelectedUser(user);
      const details = await adminApi.getUserDetails(user.id);
      setUserDetails(details.data);
      setDialogMode(mode);
      setIsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch user details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserView = (user: User) => openUserDialog(user, 'view');

  const handleUserEdit = (user: User) => openUserDialog(user, 'edit');

  const handleAddUser = () => {
    setSelectedUser(null);
    setUserDetails(null);
    setDialogMode('create');
    setIsDialogOpen(true);
  };

  const resetDialogState = () => {
    setSelectedUser(null);
    setUserDetails(null);
    setDialogMode(null);
  };

  const dispatchUsersRefresh = () => {
    window.dispatchEvent(new Event('usersTableRefresh'));
  };

  const handleUserUpdated = () => {
    dispatchUsersRefresh();
    setIsDialogOpen(false);
    resetDialogState();
  };

  const handleUserCreated = () => {
    dispatchUsersRefresh();
    setIsDialogOpen(false);
    resetDialogState();
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetDialogState();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          View and manage all users in the system
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <Button onClick={handleAddUser} className="w-full sm:w-auto">
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </CardHeader>
        <CardContent>
          <UsersTable
            onUserView={handleUserView}
            onUserEdit={handleUserEdit}
          />
        </CardContent>
      </Card>

      {dialogMode && (
        <UserDialog
          mode={dialogMode}
          user={selectedUser}
          userDetails={userDetails}
          open={isDialogOpen}
          onOpenChange={handleDialogOpenChange}
          onEdit={dialogMode === 'view' ? () => setDialogMode('edit') : undefined}
          onUpdated={handleUserUpdated}
          onCreated={handleUserCreated}
        />
      )}
    </div>
  );
}
