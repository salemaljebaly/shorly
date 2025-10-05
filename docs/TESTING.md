# Testing Guide

Shorly maintains comprehensive test coverage with three types of tests: **Unit**, **Integration**, and **E2E**. This guide explains our testing strategy and how to run tests.

## Table of Contents

- [Overview](#overview)
- [Test Coverage](#test-coverage)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)

---

## Overview

### Testing Pyramid

```
       /\
      /E2E\      ← 10% (slow, broad, critical user flows)
     /------\
    /  INT  \    ← 20% (medium speed, component interactions)
   /----------\
  /   UNIT     \ ← 70% (fast, many edge cases, business logic)
 /--------------\
```

**Current Coverage (API):**
- **Statements:** 100%
- **Branches:** 100%
- **Functions:** 100%
- **Lines:** 100%

---

## Test Coverage

### Coverage Goals

| Metric     | Target | Current |
|------------|--------|---------|
| Statements | 100%   | ✅ 100% |
| Branches   | 100%   | ✅ 100% |
| Functions  | 100%   | ✅ 100% |
| Lines      | 100%   | ✅ 100% |

### Per-Service Coverage

All services maintain 100% coverage:
- ✅ Auth Service (11 unit, 11 integration, 15 e2e)
- ✅ Links Service (23 unit, 10 integration, 25 e2e)
- ✅ OneLinks Service (21 unit, 8 integration, 22 e2e)
- ✅ Analytics Service (11 unit, 4 integration, 18 e2e)
- ✅ QR Service (20 unit, 0 integration, 16 e2e)

**Total: 86 unit + 33 integration + 96 e2e = 215 tests**

---

## Test Types

### 1. Unit Tests

**Purpose:** Test individual functions/methods in isolation with mocked dependencies

**Location:** `apps/api/src/**/*.spec.ts` (next to source files)

**What They Test:**
- Business logic
- Edge cases (null, undefined, empty arrays)
- Error handling
- Default parameters
- Branch coverage (if/else, ternary, ||, &&)
- Environment variable fallbacks

**Example:**
```typescript
// links.service.spec.ts
it('should create link with auto-generated short code', async () => {
  const userId = await createTestUser();
  const dto = { destinationUrl: 'https://example.com' };

  const result = await service.create(userId, dto);

  expect(result.shortCode).toBeDefined();
  expect(redisMock.setex).toHaveBeenCalled(); // Mocked Redis
});
```

**Run:**
```bash
pnpm --filter @shorly/api test
pnpm --filter @shorly/api test:cov  # With coverage
```

---

### 2. Integration Tests

**Purpose:** Test component interactions with real dependencies (database + Redis)

**Location:** `apps/api/test/integration/*.integration-spec.ts`

**What They Test:**
- Service + Real PostgreSQL + Real Redis
- Cache invalidation logic
- Database constraints and transactions
- Race conditions
- Concurrent operations
- Data consistency between cache and database

**Example:**
```typescript
// links.integration-spec.ts
it('should cache link in Redis after creation', async () => {
  const link = await service.create(userId, dto);

  // Verify REAL Redis cache
  const cached = await redis.get(`link:${link.shortCode}`);
  expect(cached).toBeDefined();
  expect(JSON.parse(cached).id).toBe(link.id);
});
```

**Run:**
```bash
pnpm --filter @shorly/api test:integration
```

**Features:**
- ✅ Run in parallel (uses 50% CPU cores)
- ✅ Isolated test contexts (unique user per test)
- ✅ Real database and Redis
- ✅ Automatic cleanup

---

### 3. E2E (End-to-End) Tests

**Purpose:** Test complete user flows through HTTP layer

**Location:** `apps/api/test/e2e/*.e2e-spec.ts`

**What They Test:**
- Full HTTP request/response flows
- Controllers, guards, middleware
- Authentication and authorization
- Request validation
- Error responses (400, 401, 404, etc.)
- Happy paths for user workflows

**Example:**
```typescript
// links.e2e-spec.ts
it('should create link via POST /links', () => {
  return request(app.getHttpServer())
    .post('/links')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ destinationUrl: 'https://example.com' })
    .expect(201)
    .expect((res) => {
      expect(res.body.shortCode).toBeDefined();
    });
});
```

**Run:**
```bash
pnpm --filter @shorly/api test:e2e
```

**Features:**
- ✅ Run sequentially (maxWorkers: 1)
- ✅ Full NestJS application bootstrap
- ✅ Real HTTP requests via supertest
- ✅ Test database isolation

---

## Running Tests

### API Tests

```bash
# Unit tests
pnpm --filter @shorly/api test

# Unit tests with coverage
pnpm --filter @shorly/api test:cov

# Integration tests
pnpm --filter @shorly/api test:integration

# E2E tests
pnpm --filter @shorly/api test:e2e

# All tests
pnpm --filter @shorly/api test && \
pnpm --filter @shorly/api test:integration && \
pnpm --filter @shorly/api test:e2e
```

### Watch Mode

```bash
pnpm --filter @shorly/api test:watch
```

### Run Specific Test File

```bash
# Unit
pnpm --filter @shorly/api test -- auth.service.spec.ts

# Integration
pnpm --filter @shorly/api test:integration -- auth.integration-spec.ts

# E2E
pnpm --filter @shorly/api test:e2e -- auth.e2e-spec.ts
```

### Run Specific Test Case

```bash
pnpm --filter @shorly/api test -- auth.service.spec.ts -t "should register user"
```

---

## Writing Tests

### Mandatory Testing Checklist

After completing ANY feature, you MUST add:

- [ ] Unit tests (100% coverage)
- [ ] Integration tests (cache, database, concurrency)
- [ ] E2E tests (HTTP flows)
- [ ] All tests pass
- [ ] Coverage remains at 100%

### Unit Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';
import { PrismaClient } from '@prisma/client';

describe('YourService', () => {
  let service: YourService;
  let prisma: PrismaClient;
  let redisMock: any;

  beforeEach(async () => {
    prisma = new PrismaClient();
    redisMock = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        { provide: PrismaClient, useValue: prisma },
        { provide: 'REDIS_CLIENT', useValue: redisMock },
      ],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  afterEach(async () => {
    await prisma.$disconnect();
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    const result = await service.doSomething();
    expect(result).toBeDefined();
  });
});
```

### Integration Test Template

```typescript
import { YourService } from '../../src/modules/your/your.service';
import { IntegrationTestContext, setupIntegrationTest } from './test-helpers';

describe('YourService Integration Tests', () => {
  let context: IntegrationTestContext;
  let service: YourService;
  let userId: string;

  beforeAll(async () => {
    context = await setupIntegrationTest();
    service = new YourService(context.prisma, context.redis);
  });

  beforeEach(async () => {
    userId = await context.createTestUser();
    await context.clearRedisCache();
  });

  afterAll(async () => {
    await context.cleanup();
  });

  it('should integrate with database and cache', async () => {
    const result = await service.create(userId, data);

    // Verify in cache
    const cached = await context.redis.get(`key:${result.id}`);
    expect(cached).toBeDefined();

    // Verify in database
    const fromDb = await context.prisma.model.findUnique({
      where: { id: result.id }
    });
    expect(fromDb).toBeDefined();
  });
});
```

### E2E Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestUtils } from '../test-utils';

describe('YourController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await TestUtils.setupDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await TestUtils.teardownDatabase();
  });

  it('/endpoint (POST)', () => {
    return request(app.getHttpServer())
      .post('/endpoint')
      .send(data)
      .expect(201);
  });
});
```

---

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use unique identifiers (timestamps, UUIDs)
- Clean up test data in `afterEach`
- Don't rely on test execution order

### 2. Descriptive Test Names

```typescript
// ✅ Good
it('should throw UnauthorizedException when password is incorrect')

// ❌ Bad
it('test login')
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('should create user', async () => {
  // Arrange
  const dto = { email: 'test@example.com', password: 'pass123' };

  // Act
  const result = await service.register(dto);

  // Assert
  expect(result.user.email).toBe(dto.email);
});
```

### 4. Test Edge Cases

```typescript
it('should handle null values')
it('should handle empty arrays')
it('should handle missing optional parameters')
it('should handle concurrent operations')
it('should handle database errors')
```

### 5. Mock External Dependencies in Unit Tests

```typescript
// Mock Redis, not real connection
redisMock = {
  get: jest.fn().mockResolvedValue(null),
  setex: jest.fn().mockResolvedValue('OK'),
};
```

### 6. Use Real Dependencies in Integration Tests

```typescript
// Real Prisma, Real Redis
const context = await setupIntegrationTest();
service = new YourService(context.prisma, context.redis);
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm --filter @shorly/api test:cov

      - name: Run integration tests
        run: pnpm --filter @shorly/api test:integration

      - name: Run E2E tests
        run: pnpm --filter @shorly/api test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Troubleshooting

### Tests Failing After Database Changes

```bash
# Reset test database
cd apps/api
DATABASE_URL="your_test_db_url" pnpm prisma migrate reset
```

### Port Already in Use

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Redis Connection Issues

```bash
# Start Redis
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:7
```

### Test Timeout Errors

Increase timeout in jest config:
```json
{
  "testTimeout": 30000
}
```

### Flaky Tests

- Check for race conditions
- Ensure proper test isolation
- Add unique identifiers
- Verify cleanup in `afterEach`

---

## Performance Tips

1. **Use `maxWorkers`** for parallel execution
2. **Run integration tests in parallel** (50% CPU)
3. **Run E2E tests sequentially** (avoid port conflicts)
4. **Use test databases** separate from development
5. **Clear only necessary data** in cleanup

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
