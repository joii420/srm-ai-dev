# Backend API Contract: Appsmith AI-IDE

**Branch**: `001-appsmith-ai-ide` | **Date**: 2026-03-24
**Base URL**: `http://localhost:3100`（后端管理服务）

所有接口（`/auth/login` 除外）需携带 `Authorization: Bearer <token>` Header。

## 认证接口

### POST /auth/login

请求体：
```json
{ "username": "string", "password": "string" }
```

成功响应（200）：
```json
{ "token": "jwt-string", "userInfo": { "id": "uuid", "username": "string", "displayName": "string", "role": "developer|admin" } }
```

错误响应（401）：
```json
{ "error": "INVALID_CREDENTIALS", "message": "账号或密码错误" }
```

错误响应（409）：
```json
{ "error": "SESSION_CONFLICT", "message": "该账号已在其他设备登录，请先退出" }
```

### GET /auth/me

成功响应（200）：
```json
{ "id": "uuid", "username": "string", "displayName": "string", "role": "developer|admin", "activeCheckout": { "pageId": "string", "containerId": "string" } | null }
```

### POST /auth/logout

成功响应（200）：
```json
{ "success": true }
```

## Page 接口

> 注：Page 列表由后端调用第三方接口（配置项 pages.thirdPartyApiUrl）获取并聚合签出状态后返回，本项目不维护 Page 元数据，仅维护签出状态。

### GET /pages

成功响应（200）：
```json
{
  "pages": [
    {
      "pageId": "string",
      "pageName": "string",
      "gitlabRepoUrl": "string",
      "branch": "dev",
      "status": "free|checkedout|mine",
      "checkedOutBy": { "username": "string", "displayName": "string" } | null
    }
  ]
}
```

### POST /pages/:pageId/checkout

成功响应（200）- SSE 流式返回步骤进度：
```
event: step
data: {"step": "locking", "status": "done"}

event: step
data: {"step": "container", "status": "in_progress"}

event: step
data: {"step": "git_clone", "status": "pending"}

event: step
data: {"step": "deps", "status": "pending"}

event: step
data: {"step": "ai_start", "status": "pending"}

event: step
data: {"step": "health_check", "status": "pending"}

event: complete
data: {"containerId": "string", "sessionId": "string"}
```

错误响应（409）：
```json
{ "error": "ALREADY_CHECKED_OUT", "message": "该 Page 已被其他用户签出" }
```

错误响应（503）：
```json
{ "error": "MAX_CONTAINERS_REACHED", "message": "当前容器数已达上限，请等待其他开发者签入后重试" }
```

> 注：前端收到 `complete` 事件后，将 containerId 和 sessionId 存入客户端状态（Zustand store），后续 AI 对话和文件操作请求由后端代理转发至对应容器，前端不直接访问容器地址。

### POST /pages/:pageId/checkin

请求体：
```json
{ "commitMessage": "string (必填, ≤200字符)" }
```

成功响应（200）：
```json
{ "success": true, "commitHash": "string" }
```

错误响应（409）：
```json
{ "error": "GIT_CONFLICT", "message": "代码冲突无法自动解决，请联系管理员或通过 GitLab 界面手动处理后重试签入" }
```

### GET /pages/:pageId/tree

成功响应（200）：
```json
{
  "pageId": "string",
  "branch": "dev",
  "tree": [
    { "type": "file", "name": "canvas.json", "path": "canvas.json" },
    { "type": "directory", "name": "JsObjects", "path": "JsObjects", "children": [...] }
  ]
}
```

### GET /pages/:pageId/files?path={filePath}

成功响应（200）：
```json
{
  "pageId": "string",
  "filePath": "string",
  "branch": "dev",
  "content": "string",
  "encoding": "utf-8",
  "size": 1024
}
```

> 注：以上两个接口为 GitLab 代理接口，后端向 GitLab 读取文件内容后返回给前端，服务端持有 GitLab 访问凭证，不向前端暴露。接口路径与 spec API Schema 章节定义一致。

### GitLab 代理接口统一错误格式

