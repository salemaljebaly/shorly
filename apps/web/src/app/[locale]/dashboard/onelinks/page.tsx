'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { oneLinksApi, type OneLink } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function OneLinksPage() {
  const [oneLinks, setOneLinks] = useState<OneLink[]>([]);
  const [loading, setLoading] = useState(true);

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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create OneLink
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">Total OneLinks</div>
          <div className="mt-2 text-2xl font-bold">{oneLinks.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">Active OneLinks</div>
          <div className="mt-2 text-2xl font-bold">{oneLinks.filter((l) => l.isActive).length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Clicks</div>
          <div className="mt-2 text-2xl font-bold">
            {oneLinks.reduce((sum, l) => sum + l.clicks, 0).toLocaleString()}
          </div>
        </Card>
      </div>

      {/* OneLinks List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {oneLinks.map((oneLink) => (
          <Card key={oneLink.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">/{oneLink.shortCode}</h3>
                {oneLink.title && <p className="text-sm text-muted-foreground">{oneLink.title}</p>}
              </div>
              <Badge variant={oneLink.isActive ? 'default' : 'secondary'}>
                {oneLink.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              {oneLink.targets.android && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">Android:</span>
                  <span className="truncate">{oneLink.targets.android}</span>
                </div>
              )}
              {oneLink.targets.ios && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">iOS:</span>
                  <span className="truncate">{oneLink.targets.ios}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Web:</span>
                <span className="truncate">{oneLink.targets.web}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {oneLink.clicks.toLocaleString()} clicks
              </span>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {oneLinks.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold">No OneLinks yet</h3>
            <p className="text-muted-foreground mt-2">
              Create your first OneLink to route users based on their device
            </p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create OneLink
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
