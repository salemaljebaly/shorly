'use client';

import { ExternalLink, Copy, BarChart2, QrCode, MoreHorizontal } from 'lucide-react';
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
import { toast } from 'sonner';

interface Link {
  id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  clicks: number;
  isActive: boolean;
  createdAt: string;
}

interface RecentLinksTableProps {
  links: Link[];
}

export function RecentLinksTable({ links }: RecentLinksTableProps) {
  const copyToClipboard = (shortCode: string) => {
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

  if (links.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No links created yet. Create your first link to get started!
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Short Link</TableHead>
            <TableHead>Original URL</TableHead>
            <TableHead>Clicks</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((link) => (
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
              </TableCell>
              <TableCell>
                <div className="max-w-xs truncate" title={link.originalUrl}>
                  {link.title || link.originalUrl}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <BarChart2 className="h-3 w-3 text-muted-foreground" />
                  <span>{link.clicks.toLocaleString()}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={link.isActive ? 'default' : 'secondary'}>
                  {link.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(link.createdAt)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Visit Link
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <BarChart2 className="mr-2 h-4 w-4" />
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <QrCode className="mr-2 h-4 w-4" />
                      Generate QR
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
