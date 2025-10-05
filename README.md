# Shorly

> **Global Link Management Platform** - Create short links and OneLinks with device-based routing, analytics, and QR codes.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](docs/TESTING.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

## ✨ Features

- **Short Links**: Create and manage short links with custom codes and comprehensive analytics
- **OneLinks**: Universal app links with device-based routing (Android, iOS, Web)
- **Analytics**: Real-time tracking of clicks, devices, countries, browsers, and referrers
- **QR Codes**: Dynamic QR code generation for any link
- **Multilingual**: Full support for English and Arabic (RTL)
- **Edge Redirects**: Lightning-fast redirects via Cloudflare Workers
- **API-First**: Developer-friendly REST API with Swagger documentation
- **Self-Hostable**: Deploy to VPS with Docker or use Cloudflare Pages/Workers

## 🏗 Architecture

```
shorly/
├── apps/
│   ├── api/          # NestJS backend with Prisma + PostgreSQL
│   ├── web/          # Next.js frontend with shadcn UI
│   └── worker/       # Cloudflare Worker for edge redirects
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── config/       # Environment schemas (Zod)
│   └── utils/        # Shared utilities
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Redis 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/shorly.git
cd shorly

# Install dependencies
pnpm install

# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Update .env files with your configuration

# Run database migrations
cd apps/api
pnpm prisma migrate dev
cd ../..

# Start development servers
pnpm dev
```

The services will be available at:
- **API**: http://localhost:3001/api/v1
- **API Docs**: http://localhost:3001/docs
- **Web**: http://localhost:3000

## 🐳 Docker Deployment

### Using Docker Compose (Recommended for VPS)

```bash
# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Update apps/api/.env with your production values
# IMPORTANT: Change POSTGRES_PASSWORD and JWT secrets in production!

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Build

```bash
# Build API
docker build -f apps/api/Dockerfile -t shorly-api .

# Build Web
docker build -f apps/web/Dockerfile -t shorly-web .
```

## ☁️ Cloudflare Deployment

### Deploy Worker

```bash
cd apps/worker

# Configure wrangler.toml with your settings

# Deploy
pnpm deploy
```

### Deploy Web to Cloudflare Pages

```bash
cd apps/web

# Build
pnpm build

# Deploy to Cloudflare Pages
# (Use Cloudflare Dashboard or Wrangler Pages)
```

## 📚 API Documentation

Once the API is running, visit http://localhost:3001/docs for interactive Swagger documentation.

### Authentication

```bash
# Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Create a Short Link

```bash
curl -X POST http://localhost:3001/api/v1/links \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"destinationUrl":"https://example.com","shortCode":"example"}'
```

### Create a OneLink

```bash
curl -X POST http://localhost:3001/api/v1/onelinks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shortCode":"myapp",
    "targets":[
      {"deviceType":"android","url":"https://play.google.com/store/apps/details?id=com.myapp"},
      {"deviceType":"ios","url":"https://apps.apple.com/app/myapp/id123456789"},
      {"deviceType":"web","url":"https://myapp.com"}
    ],
    "fallbackUrl":"https://myapp.com"
  }'
```

## 🛠 Development

### Project Structure

```
apps/api/src/
├── config/              # Database, Redis config
├── modules/
│   ├── auth/           # Authentication
│   ├── links/          # Short links CRUD
│   ├── onelinks/       # OneLinks CRUD
│   ├── analytics/      # Analytics tracking
│   └── qr/             # QR code generation
└── main.ts

apps/web/src/
├── app/                # Next.js App Router
├── components/
│   └── ui/            # shadcn UI components
└── lib/               # Utilities
```

### Available Commands

```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm lint             # Lint all code
pnpm type-check       # Type check all apps

# Database
pnpm --filter @shorly/api prisma:migrate    # Create migration
pnpm --filter @shorly/api prisma:studio     # Open Prisma Studio

# Clean
pnpm clean            # Remove all build artifacts
```

## 🌍 Internationalization

Shorly supports English (LTR) and Arabic (RTL). The UI automatically adapts based on the selected language.

To add more languages:
1. Update `packages/config/src/index.ts` with new language codes
2. Add translations in `apps/web/locales/`
3. Configure next-intl in the web app

## 🔒 Security

- JWT-based authentication
- Rate limiting on API endpoints
- Input validation with class-validator
- Safe URL validation (blocks internal/private IPs)
- SQL injection protection via Prisma
- XSS protection via Next.js

## 📊 Analytics Privacy

Shorly follows privacy-first principles:
- IP addresses are anonymized (last octet removed)
- No third-party tracking scripts
- Minimal data collection
- GDPR-friendly

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Inspired by [Dub](https://dub.co)
- Built with [shadcn/ui](https://ui.shadcn.com)
- Powered by [Next.js](https://nextjs.org) and [NestJS](https://nestjs.com)

## 📧 Support

For support, email support@shorly.example or open an issue on GitHub.

---

**Built with ❤️ using modern web technologies**