```json
{ "error": "GITLAB_UNREACHABLE|REPO_NOT_FOUND|FILE_NOT_FOUND|PERMISSION_DENIED", "message": "string", "pageId": "string" }
```

## Skill 接口

### GET /skills

成功响应（200）：
```json
{
  "skills": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "icon": "string",
      "category": "string",
      "prompt": "string",
      "keywords": ["string"],
      "fields": [
        { "id": "string", "label": "string", "type": "text|textarea|select|chips", "required": true, "placeholder": "string", "options": ["string"], "token": "string" }
      ],
      "tags": ["string"],
      "enabled": true,
      "version": "v1.0",
      "callCount": 0
    }
  ]
}
```

### POST /skills

请求体：（同 Skill 对象，不含 id/callCount/createdAt）

### PUT /skills/:id

请求体：Skill 可修改字段

### DELETE /skills/:id

成功响应（200）：
```json
{ "success": true }
```

### POST /skills/:id/use

成功响应（200）：
```json
{ "callCount": 90 }
```

### GET /skills/:id/versions

成功响应（200）：
```json
{
  "versions": [
    { "version": "v1.2", "createdAt": "iso-date", "modifiedBy": "displayName", "promptSnapshot": "string" }
  ]
}
```

### POST /skills/:id/versions

创建新版本（保存当前 Prompt 和模板参数快照）。

请求体：
```json
{ "versionLabel": "v1.3" }
```

成功响应（200）：
```json
{ "version": "v1.3", "createdAt": "iso-date" }
```

### POST /skills/:id/rollback

回滚 Skill 到指定历史版本。回滚后正在进行中的对话继续使用旧版本 Prompt，新开启对话使用回滚后版本（FR-032）。

请求体：
```json
{ "version": "v1.1" }
```

成功响应（200）：
```json
{ "success": true, "currentVersion": "v1.1" }
```

## 依赖库接口

### GET /deps

成功响应（200）：
```json
{ "dependencies": [{ "id": "uuid", "namespace": "string", "url": "string", "version": "string", "description": "string", "lastLoaded": "iso-date" }] }
```

### POST /deps

请求体：
```json
{ "namespace": "string (必填)", "url": "string (必填)", "version": "string", "description": "string" }
```

### PUT /deps/:id

### DELETE /deps/:id

### POST /deps/:id/refresh

触发单个依赖库更新：后端从 URL 重新拉取最新代码，更新容器内依赖库上下文，通知所有 active 签出用户。

成功响应（200）：
```json
{ "success": true, "namespace": "string", "newVersion": "string" }
```

### POST /deps/batch/refresh

触发全部依赖库批量更新：后端从各依赖库 URL 重新拉取最新代码，更新所有 active 容器内依赖库上下文，通知所有 active 签出用户（各用户下一条消息发送时使用新依赖库上下文）。

成功响应（200）：
```json
{ "success": true, "results": [{ "namespace": "string", "success": true }] }
```

## 容器运维接口（仅管理员）

### GET /containers

成功响应（200）：
```json
{
  "containers": [
    {
      "containerId": "string",
      "pageId": "string",
      "pageName": "string",
      "checkedOutBy": { "username": "string", "displayName": "string" },
      "checkedOutAt": "iso-date",
      "status": "running|stopped"
    }
  ]
}
```

### POST /containers/:id/force-checkin

成功响应（200）：
```json
{ "success": true, "commitMessage": "[Admin Force Checkin] PageName 2026-03-24T12:00:00Z" }
```

### POST /containers/:id/force-destroy

成功响应（200）：
```json
{ "success": true }
```

## 系统配置接口（仅管理员）

### GET /system-config

### PUT /system-config

请求体：
```json
{ "key": "string", "value": "any" }
```

### PUT /system-config/ssh-key

请求体：
```json
{ "privateKey": "PEM-string", "gitlabDomain": "string" }
```

### POST /system-config/ssh-test

成功响应（200）：
```json
{ "success": true, "message": "SSH 连接测试成功" }
```
