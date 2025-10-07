'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Link2, BarChart3, QrCode, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Link2 className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">Shorly</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {routes.map((route) => (
            <Link key={route.href} href={route.href}>
              <Button
                variant={pathname === route.href ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start', pathname === route.href && 'bg-secondary')}
              >
                <route.icon className="mr-2 h-4 w-4" />
                {route.label}
              </Button>
            </Link>
          ))}
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
