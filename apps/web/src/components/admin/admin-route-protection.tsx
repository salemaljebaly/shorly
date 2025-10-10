'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';

interface AdminRouteProtectionProps {
  children: React.ReactNode;
}

export function AdminRouteProtection({ children }: AdminRouteProtectionProps) {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    console.log('AdminRouteProtection - User:', user, 'Loading:', loading); // Debug log

    if (!loading) {
      // Check if user is admin
      const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
      console.log('AdminRouteProtection - IsAdmin:', isAdmin); // Debug log

      if (!user) {
        // Not logged in, redirect to login
        console.log('Redirecting to login');
        window.location.href = '/login';
        return;
      }

      if (!isAdmin) {
        // Logged in but not admin, redirect to user dashboard
        console.log('Redirecting to dashboard - not admin');
        window.location.href = '/dashboard';
        return;
      }

      console.log('Admin access confirmed');
      setIsChecking(false);
    }
  }, [user, loading, router]);

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