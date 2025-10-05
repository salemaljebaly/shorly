# Shorly Deployment Guide

Complete guide for deploying Shorly to various platforms.

## Table of Contents

- [VPS Deployment (Docker)](#vps-deployment-docker)
- [Cloudflare Deployment](#cloudflare-deployment)
- [Hybrid Deployment](#hybrid-deployment)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring](#monitoring)

## VPS Deployment (Docker)

### Prerequisites

- Ubuntu 22.04+ or similar Linux distribution
- Docker and Docker Compose installed
- Domain name with DNS configured
- At least 2GB RAM, 2 CPU cores, 20GB storage

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add user to docker group
sudo usermod -aG docker $USER
```

### Step 2: Clone Repository

```bash
cd /opt
sudo git clone https://github.com/yourusername/shorly.git
cd shorly
```

### Step 3: Configure Environment

```bash
# Create .env files for production
sudo nano apps/api/.env
```

Add production values:
```env
NODE_ENV=production
DATABASE_URL=postgresql://shorly:STRONG_PASSWORD@postgres:5432/shorly
REDIS_URL=redis://redis:6379
JWT_SECRET=GENERATE_SECURE_32_CHAR_SECRET
PORT=3001
CORS_ORIGIN=https://yourdomain.com
```

```bash
# Web environment
sudo nano apps/web/.env
```

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Step 4: Update docker-compose.yml

```yaml
# Update passwords and secrets
environment:
  POSTGRES_PASSWORD: YOUR_STRONG_PASSWORD
  JWT_SECRET: YOUR_JWT_SECRET
```

### Step 5: Deploy

```bash
# Start services
sudo docker-compose up -d

# View logs
sudo docker-compose logs -f

# Check status
sudo docker-compose ps
```

### Step 6: Run Migrations

```bash
sudo docker-compose exec api npx prisma migrate deploy
```

### Step 7: Configure Nginx (Reverse Proxy)

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/shorly
```

```nginx
# API Server
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Web Server
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/shorly /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renewal is set up automatically
```

## Cloudflare Deployment

### Cloudflare Workers (Redirects)

1. **Install Wrangler**:
```bash
npm install -g wrangler
wrangler login
```

2. **Configure Worker**:
```bash
cd apps/worker
nano wrangler.toml
```

Update:
```toml
name = "shorly-worker"
routes = [
  { pattern = "go.yourdomain.com/*", zone_name = "yourdomain.com" }
]

[vars]
API_URL = "https://api.yourdomain.com/api/v1"
```

3. **Create KV Namespace**:
```bash
wrangler kv:namespace create "LINKS_CACHE"
```

Add namespace ID to `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "LINKS_CACHE"
id = "your-namespace-id"
```

4. **Deploy**:
```bash
wrangler deploy
```

### Cloudflare Pages (Web Frontend)

1. **Connect Repository** in Cloudflare Dashboard
2. **Build Settings**:
   - Framework: Next.js
   - Build command: `cd apps/web && pnpm build`
   - Build output: `apps/web/.next`
   - Root directory: `/`

3. **Environment Variables**:
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

4. **Deploy**: Push to main branch

## Hybrid Deployment

Best performance setup:

- **API**: VPS with Docker (PostgreSQL + Redis + NestJS)
- **Worker**: Cloudflare Workers (redirects)
- **Web**: Cloudflare Pages (frontend)

### Architecture

```
User Request
    ↓
[Cloudflare CDN]
    ↓
├─ go.domain.com/* → Worker (redirect)
├─ domain.com → Pages (frontend)
└─ api.domain.com → VPS (API)
```

### Setup

1. Deploy API to VPS (see above)
2. Deploy Worker (see above)
3. Deploy Web to Pages (see above)
4. Configure DNS in Cloudflare:
   - `yourdomain.com` → Cloudflare Pages
   - `api.yourdomain.com` → VPS IP
   - `go.yourdomain.com` → Worker route

## Environment Variables

### Production API (.env)

```env
NODE_ENV=production
LOG_LEVEL=warn

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_URL=redis://host:6379
REDIS_TOKEN=your_token_if_upstash
REDIS_TTL=3600

# JWT
JWT_SECRET=MINIMUM_32_CHARACTERS_STRONG_SECRET
JWT_EXPIRES_IN=7d

# Server
PORT=3001
API_PREFIX=/api/v1
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### Production Web (.env)

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

## Database Setup

### Managed PostgreSQL (Recommended)

Options:
- **Supabase**: Free tier available, managed Postgres
- **Neon**: Serverless Postgres, generous free tier
- **Railway**: Easy setup, fair pricing
- **DigitalOcean**: Managed databases

### Self-Hosted PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Create database and user
sudo -u postgres psql

CREATE DATABASE shorly;
CREATE USER shorly WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE shorly TO shorly;
\q

# Enable remote connections (if needed)
sudo nano /etc/postgresql/16/main/postgresql.conf
# Change: listen_addresses = '*'

sudo nano /etc/postgresql/16/main/pg_hba.conf
# Add: host all all 0.0.0.0/0 md5

sudo systemctl restart postgresql
```

### Redis Setup

Use **Upstash** (free tier) or self-host:

```bash
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

## SSL/TLS Configuration

### Let's Encrypt (Free)

Already configured in Nginx section above.

### Cloudflare SSL

1. In Cloudflare Dashboard → SSL/TLS
2. Set to "Full (strict)"
3. Enable "Always Use HTTPS"
4. Enable "Automatic HTTPS Rewrites"

## Monitoring

### Application Monitoring

**Sentry** (errors):
```bash
npm install @sentry/node @sentry/nestjs
```

Configure in `main.ts`:
```typescript
import * as Sentry from '@sentry/nestjs';

Sentry.init({ dsn: 'your-sentry-dsn' });
```

### Server Monitoring

**Prometheus + Grafana**:
```bash
# Install prometheus
docker run -d -p 9090:9090 prom/prometheus

# Install grafana
docker run -d -p 3001:3000 grafana/grafana
```

### Logs

**Docker logs**:
```bash
docker-compose logs -f --tail=100 api
docker-compose logs -f --tail=100 web
```

**Cloudflare logs**:
- Worker logs: `wrangler tail`
- Pages logs: Cloudflare Dashboard

### Health Checks

Add to `docker-compose.yml`:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Backup

### Database Backups

```bash
# Automated daily backup
sudo crontab -e

# Add line:
0 2 * * * docker exec shorly-postgres pg_dump -U shorly shorly | gzip > /backups/shorly-$(date +\%Y\%m\%d).sql.gz
```

### Restore

```bash
gunzip < backup.sql.gz | docker exec -i shorly-postgres psql -U shorly shorly
```

## Scaling

### Horizontal Scaling

1. **Load Balancer**: Nginx, Cloudflare
2. **Multiple API Instances**: Scale with Docker Swarm or Kubernetes
3. **Database**: Read replicas
4. **Redis**: Redis Cluster

### Vertical Scaling

Upgrade VPS resources as needed.

## Troubleshooting

### Container won't start

```bash
docker-compose logs api
docker-compose ps
```

### Database connection issues

```bash
docker-compose exec api npx prisma db push
```

### Redis connection issues

```bash
docker-compose exec redis redis-cli ping
```

## Security Checklist

- [ ] Strong passwords for database
- [ ] JWT secret is 32+ characters
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] SSL/TLS configured
- [ ] Firewall configured (UFW)
- [ ] Regular updates scheduled
- [ ] Backups automated
- [ ] Environment variables secured
- [ ] Docker images updated regularly

## Support

For deployment issues:
- Check logs first
- Search existing issues
- Create new issue with logs
- Email: support@shorly.example
