'use client';

import { useEffect, useState } from 'react';
import { UserCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalePath } from '@/lib/locale-routing';

export function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [targetUser, setTargetUser] = useState<{ name: string | null; email: string } | null>(null);
  const { buildPath } = useLocalePath();

  useEffect(() => {
    const impersonating = localStorage.getItem('impersonating') === 'true';
    const userData = localStorage.getItem('impersonated_user');

    setIsImpersonating(impersonating);
    if (impersonating && userData) {
      try {
        setTargetUser(JSON.parse(userData));
      } catch {
        setTargetUser(null);
      }
    }
  }, []);

  const handleExitImpersonation = () => {
    // Restore admin tokens
    const adminAccessToken = localStorage.getItem('admin_access_token');
    const adminRefreshToken = localStorage.getItem('admin_refresh_token');
    const adminUserData = localStorage.getItem('admin_user_data');

    if (adminAccessToken) localStorage.setItem('access_token', adminAccessToken);
    if (adminRefreshToken) localStorage.setItem('refresh_token', adminRefreshToken);
    if (adminUserData) localStorage.setItem('user_data', adminUserData);

    // Clear impersonation data
    localStorage.removeItem('impersonating');
    localStorage.removeItem('impersonated_user');
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user_data');

    // Redirect back to admin panel
    window.location.href = buildPath('/admin/users');
  };

  if (!isImpersonating || !targetUser) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 bg-yellow-500 text-yellow-950 px-4 py-3 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCheck className="h-5 w-5" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-semibold">Impersonation Mode</span>
            <span className="text-sm">
              Viewing as: {targetUser.name || targetUser.email}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExitImpersonation}
          className="bg-yellow-600 text-yellow-50 hover:bg-yellow-700 hover:text-yellow-50 border-yellow-700"
        >
          <X className="mr-2 h-4 w-4" />
          Exit Impersonation
        </Button>
      </div>
    </div>
  );
}
