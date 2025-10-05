# Shorly Documentation

Welcome to the Shorly documentation! This guide will help you understand, set up, and contribute to the project.

---

## 📚 Table of Contents

### Getting Started
- **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 minutes
- **[Architecture Overview](ARCHITECTURE.md)** - Understand the system design
- **[Summary](SUMMARY.md)** - High-level project overview

### Development
- **[Testing Guide](TESTING.md)** - Comprehensive testing documentation
  - Unit Tests (100% coverage)
  - Integration Tests
  - E2E Tests
- **[Contributing](CONTRIBUTING.md)** - How to contribute to the project
- **[Changelog](CHANGELOG.md)** - Project history and changes

### Deployment
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions
  - VPS Deployment
  - Cloudflare Workers
  - Docker Setup

---

## 🚀 Quick Links

### For New Developers
1. Read [QUICKSTART.md](QUICKSTART.md)
2. Check [ARCHITECTURE.md](ARCHITECTURE.md)
3. Review [TESTING.md](TESTING.md)
4. See [CONTRIBUTING.md](CONTRIBUTING.md)

### For Deploying
1. Follow [DEPLOYMENT.md](DEPLOYMENT.md)
2. Reference [QUICKSTART.md](QUICKSTART.md) for environment setup

### For Testing
1. Read [TESTING.md](TESTING.md) for complete testing guide
2. Achieve 100% code coverage
3. Run unit, integration, and E2E tests

---

## 📖 Documentation Structure

```
docs/
├── README.md              # This file - Documentation hub
├── QUICKSTART.md          # Quick start guide
├── ARCHITECTURE.md        # System architecture
├── TESTING.md             # Testing guide
├── CONTRIBUTING.md        # Contribution guidelines
├── DEPLOYMENT.md          # Deployment guide
├── SUMMARY.md             # Project summary
└── CHANGELOG.md           # Changes history
```

---

## 🏗️ Project Structure

```
shorly/
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── src/          # Source code
│   │   ├── test/
│   │   │   ├── e2e/      # E2E tests
│   │   │   └── integration/  # Integration tests
│   │   └── prisma/       # Database schema
│   │
│   ├── web/              # Next.js 15 frontend
│   │   └── src/          # Source code
│   │
│   └── worker/           # Cloudflare Worker
│
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── config/           # Environment schemas
│   └── utils/            # Shared utilities
│
└── docs/                 # 📚 You are here
```

---

## 🧪 Testing Overview

Shorly maintains **100% test coverage** across all metrics:

| Type | Count | Coverage | Location |
|------|-------|----------|----------|
| **Unit** | 86 tests | 100% | `apps/api/src/**/*.spec.ts` |
| **Integration** | 33 tests | All services | `apps/api/test/integration/` |
| **E2E** | 96 tests | All endpoints | `apps/api/test/e2e/` |

**Total: 215 tests**

See [TESTING.md](TESTING.md) for details.

---

## 🚢 Deployment Options

1. **VPS** - Self-hosted with Docker Compose
2. **Cloudflare** - Workers + Pages (edge-optimized)
3. **Hybrid** - API on VPS, Worker on Cloudflare (recommended)

See [DEPLOYMENT.md](DEPLOYMENT.md) for details.

---

## 🛠️ Tech Stack

### Backend (API)
- **Framework:** NestJS
- **Database:** PostgreSQL 16 + Prisma ORM
- **Cache:** Redis 7
- **Auth:** JWT (access + refresh tokens)
- **Docs:** Swagger/OpenAPI

### Frontend (Web)
- **Framework:** Next.js 15 (App Router)
- **UI:** shadcn/ui + Tailwind CSS
- **i18n:** Built-in (English + Arabic with RTL)
- **State:** React Server Components

### Edge (Worker)
- **Runtime:** Cloudflare Workers
- **Storage:** KV (cache)
- **Purpose:** Low-latency redirects

### Shared
- **Language:** TypeScript
- **Package Manager:** pnpm
- **Monorepo:** Turborepo
- **Testing:** Jest + Supertest

---

## 📝 Key Features

- ✅ **Short Links** - Create and manage short URLs
- ✅ **OneLinks** - Device-based routing (iOS/Android/Web)
- ✅ **Analytics** - Track clicks, devices, countries, referrers
- ✅ **QR Codes** - Generate dynamic QR codes
- ✅ **Multilingual** - English + Arabic (RTL support)
- ✅ **Edge Redirects** - Cloudflare Workers for speed
- ✅ **100% Test Coverage** - Unit + Integration + E2E
- ✅ **Self-Hostable** - Docker Compose ready

---

## 🤝 Contributing

We welcome contributions! Please read:

1. [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
2. [TESTING.md](TESTING.md) - Testing requirements
3. [ARCHITECTURE.md](ARCHITECTURE.md) - System design

**Before submitting PR:**
- ✅ All tests pass
- ✅ 100% coverage maintained
- ✅ Code follows style guide
- ✅ Documentation updated

---

## 📦 Installation

Quick setup:

```bash
# Clone repository
git clone https://github.com/yourusername/shorly.git
cd shorly

# Install dependencies
pnpm install

# Setup environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Start services (PostgreSQL + Redis)
docker-compose up -d

# Run migrations
cd apps/api
pnpm prisma migrate dev

# Start development
cd ../..
pnpm dev
```

See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

---

## 🐛 Troubleshooting

### Common Issues

**Database connection errors:**
```bash
docker-compose up -d postgres redis
```

**Port conflicts:**
```bash
lsof -ti:3001 | xargs kill -9  # Kill API
lsof -ti:3000 | xargs kill -9  # Kill Web
```

**Type errors:**
```bash
pnpm build  # Rebuild all packages
```

**Test failures:**
```bash
# Reset test database
DATABASE_URL="test_db_url" pnpm prisma migrate reset
```

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/shorly/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/shorly/discussions)
- **Documentation:** You're reading it! 📚

---

## 📄 License

See [LICENSE](../LICENSE) file for details.

---

## 🎯 Next Steps

1. **New to the project?** → Start with [QUICKSTART.md](QUICKSTART.md)
2. **Want to contribute?** → Read [CONTRIBUTING.md](CONTRIBUTING.md)
3. **Deploying to production?** → Follow [DEPLOYMENT.md](DEPLOYMENT.md)
4. **Writing tests?** → Check [TESTING.md](TESTING.md)
5. **Understanding architecture?** → See [ARCHITECTURE.md](ARCHITECTURE.md)

Happy coding! 🚀
