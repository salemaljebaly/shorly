DO $$
BEGIN
  -- Rename providerId column if it still exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'providerId'
  ) THEN
    ALTER TABLE "subscriptions" RENAME COLUMN "providerId" TO "providerSubscriptionId";
  END IF;
END $$;

-- Add new lifecycle columns if missing
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "trialEnd" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);

-- Ensure provider column defaults to stripe
ALTER TABLE "subscriptions" ALTER COLUMN "provider" SET DEFAULT 'stripe';

-- Backfill provider default for existing rows
UPDATE "subscriptions"
SET "provider" = COALESCE("provider", 'stripe');

DO $$
BEGIN
  -- Rename legacy index if present
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'subscriptions_providerId_idx'
  ) THEN
    ALTER INDEX "subscriptions_providerId_idx"
    RENAME TO "subscriptions_providerSubscriptionId_idx";
  END IF;
END $$;

-- Ensure new index exists (covers fresh databases)
CREATE INDEX IF NOT EXISTS "subscriptions_providerSubscriptionId_idx"
  ON "subscriptions" ("providerSubscriptionId");
