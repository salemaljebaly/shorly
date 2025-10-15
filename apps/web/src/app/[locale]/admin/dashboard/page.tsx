'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Link2, BarChart3, Activity, TrendingUp, MousePointerClick } from 'lucide-react';
import { adminApi, type DashboardMetrics } from '@/lib/api/admin';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getDashboardMetrics();
      setMetrics(response.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch dashboard metrics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Loading dashboard metrics...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const growthPercentage = metrics.users.newThisMonth > 0
    ? ((metrics.users.newThisMonth / Math.max(metrics.users.total - metrics.users.newThisMonth, 1)) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and key metrics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.users.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{metrics.users.newThisMonth}</span> this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.users.active.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((metrics.users.active / Math.max(metrics.users.total, 1)) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.usage.totalLinks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.usage.totalOneLinks.toLocaleString()} OneLinks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.usage.totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.usage.clicksToday.toLocaleString()} today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Signups Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            User Signups (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.signupsByDay}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => format(new Date(date), 'MM/dd')}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip
                labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-start justify-between border-b pb-3 last:border-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {activity.type === 'USER_REGISTERED' && '🎉 New user registered'}
                      {activity.type === 'LINK_CREATED' && '🔗 Link created'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.type === 'USER_REGISTERED' && activity.details.email}
                      {activity.type === 'LINK_CREATED' && `Short code: ${activity.details.shortCode}`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.timestamp), 'MMM dd, HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New this week</span>
                <span className="text-sm font-bold">{metrics.users.newThisWeek} users</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Growth rate</span>
                <span className="text-sm font-bold text-green-600">+{growthPercentage}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. links/user</span>
                <span className="text-sm font-bold">
                  {(metrics.usage.totalLinks / Math.max(metrics.users.total, 1)).toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. clicks/link</span>
                <span className="text-sm font-bold">
                  {(metrics.usage.totalClicks / Math.max(metrics.usage.totalLinks, 1)).toFixed(1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
