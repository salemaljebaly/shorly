'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { qrApi, linksApi, type Link } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, QrCode as QrCodeIcon, Palette, Search, Filter, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

function QRCodePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const linkParam = searchParams.get('link');

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

  const isExpired = (expiresAt?: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const [links, setLinks] = useState<Link[]>([]);
  const [link, setLink] = useState<Link | null>(null);
  const [qrBlob, setQrBlob] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // QR Options
  const [size, setSize] = useState('300');
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [darkColor, setDarkColor] = useState('000000');
  const [lightColor, setLightColor] = useState('ffffff');
  const [errorLevel, setErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');

  const fetchLink = useCallback(async () => {
    if (!linkParam) return;

    try {
      const linkData = await linksApi.getByShortCode(linkParam);
      setLink(linkData);
    } catch (error) {
      toast.error('Failed to load link');
      console.error(error);
    }
  }, [linkParam]);

  const fetchLinks = async () => {
    try {
      setLoadingLinks(true);
      const data = await linksApi.getAll();
      setLinks(data);
    } catch (error) {
      toast.error('Failed to load links');
      console.error(error);
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  useEffect(() => {
    if (linkParam) {
      fetchLink();
    }
  }, [linkParam, fetchLink]);

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

  const generateQR = async () => {
    if (!link) return;

    setLoading(true);
    try {
      const blob = await qrApi.generateLinkQR(link.shortCode, {
        size: parseInt(size),
        format,
        dark: darkColor,
        light: lightColor,
        errorCorrectionLevel: errorLevel,
      });

      const url = URL.createObjectURL(blob);
      setQrBlob(url);
      toast.success('QR Code generated successfully!');
    } catch (error) {
      toast.error('Failed to generate QR code');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrBlob || !link) return;

    const a = document.createElement('a');
    a.href = qrBlob;
    a.download = `${link.shortCode}-qr.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('QR Code downloaded!');
  };

  if (!linkParam) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">QR Code Generator</h1>
          <p className="mt-2 text-muted-foreground">Select a link to generate a QR code</p>
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

        {loadingLinks ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading links...</div>
          </div>
        ) : filteredLinks.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <QrCodeIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-2xl font-bold">No Links Found</h2>
              <p className="text-muted-foreground mt-2">Create a link first to generate QR codes</p>
              <Button className="mt-4" onClick={() => router.push('/dashboard/links')}>
                Go to Links
              </Button>
            </div>
          </Card>
        ) : (
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
                {filteredLinks.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-primary">/{l.shortCode}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(l.shortCode)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {l.expiresAt && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {isExpired(l.expiresAt) ? (
                            <span className="text-destructive">Expired</span>
                          ) : (
                            `Expires ${formatDate(l.expiresAt)}`
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        {l.title && <div className="font-medium">{l.title}</div>}
                        <div
                          className={`max-w-md truncate ${
                            l.title ? 'text-xs text-muted-foreground' : ''
                          }`}
                          title={l.destinationUrl}
                        >
                          {l.destinationUrl}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <QrCodeIcon className="h-3 w-3 text-muted-foreground" />
                        <span>{(l.clicks ?? 0).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          isExpired(l.expiresAt)
                            ? 'destructive'
                            : l.isActive
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {isExpired(l.expiresAt) ? 'Expired' : l.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(l.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(`/${l.shortCode}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/qr?link=${l.shortCode}`)}
                        >
                          <QrCodeIcon className="mr-2 h-4 w-4" />
                          Generate QR
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">QR Code Generator</h1>
        {link && (
          <p className="mt-2 text-muted-foreground">
            Generate QR code for /{link.shortCode}
            {link.title && ` - ${link.title}`}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settings */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">QR Code Settings</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size (px)</Label>
              <Input
                id="size"
                type="number"
                min="100"
                max="2000"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select value={format} onValueChange={(v: 'png' | 'svg') => setFormat(v)}>
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="svg">SVG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="errorLevel">Error Correction</Label>
              <Select value={errorLevel} onValueChange={(v: any) => setErrorLevel(v)}>
                <SelectTrigger id="errorLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Low (7%)</SelectItem>
                  <SelectItem value="M">Medium (15%)</SelectItem>
                  <SelectItem value="Q">Quartile (25%)</SelectItem>
                  <SelectItem value="H">High (30%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dark">Dark Color</Label>
                <div className="flex gap-2">
                  <div
                    className="w-10 h-10 rounded border cursor-pointer"
                    style={{ backgroundColor: `#${darkColor}` }}
                    onClick={() => document.getElementById('darkPicker')?.click()}
                  />
                  <Input
                    id="dark"
                    value={darkColor}
                    onChange={(e) => setDarkColor(e.target.value.replace('#', ''))}
                    placeholder="000000"
                    maxLength={6}
                  />
                  <input
                    id="darkPicker"
                    type="color"
                    value={`#${darkColor}`}
                    onChange={(e) => setDarkColor(e.target.value.replace('#', ''))}
                    className="sr-only"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="light">Light Color</Label>
                <div className="flex gap-2">
                  <div
                    className="w-10 h-10 rounded border cursor-pointer"
                    style={{ backgroundColor: `#${lightColor}` }}
                    onClick={() => document.getElementById('lightPicker')?.click()}
                  />
                  <Input
                    id="light"
                    value={lightColor}
                    onChange={(e) => setLightColor(e.target.value.replace('#', ''))}
                    placeholder="ffffff"
                    maxLength={6}
                  />
                  <input
                    id="lightPicker"
                    type="color"
                    value={`#${lightColor}`}
                    onChange={(e) => setLightColor(e.target.value.replace('#', ''))}
                    className="sr-only"
                  />
                </div>
              </div>
            </div>

            <Button onClick={generateQR} disabled={loading} className="w-full">
              <Palette className="mr-2 h-4 w-4" />
              {loading ? 'Generating...' : 'Generate QR Code'}
            </Button>
          </div>
        </Card>

        {/* Preview */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            {qrBlob ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrBlob}
                  alt="QR Code"
                  className="max-w-full border rounded-lg"
                  style={{ maxHeight: '400px' }}
                />
                <Button onClick={downloadQR} className="mt-4">
                  <Download className="mr-2 h-4 w-4" />
                  Download QR Code
                </Button>
              </>
            ) : (
              <div className="text-center text-muted-foreground">
                <QrCodeIcon className="mx-auto h-16 w-16 mb-4" />
                <p>Click &quot;Generate QR Code&quot; to preview</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function QRPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="text-muted-foreground">Loading...</div></div>}>
      <QRCodePage />
    </Suspense>
  );
}

export default QRPageWrapper;
