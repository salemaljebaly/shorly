// Load test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://shorly:shorly_password@localhost:5432/shorly_test';
process.env.REDIS_URL =
  process.env.TEST_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only-min-32-chars';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing-purposes-only-different';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.RATE_LIMIT_MAX = '1000';
process.env.RATE_LIMIT_WINDOW = '60000'; // 1 minute window for tests
process.env.LOG_LEVEL = 'error';
