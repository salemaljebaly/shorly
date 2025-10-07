'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { qrApi, linksApi, type Link } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, QrCode as QrCodeIcon, Palette } from 'lucide-react';
import { toast } from 'sonner';

export default function QRCodePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const linkParam = searchParams.get('link');

  const [links, setLinks] = useState<Link[]>([]);
  const [link, setLink] = useState<Link | null>(null);
  const [qrBlob, setQrBlob] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(true);

  // QR Options
  const [size, setSize] = useState('300');
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [darkColor, setDarkColor] = useState('000000');
  const [lightColor, setLightColor] = useState('ffffff');
  const [errorLevel, setErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');

  useEffect(() => {
    fetchLinks();
  }, []);

  useEffect(() => {
    if (linkParam) {
      fetchLink();
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

  const fetchLink = async () => {
    if (!linkParam) return;

    try {
      const linkData = await linksApi.getByShortCode(linkParam);
      setLink(linkData);
    } catch (error) {
      toast.error('Failed to load link');
      console.error(error);
    }
  };

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

        {loadingLinks ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading links...</div>
          </div>
        ) : links.length === 0 ? (
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {links.map((l) => (
              <Card
                key={l.id}
                className="p-6 hover:border-primary cursor-pointer transition-colors"
                onClick={() => router.push(`/dashboard/qr?link=${l.shortCode}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">/{l.shortCode}</h3>
                    {l.title && <p className="text-sm text-muted-foreground mt-1">{l.title}</p>}
                  </div>
                  <QrCodeIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground truncate">{l.destinationUrl}</p>
                <Button className="w-full mt-4" size="sm">
                  Generate QR Code
                </Button>
              </Card>
            ))}
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
                <p>Click "Generate QR Code" to preview</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
