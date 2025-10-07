'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { linksApi, type Link } from '@/lib/api';
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
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const data = await linksApi.getAll();
      setLinks(data);
    } catch (error) {
      toast.error('Failed to load links');
      console.error(error);
    } finally {
      setLoading(false);
    }
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
          <div className="mt-2 text-2xl font-bold">{links.length}</div>
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
        <LinksTable links={filteredLinks} onUpdate={fetchLinks} />
      )}

      {/* Create Link Dialog */}
      <CreateLinkDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </div>
  );
}
