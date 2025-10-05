# shorly Worker

Cloudflare Worker for edge-based link redirects.

## Features

- **Edge Redirects**: Lightning-fast redirects from 300+ locations worldwide
- **Device Detection**: Automatic routing based on Android/iOS/Web
- **KV Caching**: Optional caching with Cloudflare KV
- **Analytics**: Click tracking (fire-and-forget)
- **Zero Cold Start**: Always-on, no cold starts

## Setup

### Prerequisites

- Cloudflare account
- Wrangler CLI (`pnpm add -g wrangler`)

### Configuration

1. Login to Cloudflare:
```bash
wrangler login
```

2. Update `wrangler.toml`:
```toml
name = "shorly-worker"
routes = [
  { pattern = "go.yourdomain.com/*", zone_name = "yourdomain.com" }
]

[vars]
API_URL = "https://api.yourdomain.com/api/v1"
```

3. (Optional) Create KV namespace for caching:
```bash
wrangler kv:namespace create "LINKS_CACHE"
wrangler kv:namespace create "LINKS_CACHE" --preview
```

Add to `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "LINKS_CACHE"
id = "your-namespace-id"
preview_id = "your-preview-id"
```

## Development

```bash
# Start local dev server
pnpm dev

# Test redirects
curl http://localhost:8787/example
```

## Deployment

```bash
# Deploy to production
pnpm deploy

# Deploy to specific environment
wrangler deploy --env production
```

## How It Works

1. Extract short code from URL path
2. Check KV cache (if available)
3. Fetch from API if not cached
4. For OneLinks: detect device and route accordingly
5. Track click event (async)
6. Redirect to destination

## Device Detection

```typescript
function detectDeviceType(userAgent: string): 'android' | 'ios' | 'web' {
  if (userAgent.includes('android')) return 'android';
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
  return 'web';
}
```

## Caching Strategy

- **KV Cache TTL**: 1 hour
- **Fallback**: Always fetch from API if cache miss
- **Invalidation**: Updates in API should clear KV cache

## Analytics

Click events are tracked asynchronously:

```typescript
fetch(`${API_URL}/analytics/track`, {
  method: 'POST',
  body: JSON.stringify({
    linkId,
    userAgent,
    country: request.cf?.country,
    city: request.cf?.city,
  }),
});
```

## Monitoring

View logs in Cloudflare Dashboard or via Wrangler:

```bash
# Tail logs
wrangler tail

# View metrics
wrangler metrics
```

## Custom Domains

Add custom domains in Cloudflare Dashboard:
1. Workers & Pages → Your Worker → Settings → Triggers
2. Add Custom Domain
3. DNS records will be created automatically

## Limits

Free tier:
- 100,000 requests/day
- 10ms CPU time per request
- 1GB KV storage

Paid tier:
- Unlimited requests
- 50ms CPU time
- 1GB KV storage (additional $0.50/GB)

## Best Practices

1. Use KV caching to reduce API calls
2. Keep worker code minimal (< 1MB)
3. Use async analytics tracking
4. Handle errors gracefully
5. Monitor performance via Cloudflare Analytics
