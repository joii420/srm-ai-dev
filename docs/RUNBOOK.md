---
title: Appsmith AI IDE 运维手册
type: operations_manual
last_updated: 2026-04-03
target_audience: 运维工程师
generated_by: claude-code
prompt: docs/prompts/AI_PRODUCT_DOC_PROMPT.md
reviewed_by: pending
---

# Appsmith AI IDE 运维手册

## 服务架构

```
Nginx (:80) ──┬── 静态文件 (React SPA)
              └── /api/ide/* ──→ Quarkus Backend (:3100)
                                       │
                                       ├── PostgreSQL (:5432)
                                       ├── Docker Engine (容器管理)
                                       └── 外部服务 (Git, 编辑锁, AI Agent)
```

## 部署与启动

### 首次部署

```bash
# 1. 进入部署目录
cd srm-ai-dev/appsmith-ai-ide/deploy

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写以下必要配置：
# DATABASE_URL, JWT_SECRET, SSH_KEY_ENCRYPT_SECRET, GIT_TOKEN

# 3. 构建容器镜像（开发容器）
cd ../docker
docker build -t appsmith-ai-ide-container:latest -f Dockerfile.container .

# 4. 启动所有服务
cd ../deploy
docker compose up -d --build
```

### 验证部署

```bash
# 检查服务状态
docker compose ps

# 检查后端健康
curl http://localhost:3100/q/health

# 检查前端访问
curl -I http://localhost/

# 查看后端日志
docker compose logs -f backend

# 查看数据库连接
docker compose exec db psql -U postgres -d aiide -c "SELECT count(*) FROM users;"
```

### 重启服务

```bash
# 重启全部
cd srm-ai-dev/appsmith-ai-ide/deploy
docker compose restart

# 仅重启后端
docker compose restart backend

# 重建并重启（代码更新后）
docker compose up -d --build backend
```

---

## 日常运维

### 查看活跃容器

```bash
# 通过 API（需管理员 Token）
curl -H "Authorization: Bearer {admin-token}" http://localhost:3100/api/ide/containers

# 通过 Docker 直接查看
docker ps --filter "ancestor=appsmith-ai-ide-container:latest"
```

### 强制回收容器

当开发者长时间未签入，或容器异常时：

```bash
# 通过 API 强制签入（会尝试提交代码）
curl -X POST -H "Authorization: Bearer {admin-token}" \
  http://localhost:3100/api/ide/containers/{checkoutId}/force-checkin

# 通过 API 强制销毁（直接销毁，不保存代码）
curl -X POST -H "Authorization: Bearer {admin-token}" \
  http://localhost:3100/api/ide/containers/{checkoutId}/force-destroy

# 如果 API 不可用，直接通过 Docker 操作
docker stop {containerId}
docker rm {containerId}
# 注意：直接 Docker 操作后，需手动更新数据库中的 checkout 状态
```

### 数据库维护

```bash
# 进入数据库
docker compose exec db psql -U postgres -d aiide

# 查看活跃签出
SELECT c.id, c.page_name, u.username, c.status, c.checked_out_at
FROM checkouts c JOIN users u ON c.user_id = u.id
WHERE c.status = 'active'
ORDER BY c.checked_out_at;

# 查看系统配置
SELECT key, value, description FROM system_configs;

# 手动标记签出为已完成（容器已手动销毁时）
UPDATE checkouts SET status = 'force-destroyed', checked_in_at = NOW()
WHERE id = '{checkoutId}' AND status = 'active';
```

### 日志排查

```bash
# 后端应用日志
docker compose logs -f --tail=100 backend

# 按关键词过滤
docker compose logs backend 2>&1 | grep -i "error"
docker compose logs backend 2>&1 | grep "ContainerLifecycle"

# Nginx 访问日志
docker compose logs nginx

# 数据库日志
docker compose logs db
```

---

## 故障排查

### 1. 签出失败

**优先检查点（按 CALLGRAPH 高风险节点排序）：**

