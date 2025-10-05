# shorly Web

Next.js 15 frontend with shadcn/ui for shorly link management platform.

## Features

- **Next.js 15**: Latest App Router with React Server Components
- **shadcn/ui v3.3.1**: Beautiful, accessible UI components
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **RTL Support**: Arabic and other RTL languages
- **Responsive**: Mobile-first design
- **Dark Mode**: Full dark mode support

## Setup

### Environment Variables

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

### Running

```bash
# Development
pnpm dev

# Build
pnpm build

# Production
pnpm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── dashboard/         # Dashboard pages
│   └── globals.css        # Global styles
├── components/
│   └── ui/                # shadcn UI components
├── lib/
│   └── utils.ts           # Utility functions
└── hooks/                 # Custom React hooks
```

## Adding shadcn Components

```bash
# Add a new component
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

Components will be added to `src/components/ui/`.

## Styling

### CSS Variables

Theme colors are defined in `globals.css` using CSS variables:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --background: 0 0% 100%;
  /* ... */
}
```

### Dark Mode

Toggle dark mode by adding `dark` class to `<html>`:

```tsx
<html className={isDark ? 'dark' : ''}>
```

### RTL Support

For RTL languages (like Arabic), add `dir="rtl"` to `<html>`:

```tsx
<html dir={locale === 'ar' ? 'rtl' : 'ltr'}>
```

## Internationalization

Uses `next-intl` for i18n:

```tsx
import { useTranslations } from 'next-intl';

export default function Page() {
  const t = useTranslations('Index');
  return <h1>{t('title')}</h1>;
}
```

Add translations in `messages/[locale].json`.

## API Integration

Create API client in `lib/api.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function createLink(data: CreateLinkDto) {
  const response = await fetch(`${API_URL}/links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

## Deployment

### Vercel/Cloudflare Pages

```bash
# Build
pnpm build

# Deploy (automatically handled by platform)
```

### Docker

```bash
docker build -f Dockerfile -t shorly-web .
docker run -p 3000:3000 shorly-web
```

### Static Export

For static hosting:

```bash
# next.config.ts
export default {
  output: 'export',
};

pnpm build
# Upload 'out/' directory to static host
```

## Performance

- Server Components by default
- Automatic code splitting
- Image optimization with `next/image`
- Font optimization with `next/font`
- Turbopack for faster builds (dev)

## SEO

Configure metadata in layouts and pages:

```tsx
export const metadata: Metadata = {
  title: 'shorly',
  description: 'Link management platform',
};
```
