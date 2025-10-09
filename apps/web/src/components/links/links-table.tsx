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
import { EditLinkDialog } from './edit-link-dialog';
import { linksApi, type Link } from '@/lib/api';
import { buildLocalePath } from '@/lib/locale-routing';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LinksTableProps {
  links: Link[];
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

export function LinksTable({
  links,
  onUpdate,
  pagination,
  onPageChange,
  onPageSizeChange,
}: LinksTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const currentPage = pagination?.page ?? 1;
  const currentPageSize = pagination?.pageSize ?? (links.length || 1);
  const totalItems = pagination?.total ?? links.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize));
  const hasNext = pagination?.hasNext ?? currentPage < totalPages;
  const displayedCount = links.length;
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

  const handleDelete = (link: Link) => {
    setSelectedLink(link);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedLink) return;

    try {
      await linksApi.delete(selectedLink.id);
      toast.success('Link deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedLink(null);
      onUpdate?.();
    } catch (_error) {
      toast.error('Failed to delete link');
    }
  };

  const handleEdit = (link: Link) => {
    setSelectedLink(link);
    setEditDialogOpen(true);
  };

  const handleToggleStatus = async (link: Link) => {
    try {
      await linksApi.update(link.id, { isActive: !link.isActive });
      toast.success(link.isActive ? 'Link deactivated' : 'Link activated');
      onUpdate?.();
    } catch (_error) {
      toast.error('Failed to update link status');
    }
  };

  const handleViewAnalytics = (link: Link) => {
    // Extract locale from current URL and build localized path
    const currentLocale =
      typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'en' : 'en';
    window.location.href = `${buildLocalePath('/dashboard/analytics', currentLocale)}?link=${link.shortCode}`;
  };

  const handleGenerateQR = (link: Link) => {
    // Extract locale from current URL and build localized path
    const currentLocale =
      typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'en' : 'en';
    window.location.href = `${buildLocalePath('/dashboard/qr', currentLocale)}?link=${link.shortCode}`;
  };

  const isExpired = (expiresAt?: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Short Link</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="py-12 text-center">
                    <p className="text-muted-foreground">No links found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">/{link.shortCode}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(link.shortCode)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {link.expiresAt && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {isExpired(link.expiresAt) ? (
                          <span className="text-destructive">Expired</span>
                        ) : (
                          `Expires ${formatDate(link.expiresAt)}`
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      {link.title && <div className="font-medium">{link.title}</div>}
                      <div
                        className={`max-w-md truncate ${
                          link.title ? 'text-xs text-muted-foreground' : ''
                        }`}
                        title={link.destinationUrl}
                      >
                        {link.destinationUrl}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <BarChart2 className="h-3 w-3 text-muted-foreground" />
                      <span>{(link.clicks ?? 0).toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        isExpired(link.expiresAt)
                          ? 'destructive'
                          : link.isActive
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {isExpired(link.expiresAt)
                        ? 'Expired'
                        : link.isActive
                          ? 'Active'
                          : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(link.createdAt)}
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
                          onClick={() => window.open(`/${link.shortCode}`, '_blank')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Visit Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewAnalytics(link)}>
                          <BarChart2 className="mr-2 h-4 w-4" />
                          View Analytics
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateQR(link)}>
                          <QrCode className="mr-2 h-4 w-4" />
                          Generate QR
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(link)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(link)}>
                          {link.isActive ? (
                            <ToggleLeft className="mr-2 h-4 w-4" />
                          ) : (
                            <ToggleRight className="mr-2 h-4 w-4" />
                          )}
                          {link.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(link)}
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
        {pagination && (
          <div className="flex flex-col gap-4 border-t px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
              {totalItems === 0
                ? 'No links to display'
                : hasDisplayedItems
                  ? `Showing ${startItem}-${endItem} of ${totalItems} links`
                  : 'No links on this page'}
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
            <AlertDialogTitle>Delete Link?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">/{selectedLink?.shortCode}</span>?
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
      {selectedLink && (
        <EditLinkDialog
          link={selectedLink}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}
