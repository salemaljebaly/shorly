# Shorly Project Structure

Complete overview of the Shorly monorepo architecture.

## Directory Tree

```
shorly/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # CI pipeline (lint, test, build)
│       └── deploy.yml                # Deployment pipeline
│
├── apps/
│   ├── api/                          # NestJS Backend API
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Database schema
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── prisma.module.ts  # Prisma configuration
│   │   │   │   └── redis.module.ts   # Redis configuration
│   │   │   ├── modules/
│   │   │   │   ├── auth/             # Authentication module
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── strategies/
│   │   │   │   │   │   └── jwt.strategy.ts
│   │   │   │   │   ├── guards/
│   │   │   │   │   │   └── jwt-auth.guard.ts
│   │   │   │   │   └── decorators/
│   │   │   │   │       └── current-user.decorator.ts
│   │   │   │   ├── links/            # Links CRUD module
│   │   │   │   │   ├── links.module.ts
│   │   │   │   │   ├── links.service.ts
│   │   │   │   │   ├── links.controller.ts
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── create-link.dto.ts
│   │   │   │   │       └── update-link.dto.ts
│   │   │   │   ├── onelinks/         # OneLinks module
│   │   │   │   │   ├── onelinks.module.ts
│   │   │   │   │   ├── onelinks.service.ts
│   │   │   │   │   ├── onelinks.controller.ts
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── create-onelink.dto.ts
│   │   │   │   │       └── update-onelink.dto.ts
│   │   │   │   ├── analytics/        # Analytics module
│   │   │   │   │   ├── analytics.module.ts
│   │   │   │   │   ├── analytics.service.ts
│   │   │   │   │   └── analytics.controller.ts
│   │   │   │   └── qr/               # QR code generation
│   │   │   │       ├── qr.module.ts
│   │   │   │       ├── qr.service.ts
│   │   │   │       └── qr.controller.ts
│   │   │   ├── app.module.ts         # Root module
│   │   │   └── main.ts               # Application entry point
│   │   ├── .env.example              # Environment variables template
│   │   ├── Dockerfile                # Docker build file
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   └── README.md
│   │
│   ├── web/                          # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/                  # Next.js App Router
│   │   │   │   ├── layout.tsx        # Root layout
│   │   │   │   ├── page.tsx          # Home page
│   │   │   │   ├── globals.css       # Global styles
│   │   │   │   └── dashboard/        # Dashboard pages (future)
│   │   │   ├── components/
│   │   │   │   └── ui/               # shadcn UI components
│   │   │   │       ├── button.tsx
│   │   │   │       ├── card.tsx
│   │   │   │       └── ...           # More components
│   │   │   ├── lib/
│   │   │   │   └── utils.ts          # Utility functions
│   │   │   └── hooks/                # Custom React hooks
│   │   ├── public/                   # Static assets
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── worker/                       # Cloudflare Worker
│       ├── src/
│       │   └── index.ts              # Worker entry point
│       ├── wrangler.toml             # Cloudflare configuration
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── packages/                         # Shared packages
│   ├── types/                        # Shared TypeScript types
│   │   ├── src/
│   │   │   └── index.ts              # Type definitions
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── config/                       # Environment schemas
│   │   ├── src/
│   │   │   └── index.ts              # Zod schemas & constants
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── utils/                        # Shared utilities
│       ├── src/
│       │   ├── index.ts              # Exports
│       │   ├── short-code.ts         # Short code generation
│       │   ├── device-detection.ts   # Device type detection
│       │   ├── analytics-parser.ts   # Analytics helpers
│       │   └── validators.ts         # Validation utilities
│       ├── package.json
│       └── tsconfig.json
│
├── .github/                          # GitHub configuration
├── .gitignore                        # Git ignore rules
├── .prettierrc                       # Prettier config
├── docker-compose.yml                # Docker Compose for VPS
├── package.json                      # Root package.json
├── pnpm-workspace.yaml               # pnpm workspace config
├── turbo.json                        # Turborepo configuration
├── setup.sh                          # Quick setup script
├── README.md                         # Main documentation
├── CONTRIBUTING.md                   # Contribution guidelines
├── DEPLOYMENT.md                     # Deployment guide
├── STRUCTURE.md                      # This file
└── LICENSE                           # MIT License

```

## Module Responsibilities

### Backend API (`apps/api`)

**Purpose**: RESTful API for link management, authentication, and analytics.

**Tech Stack**:
- NestJS 10+
- Prisma ORM
- PostgreSQL
- Redis
- JWT Authentication
- Swagger/OpenAPI

**Key Features**:
- User authentication (register/login)
- Short link CRUD operations
- OneLink CRUD with device routing
- Click analytics tracking
- QR code generation
- Rate limiting
- Redis caching

### Frontend Web (`apps/web`)

**Purpose**: User-facing dashboard for managing links.

**Tech Stack**:
- Next.js 15 (App Router)
- React 19
- shadcn/ui v3.3.1
- Tailwind CSS
- TypeScript

**Key Features**:
- Responsive design
- Dark mode support
- RTL support (Arabic)
- Link management UI
- Analytics dashboard
- QR code display

### Cloudflare Worker (`apps/worker`)

