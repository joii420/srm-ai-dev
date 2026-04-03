---
type: api
last_updated: 2026-04-03
generated_by: claude-code
prompt: docs/prompts/AI_SCAN_PROMPT.md
related: [SCHEMA.md]
reviewed_by: pending
---

# API / 接口速查

## 基础信息
- 类型: HTTP REST API
- 基础路径: `/api/ide`
- 认证方式: JWT Bearer Token (HMAC-SHA256)
- 响应格式: JSON
- 长操作: Server-Sent Events (SSE)

---

## 认证模块 (`/api/ide/auth`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/auth/login` | 用户登录，返回 JWT token + 用户信息 | 无需 |
| GET | `/auth/me` | 获取当前用户信息及活跃签出状态 | 需要 |
| POST | `/auth/logout` | 用户登出（客户端清除 token） | 需要 |

### POST /auth/login
**请求体:**
```json
{
  "username": "string",
  "password": "string"
}
```
**响应:**
```json
{
  "token": "jwt-string",
  "user": {
    "id": "uuid",
    "username": "string",
    "displayName": "string",
    "role": "admin|developer"
  }
}
```

---

## 页面模块 (`/api/ide/pages`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/pages` | 获取页面列表（含签出状态: free/mine/checkedout） | 需要 |
| GET | `/pages/{pageId}` | 获取单个页面详情 | 需要 |
| POST | `/pages/create` | 创建新页面（验证 Git 仓库存在性） | 需要 |
| GET | `/pages/{pageId}/edit-lock-state` | 检查页面外部编辑锁状态 | 需要 |
| POST | `/pages/{pageId}/checkout` | 签出页面（SSE 流式返回进度） | 需要 |
| POST | `/pages/{pageId}/checkin` | 签入页面（提交代码、推送、销毁容器） | 需要 |

### POST /pages/create
**请求体:**
```json
{
  "name": "string",
  "type": "appsmith|normal",
  "description": "string",
  "gitBranch": "string (默认 dev)",
  "appsmithPageId": "string (可选)"
}
```

### POST /pages/{pageId}/checkout
**响应类型:** `text/event-stream` (SSE)
**事件流:**
```
event: step
data: {"step": "creating-container", "message": "正在创建容器..."}

event: step
data: {"step": "cloning-repo", "message": "正在克隆仓库..."}

event: complete
data: {"containerId": "string", "sessionId": "string"}
```

### POST /pages/{pageId}/checkin
**请求体:**
```json
{
  "commitMessage": "string"
}
```
**响应:**
```json
{
  "success": true,
  "commitHash": "string"
}
```

---

## 技能模块 (`/api/ide/skills`)

| 方法 | 路径 | 说明 | 认证 | 权限 |
|------|------|------|------|------|
| GET | `/skills` | 获取技能列表（可按 enabled 过滤） | 需要 | 所有用户 |
| POST | `/skills` | 创建技能（含字段） | 需要 | 管理员 |
| PUT | `/skills/{id}` | 更新技能配置 | 需要 | 管理员 |
| DELETE | `/skills/{id}` | 删除技能 | 需要 | 管理员 |
| POST | `/skills/{id}/increment-call-count` | 增加技能调用计数 | 需要 | 所有用户 |
| POST | `/skills/{id}/versions` | 创建技能版本 | 需要 | 管理员 |

---

## 依赖模块 (`/api/ide/deps`)

| 方法 | 路径 | 说明 | 认证 | 权限 |
|------|------|------|------|------|
| GET | `/deps` | 获取所有依赖列表 | 需要 | 所有用户 |
| POST | `/deps` | 创建依赖 | 需要 | 管理员 |
| PUT | `/deps/{id}` | 更新依赖 | 需要 | 管理员 |
| DELETE | `/deps/{id}` | 删除依赖 | 需要 | 管理员 |
| POST | `/deps/{id}/refresh` | 重新加载单个依赖 | 需要 | 管理员 |
| POST | `/deps/batch/refresh` | 批量重新加载所有依赖 | 需要 | 管理员 |

---

## 容器管理模块 (`/api/ide/containers`)

| 方法 | 路径 | 说明 | 认证 | 权限 |
|------|------|------|------|------|
| GET | `/containers` | 获取活跃容器列表（含签出信息） | 需要 | 管理员 |
| POST | `/containers/{id}/force-checkin` | 强制签入容器 | 需要 | 管理员 |
| POST | `/containers/{id}/force-destroy` | 强制销毁容器 | 需要 | 管理员 |

---

## 系统配置模块 (`/api/ide/system-config`)

| 方法 | 路径 | 说明 | 认证 | 权限 |
|------|------|------|------|------|
| GET | `/system-config` | 获取所有系统配置 | 需要 | 管理员 |
| POST | `/system-config` | 创建系统配置 | 需要 | 管理员 |
| PUT | `/system-config/{id}` | 更新系统配置 | 需要 | 管理员 |
| DELETE | `/system-config/{id}` | 删除系统配置 | 需要 | 管理员 |

---

## 健康检查

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/q/health` | Quarkus 综合健康检查 | 无需 |
| GET | `/q/health/ready` | 就绪探针 | 无需 |
| GET | `/q/health/live` | 存活探针 | 无需 |

---

## 通用错误响应

| HTTP 状态码 | 含义 |
|-------------|------|
| 400 | 请求参数错误 |
| 401 | 未认证或 token 过期 |
| 403 | 无权限（非管理员访问管理员端点） |
| 404 | 资源不存在 |
| 409 | 冲突（页面已被签出、名称重复等） |
| 500 | 服务器内部错误 |
