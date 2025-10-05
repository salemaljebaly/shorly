# shorly API

NestJS-based REST API for shorly link management platform.

## Features

- **Authentication**: JWT-based auth with bcrypt password hashing
- **Links**: CRUD operations for short links
- **OneLinks**: Device-based routing with Android/iOS/Web support
- **Analytics**: Click tracking and aggregated statistics
- **QR Codes**: Dynamic QR code generation
- **Caching**: Redis-based caching for high performance
- **Documentation**: Swagger/OpenAPI docs at `/docs`

## Setup

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/shorly

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
JWT_EXPIRES_IN=7d

# Server
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Database Setup

```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# (Optional) Open Prisma Studio
pnpm prisma:studio
```

### Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start:prod
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Links

- `POST /links` - Create short link
- `GET /links` - List user's links (paginated)
- `GET /links/:id` - Get link details
- `PUT /links/:id` - Update link
- `DELETE /links/:id` - Delete link

### OneLinks

- `POST /onelinks` - Create OneLink
- `GET /onelinks` - List user's OneLinks
- `GET /onelinks/:id` - Get OneLink details
- `PUT /onelinks/:id` - Update OneLink
- `DELETE /onelinks/:id` - Delete OneLink

### Analytics

- `GET /analytics/links/:linkId` - Get link analytics
- `GET /analytics/onelinks/:oneLinkId` - Get OneLink analytics

### QR Codes

- `GET /qr/:shortCode` - Generate QR code (PNG/SVG)

## Database Schema

See `prisma/schema.prisma` for the complete schema.

### Key Models

- **User**: User accounts with email/password
- **Link**: Short links with destination URLs
- **OneLink**: Multi-target links with device routing
- **ClickEvent**: Analytics events

## Caching Strategy

Links and OneLinks are cached in Redis with:
- TTL: 1 hour (configurable via `REDIS_TTL`)
- Cache-aside pattern
- Automatic invalidation on updates

## Rate Limiting

Default rate limits (configurable):
- Window: 15 minutes
- Max requests: 100 per window

## Development

### Adding New Modules

```bash
# Generate module
nest g module modules/your-module
nest g controller modules/your-module
nest g service modules/your-module
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov
```

## Deployment

### Docker

```bash
docker build -f Dockerfile -t shorly-api .
docker run -p 3001:3001 --env-file .env shorly-api
```

### VPS

1. Install dependencies: `pnpm install --prod`
2. Build: `pnpm build`
3. Run migrations: `pnpm prisma:deploy`
4. Start: `pnpm start:prod`

Use PM2 or systemd for process management.
