# Shorly Quick Start Guide

**Get Shorly running in under 5 minutes!**

## Prerequisites Check

```bash
node -v   # Need 20+
pnpm -v   # Need 9+
docker -v # Optional, for database
```

Don't have these? [Install Node.js](https://nodejs.org/), then:
```bash
npm install -g pnpm@9.15.0
```

## 🚀 Fast Track Setup

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repo
git clone https://github.com/yourusername/shorly.git
cd shorly

# Run setup script
./setup.sh

# Start development
pnpm dev
```

### Option 2: Manual Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Update database URL in apps/api/.env
# DATABASE_URL=postgresql://user:pass@localhost:5432/shorly

# 4. Run migrations
cd apps/api
pnpm prisma migrate dev
pnpm prisma generate
cd ../..

# 5. Build shared packages
pnpm --filter @shorly/types build
pnpm --filter @shorly/config build
pnpm --filter @shorly/utils build

# 6. Start development
pnpm dev
```

## 🐳 Using Docker (Easiest)

**No PostgreSQL or Redis installed? Use Docker!**

```bash
# Start database services only
docker-compose up -d postgres redis

# Then run apps locally
pnpm dev
```

**Or run everything in Docker:**

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

Services:
- API: http://localhost:3001
- Web: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## 📱 Access Your App

Once running:

| Service | URL | Description |
|---------|-----|-------------|
| **Web UI** | http://localhost:3000 | Homepage |
| **API** | http://localhost:3001/api/v1 | REST API |
| **API Docs** | http://localhost:3001/docs | Swagger UI |

## 🧪 Test It Works

### 1. Register a User

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**Response:**
```json
{
  "user": { "id": "...", "email": "test@example.com" },
  "token": "eyJhbGciOiJ..."
}
```

### 2. Create a Short Link

```bash
# Save the token from above
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:3001/api/v1/links \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destinationUrl": "https://github.com",
    "shortCode": "gh"
  }'
```

### 3. Test Redirect (via Worker)

After deploying the worker:
```bash
curl -I https://your-worker-url/gh
# Should redirect to https://github.com
```

## ⚙️ Configuration Quick Reference

### apps/api/.env

```env
# Database (Required)
DATABASE_URL=postgresql://user:pass@localhost:5432/shorly

# Redis (Required)
REDIS_URL=redis://localhost:6379

# JWT (Required - Generate a secure secret!)
JWT_SECRET=your-super-secret-32-char-minimum-key

# Server (Optional)
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### apps/web/.env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

## 🔧 Common Commands

### Development
```bash
pnpm dev              # Start all in dev mode
pnpm build            # Build all apps
pnpm lint             # Lint all code
pnpm type-check       # Check types
```

### Database
```bash
cd apps/api
pnpm prisma studio    # Open Prisma Studio (DB GUI)
pnpm prisma migrate dev --name your_migration
pnpm prisma generate  # Regenerate Prisma client
```

### Docker
```bash
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs -f api        # View API logs
docker-compose restart api        # Restart API
```

### Specific Apps
```bash
pnpm --filter @shorly/api dev     # Run API only
pnpm --filter @shorly/web dev     # Run Web only
pnpm --filter @shorly/worker dev  # Run Worker only
```

## 🐛 Troubleshooting

### Database Connection Failed

**Error:** `Can't reach database server`

**Fix:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# If not, start it
docker-compose up -d postgres

# Or install locally:
# Mac: brew install postgresql@16
# Ubuntu: sudo apt install postgresql-16
```

### Redis Connection Failed

**Error:** `Redis connection refused`

**Fix:**
```bash
# Start Redis via Docker
docker-compose up -d redis

# Or install locally:
# Mac: brew install redis
# Ubuntu: sudo apt install redis-server
```

### Module Not Found

**Error:** `Cannot find module '@shorly/types'`

**Fix:**
```bash
# Build shared packages
pnpm --filter @shorly/types build
pnpm --filter @shorly/config build
pnpm --filter @shorly/utils build
```

### Port Already in Use

**Error:** `Port 3000 already in use`

**Fix:**
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>

# Or change port in .env
```

### Prisma Client Not Generated

**Error:** `PrismaClient is not available`

**Fix:**
```bash
cd apps/api
pnpm prisma generate
```

## 📚 Next Steps

1. **Read Full Docs**: Check `README.md` for comprehensive guide
2. **Explore API**: Visit http://localhost:3001/docs
3. **Build Dashboard**: Start with `apps/web/src/app/dashboard/`
4. **Deploy Worker**: Follow `apps/worker/README.md`
5. **Customize UI**: Modify `apps/web/src/components/`

## 🎯 Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature

# 2. Make changes
# Edit files in apps/api, apps/web, etc.

# 3. Test locally
pnpm dev

# 4. Build to ensure no errors
pnpm build

# 5. Commit
git add .
git commit -m "feat: your feature description"

# 6. Push and create PR
git push origin feature/your-feature
```

## 🚢 Quick Deploy

### VPS (Docker)
```bash
# On your server
git clone https://github.com/yourusername/shorly.git
cd shorly
docker-compose up -d
```

### Cloudflare Worker
```bash
cd apps/worker
wrangler login
wrangler deploy
```

### Cloudflare Pages
```bash
# Connect repo in Cloudflare Dashboard
# Build: cd apps/web && pnpm build
# Output: apps/web/.next
```

## 💡 Pro Tips

1. **Use Prisma Studio** for visual database management:
   ```bash
   cd apps/api && pnpm prisma studio
   ```

2. **Use Turbo for speed**:
   ```bash
   # Turbo caches builds - subsequent builds are instant!
   pnpm build # First time: ~30s
   pnpm build # Second time: ~2s
   ```

3. **Check what's running**:
   ```bash
   docker-compose ps  # Docker services
   lsof -i :3000      # Port 3000
   lsof -i :3001      # Port 3001
   ```

4. **Reset everything**:
   ```bash
   docker-compose down -v  # Stop and remove volumes
   pnpm clean             # Clean build artifacts
   rm -rf node_modules    # Remove dependencies
   pnpm install           # Fresh install
   ```

## 📖 Essential Reading

- **README.md** - Complete overview
- **STRUCTURE.md** - Architecture details
- **DEPLOYMENT.md** - Production deployment
- **CONTRIBUTING.md** - How to contribute

## 🆘 Get Help

- **Issues**: https://github.com/yourusername/shorly/issues
- **Discussions**: https://github.com/yourusername/shorly/discussions
- **Email**: support@shorly.example

---

**Happy Coding! 🎉**

Got running in under 5 minutes? Great! Now explore and build something amazing!
