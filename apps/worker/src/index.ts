/**
 * Cloudflare Worker for shorly
 * Handles edge redirects for short links and OneLinks
 */

interface Env {
  DATABASE_URL: string;
  REDIS_URL?: string;
  API_URL: string;
  LINKS_CACHE?: KVNamespace;
}

interface LinkData {
  id: string;
  shortCode: string;
  destinationUrl: string;
  isActive: boolean;
  expiresAt?: string;
}

interface OneLinkData {
  id: string;
  shortCode: string;
  targets: Array<{
    deviceType: 'android' | 'ios' | 'web';
    url: string;
    priority?: number;
  }>;
  fallbackUrl: string;
  isActive: boolean;
}

function detectDeviceType(userAgent: string): 'android' | 'ios' | 'web' {
  const ua = userAgent.toLowerCase();

  if (ua.includes('android')) {
    return 'android';
  }

  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    return 'ios';
  }

  return 'web';
}

async function fetchLink(shortCode: string, env: Env): Promise<LinkData | null> {
  try {
    // Try KV cache first if available
    if (env.LINKS_CACHE) {
      const cached = await env.LINKS_CACHE.get(`link:${shortCode}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Fallback to API
    const response = await fetch(`${env.API_URL}/links/code/${shortCode}`);
    if (!response.ok) return null;

    const link = await response.json() as LinkData;

    // Cache for 1 hour
    if (env.LINKS_CACHE) {
      await env.LINKS_CACHE.put(`link:${shortCode}`, JSON.stringify(link), {
        expirationTtl: 3600,
      });
    }

    return link;
  } catch (error) {
    console.error('Error fetching link:', error);
    return null;
  }
}

async function fetchOneLink(shortCode: string, env: Env): Promise<OneLinkData | null> {
  try {
    // Try KV cache first if available
    if (env.LINKS_CACHE) {
      const cached = await env.LINKS_CACHE.get(`onelink:${shortCode}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Fallback to API
    const response = await fetch(`${env.API_URL}/onelinks/code/${shortCode}`);
    if (!response.ok) return null;

    const oneLink = await response.json() as OneLinkData;

    // Cache for 1 hour
    if (env.LINKS_CACHE) {
      await env.LINKS_CACHE.put(`onelink:${shortCode}`, JSON.stringify(oneLink), {
        expirationTtl: 3600,
      });
    }

    return oneLink;
  } catch (error) {
    console.error('Error fetching onelink:', error);
    return null;
  }
}

async function trackClick(
  linkId: string | undefined,
  oneLinkId: string | undefined,
  request: Request,
  env: Env
): Promise<void> {
  try {
    // Fire and forget analytics tracking
    fetch(`${env.API_URL}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        linkId,
        oneLinkId,
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        ip: request.headers.get('cf-connecting-ip'),
        country: (request as any).cf?.country,
        city: (request as any).cf?.city,
      }),
    });
  } catch (error) {
    console.error('Error tracking click:', error);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const shortCode = url.pathname.slice(1); // Remove leading /

    if (!shortCode || shortCode === '') {
      return new Response('shorly Worker - No short code provided', { status: 400 });
    }

    // Health check
    if (shortCode === 'health') {
      return new Response('OK', { status: 200 });
    }

    const userAgent = request.headers.get('user-agent') || '';

    // Try OneLink first
    const oneLink = await fetchOneLink(shortCode, env);
    if (oneLink && oneLink.isActive) {
      const deviceType = detectDeviceType(userAgent);

      // Find matching target
      const matchingTargets = oneLink.targets
        .filter((t) => t.deviceType === deviceType)
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

      let redirectUrl = oneLink.fallbackUrl;

      if (matchingTargets.length > 0) {
        redirectUrl = matchingTargets[0].url;
      } else if (deviceType !== 'web') {
        // Fallback to web if available
        const webTarget = oneLink.targets.find((t) => t.deviceType === 'web');
        if (webTarget) {
          redirectUrl = webTarget.url;
        }
      }

      // Track click
      trackClick(undefined, oneLink.id, request, env);

      return Response.redirect(redirectUrl, 302);
    }

    // Try regular link
    const link = await fetchLink(shortCode, env);
    if (link && link.isActive) {
      // Check expiration
      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return new Response('Link has expired', { status: 410 });
      }

      // Track click
      trackClick(link.id, undefined, request, env);

      return Response.redirect(link.destinationUrl, 302);
    }

    // Not found
    return new Response('Short link not found', { status: 404 });
  },
};
