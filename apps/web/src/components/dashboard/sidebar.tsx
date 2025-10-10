'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Link2,
  BarChart3,
  QrCode,
  Settings,
  Smartphone,
  LogOut,
  Users,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalePath } from '@/lib/locale-routing';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrentUser } from '@/hooks/use-current-user';

const routes = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    label: 'Links',
    icon: Link2,
    href: '/dashboard/links',
  },
  {
    label: 'OneLinks',
    icon: Smartphone,
    href: '/dashboard/onelinks',
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    href: '/dashboard/analytics',
  },
  {
    label: 'QR Codes',
    icon: QrCode,
    href: '/dashboard/qr',
  },
  {
    label: 'Settings',
    icon: Settings,
    href: '/dashboard/settings',
  },
];

const adminRoutes = [
  {
    label: 'Admin',
    icon: Shield,
    href: '/admin',
  },
  {
    label: 'Users',
    icon: Users,
    href: '/admin/users',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { buildPath } = useLocalePath();
  const { user } = useCurrentUser();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = buildPath('/login');
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href={buildPath('/dashboard')} className="flex items-center gap-2">
          <Link2 className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">Shorly</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {routes.map((route) => {
            const localizedHref = buildPath(route.href);
            return (
              <Link key={route.href} href={localizedHref}>
                <Button
                  variant={pathname === localizedHref ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    pathname === localizedHref && 'bg-secondary'
                  )}
                >
                  <route.icon className="mr-2 h-4 w-4" />
                  {route.label}
                </Button>
              </Link>
            );
          })}

          {/* Admin Routes - Only show to admin users */}
          {isAdmin && (
            <>
              <div className="my-2 px-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </div>
              </div>
              {adminRoutes.map((route) => {
                const localizedHref = buildPath(route.href);
                return (
                  <Link key={route.href} href={localizedHref}>
                    <Button
                      variant={pathname === localizedHref ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-start',
                        pathname === localizedHref && 'bg-secondary'
                      )}
                    >
                      <route.icon className="mr-2 h-4 w-4" />
                      {route.label}
                    </Button>
                  </Link>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Logout */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
