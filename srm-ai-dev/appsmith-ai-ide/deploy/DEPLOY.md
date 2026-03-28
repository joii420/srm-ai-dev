# Appsmith AI IDE 部署指南

在 **Ubuntu 24.04.4 LTS** 上使用 Docker 一键部署 Appsmith AI IDE。

---

## 架构概览

```
┌─────────────────────────────────────────────────┐
│              Docker Compose                     │
│                                                 │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │  PostgreSQL   │    │    aiide-app          │  │
│  │  16-alpine    │◄───│                       │  │
│  │  Port: 5432   │    │  Nginx (:80)          │  │
│  └──────────────┘    │    ├─ 前端静态文件     │  │
│                       │    └─ /api/ → :3100   │  │
│                       │                       │  │
│                       │  Java Backend (:3100) │  │
│                       │    Quarkus + JDK 17   │  │
│                       │                       │  │
│                       │  Prisma Migrate       │  │
│                       │    (启动时自动执行)    │  │
│                       └───────────────────────┘  │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  container-services (按需生成的容器)     │    │
│  │  AI Proxy (:3000) + File Manager (:3001)│    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

## 使用的镜像及版本

| 组件 | 镜像 | 版本/Tag |
|------|------|----------|
| **操作系统基础** | `ubuntu` | `24.04` |
| **PostgreSQL** | `postgres` | `16-alpine` |
| **JDK** | `openjdk-17-jre-headless` | `17` (Ubuntu APT) |
| **Node.js** (构建阶段) | `node` | `20-slim` |
| **Maven** (构建阶段) | `maven` | `3.9-eclipse-temurin-17` |
| **Nginx** | Ubuntu APT `nginx` | 系统默认版本 |
| **Container Services** | `node` | `20-slim` |

---

## 前置条件

### 1. 系统要求

- Ubuntu 24.04.4 LTS (amd64)
- 最低 4GB 内存，推荐 8GB+
- 最低 20GB 磁盘空间
- 可访问外部网络（拉取镜像和依赖）

### 2. 安装 Docker 和 Docker Compose

```bash
# 更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 安装必要工具
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# 添加 Docker 官方 GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 添加 Docker 仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker Engine + Compose Plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 将当前用户加入 docker 组（免 sudo）
sudo usermod -aG docker $USER
newgrp docker

# 验证安装
docker --version
docker compose version
```

### 3. 安装 Git

```bash
sudo apt-get install -y git
```

---

## 部署步骤

### Step 1: 获取源码

```bash
cd /opt
sudo git clone <你的仓库地址> appsmith-ai-ide
sudo chown -R $USER:$USER appsmith-ai-ide
cd appsmith-ai-ide
```

### Step 2: 配置环境变量

```bash
cd deploy

# 从模板创建环境变量文件
cp .env.example .env

# 编辑环境变量（务必修改以下关键配置）
nano .env
```

**必须修改的变量：**

| 变量 | 说明 |
|------|------|
| `DB_PASSWORD` | 数据库密码，请使用强密码 |
| `JWT_SECRET` | JWT 签名密钥，至少 32 字符 |
| `SSH_KEY_ENCRYPT_SECRET` | SSH 密钥加密密钥 |
| `GIT_TOKEN` | Git 仓库访问 Token |
| `GIT_REPO_PREFIX` | Git 仓库前缀 (如 `git@github.com:your-org/`) |

### Step 3: 准备 SSH 密钥（可选）

如果需要通过 SSH 访问 Git 仓库：

```bash
# 在 deploy/ 目录下创建 sshkey 目录
mkdir -p sshkey
cp /path/to/your/id_rsa sshkey/id_rsa
chmod 600 sshkey/id_rsa
```

### Step 4: 构建 Container Services 镜像

Container Services 镜像是后端动态创建的开发容器所使用的镜像，需要单独构建：

```bash
# 回到项目根目录
cd /opt/appsmith-ai-ide

# 构建容器服务镜像
docker build -t appsmith-ai-ide-container:latest -f deploy/Dockerfile.container .
```

### Step 5: 构建并启动服务

```bash
cd /opt/appsmith-ai-ide/deploy

