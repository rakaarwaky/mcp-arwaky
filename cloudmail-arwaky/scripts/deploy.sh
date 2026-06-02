#!/bin/bash

# scripts/deploy.sh
# Professional Deployment script for Cloud Mail Flare (Frontend + Backend + Database)

set -e

# Load environment variables from .env file
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_NAME="DB"
REQUIRED_BRANCH="main"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}===> Starting Professional Deployment Process <===${NC}"

cd "$PROJECT_ROOT"

# 1. Pre-deployment Checks
echo -e "${YELLOW}[Check] Validating environment...${NC}"

# Check branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [ "$CURRENT_BRANCH" != "$REQUIRED_BRANCH" ]; then
    echo -e "${YELLOW}⚠️  Warning: You are on branch '$CURRENT_BRANCH'. Production deployment is usually from '$REQUIRED_BRANCH'.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit 1; fi
fi

# 2. Build Frontend (Clean Build)
echo -e "${YELLOW}[1/3] Building Frontend Assets (Clean Build)...${NC}"
rm -rf src/surfaces/web/web-dist
if ! npm run build -w src/surfaces/web; then
    echo -e "${RED}❌ Error: Build failed.${NC}"
    exit 1
fi

# Verify build output
if [ ! -d "src/surfaces/web/web-dist/client" ]; then
    echo -e "${RED}❌ Error: Build directory 'src/surfaces/web/web-dist/client' not found.${NC}"
    exit 1
fi

# 3. Quality Gates
echo -e "${YELLOW}[Quality] Running Linting...${NC}"
if ! npm run lint:aes; then
    echo -e "${RED}❌ Error: Linting failed.${NC}"
    exit 1
fi

echo -e "${YELLOW}[Quality] Running Smoke Tests...${NC}"
if ! npm run test:smoke; then
    echo -e "${RED}❌ Error: Smoke tests failed. Deployment aborted.${NC}"
    exit 1
fi


# 4. Apply Database Migrations (D1)
echo -e "${YELLOW}[2/3] Applying D1 Database Migrations...${NC}"
if yes | npx wrangler d1 migrations apply "$DB_NAME" --remote --config wrangler.toml; then
    echo -e "${GREEN}✅ Migrations applied successfully.${NC}"
else
    echo -e "${YELLOW}⚠️  Migration warning: The migration step returned an error.${NC}"
    echo -e "${YELLOW}This often happens if columns already exist. Checking deployment...${NC}"
fi

# 5. Deploy Worker (Backend + Assets)
echo -e "${YELLOW}[3/3] Deploying Worker to Cloudflare...${NC}"
if npx wrangler deploy --config wrangler.toml; then
    echo -e "${GREEN}✅ Deployment Successful!${NC}"
    
    # Try to extract the custom domain from wrangler.toml
    CUSTOM_DOMAIN=$(grep "pattern =" wrangler.toml | head -n 1 | cut -d'"' -f2)
    if [ -n "$CUSTOM_DOMAIN" ]; then
        echo -e "${BLUE}URL: https://${CUSTOM_DOMAIN}${NC}"
    else
        echo -e "${BLUE}URL: Check Cloudflare Dashboard${NC}"
    fi
else
    echo -e "${RED}❌ Error: Cloudflare deployment failed.${NC}"
    exit 1
fi

