# Quickstart: Appsmith AI-IDE Web 开发平台

**Branch**: `001-appsmith-ai-ide` | **Date**: 2026-03-24

## 环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | 20 LTS | 通过 `.nvmrc` 管理，推荐使用 `nvm install` |
| pnpm | >= 8 | `npm install -g pnpm` |
| Docker Engine | >= 24 | 容器服务构建与运行依赖 |
| PostgreSQL | 16 | 本地安装或通过 `docker-compose` 自动启动 |

额外要求：

- 内网 GitLab 可访问（SSH Key 已配置）
- Anthropic Claude API Key

## 快速启动

### 1. 克隆项目

```bash
git clone git@gitlab.internal:group/ai-ide-project.git
cd appsmith-ai-ide
```

### 2. 一键初始化（推荐）

```bash
bash scripts/setup.sh
```

`scripts/setup.sh` 会自动完成以下步骤：

- 检测 Node.js / pnpm / Docker 版本
- 执行 `pnpm install` 安装所有依赖
- 复制 `.env.example` 为 `.env`（如不存在）
- 运行数据库迁移与 Prisma Client 生成
- 构建容器服务镜像

### 3. 手动初始化（可选）

如果不使用 setup 脚本，可手动执行：

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填写以下必需项：
#   CLAUDE_API_KEY          - Anthropic API 密钥
#   SSH_KEY_ENCRYPT_SECRET  - 64 位 hex 字符串 (32 字节)
#   GITLAB_KNOWN_HOSTS      - GitLab SSH host key
#   DATABASE_URL            - PostgreSQL 连接串
#   JWT_SECRET              - JWT 签名密钥

# 数据库迁移
pnpm --filter backend db:migrate    # prisma migrate dev
pnpm --filter backend db:generate   # 生成 Prisma Client

# 构建容器镜像（首次需要）
pnpm docker:build
```

## 启动开发服务器

```bash
# 全栈启动（推荐）— docker-compose up + frontend + backend
pnpm dev

# 分别启动各包
pnpm --filter frontend dev          # 前端 React + Vite
pnpm --filter backend dev           # 后端 Fastify + tsx watch
pnpm --filter container-services dev # 容器服务
```

## 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend (Vite) | 5173 | React 开发服务器 |
| Backend (Fastify) | 3100 | 管理服务 API |
| PostgreSQL | 5432 | 数据库 |
| Container AI Proxy | 3000 | 容器内 Claude 代理（动态创建） |
| Container File Manager | 3001 | 容器内文件管理（动态创建） |

## 运行测试

### 全部测试

```bash
pnpm test                            # 运行所有子包测试
```

### 按测试类型

```bash
pnpm test:unit                       # 仅单元测试
pnpm test:integration                # 仅集成测试
pnpm test:contract                   # 仅契约测试
```

### 按子包运行

```bash
# Backend
pnpm --filter backend test           # 全部
pnpm --filter backend test:unit      # 单元测试
pnpm --filter backend test:integration  # 集成测试
pnpm --filter backend test:contract  # 契约测试

# Frontend
pnpm --filter frontend test
pnpm --filter frontend test:unit

# Container Services
pnpm --filter container-services test
pnpm --filter container-services test:unit
```

### Watch 模式

```bash
pnpm --filter backend test:watch     # vitest watch 模式
```

## 常用脚本

| 脚本 | 说明 |
|------|------|
| `pnpm dev` | 启动全栈开发环境 |
| `pnpm dev:fe` | 仅启动前端 |
| `pnpm dev:be` | 仅启动后端 |
| `pnpm build` | 编译所有子包 |
| `pnpm test` | 运行所有测试 |
| `pnpm lint` | ESLint 检查 |
| `pnpm docker:build` | 构建容器服务镜像 |
| `pnpm db:migrate` | 执行数据库迁移 |
| `pnpm db:studio` | 启动 Prisma Studio |
| `pnpm db:generate` | 更新 Prisma Client |

## 项目结构速查

```
appsmith-ai-ide/
├── packages/frontend/             React 18 + Vite + TypeScript
├── packages/backend/              Node.js 20 + Fastify + Prisma
│   ├── src/middleware/            Auth、错误处理中间件
│   ├── src/services/              SshKeyService 等业务服务
│   ├── src/lib/                   Prisma client、Logger
│   └── tests/                     unit / integration / contract
├── packages/container-services/   Docker 容器内双服务
├── docker/                        Dockerfile + docker-compose + PM2 配置
├── scripts/                       setup.sh 等自动化脚本
└── specs/                         Speckit 规格与计划文档
```

## 常见问题排查

### Docker 构建失败

```bash
# 确认 Docker 正在运行
docker info

# 清理缓存后重新构建
docker system prune -f
pnpm docker:build --no-cache

# 检查 Docker 版本 (需要 >= 24)
docker --version
```

### SSH Key 配置

```bash
# 生成 SSH_KEY_ENCRYPT_SECRET（64 位 hex）
openssl rand -hex 32

# 获取 GitLab known_hosts
ssh-keyscan gitlab.internal >> ~/.ssh/known_hosts

# 测试 GitLab 连接
ssh -T git@gitlab.internal
```

### 数据库连接失败

```bash
# 确认 PostgreSQL 正在运行
docker-compose ps            # 如果使用 docker-compose
pg_isready -h localhost -p 5432

# 检查 DATABASE_URL 格式
# postgresql://user:password@localhost:5432/ai_ide_dev

# 重新执行迁移
pnpm --filter backend db:migrate

# 重置数据库（开发环境）
pnpm --filter backend db:migrate -- --reset
```

### 端口冲突

```bash
# 检查端口占用
lsof -i :5173    # Frontend
lsof -i :3100    # Backend
lsof -i :5432    # PostgreSQL

# Windows 下使用
netstat -ano | findstr :5173
```

### 环境变量缺失

如果启动时报 `XXX environment variable is not set`，请确认 `.env` 文件包含所有必需变量：

```
CLAUDE_API_KEY=sk-ant-...
SSH_KEY_ENCRYPT_SECRET=<64位hex>
GITLAB_KNOWN_HOSTS=<gitlab host key>
DATABASE_URL=postgresql://user:password@localhost:5432/ai_ide_dev
JWT_SECRET=<至少32字符的随机字符串>
```

## Commit 规范

格式：`<type>(<scope>): <subject>`

| type | 说明 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| test | 测试 |
| refactor | 重构 |
| docs | 文档 |
| chore | 构建/工具链 |

scope: `fe` / `be` / `cs` / `docker`

示例：

```
feat(be): add SSH key rotation endpoint
fix(fe): resolve session timeout on idle
test(be): add auth middleware unit tests
chore(docker): upgrade base image to node:20-slim
```
