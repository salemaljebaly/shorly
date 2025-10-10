'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, MousePointerClick, Eye, TrendingUp } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { QuickCreateLink } from '@/components/dashboard/quick-create-link';
import { RecentLinksTable } from '@/components/dashboard/recent-links-table';
import { Button } from '@/components/ui/button';
import { linksApi, oneLinksApi, type Link, type OneLink } from '@/lib/api';
import { useLocalePath } from '@/lib/locale-routing';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const { buildPath } = useLocalePath();
  const [links, setLinks] = useState<Link[]>([]);
  const [oneLinks, setOneLinks] = useState<OneLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLinks: 0,
    totalClicks: 0,
    activeLinks: 0,
    clickRate: 0,
    totalOneLinks: 0,
    totalOneLinkClicks: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [linksResult, oneLinksResult] = await Promise.all([
        linksApi.getAll(),
        oneLinksApi.getAll(),
      ]);

      setLinks(linksResult.data);
      setOneLinks(oneLinksResult.data);

      // Calculate stats for links
      const totalLinkClicks = linksResult.data.reduce((sum, link) => sum + (link.clicks || 0), 0);
      const activeLinks = linksResult.data.filter((link) => link.isActive).length;
      const linkClickRate =
        linksResult.data.length > 0 ? (totalLinkClicks / linksResult.data.length).toFixed(1) : 0;

      // Calculate stats for OneLinks
      const totalOneLinkClicks = oneLinksResult.data.reduce(
        (sum, oneLink) => sum + (oneLink.clicks || 0),
        0
      );

      setStats({
        totalLinks: linksResult.total,
        totalClicks: totalLinkClicks,
        activeLinks,
        clickRate: Number(linkClickRate),
        totalOneLinks: oneLinksResult.total,
        totalOneLinkClicks,
      });
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const recentLinks = links.slice(0, 5).map((link) => ({
    id: link.id,
    shortCode: link.shortCode,
    originalUrl: link.destinationUrl,
    title: link.title,
    clicks: link.clicks || 0,
    isActive: link.isActive,
    createdAt: link.createdAt,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back! Here&apos;s an overview of your links.
          </p>
        </div>
        <Button onClick={() => router.push(buildPath('/dashboard/links'))}>
          <Link2 className="mr-2 h-4 w-4" />
          Create Link
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Links"
          value={loading ? '...' : stats.totalLinks}
          description={`${stats.totalOneLinks} OneLinks`}
          icon={Link2}
        />
        <StatsCard
          title="Total Clicks"
          value={loading ? '...' : (stats.totalClicks + stats.totalOneLinkClicks).toLocaleString()}
          description={`${stats.totalOneLinkClicks} from OneLinks`}
          icon={MousePointerClick}
        />
        <StatsCard
          title="Active Links"
          value={loading ? '...' : stats.activeLinks}
          description="Currently active"
          icon={Eye}
        />
        <StatsCard
          title="Avg. Clicks/Link"
          value={loading ? '...' : stats.clickRate}
          description="Average per link"
          icon={TrendingUp}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Create */}
        <div className="lg:col-span-1">
          <QuickCreateLink onSuccess={fetchData} />
        </div>

        {/* Recent Links */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent Links</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(buildPath('/dashboard/links'))}
              >
                View All
              </Button>
            </div>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <RecentLinksTable links={recentLinks} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
