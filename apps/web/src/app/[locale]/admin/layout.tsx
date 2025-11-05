import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminRouteProtection } from '@/components/admin/admin-route-protection';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRouteProtection>
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
        </div>
      </div>
    </AdminRouteProtection>
  );
}