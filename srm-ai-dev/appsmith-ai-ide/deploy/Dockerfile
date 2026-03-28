# ============================================================
# Multi-stage Dockerfile for Appsmith AI IDE
# Stages: frontend-build -> backend-build -> db-migrate -> runtime
# ============================================================

# ------------------ Stage 1: Frontend Build ------------------
FROM node:20-slim AS frontend-build

RUN npm install -g pnpm

WORKDIR /build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/frontend/package.json packages/frontend/
RUN pnpm install --frozen-lockfile || pnpm install --filter frontend

COPY packages/frontend/ packages/frontend/
COPY tsconfig.base.json ./
RUN pnpm --filter frontend build

# ------------------ Stage 2: Java Backend Build ------------------
FROM maven:3.9-eclipse-temurin-17 AS backend-build

WORKDIR /build
COPY packages/backend-java/pom.xml .
RUN mvn dependency:go-offline -B

COPY packages/backend-java/src/ src/
RUN mvn package -DskipTests -B

# ------------------ Stage 3: DB Migration Tool ------------------
FROM node:20-slim AS db-migrate

RUN npm install -g pnpm

WORKDIR /migrate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/backend/package.json packages/backend/
RUN pnpm install --frozen-lockfile || pnpm install --filter backend

COPY packages/backend/prisma/ packages/backend/prisma/
RUN cd packages/backend && npx prisma generate

# ------------------ Stage 4: Runtime ------------------
FROM ubuntu:24.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Install system packages: JDK 17, Nginx, Node.js 20, Docker CLI, PostgreSQL client
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless \
    nginx \
    curl \
    ca-certificates \
    gnupg \
    postgresql-client-16 \
    supervisor \
    git \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS (for Prisma migration)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI (for container management)
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu noble stable" \
       > /etc/apt/sources.list.d/docker.list \
    && apt-get update && apt-get install -y --no-install-recommends docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# ---- Copy Frontend static files ----
COPY --from=frontend-build /build/packages/frontend/dist/ /var/www/html/

# ---- Copy Java Backend ----
COPY --from=backend-build /build/target/quarkus-app/ /opt/backend/

# ---- Copy Prisma migration tool ----
COPY --from=db-migrate /migrate/packages/backend/node_modules/ /opt/migrate/node_modules/
COPY --from=db-migrate /migrate/packages/backend/prisma/ /opt/migrate/prisma/
COPY --from=db-migrate /migrate/node_modules/ /opt/migrate/global_modules/

# ---- Nginx config ----
COPY deploy/nginx.conf /etc/nginx/sites-available/default

# ---- Supervisor config ----
COPY deploy/supervisord.conf /etc/supervisor/conf.d/appsmith-ai-ide.conf

# ---- Entrypoint ----
COPY deploy/entrypoint.sh /opt/entrypoint.sh
RUN chmod +x /opt/entrypoint.sh

EXPOSE 80 3100

ENTRYPOINT ["/opt/entrypoint.sh"]
