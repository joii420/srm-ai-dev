#!/usr/bin/env bash
set -euo pipefail

echo "=== Appsmith AI-IDE Setup ==="

# 0. Sync .env to backend package (Prisma needs it in its own directory)
if [ -f .env ]; then
  cp .env packages/backend/.env
  echo "[0/5] Synced .env to packages/backend/"
fi

# 1. Install dependencies
echo "[1/5] Installing dependencies..."
pnpm install

# 2. Generate Prisma client
echo "[2/5] Generating Prisma client..."
pnpm --filter backend db:generate

# 3. Run database migrations
echo "[3/5] Running database migrations..."
pnpm --filter backend db:migrate

# 4. Build container image
CONTAINER_IMAGE="${CONTAINER_IMAGE_NAME:-appsmith-ai-ide-container:latest}"
echo "[4/5] Building container image: $CONTAINER_IMAGE..."
docker build -t "$CONTAINER_IMAGE" -f docker/Dockerfile.container .

# 5. Seed SystemConfig defaults
echo "[5/5] Seeding default system configuration..."
pnpm --filter backend db:seed

echo "=== Setup Complete ==="
echo "Run 'pnpm dev' to start the development environment."
