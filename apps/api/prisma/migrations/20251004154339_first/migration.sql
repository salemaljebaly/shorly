-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "apiKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links" (
    "id" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onelinks" (
    "id" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "targets" JSONB NOT NULL,
    "fallbackUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onelinks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_events" (
    "id" TEXT NOT NULL,
    "linkId" TEXT,
    "oneLinkId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "country" TEXT,
    "city" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,

    CONSTRAINT "click_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_apiKey_key" ON "users"("apiKey");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_apiKey_idx" ON "users"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "links_shortCode_key" ON "links"("shortCode");

-- CreateIndex
CREATE INDEX "links_shortCode_idx" ON "links"("shortCode");

-- CreateIndex
CREATE INDEX "links_userId_idx" ON "links"("userId");

-- CreateIndex
CREATE INDEX "links_isActive_idx" ON "links"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "onelinks_shortCode_key" ON "onelinks"("shortCode");

-- CreateIndex
CREATE INDEX "onelinks_shortCode_idx" ON "onelinks"("shortCode");

-- CreateIndex
CREATE INDEX "onelinks_userId_idx" ON "onelinks"("userId");

-- CreateIndex
CREATE INDEX "onelinks_isActive_idx" ON "onelinks"("isActive");

-- CreateIndex
CREATE INDEX "click_events_linkId_timestamp_idx" ON "click_events"("linkId", "timestamp");

-- CreateIndex
CREATE INDEX "click_events_oneLinkId_timestamp_idx" ON "click_events"("oneLinkId", "timestamp");

-- CreateIndex
CREATE INDEX "click_events_timestamp_idx" ON "click_events"("timestamp");

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onelinks" ADD CONSTRAINT "onelinks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_oneLinkId_fkey" FOREIGN KEY ("oneLinkId") REFERENCES "onelinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
