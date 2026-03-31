# Redux Node Service API 快速参考

> 服务默认地址：`http://localhost:3200`
>
>
> 完整 API 文档见 [node-service-api.md](./node-service-api.md)

---

## 统一返回格式

所有接口 HTTP 状态码始终为 **200**，通过 `success` 和 `errorCode` 区分结果。

**成功**：

```json
{
  "success": true,
  "message": "",
  "result": <any>
}
```

**失败**：

```json
{
  "success": false,
  "message": "错误描述",
  "errorCode": "ERROR_CODE",
  "result": null
}
```

---

## 错误码说明

| errorCode | 说明 | 示例 message |
|-----------|------|-------------|
| `INTERNAL_ERROR` | 服务内部错误 | `"..."` |
| `INVALID_REQUEST` | 请求格式非法 | `"..."` |
| `MISSING_PARAM` | 必填参数缺失 | `"pageId 为必填参数"` |
| `SESSION_NOT_FOUND` | 会话不存在 | `"Session xxx not found"` |
| `SESSION_CREATE_FAILED` | 会话创建失败 | `"Cannot read property..."` |
| `INIT_CRASH` | 业务初始化异常 | `"初始化异常"` |
| `TIMEOUT` | 操作超时（通用） | `"初始化超时: ..."` / `"更新超时: ..."` |
| `JS_COLLECTION_NOT_FOUND` | JS Collection 不存在 | `"未找到 id 为 xxx 的 JS Collection"` |
| `BACKEND_UNAVAILABLE` | 代理后端不可达 | `"Backend unavailable: ..."` |
| `BACKEND_TIMEOUT` | 代理后端超时 | `"Backend timeout: ..."` |
| `BACKEND_CONFIG_ERROR` | 代理后端未配置 | `"Session has no backendUrl configured"` |

---

## 接口列表

### 1. `GET /health`

健康检查，无需会话。

**参数**：无

**调用示例**：

```bash
curl http://localhost:3100/health
```

**成功响应**：

```json
{
  "success": true,
  "message": "",
  "result": {
    "status": "ok",
    "uptime": 120,
    "sessions": 2,
    "memory": {
      "heapUsed": "85MB",
      "rss": "137MB"
    }
  }
}
```

---

### 2. `POST /sessions`

创建隔离会话。每个会话拥有独立的 Store、Saga 和 worker_thread。

**请求体 (JSON)**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `authToken` | string | 否 | Appsmith 后端认证 Token，默认空 |
| `backendUrl` | string | 否 | Appsmith 后端地址，默认空 |

**调用示例**：

```bash
curl -X POST http://localhost:3100/sessions \
  -H "Content-Type: application/json" \
  -d '{"authToken": "your-jwt-token", "backendUrl": "http://appsmith:8080"}'
```

**成功响应**：

```json
{
  "success": true,
  "message": "",
  "result": {
    "sessionId": "3f8ab32c-8a0c-4c75-baa4-722015162123",
    "createdAt": "2026-03-26T03:05:50.724Z"
  }
}
```

**失败响应**：

```json
{
  "success": false,
  "message": "创建失败",
  "errorCode": "SESSION_CREATE_FAILED",
  "result": null
}
```

---

### 3. `GET /sessions`

列出所有活跃会话。

**参数**：无

**调用示例**：

```bash
curl http://localhost:3100/sessions
```

**成功响应**：

```json
{
  "success": true,
  "message": "",
  "result": [
    {
      "id": "3f8ab32c-...",
      "authToken": "your-jwt...",
      "backendUrl": "http://appsmith:8080",
      "createdAt": "2026-03-26T03:05:50.724Z",
      "stateKeys": ["entities", "ui", "evaluations", "form", "settings", "tenant", "linting"]
    }
  ]
}
```

---

### 4. `DELETE /sessions/:id`

销毁会话，释放 Store、Saga、worker_thread 资源。

**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 会话 ID |

