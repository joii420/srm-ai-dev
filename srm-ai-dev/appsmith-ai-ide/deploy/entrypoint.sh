#!/bin/bash
set -e

echo "============================================"
echo "  Appsmith AI IDE - Starting up..."
echo "============================================"

# ---- Wait for PostgreSQL ----
echo "[1/3] Waiting for PostgreSQL..."
until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USER:-aiide}" -q 2>/dev/null; do
    echo "  PostgreSQL not ready, retrying in 2s..."
    sleep 2
done
echo "  PostgreSQL is ready."

# ---- Run Prisma Migrations ----
echo "[2/3] Running database migrations..."
cd /opt/migrate
export DATABASE_URL="postgresql://${DB_USER:-aiide}:${DB_PASSWORD:-aiide_dev}@${DB_HOST:-postgres}:${DB_PORT:-5432}/${DB_NAME:-aiide}?schema=public"
NODE_PATH=/opt/migrate/global_modules npx prisma migrate deploy --schema=prisma/schema.prisma
echo "  Migrations complete."

# ---- Set Java backend env vars from container environment ----
echo "[3/3] Starting services..."

# Export DB config for Quarkus
export QUARKUS_DATASOURCE_USERNAME="${DB_USER:-aiide}"
export QUARKUS_DATASOURCE_PASSWORD="${DB_PASSWORD:-aiide_dev}"
export QUARKUS_DATASOURCE_JDBC_URL="jdbc:postgresql://${DB_HOST:-postgres}:${DB_PORT:-5432}/${DB_NAME:-aiide}"

# Start supervisor (manages nginx + java backend)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/appsmith-ai-ide.conf
