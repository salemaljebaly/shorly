'use client';

import { useState } from 'react';
import {
  ExternalLink,
  Copy,
  BarChart2,
  QrCode,
  MoreHorizontal,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Smartphone,
  Tablet,
  Monitor,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { CreateOneLinkDialog } from './create-onelink-dialog';
import { EditOneLinkDialog } from './edit-onelink-dialog';
import { oneLinksApi, DeviceType, type OneLink } from '@/lib/api';
import { buildLocalePath } from '@/lib/locale-routing';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OneLinksTableProps {
  oneLinks: OneLink[];
  onUpdate?: () => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function OneLinksTable({
  oneLinks,
  onUpdate,
  pagination,
  onPageChange,
  onPageSizeChange,
}: OneLinksTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOneLink, setSelectedOneLink] = useState<OneLink | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const currentPage = pagination?.page ?? 1;
  const currentPageSize = pagination?.pageSize ?? (oneLinks.length || 1);
  const totalItems = pagination?.total ?? oneLinks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize));
  const hasNext = pagination?.hasNext ?? currentPage < totalPages;
  const displayedCount = oneLinks.length;
  const hasDisplayedItems = displayedCount > 0;
  const startItem = hasDisplayedItems ? (currentPage - 1) * currentPageSize + 1 : 0;
  const endItem = hasDisplayedItems ? startItem + displayedCount - 1 : 0;

  const copyToClipboard = (shortCode: string) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/${shortCode}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDelete = (oneLink: OneLink) => {
    setSelectedOneLink(oneLink);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedOneLink) return;

    try {
      await oneLinksApi.delete(selectedOneLink.id);
      toast.success('OneLink deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedOneLink(null);
      onUpdate?.();
    } catch (_error) {
      toast.error('Failed to delete OneLink');
    }
  };

  const handleEdit = (oneLink: OneLink) => {
    setSelectedOneLink(oneLink);
    setEditDialogOpen(true);
  };

  const handleToggleStatus = async (oneLink: OneLink) => {
    try {
      await oneLinksApi.update(oneLink.id, { isActive: !oneLink.isActive });
      toast.success(oneLink.isActive ? 'OneLink deactivated' : 'OneLink activated');
      onUpdate?.();
    } catch (_error) {
      toast.error('Failed to update OneLink status');
    }
  };

  const handleViewAnalytics = (oneLink: OneLink) => {
    // Extract locale from current URL and build localized path
    const currentLocale =
      typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'en' : 'en';
    window.location.href = `${buildLocalePath('/dashboard/analytics', currentLocale)}?link=${oneLink.shortCode}`;
  };

  const handleGenerateQR = (oneLink: OneLink) => {
    // Extract locale from current URL and build localized path
    const currentLocale =
      typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'en' : 'en';
    window.location.href = `${buildLocalePath('/dashboard/qr', currentLocale)}?link=${oneLink.shortCode}`;
  };

  const getDeviceIcon = (deviceType: DeviceType) => {
    switch (deviceType) {
      case DeviceType.ANDROID:
        return <Smartphone className="h-3 w-3" />;
      case DeviceType.IOS:
        return <Tablet className="h-3 w-3" />;
      case DeviceType.WEB:
        return <Monitor className="h-3 w-3" />;
    }
  };

  const getTargetDisplay = (oneLink: OneLink) => {
    if (oneLink.targets.length === 0) {
      return <span className="text-muted-foreground">No targets</span>;
    }

    const validTargets = oneLink.targets.filter((target) => target.url.trim() !== '');

    if (validTargets.length === 0) {
      return <span className="text-muted-foreground">No valid targets</span>;
    }

    return (
      <div className="flex items-center gap-1">
        {validTargets.slice(0, 3).map((target, index) => (
          <div key={index} className="flex items-center gap-1">
            {getDeviceIcon(target.deviceType)}
          </div>
        ))}
        {validTargets.length > 3 && (
          <span className="text-xs text-muted-foreground">+{validTargets.length - 3}</span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Short Link</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Targets</TableHead>
                <TableHead>Fallback</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {oneLinks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="py-12 text-center">
                      <p className="text-muted-foreground">No OneLinks found</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Create your first OneLink to get started
                      </p>
                      <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                        Create OneLink
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                oneLinks.map((oneLink) => (
                  <TableRow key={oneLink.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-primary">/{oneLink.shortCode}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(oneLink.shortCode)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {oneLink.title && <div className="font-medium">{oneLink.title}</div>}
                        {oneLink.description && (
                          <div className="max-w-xs truncate text-xs text-muted-foreground">
                            {oneLink.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">{getTargetDisplay(oneLink)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={oneLink.fallbackUrl}>
                        {oneLink.fallbackUrl}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <BarChart2 className="h-3 w-3 text-muted-foreground" />
                        <span>{(oneLink.clicks ?? 0).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={oneLink.isActive ? 'default' : 'secondary'}>
                        {oneLink.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(oneLink.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => window.open(`/${oneLink.shortCode}`, '_blank')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Visit Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewAnalytics(oneLink)}>
                            <BarChart2 className="mr-2 h-4 w-4" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGenerateQR(oneLink)}>
                            <QrCode className="mr-2 h-4 w-4" />
                            Generate QR
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(oneLink)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(oneLink)}>
                            {oneLink.isActive ? (
                              <ToggleLeft className="mr-2 h-4 w-4" />
                            ) : (
                              <ToggleRight className="mr-2 h-4 w-4" />
                            )}
                            {oneLink.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(oneLink)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {pagination && (
          <div className="flex flex-col gap-4 border-t px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
              {totalItems === 0
                ? 'No OneLinks to display'
                : hasDisplayedItems
                  ? `Showing ${startItem}-${endItem} of ${totalItems} OneLinks`
                  : 'No OneLinks on this page'}
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <Select
                  value={String(currentPageSize)}
                  onValueChange={(value) => onPageSizeChange?.(Number(value))}
                  disabled={!onPageSizeChange}
                >
                  <SelectTrigger className="h-8 w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((sizeOption) => (
                      <SelectItem key={sizeOption} value={String(sizeOption)}>
                        {sizeOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={!onPageChange || currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[110px] text-center text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={!onPageChange || !hasNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete OneLink?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">/{selectedOneLink?.shortCode}</span>?
              This action cannot be undone and all analytics data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      {selectedOneLink && (
        <EditOneLinkDialog
          oneLink={selectedOneLink}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={onUpdate}
        />
      )}

      {/* Create Dialog */}
      <CreateOneLinkDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={onUpdate}
      />
    </>
  );
}
