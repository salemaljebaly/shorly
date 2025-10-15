'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useLocalePath } from '@/lib/locale-routing';

interface AdminRouteProtectionProps {
  children: React.ReactNode;
}

export function AdminRouteProtection({ children }: AdminRouteProtectionProps) {
  const router = useRouter();
  const { buildPath } = useLocalePath();
  const { user, loading } = useCurrentUser();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      // Check if user is admin
      const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

      if (!user) {
        // Not logged in, redirect to login
        console.log('AdminRouteProtection: No user - redirecting to login');
        window.location.href = buildPath('/login');
        return;
      }

      if (!isAdmin) {
        // Logged in but not admin, redirect to user dashboard
        console.log('AdminRouteProtection: Not admin - redirecting to dashboard');
        window.location.href = buildPath('/dashboard');
        return;
      }

      // Admin access confirmed
      console.log('AdminRouteProtection: Admin access granted');
      setIsChecking(false);
    }
  }, [user, loading, router, buildPath]);

  if (loading || isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Verifying admin access...</h2>
            <p className="text-muted-foreground">Please wait while we check your permissions.</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}