# 构建应用镜像并启动所有服务
docker compose up -d --build
```

首次构建可能需要较长时间（下载 Maven 依赖、npm 包等）。

### Step 6: 验证部署

```bash
# 查看容器状态
docker compose ps

# 查看应用日志
docker compose logs -f app

# 等待看到以下日志表明启动成功：
#   [2/3] Running database migrations...
#   Migrations complete.
#   [3/3] Starting services...
```

验证服务：

```bash
# 检查前端页面
curl -s -o /dev/null -w "%{http_code}" http://localhost:80
# 应返回 200

# 检查后端健康状态
curl http://localhost:3100/q/health
# 应返回 {"status":"UP",...}
```

浏览器访问 `http://<服务器IP>` 即可打开 Appsmith AI IDE。

---

## 常用运维操作

### 查看日志

```bash
# 所有服务日志
docker compose logs -f

# 仅应用日志
docker compose logs -f app

# 仅数据库日志
docker compose logs -f postgres

# 查看容器内部日志
docker exec aiide-app tail -f /var/log/backend.log
docker exec aiide-app tail -f /var/log/nginx/error.log
```

### 重启服务

```bash
# 重启所有服务
docker compose restart

# 仅重启应用
docker compose restart app
```

### 更新部署

```bash
cd /opt/appsmith-ai-ide

# 拉取最新代码
git pull

# 重新构建 Container Services 镜像
docker build -t appsmith-ai-ide-container:latest -f deploy/Dockerfile.container .

# 重新构建并启动应用
cd deploy
docker compose up -d --build
```

### 数据库备份

```bash
# 备份
docker exec aiide-postgres pg_dump -U aiide aiide > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复
cat backup_file.sql | docker exec -i aiide-postgres psql -U aiide aiide
```

### 停止服务

```bash
cd /opt/appsmith-ai-ide/deploy

# 停止（保留数据卷）
docker compose down

# 停止并删除数据卷（⚠️ 会丢失数据库数据）
docker compose down -v
```

---

## 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| `80` | Nginx | 前端页面 + API 反向代理 |
| `3100` | Java Backend | Quarkus REST API |
| `5432` | PostgreSQL | 数据库（默认仅内部访问） |

> 生产环境建议只对外暴露 80 端口，通过 Nginx 反向代理访问后端 API。
> 修改 `docker-compose.yml` 中 `BACKEND_PORT` 映射为仅内部可达即可。

---

## 防火墙配置

```bash
# 允许 HTTP
sudo ufw allow 80/tcp

# 如需外部访问数据库（不推荐）
# sudo ufw allow 5432/tcp

sudo ufw enable
```

---

## 故障排查

### 应用容器启动失败

```bash
# 查看详细日志
docker compose logs app

# 进入容器调试
docker exec -it aiide-app bash

# 检查 Java 进程
docker exec aiide-app ps aux | grep java

# 检查 Nginx 进程
docker exec aiide-app ps aux | grep nginx
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 容器状态
docker compose ps postgres

# 手动测试连接
docker exec -it aiide-postgres psql -U aiide -d aiide -c "SELECT 1;"
```

### 迁移失败

```bash
# 进入容器手动执行迁移
docker exec -it aiide-app bash
cd /opt/migrate
DATABASE_URL="postgresql://aiide:password@postgres:5432/aiide?schema=public" \
  npx prisma migrate deploy --schema=prisma/schema.prisma
```

---

## 目录结构

```
deploy/
├── .env.example          # 环境变量模板
├── .env                  # 实际环境变量（需手动创建）
├── Dockerfile            # 主应用镜像（Frontend + Java Backend）
├── Dockerfile.container  # Container Services 镜像
├── docker-compose.yml    # Docker Compose 编排文件
├── nginx.conf            # Nginx 配置
├── supervisord.conf      # Supervisor 进程管理配置
├── entrypoint.sh         # 容器启动入口脚本
├── sshkey/               # SSH 密钥目录（需手动创建）
│   └── id_rsa
└── DEPLOY.md             # 本文档
```
