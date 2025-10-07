'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { analyticsApi, linksApi, type Link, type AnalyticsData } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Users, MousePointerClick, Globe, Smartphone, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';


function AnalyticsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const linkParam = searchParams.get('link');

  const [links, setLinks] = useState<Link[]>([]);
  const [link, setLink] = useState<Link | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [dateRange, setDateRange] = useState('7');

  const fetchData = useCallback(async () => {
    if (!linkParam) return;

    try {
      setLoading(true);
      const linkData = await linksApi.getByShortCode(linkParam);
      setLink(linkData);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const rawData = await analyticsApi.getLinkAnalytics(linkData.id, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Ensure analytics data has the expected array structure
      const transformedData: AnalyticsData = {
        totalClicks: rawData.totalClicks || 0,
        uniqueVisitors: rawData.uniqueVisitors || 0,
        clicksByDate: Array.isArray(rawData.clicksByDate)
          ? rawData.clicksByDate.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          : Object.entries(rawData.clicksByDate || {})
              .map(([date, clicks]) => ({ date, clicks: Number(clicks) }))
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        clicksByCountry: Array.isArray(rawData.clicksByCountry)
          ? rawData.clicksByCountry.sort((a, b) => b.clicks - a.clicks)
          : Object.entries(rawData.clicksByCountry || {})
              .map(([country, clicks]) => ({ country, clicks: Number(clicks) }))
              .sort((a, b) => b.clicks - a.clicks),
        clicksByDevice: Array.isArray(rawData.clicksByDevice)
          ? rawData.clicksByDevice.sort((a, b) => b.clicks - a.clicks)
          : Object.entries((rawData as any).byDevice || {})
              .map(([device, clicks]) => ({ device, clicks: Number(clicks) }))
              .sort((a, b) => b.clicks - a.clicks),
        clicksByBrowser: Array.isArray(rawData.clicksByBrowser)
          ? rawData.clicksByBrowser.sort((a, b) => b.clicks - a.clicks)
          : Object.entries((rawData as any).byBrowser || {})
              .map(([browser, clicks]) => ({ browser, clicks: Number(clicks) }))
              .sort((a, b) => b.clicks - a.clicks),
        clicksByReferrer: Array.isArray(rawData.clicksByReferrer)
          ? rawData.clicksByReferrer.sort((a, b) => b.clicks - a.clicks)
          : Object.entries((rawData as any).byReferer || {})
              .map(([referrer, clicks]) => ({ referrer, clicks: Number(clicks) }))
              .sort((a, b) => b.clicks - a.clicks),
      };

      setAnalytics(transformedData);
    } catch (error) {
      toast.error('Failed to load analytics');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [linkParam, dateRange]);

  const fetchLinks = async () => {
    try {
      setLoadingLinks(true);
      const data = await linksApi.getAll();
      setLinks(data);
    } catch (error) {
      toast.error('Failed to load links');
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  useEffect(() => {
    if (linkParam) {
      fetchData();
    }
  }, [linkParam, dateRange, fetchData]);

  if (!linkParam) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="mt-2 text-muted-foreground">Select a link to view analytics</p>
        </div>

        {loadingLinks ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading links...</div>
          </div>
        ) : links.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <BarChart2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-2xl font-bold">No Links Found</h2>
              <p className="text-muted-foreground mt-2">Create a link first to view analytics</p>
              <Button className="mt-4" onClick={() => router.push('/dashboard/links')}>
                Go to Links
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {links.map((l) => (
              <Card
                key={l.id}
                className="p-6 hover:border-primary cursor-pointer transition-colors"
                onClick={() => router.push(`/dashboard/analytics?link=${l.shortCode}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">/{l.shortCode}</h3>
                    {l.title && <p className="text-sm text-muted-foreground mt-1">{l.title}</p>}
                  </div>
                  <BarChart2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground truncate mb-2">{l.destinationUrl}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Clicks</span>
                  <span className="font-semibold">{(l.clicks ?? 0).toLocaleString()}</span>
                </div>
                <Button className="w-full mt-4" size="sm">
                  View Analytics
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          {link && (
            <p className="mt-2 text-muted-foreground">
              Analytics for /{link.shortCode}
              {link.title && ` - ${link.title}`}
            </p>
          )}
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <MousePointerClick className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
              <h3 className="text-2xl font-bold">
                {(analytics?.totalClicks || 0).toLocaleString()}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-500/10 p-3">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Unique Visitors</p>
              <h3 className="text-2xl font-bold">
                {(analytics?.uniqueVisitors || 0).toLocaleString()}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-500/10 p-3">
              <Globe className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Countries</p>
              <h3 className="text-2xl font-bold">{analytics?.clicksByCountry?.length || 0}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-purple-500/10 p-3">
              <Smartphone className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Devices</p>
              <h3 className="text-2xl font-bold">{analytics?.clicksByDevice?.length || 0}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Clicks by Date */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Clicks Over Time</h3>
          <div className="space-y-2">
            {analytics?.clicksByDate?.slice(0, 10).map((item) => (
              <div key={item.date} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {new Date(item.date).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${(item.clicks / (analytics?.totalClicks || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{item.clicks}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Clicks by Country */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Countries</h3>
          <div className="space-y-2">
            {analytics?.clicksByCountry?.slice(0, 10).map((item) => (
              <div key={item.country} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.country || 'Unknown'}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${(item.clicks / (analytics?.totalClicks || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{item.clicks}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Clicks by Device */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Devices</h3>
          <div className="space-y-2">
            {analytics?.clicksByDevice?.map((item) => (
              <div key={item.device} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">{item.device}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{
                        width: `${(item.clicks / (analytics?.totalClicks || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{item.clicks}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Clicks by Referrer */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Referrers</h3>
          <div className="space-y-2">
            {analytics?.clicksByReferrer?.slice(0, 10).map((item) => (
              <div key={item.referrer} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {item.referrer || 'Direct'}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(item.clicks / (analytics?.totalClicks || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{item.clicks}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AnalyticsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-muted-foreground">Loading...</div></div>}>
      <AnalyticsPage />
    </Suspense>
  );
}

export default AnalyticsPageWrapper;
