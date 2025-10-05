#!/bin/bash

# shorly Quick Setup Script
# This script helps you set up shorly for development

set -e

echo "🚀 shorly Setup Script"
echo "=========================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm is not installed. Installing pnpm..."
    npm install -g pnpm@9.15.0 || {
        echo "❌ Failed to install pnpm via npm. Trying alternative method..."
        curl -fsSL https://get.pnpm.io/install.sh | sh - || {
            echo "❌ Failed to install pnpm. Please install manually:"
            echo "   npm install -g pnpm@9.15.0"
            exit 1
        }
    }
fi

echo "✅ Node.js $(node --version) found"
echo "✅ pnpm $(pnpm --version) found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
if [ -f pnpm-lock.yaml ]; then
    pnpm install --frozen-lockfile
else
    echo "⚠️  No lockfile found, generating one..."
    pnpm install
fi
echo ""

# Setup environment files
echo "⚙️  Setting up environment files..."

if [ ! -f apps/api/.env ]; then
    cp apps/api/.env.example apps/api/.env
    echo "✅ Created apps/api/.env"
else
    echo "⚠️  apps/api/.env already exists, skipping..."
fi

if [ ! -f apps/web/.env.local ]; then
    cp apps/web/.env.example apps/web/.env.local
    echo "✅ Created apps/web/.env.local"
else
    echo "⚠️  apps/web/.env.local already exists, skipping..."
fi

echo ""

# Check for PostgreSQL
echo "🗄️  Database Setup"
echo "----------------"
echo "Make sure PostgreSQL is running and accessible."
echo ""
read -p "Do you want to run database migrations now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running Prisma migrations..."
    cd apps/api
    pnpm prisma generate
    pnpm prisma migrate dev --name init
    cd ../..
    echo "✅ Database migrations completed"
else
    echo "⚠️  Skipping migrations. Run 'cd apps/api && pnpm prisma migrate dev' later."
fi

echo ""

# Build packages
echo "🔨 Building shared packages..."
pnpm --filter @shorly/types build
pnpm --filter @shorly/config build
pnpm --filter @shorly/utils build
echo "✅ Packages built successfully"
echo ""

# Summary
echo "✨ Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Make sure PostgreSQL and Redis are running"
echo "2. Update apps/api/.env with your database credentials"
echo "3. Run 'pnpm dev' to start development servers"
echo ""
echo "Services will be available at:"
echo "  - API: http://localhost:3001/api/v1"
echo "  - API Docs: http://localhost:3001/docs"
echo "  - Web: http://localhost:3000"
echo ""
echo "📚 Read README.md for more information"
echo "🐛 Report issues at https://github.com/yourusername/shorly/issues"
echo ""
echo "Happy coding! 🎉"
