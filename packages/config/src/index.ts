import { z } from 'zod';

// Environment validation schemas using Zod

// ============= Common Config =============
export const commonEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// ============= Database Config =============
export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DB_POOL_MIN: z.coerce.number().min(1).default(2),
  DB_POOL_MAX: z.coerce.number().min(1).default(10),
});

// ============= Redis Config =============
export const redisEnvSchema = z.object({
  REDIS_URL: z.string().url(),
  REDIS_TOKEN: z.string().optional(),
  REDIS_TTL: z.coerce.number().default(3600), // 1 hour default
});

// ============= API Config =============
export const apiEnvSchema = commonEnvSchema.merge(databaseEnvSchema).merge(redisEnvSchema).extend({
  PORT: z.coerce.number().default(3001),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('*'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  RATE_LIMIT_WINDOW: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

// ============= Web Config =============
export const webEnvSchema = commonEnvSchema.extend({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_DEFAULT_LANGUAGE: z.enum(['en', 'ar']).default('en'),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

// ============= Worker Config =============
export const workerEnvSchema = z.object({
  ENVIRONMENT: z.enum(['development', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  REDIS_TOKEN: z.string().optional(),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

// ============= Validation Helpers =============
export function validateEnv<T extends z.ZodSchema>(
  schema: T,
  env: Record<string, unknown> = process.env
): z.infer<T> {
  try {
    return schema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(`Environment validation failed:\n${missingVars}`);
    }
    throw error;
  }
}

// ============= App Constants =============
export const APP_CONSTANTS = {
  SHORT_CODE_LENGTH: 7,
  SHORT_CODE_CHARSET: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  MAX_SHORT_CODE_ATTEMPTS: 10,
  DEFAULT_QR_SIZE: 512,
  DEFAULT_QR_MARGIN: 4,
  MAX_LINK_TITLE_LENGTH: 200,
  MAX_LINK_DESCRIPTION_LENGTH: 1000,
  ANALYTICS_BATCH_SIZE: 100,
  SUPPORTED_LANGUAGES: ['en', 'ar'] as const,
} as const;

export type SupportedLanguage = (typeof APP_CONSTANTS.SUPPORTED_LANGUAGES)[number];
