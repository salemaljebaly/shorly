'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, FileJson, FileSpreadsheet, Calendar as CalendarIcon, Filter, RotateCcw, Activity, User, Target, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import adminApi from '@/lib/api/admin';

interface AdminLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, any>;
  timestamp: string;
}

interface LogStats {
  totalActions: number;
  uniqueAdmins: number;
  actionsByType: Record<string, number>;
}

export default function AdminLogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [pageSize] = useState(50);

  // Filters
  const [adminIdFilter, setAdminIdFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [targetIdFilter, setTargetIdFilter] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const actionTypes = [
    'VIEW_USER',
    'CREATE_USER',
    'EDIT_USER',
    'DELETE_USER',
    'SUSPEND_USER',
    'ACTIVATE_USER',
    'IMPERSONATE_USER',
    'RESET_PASSWORD_USER',
    'VIEW_BILLING',
    'EDIT_SUBSCRIPTION',
    'CANCEL_SUBSCRIPTION',
    'REFUND_PAYMENT',
  ];

  const targetTypes = ['USER', 'SUBSCRIPTION', 'PAYMENT', 'TICKET', 'FAQ', 'INVOICE', 'CONTENT', 'ROLE'];

  // Fetch logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
      };

      if (adminIdFilter) params.adminId = adminIdFilter;
      if (actionFilter) params.action = actionFilter;
      if (targetTypeFilter) params.targetType = targetTypeFilter;
      if (targetIdFilter) params.targetId = targetIdFilter;
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      console.log('Fetching logs with params:', params);
      const response = await adminApi.getAdminLogs(params);
      console.log('API Response:', response);
      console.log('Response data:', response.data);

      setLogs(response.data.logs);
      setTotalPages(response.data.pagination.totalPages);
      setTotalLogs(response.data.pagination.total);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch admin logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      console.log('Fetching stats...');
      const response = await adminApi.getAdminLogStats();
      console.log('Stats response:', response);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [currentPage]);

  const handleApplyFilters = () => {
    setCurrentPage(1); // Reset to first page
    fetchLogs();
  };

  const handleResetFilters = () => {
    setAdminIdFilter('');
    setActionFilter('');
    setTargetTypeFilter('');
    setTargetIdFilter('');
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
    fetchLogs();
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const params: any = {};
      if (adminIdFilter) params.adminId = adminIdFilter;
      if (actionFilter) params.action = actionFilter;
      if (targetTypeFilter) params.targetType = targetTypeFilter;
      if (targetIdFilter) params.targetId = targetIdFilter;
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      // Fetch all logs without pagination for export
      params.limit = 10000;
      const response = await adminApi.getAdminLogs(params);
      const allLogs = response.data.logs;

      if (format === 'json') {
        const dataStr = JSON.stringify(allLogs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `admin-logs-${Date.now()}.json`;
        link.click();
      } else {
        // CSV export
        const headers = ['Timestamp', 'Admin Email', 'Action', 'Target Type', 'Target ID', 'Metadata'];
        const csvRows = [headers.join(',')];

        allLogs.forEach((log: AdminLog) => {
          const row = [
            log.timestamp,
            log.adminEmail,
            log.action,
            log.targetType,
            log.targetId,
            JSON.stringify(log.metadata).replace(/,/g, ';'),
          ];
          csvRows.push(row.join(','));
        });

        const csvStr = csvRows.join('\n');
        const dataBlob = new Blob([csvStr], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `admin-logs-${Date.now()}.csv`;
        link.click();
      }

      toast({
        title: 'Success',
        description: `Logs exported as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export logs',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('CREATED')) return 'default';
    if (action.includes('UPDATED')) return 'secondary';
    if (action.includes('DELETED') || action.includes('CANCELLED')) return 'destructive';
    if (action.includes('SUSPENDED')) return 'destructive';
    if (action.includes('IMPERSONATED')) return 'outline';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Audit Logs</h1>
          <p className="text-muted-foreground">
            View and track all administrative actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={exporting || !logs || logs.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            disabled={exporting || !logs || logs.length === 0}
          >
            <FileJson className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActions}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Admins</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueAdmins}</div>
              <p className="text-xs text-muted-foreground">Performed actions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Common Action</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.actionsByType && Object.keys(stats.actionsByType).length > 0
                  ? Object.entries(stats.actionsByType).sort((a, b) => b[1] - a[1])[0]?.[0]
                  : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.actionsByType && Object.keys(stats.actionsByType).length > 0
                  ? `${Object.entries(stats.actionsByType).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} times`
                  : '0 times'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter logs by various criteria</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="admin-id">Admin ID</Label>
              <Input
                id="admin-id"
                placeholder="Filter by admin ID"
                value={adminIdFilter}
                onChange={(e) => setAdminIdFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action Type</Label>
              <Select value={actionFilter || undefined} onValueChange={setActionFilter}>
                <SelectTrigger id="action">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-type">Target Type</Label>
              <Select value={targetTypeFilter || undefined} onValueChange={setTargetTypeFilter}>
                <SelectTrigger id="target-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {targetTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-id">Target ID</Label>
              <Input
                id="target-id"
                placeholder="Filter by target ID"
                value={targetIdFilter}
                onChange={(e) => setTargetIdFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApplyFilters} disabled={loading}>
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline" onClick={handleResetFilters}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>
            Showing {logs?.length || 0} of {totalLogs} total logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading logs...
                    </TableCell>
                  </TableRow>
                ) : !logs || logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.timestamp), 'PPp')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.adminEmail}</span>
                          <span className="text-xs text-muted-foreground">{log.adminId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.targetType}</TableCell>
                      <TableCell className="font-mono text-xs">{log.targetId}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Log Details</DialogTitle>
                              <DialogDescription>
                                Full details for log entry {log.id}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-semibold">Timestamp</Label>
                                <p className="text-sm">{format(new Date(log.timestamp), 'PPpp')}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-semibold">Admin</Label>
                                <p className="text-sm">{log.adminEmail}</p>
                                <p className="text-xs text-muted-foreground font-mono">{log.adminId}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-semibold">Action</Label>
                                <div className="mt-1">
                                  <Badge variant={getActionBadgeVariant(log.action)}>
                                    {log.action}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm font-semibold">Target</Label>
                                <p className="text-sm">Type: {log.targetType}</p>
                                <p className="text-xs text-muted-foreground font-mono">ID: {log.targetId}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-semibold">Metadata</Label>
                                <pre className="mt-2 rounded-md bg-slate-950 p-4 text-xs text-slate-50 overflow-x-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