| 检查项 | 命令 | 预期结果 |
|--------|------|----------|
| Docker 服务状态 | `docker info` | 正常输出 Docker 信息 |
| 容器数量是否达上限 | `docker ps --filter ancestor=appsmith-ai-ide-container:latest \| wc -l` | 小于 max-concurrent (默认 20) |
| 容器镜像是否存在 | `docker images appsmith-ai-ide-container:latest` | 镜像存在 |
| Git SSH 连接 | `ssh -T git@gitlab.example.com` | 认证成功 |
| 编辑锁服务是否可达 | `curl http://test.srm.wzhf.com:9000/script-engine/health` | 200 OK |
| 数据库连接 | `docker compose exec db pg_isready` | 返回 accepting connections |

### 2. 签入失败

**常见原因及处理：**

| 现象 | 原因 | 处理 |
|------|------|------|
| Git push 失败 | 远程仓库有新提交，non-fast-forward | 需手动进入容器解决冲突 |
| 容器已不存在 | 容器被意外删除或超时回收 | 标记 checkout 为 force-destroyed |
| SSH 密钥无效 | 密钥过期或被吊销 | 更新 SSH 密钥配置 |

```bash
# 进入问题容器排查
docker exec -it {containerId} bash

# 检查 Git 状态
docker exec {containerId} git -C /workspace status

# 手动尝试推送
docker exec {containerId} git -C /workspace push origin dev
```

### 3. 登录失败

```bash
# 检查外部认证服务
curl -X POST {auth-api-url} -d '{"username":"test","password":"test"}'

# 检查 JWT 配置
docker compose exec backend env | grep JWT

# 如果外部认证不可用，检查是否开启了 dev 模式
# dev 模式下密码固定为 "dev"
```

### 4. 前端无法访问

```bash
# 检查 Nginx 状态
docker compose ps nginx

# 检查 Nginx 配置是否正确
docker compose exec nginx nginx -t

# 检查后端代理是否正常
curl http://localhost:3100/q/health
```

---

## 操作限制

以下文件和配置在变更前务必备份：

| 路径 | 限制说明 |
|------|----------|
| `deploy/.env` | 包含密钥和数据库连接信息，修改后需重启服务 |
| `deploy/docker-compose.yml` | 生产部署配置，修改后需 docker compose up -d |
| `docker/Dockerfile.container` | 开发容器镜像，修改后需重新 build 镜像 |
| `docker/nginx.conf` | Nginx 路由配置，修改后需 reload |
| `db/migration/` | Flyway 迁移脚本，已执行的脚本禁止修改 |
| `AuthFilter.java` | 认证核心，修改可能导致安全漏洞 |
| `JwtConfig.java` | JWT 配置，修改需同步所有已发出的 Token |
| `ContainerLifecycle.java` | 容器编排核心，修改影响签入签出全流程 |

---

## 关键配置项

### application.properties (静态)

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `quarkus.http.port` | 后端端口 | 3100 |
| `aiide.jwt-secret` | JWT 签名密钥 | 必填 |
| `aiide.auth.jwt-expires-in` | Token 过期时间(秒) | 28800 (8小时) |
| `aiide.container.image-name` | 容器镜像名 | appsmith-ai-ide-container:latest |
| `aiide.container.memory-limit` | 容器内存限制 | 1g |
| `aiide.container.cpu-limit` | 容器 CPU 限制 | 1.0 |
| `aiide.container.max-concurrent` | 最大并发容器数 | 20 |

### system_configs (动态，数据库存储)

| key | 说明 |
|-----|------|
| `gitlab.api-base-url` | GitLab API 地址 |
| `gitlab.repo-prefix` | Git 仓库前缀 |
| `git.token` | Git 访问令牌 |
| `appsmith.session` | Appsmith 会话 Cookie |

修改动态配置：
```bash
curl -X PUT -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{"key":"git.token","value":"new-token-value"}' \
  http://localhost:3100/api/ide/system-config/{configId}
```

---

## 备份与恢复

### 数据库备份

```bash
# 导出数据库
docker compose exec db pg_dump -U postgres aiide > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker compose exec -T db psql -U postgres aiide < backup_20260403.sql
```

### 定期备份建议
- 数据库：每日备份
- `.env` 文件：每次修改后备份
- Docker 镜像：每次构建后 tag 版本号

```bash
# 镜像版本标记
docker tag appsmith-ai-ide-container:latest appsmith-ai-ide-container:v$(date +%Y%m%d)
```
