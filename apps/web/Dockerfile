# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9.15.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/web ./apps/web
COPY packages ./packages
COPY turbo.json ./

# Build packages
RUN pnpm --filter @shorly/types build
RUN pnpm --filter @shorly/config build
RUN pnpm --filter @shorly/utils build

# Build web
WORKDIR /app/apps/web
RUN pnpm build

# Production stage
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@9.15.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built files from builder
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "start"]
