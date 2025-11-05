'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  TrendingUp,
  Activity,
  Database,
  Zap,
  Clock,
  Users,
  Link2,
  MousePointerClick,
} from 'lucide-react';
import { adminApi, type MonitoringData } from '@/lib/api/admin';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function AdminMonitoring() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getMonitoringData();
      setData(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch monitoring data. System may be experiencing issues.';
      setError(errorMessage);
      toast({
        title: 'Error Loading Monitoring Data',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">Loading monitoring data...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">Real-time system health and user activity monitoring</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Unable to Load Monitoring Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {error || 'Failed to fetch monitoring data. The system may be experiencing connectivity issues with the database or cache.'}
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchMonitoringData}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Retry
              </button>
              <p className="text-sm text-muted-foreground">
                If this issue persists, check database and Redis connectivity.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-600">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="default" className="bg-yellow-600">Degraded</Badge>;
      case 'down':
        return <Badge variant="destructive">Down</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan.toUpperCase()) {
      case 'PRO':
        return 'bg-purple-600';
      case 'STARTER':
        return 'bg-blue-600';
      case 'FREE':
        return 'bg-gray-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <p className="text-muted-foreground">Real-time system health and user activity monitoring</p>
      </div>

      {/* System Health Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className={`h-4 w-4 ${getStatusColor(data.systemHealth.database.status)}`} />
          </CardHeader>
          <CardContent>
            {getStatusBadge(data.systemHealth.database.status)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redis Cache</CardTitle>
            <Zap className={`h-4 w-4 ${getStatusColor(data.systemHealth.redis.status)}`} />
          </CardHeader>
          <CardContent>
            {getStatusBadge(data.systemHealth.redis.status)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.systemHealth.activeUsers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.systemHealth.activeLinks.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicks Today</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.systemHealth.clicksToday.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users at Risk */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Users at Risk ({data.usersAtRisk.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Users approaching or exceeding 80% of their plan limits
          </p>
        </CardHeader>
        <CardContent>
          {data.usersAtRisk.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users at risk. All users are within their plan limits.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Links Usage</TableHead>
                    <TableHead>Clicks Usage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.usersAtRisk.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name || 'No name'}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPlanBadgeColor(user.plan)}>
                          {user.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{user.linksUsed} / {user.linksLimit}</span>
                            <span className={user.linksUsagePercentage >= 100 ? 'text-red-600' : user.linksUsagePercentage >= 80 ? 'text-yellow-600' : ''}>
                              {user.linksUsagePercentage.toFixed(0)}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min(user.linksUsagePercentage, 100)}
                            className="h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{user.clicksUsed} / {user.clicksLimit}</span>
                            <span className={user.clicksUsagePercentage >= 100 ? 'text-red-600' : user.clicksUsagePercentage >= 80 ? 'text-yellow-600' : ''}>
                              {user.clicksUsagePercentage.toFixed(0)}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min(user.clicksUsagePercentage, 100)}
                            className="h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.status || 'ACTIVE'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Heavy Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Heavy Users (Top 10)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Users with the highest click activity
          </p>
        </CardHeader>
        <CardContent>
          {data.heavyUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No user activity data available yet.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Total Links</TableHead>
                    <TableHead>Total Clicks</TableHead>
                    <TableHead>Avg Clicks/Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.heavyUsers.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name || 'No name'}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPlanBadgeColor(user.plan)}>
                          {user.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{user.totalLinks.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{user.totalClicks.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {user.totalLinks > 0 ? (user.totalClicks / user.totalLinks).toFixed(1) : '0.0'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