**调用示例**：

```bash
curl -X DELETE http://localhost:3100/sessions/3f8ab32c-...
```

**成功响应**：

```json
{ "success": true, "message": "", "result": null }
```

**失败响应**：

```json
{
  "success": false,
  "message": "Session not found",
  "errorCode": "SESSION_NOT_FOUND",
  "result": null
}
```

---

### 5. `POST /sessions/:id/biz/init`

初始化业务。dispatch `INITIALIZE_EDITOR`，竞速等待成功或失败（超时 120 秒）。

**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 会话 ID |

**请求体 (JSON)**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pageId` | string | 是 | 页面 ID |
| `pageContext` | object | 是 | 页面上下文数据 |

**调用示例**：

```bash
curl -X POST http://localhost:3100/sessions/$SID/biz/init \
  -H "Content-Type: application/json" \
  -d '{
    "pageId": "page_123",
    "pageContext": { ... }
  }'
```

**成功响应**：

```json
{ "success": true, "message": "", "result": "初始化成功" }
```

**失败响应 - 初始化异常**：

```json
{
  "success": false,
  "message": "初始化异常",
  "errorCode": "INIT_CRASH",
  "result": null
}
```

**失败响应 - 超时**：

```json
{
  "success": false,
  "message": "初始化超时: raceForAction([...]) timed out after 120000ms",
  "errorCode": "TIMEOUT",
  "result": null
}
```

**失败响应 - 缺少参数**：

```json
{
  "success": false,
  "message": "pageId 为必填参数",
  "errorCode": "MISSING_PARAM",
  "result": null
}
```

---

### 6. `POST /sessions/:id/biz/update/js-action`

更新 JS Action body。比较当前 body 与传入 body，若有变更则 dispatch 更新并等待结果。

**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 会话 ID |

**请求体 (JSON)**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | JS Collection ID |
| `body` | string | 是 | 新的 body 内容 |

**调用示例**：

```bash
curl -X POST http://localhost:3100/sessions/$SID/biz/update/js-action \
  -H "Content-Type: application/json" \
  -d '{
    "id": "js-collection-id-123",
    "body": "export default { myFunc: () => {} }"
  }'
```

**成功响应 - 无变更**：

```json
{
  "success": true,
  "message": "",
  "result": {
    "edit": false,
    "httpActions": []
  }
}
```

**成功响应 - 有变更**：

```json
{
  "success": true,
  "message": "",
  "result": {
    "edit": true,
    "httpActions": [
      {
        "method": "PUT",
        "url": "v1/collections/actions/refactorAction",
        "body": {
          "actionId": "68f2043658f1ae33b5f471d4",
          "collectionName": "VALID",
          "pageId": "68f1957658f1ae33b5f46d87",
          "oldName": "openWindow",
          "newName": "openWindow3",
          "layoutId": "68f1957658f1ae33b5f46d86",
          "actionCollection": { "..." : "..." }
        }
      }
    ]
  }
}
```

> `httpActions` 数组中每个元素代表一个需要调用方向 Appsmith 后端发起的 HTTP 请求（method + url + body）。

**失败响应 - JS Collection 不存在**：

```json
{
  "success": false,
  "message": "未找到 id 为 xxx 的 JS Collection",
  "errorCode": "JS_COLLECTION_NOT_FOUND",
  "result": null
}
```

**失败响应 - 更新失败**：

```json
{
  "success": false,
  "message": "更新 JS Action body 失败",
  "errorCode": "INTERNAL_ERROR",
  "result": null
}
```

**失败响应 - 超时**：

```json
{
  "success": false,
  "message": "更新超时: raceForAction([...]) timed out after 30000ms",
  "errorCode": "TIMEOUT",
  "result": null
}
```

**失败响应 - 缺少参数**：

```json
{
  "success": false,
  "message": "id 为必填参数",
  "errorCode": "MISSING_PARAM",
  "result": null
}
```