**Purpose**: Edge-based redirect handler for maximum performance.

**Tech Stack**:
- Cloudflare Workers
- TypeScript
- KV storage (optional caching)

**Key Features**:
- Fast redirects (< 50ms)
- Device detection
- OneLink routing
- Click tracking
- Global edge deployment

### Shared Packages

#### `@shorly/types`
Shared TypeScript interfaces and types used across all apps.

**Exports**:
- `Link`, `OneLink`, `User`, `ClickEvent`
- DTOs (CreateLinkDto, etc.)
- Enum types (DeviceType, Language)

#### `@shorly/config`
Environment variable schemas and application constants.

**Exports**:
- Zod schemas for env validation
- App constants (short code length, etc.)
- Configuration helpers

#### `@shorly/utils`
Shared utility functions.

**Exports**:
- Short code generation
- Device detection
- URL validation
- Analytics parsing

## Data Flow

### Creating a Short Link

```
User (Web) → API → Prisma → PostgreSQL
                 ↓
              Redis Cache
```

### Redirect Flow

```
User Click → Worker → KV Cache (check)
                    ↓ (miss)
                    API → Redis Cache → PostgreSQL
                    ↓
                  Redirect
                    ↓
                Analytics Track (async)
```

### OneLink Device Routing

```
User Click → Worker → Detect Device (UA)
                    ↓
                 Find Target
                    ↓
              [Android] → Play Store
              [iOS]     → App Store
              [Web]     → Website
```

## Technology Decisions

### Why Turborepo?
- Efficient monorepo management
- Smart caching
- Parallel execution
- Easy to scale

### Why NestJS?
- TypeScript-first
- Modular architecture
- Built-in DI
- Easy testing
- Great for APIs

### Why Next.js?
- React Server Components
- Excellent performance
- SEO-friendly
- Great DX
- Vercel/Cloudflare support

### Why Cloudflare Workers?
- Edge deployment
- Global low latency
- Generous free tier
- KV storage integration

### Why Prisma?
- Type-safe database access
- Easy migrations
- Great DX
- Multi-database support

### Why shadcn/ui?
- Not a dependency (copy-paste)
- Full control over code
- Radix UI primitives
- Tailwind-based
- Accessible by default

## Deployment Strategies

### Strategy 1: Full VPS (Self-Hosted)
```
VPS (Docker)
├── PostgreSQL
├── Redis
├── NestJS API
└── Next.js Web
```

**Pros**: Full control, no vendor lock-in
**Cons**: More maintenance, single region

### Strategy 2: Full Cloudflare
```
Cloudflare
├── Workers (redirects)
├── Pages (web)
└── External API (Railway/Render)
```

**Pros**: Global CDN, low latency
**Cons**: Requires external API host

### Strategy 3: Hybrid (Recommended)
```
VPS/Serverless
├── NestJS API
└── PostgreSQL/Redis

Cloudflare
├── Workers (redirects)
└── Pages (web)
```

**Pros**: Best performance, cost-effective
**Cons**: More complex setup

## Build Process

### Development
```bash
pnpm dev
# Turborepo runs all dev scripts in parallel
# - API: nest start --watch
# - Web: next dev
# - Packages: tsc --watch
```

### Production Build
```bash
pnpm build
# 1. Build packages (types, config, utils)
# 2. Build API (nest build)
# 3. Build Web (next build)
```

### Build Outputs
- **API**: `apps/api/dist/`
- **Web**: `apps/web/.next/`
- **Packages**: `packages/*/dist/`

## Environment Variables Flow

```
Root .env (optional)
    ↓
apps/api/.env → API config (validated by Zod)
    ↓
apps/web/.env.local → Web config (NEXT_PUBLIC_*)
    ↓
apps/worker/wrangler.toml → Worker vars
```

## Security Architecture

### API Security
- JWT tokens (httpOnly recommended for web)
- Password hashing (bcrypt, 10 rounds)
- Rate limiting (100 req/15min)
- Input validation (class-validator)
- SQL injection protection (Prisma)
- CORS configuration

### Worker Security
- No sensitive data stored
- Read-only operations
- Rate limiting at edge
- Safe URL validation

### Database Security
- Parameterized queries (Prisma)
- Encrypted connections
- Strong passwords
- Regular backups

## Performance Optimizations

### API
- Redis caching (1hr TTL)
- Database connection pooling
- Indexed database queries
- Async analytics tracking

### Web
- Server Components
- Image optimization
- Code splitting
- Static generation (where possible)

### Worker
- KV caching
- Edge deployment
- Minimal compute time
- Async tracking

## Monitoring Points

1. **API Health**: `/health` endpoint
2. **Database**: Connection pool metrics
3. **Redis**: Cache hit rate
4. **Worker**: Cloudflare analytics
5. **Web**: Core Web Vitals
6. **Errors**: Sentry (optional)

## Future Expansion Points

- [ ] User teams/organizations
- [ ] Custom domains per user
- [ ] Advanced analytics (geo-targeting)
- [ ] A/B testing for links
- [ ] Link expiration rules
- [ ] Webhook integrations
- [ ] API rate limiting per user
- [ ] Bulk link operations
- [ ] Link templates
- [ ] iOS/Android SDKs for deep linking
