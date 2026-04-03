---
title: Appsmith AI IDE 开发者接口文档
type: api_reference
last_updated: 2026-04-03
target_audience: 插件开发者、API 调用方
generated_by: claude-code
prompt: docs/prompts/AI_PRODUCT_DOC_PROMPT.md
reviewed_by: pending
---

# Appsmith AI IDE 开发者接口文档

## 概述

本文档面向需要与 Appsmith AI IDE 后端 API 进行集成的开发者。所有接口均为 RESTful HTTP API，返回 JSON 格式数据。

- **基础 URL**: `http://{host}:{port}/api/ide`
- **认证方式**: JWT Bearer Token
- **内容类型**: `application/json`

## 认证

### 获取 Token

```http
POST /api/ide/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

**成功响应 (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "your_username",
    "displayName": "显示名称",
    "role": "developer"
  }
}
```

### 使用 Token

所有后续请求需在 Header 中携带 Token：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

> **重要提示**: Token 有效期为 8 小时。过期后需重新登录获取。收到 401 响应时表示 Token 已失效。

---

## 页面接口

### 获取页面列表

```http
GET /api/ide/pages
Authorization: Bearer {token}
```

**响应 (200):**
```json
[
  {
    "id": "uuid",
    "name": "page-name",
    "type": "appsmith",
    "description": "页面描述",
    "gitBranch": "dev",
    "status": "free",
    "checkedOutBy": null
  }
]
```

**status 字段说明:**
| 值 | 含义 |
|----|------|
| `free` | 空闲，可签出 |
| `mine` | 当前用户已签出 |
| `checkedout` | 被其他用户签出 |

### 创建页面

```http
POST /api/ide/pages/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "new-page",
  "type": "appsmith",
  "description": "页面描述",
  "gitBranch": "dev",
  "appsmithPageId": "optional-appsmith-id"
}
```

> **注意**: `name` 必须全局唯一。`type` 为 `appsmith` 时，系统会验证对应的 Git 仓库是否存在。

### 签出页面 (SSE)

```http
POST /api/ide/pages/{pageId}/checkout
Authorization: Bearer {token}
Accept: text/event-stream
```

**SSE 事件流:**
```
event: step
data: {"step":"creating-container","message":"正在创建容器..."}

event: step
data: {"step":"cloning-repo","message":"正在克隆仓库..."}

event: step
data: {"step":"loading-deps","message":"正在加载依赖..."}

event: complete
data: {"containerId":"abc123","sessionId":"session-uuid"}
```

> **重要提示**: 这是一个 Server-Sent Events 端点，不是普通的 HTTP 请求。请使用 EventSource 或支持 SSE 的 HTTP 客户端。签出过程涉及容器创建、Git 克隆等操作，通常需要 30 秒 - 1 分钟。

### 签入页面

```http
POST /api/ide/pages/{pageId}/checkin
Authorization: Bearer {token}
Content-Type: application/json

{
  "commitMessage": "feat: 添加新功能"
}
```

**响应 (200):**
```json
{
  "success": true,
  "commitHash": "a1b2c3d"
}
```

> **重要提示**: 签入操作不可逆。执行后将提交代码到远程仓库并销毁开发容器。请确保代码已正确保存。

### 检查编辑锁状态

```http
GET /api/ide/pages/{pageId}/edit-lock-state
Authorization: Bearer {token}
```

---

## 技能接口

### 获取技能列表

```http
GET /api/ide/skills?enabled=true
Authorization: Bearer {token}
```

### 记录技能调用

```http
POST /api/ide/skills/{skillId}/increment-call-count
Authorization: Bearer {token}
```

### 创建技能（管理员）

```http
POST /api/ide/skills
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "name": "code-review",
  "description": "AI 代码审查",
  "category": "quality",
  "prompt": "请审查以下代码: {{code}}",
  "enabled": true,
  "fields": [
    {
      "fieldId": "code",
      "label": "待审查代码",
      "type": "text",
      "required": true,
      "token": "{{code}}"
    }
  ]
}
```

---

## 依赖接口

### 获取依赖列表

```http
GET /api/ide/deps
Authorization: Bearer {token}
```

### 刷新依赖（管理员）

```http
POST /api/ide/deps/{depId}/refresh
Authorization: Bearer {admin-token}
```

### 批量刷新（管理员）

```http
POST /api/ide/deps/batch/refresh
Authorization: Bearer {admin-token}
```

---

## 容器管理接口（管理员）

### 获取活跃容器

```http
GET /api/ide/containers
Authorization: Bearer {admin-token}
```

### 强制签入

```http
POST /api/ide/containers/{checkoutId}/force-checkin
Authorization: Bearer {admin-token}
```

> **重要提示**: 强制签入将销毁容器且不提交代码。容器内未保存的修改将丢失。

### 强制销毁

```http
POST /api/ide/containers/{checkoutId}/force-destroy
Authorization: Bearer {admin-token}
```

---

## 系统配置接口（管理员）

### 获取所有配置

```http
GET /api/ide/system-config
Authorization: Bearer {admin-token}
```

### 更新配置

```http
PUT /api/ide/system-config/{configId}
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "key": "gitlab.api-base-url",
  "value": "https://gitlab.example.com/api/v4",
  "description": "GitLab API 基础地址"
}
```

---

## 错误处理

所有错误响应格式：

```json
{
  "error": "错误描述信息"
}
```

| HTTP 状态码 | 含义 | 处理建议 |
|-------------|------|----------|
| 400 | 请求参数错误 | 检查请求体格式和必填字段 |
| 401 | 未认证或 Token 过期 | 重新登录获取 Token |
| 403 | 无权限 | 确认用户角色为管理员（管理员端点） |
| 404 | 资源不存在 | 检查 ID 是否正确 |
| 409 | 资源冲突 | 页面已签出、名称重复等，检查业务状态 |
| 500 | 服务器错误 | 联系管理员查看日志 |

---

## 健康检查

```http
GET /api/ide/q/health        # 综合健康状态
GET /api/ide/q/health/ready  # 就绪探针
GET /api/ide/q/health/live   # 存活探针
```

无需认证，可用于负载均衡器和监控系统。
