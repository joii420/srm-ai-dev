# Container Services API Contract: Appsmith AI-IDE

**Branch**: `001-appsmith-ai-ide` | **Date**: 2026-03-24

容器内运行两个服务：AI Proxy (:3000) 和 File Manager (:3001)。
所有请求由后端代理转发，前端不直接访问容器。

## AI Proxy (:3000)

### GET /api/health

成功响应（200）：
```json
{ "status": "ok", "sessionId": "string", "uptime": 120 }
```

### POST /api/chat

请求体：
```json
{
  "message": "string",
  "activatedSkillIds": ["skill-id-1", "skill-id-2"]
}
```

> - message：用户输入的对话内容，或由 Skill 模板参数填写后生成的最终 Prompt（两者使用相同字段，无需区分接口）
> - activatedSkillIds：开发者在「选择 Skill」标签页中勾选激活的 Skill ID 列表，AI Proxy 将对应 Skill 的 Prompt 注入上下文
> - AI Proxy 在处理每条消息时，自动读取容器内 /workspace 目录下所有文件作为仓库代码上下文（FR-013），无需前端传递文件内容
> - 所有管理员已启用 Skill 的触发关键词由前端本地匹配（意图识别 FR-038），无需通过此接口传递

响应：SSE 流式输出
```
event: token
data: {"content": "已在第 14 行添加 try/catch..."}

event: code_suggestion
data: {"file": "JsObjects/PROCESS.js", "diff": "unified diff string"}

event: done
data: {"sessionId": "string", "skillsUsed": ["error-handle"]}
```

SSE 连接中断时，前端丢弃已返回的部分内容，显示错误提示。

> 注：AI Proxy 在生成完整回复后，直接调用后端管理服务的 `POST /skills/:id/use` 接口更新 Skill 使用次数（skillsUsed 中每个 Skill ID 各调用一次）。前端不负责触发计数更新。

### GET /api/session

成功响应（200）：
```json
{ "sessionId": "string", "messageCount": 5, "createdAt": "iso-date" }
```

### DELETE /api/session

成功响应（200）：
```json
{ "success": true }
```

### POST /api/context/refresh

成功响应（200）：
```json
{ "success": true, "filesLoaded": 3, "depsLoaded": 2, "skillsInjected": 4 }
```

### GET /api/deps

成功响应（200）：
```json
{ "deps": [{ "namespace": "com", "version": "v2.3.1", "loaded": true }] }
```

### POST /api/deps/:name/refresh

成功响应（200）：
```json
{ "namespace": "com", "success": true, "newVersion": "v2.3.2" }
```

### POST /api/deps/refresh-all

成功响应（200）：
```json
{ "results": [{ "namespace": "com", "success": true }, { "namespace": "utils", "success": true }] }
```

## File Manager (:3001)

### GET /files

成功响应（200）：
```json
{
  "tree": [
    { "type": "file", "name": "canvas.json", "path": "canvas.json", "size": 2048 },
    { "type": "directory", "name": "JsObjects", "path": "JsObjects", "children": [...] }
  ]
}
```

### GET /files/:path

成功响应（200）：
```json
{ "path": "JsObjects/PROCESS.js", "content": "string", "encoding": "utf-8", "size": 1024 }
```

### POST /files/:path

请求体：
```json
{ "content": "string" }
```

### PUT /files/:path

请求体：
```json
{ "content": "string" }
```

### DELETE /files/:path

成功响应（200）：
```json
{ "success": true }
```

### POST /files/batch-save

请求体：
```json
{
  "files": [
    { "path": "JsObjects/PROCESS.js", "content": "string" },
    { "path": "canvas.json", "content": "string" }
  ]
}
```

成功响应（200）：
```json
{ "saved": 2, "results": [{ "path": "JsObjects/PROCESS.js", "success": true }] }
```

### GET /diff

成功响应（200）：
```json
{ "diff": "unified diff string", "changedFiles": 2 }
```
