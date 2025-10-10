'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { linksApi, type Link, type PaginatedLinks } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LinksTable } from '@/components/links/links-table';
import { CreateLinkDialog } from '@/components/links/create-link-dialog';
import { toast } from 'sonner';

export default function LinksPage() {
  const [linksResult, setLinksResult] = useState<PaginatedLinks | null>(null);
  const links: Link[] = linksResult?.data ?? [];
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchLinks = useCallback(
    async (options?: { page?: number; pageSize?: number }) => {
      const nextPage = options?.page ?? page;
      const nextPageSize = options?.pageSize ?? pageSize;

      try {
        setLoading(true);
        const result = await linksApi.getAll({ page: nextPage, pageSize: nextPageSize });
        setLinksResult(result);
        setPage(result.page);
        setPageSize(result.pageSize);
      } catch (error) {
        toast.error('Failed to load links');
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize]
  );

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handlePageChange = (nextPage: number) => {
    fetchLinks({ page: nextPage });
  };

  const handlePageSizeChange = (nextSize: number) => {
    fetchLinks({ page: 1, pageSize: nextSize });
  };

  const refreshLinks = () => {
    fetchLinks();
  };

  const filteredLinks = links.filter((link) => {
    const matchesSearch =
      link.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.destinationUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.title?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && link.isActive) ||
      (statusFilter === 'inactive' && !link.isActive);

    return matchesSearch && matchesStatus;
  });

  const pagination = linksResult
    ? {
        page: linksResult.page,
        pageSize: linksResult.pageSize,
        total: linksResult.total,
        hasNext: linksResult.hasNext,
      }
    : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Links</h1>
          <p className="mt-2 text-muted-foreground">Manage and track all your shortened links</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Link
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by short code, URL, or title..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Links</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Links</div>
          <div className="mt-2 text-2xl font-bold">{linksResult?.total ?? 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Active Links</div>
          <div className="mt-2 text-2xl font-bold">{links.filter((l) => l.isActive).length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Clicks</div>
          <div className="mt-2 text-2xl font-bold">
            {links.reduce((sum, l) => sum + l.clicks, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Links Table */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading links...</div>
        </div>
      ) : (
        <LinksTable
          links={filteredLinks}
          onUpdate={refreshLinks}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Create Link Dialog */}
      <CreateLinkDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </div>
  );
}
