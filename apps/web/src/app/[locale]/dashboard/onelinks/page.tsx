'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { oneLinksApi, type OneLink } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OneLinksTable } from '@/components/onelinks/onelinks-table';
import { CreateOneLinkDialog } from '@/components/onelinks/create-onelink-dialog';
import { toast } from 'sonner';

export default function OneLinksPage() {
  const [oneLinks, setOneLinks] = useState<OneLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchOneLinks();
  }, []);

  const fetchOneLinks = async () => {
    try {
      setLoading(true);
      const data = await oneLinksApi.getAll();
      setOneLinks(data);
    } catch (error) {
      toast.error('Failed to load OneLinks');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOneLinks = oneLinks.filter((oneLink) => {
    const matchesSearch =
      oneLink.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      oneLink.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      oneLink.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      oneLink.fallbackUrl.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && oneLink.isActive) ||
      (statusFilter === 'inactive' && !oneLink.isActive);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading OneLinks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">OneLinks</h1>
          <p className="mt-2 text-muted-foreground">
            Smart links that route users based on their device
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create OneLink
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by short code, title, description, or fallback URL..."
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
              <SelectItem value="all">All OneLinks</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* OneLinks Table */}
      <OneLinksTable oneLinks={filteredOneLinks} onUpdate={fetchOneLinks} />

      {/* Create OneLink Dialog */}
      <CreateOneLinkDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchOneLinks}
      />
    </div>
  );
}
