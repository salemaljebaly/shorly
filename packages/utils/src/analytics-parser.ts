/**
 * Parse referrer URL for analytics
 */
export function parseReferrer(referer?: string): string {
  if (!referer) {
    return 'Direct';
  }

  try {
    const url = new URL(referer);
    return url.hostname;
  } catch {
    return 'Unknown';
  }
}

/**
 * Extract IP address from request headers (supports proxies)
 */
export function extractIpAddress(headers: Record<string, string | undefined>): string | undefined {
  // Check various headers for real IP (common in proxied environments)
  const ipHeaders = [
    'x-real-ip',
    'x-forwarded-for',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'x-cluster-client-ip',
  ];

  for (const header of ipHeaders) {
    const ip = headers[header];
    if (ip) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return ip.split(',')[0].trim();
    }
  }

  return undefined;
}

/**
 * Anonymize IP address for privacy (remove last octet for IPv4)
 */
export function anonymizeIp(ip: string): string {
  if (!ip) return 'Unknown';

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = '0';
      return parts.join('.');
    }
  }

  // IPv6 - simplify to first 4 groups
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + '::';
  }

  return ip;
}

/**
 * Group timestamps by date for time-series analytics
 */
export function groupByDate(timestamps: Date[]): Record<string, number> {
  const grouped: Record<string, number> = {};

  for (const timestamp of timestamps) {
    const date = timestamp.toISOString().split('T')[0];
    grouped[date] = (grouped[date] || 0) + 1;
  }

  return grouped;
}

/**
 * Calculate unique values from array
 */
export function countUnique<T>(items: T[]): number {
  return new Set(items).size;
}
