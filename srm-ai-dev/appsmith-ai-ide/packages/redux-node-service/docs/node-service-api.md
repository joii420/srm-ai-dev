# Redux Node Service API 文档

> 服务默认地址：`http://localhost:3200`
>
> Appsmith 后端代理 API 文档见 [appsmith-backend-api.md](./appsmith-backend-api.md)
>
> Postman 导入文件：[node-service-api.postman_collection.json](./node-service-api.postman_collection.json)

## 统一返回格式

所有接口（除代理透传外）HTTP 状态码始终为 **200**，通过 JSON 中的 `success` 和 `errorCode` 区分结果：

**成功**：
```json
{
  "success": true,
  "message": "",
  "result": null
}
```

**失败**：
```json
{
  "success": false,
  "message": "错误描述",
  "errorCode": "MISSING_PARAM",
  "result": null
}
```

**ErrorCode 枚举值**（定义于 `src/utils/error-codes.ts`）：

| ErrorCode | 说明 |
|-----------|------|
| `INTERNAL_ERROR` | 服务内部错误 |
| `INVALID_REQUEST` | 请求格式非法 |
| `MISSING_PARAM` | 必填参数缺失 |
| `SESSION_NOT_FOUND` | 会话不存在 |
| `SESSION_CREATE_FAILED` | 会话创建失败 |
| `SLICE_NOT_FOUND` | 状态切片不存在 |
| `ACTION_INVALID` | Action 格式非法 |
| `INIT_CRASH` | 业务初始化异常 |
| `TIMEOUT` | 操作超时（通用） |
| `JS_COLLECTION_NOT_FOUND` | JS Collection 不存在 |
| `EVAL_ERROR` | 求值引擎错误 |
| `SELECTOR_NOT_FOUND` | Selector 不存在 |
| `SELECTOR_ERROR` | Selector 执行错误 |
| `BACKEND_UNAVAILABLE` | 代理后端不可达 |
| `BACKEND_TIMEOUT` | 代理后端超时 |
| `BACKEND_CONFIG_ERROR` | 代理后端未配置 |

---

## 1. 健康检查

### `GET /health`

**参数**：无

**调用示例**：
```bash
curl http://localhost:3100/health
```

**响应示例**：
```json
{
  "success": true,
  "message": "",
  "result": {
    "status": "ok",
    "uptime": 120,
    "sessions": 2,
    "memory": { "heapUsed": "195MB", "rss": "322MB" }
  }
}
```

---

## 2. 会话管理

### `POST /sessions`

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

**响应示例**：
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

---

### `GET /sessions`

列出所有活跃会话。

**调用示例**：
```bash
curl http://localhost:3100/sessions
```

**响应示例**：
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

### `DELETE /sessions/:id`

销毁会话，释放 Store、Saga、worker_thread 资源。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string (路径) | 是 | 会话 ID |

**响应示例**：
```json
{ "success": true, "message": "", "result": null }
```

**失败示例**：
```json
{ "success": false, "message": "Session not found", "errorCode": "SESSION_NOT_FOUND", "result": null }
```

---

## 3. 状态操作（会话级）

### `GET /sessions/:id/state`

获取完整 Redux 状态快照。

**响应示例**：
```json
{
  "success": true,
  "message": "",
  "result": {
    "entities": { "canvasWidgets": {}, "actions": {} },
    "ui": {},
    "evaluations": { "tree": {} },
    "form": {}, "settings": {}, "tenant": {}, "linting": {}
  }
}
```

---

### `GET /sessions/:id/state/:slice`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `slice` | string (路径) | 是 | `entities` / `ui` / `evaluations` / `form` / `settings` / `tenant` / `linting` |

**失败示例**：
```json
{ "success": false, "message": "Slice \"xxx\" not found", "errorCode": "SLICE_NOT_FOUND", "result": null }
```

---

### `GET /sessions/:id/state/:slice/:sub`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sub` | string (路径) | 是 | 子切片名，如 `canvasWidgets`、`actions`、`tree` |

---

### `POST /sessions/:id/dispatch`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string (body) | 是 | Redux Action 类型 |
| `payload` | any (body) | 否 | Action 数据 |

**调用示例**：
```bash
curl -X POST http://localhost:3100/sessions/$SID/dispatch \
  -H "Content-Type: application/json" \
  -d '{"type": "UPDATE_LAYOUT", "payload": {"widgets": {...}}}'
```

**响应示例**：
```json
{ "success": true, "message": "", "result": null }
```

**失败示例**：
```json
{ "success": false, "message": "Action must have a \"type\" field", "errorCode": "ACTION_INVALID", "result": null }
```

---

### `POST /sessions/:id/dispatch-batch`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `actions` | Array (body) | 是 | Action 数组，每个必须含 `type` |

**响应示例**：
```json
{ "success": true, "message": "", "result": { "dispatched": 2 } }
```

---

## 4. 求值引擎（会话级）

### `POST /sessions/:id/eval/setup`

初始化求值环境。**必须在 eval/tree 之前调用**。Worker 初始化约 10-15 秒。

**响应示例**：
```json
{ "success": true, "message": "", "result": "Evaluation setup started" }
```

---

### `POST /sessions/:id/eval/tree`

触发 DataTree 求值并等待结果。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `timeout` | number (query) | 否 | 最大等待毫秒，默认 30000 |

**响应示例**（成功）：
```json
{
  "success": true,
  "message": "",
  "result": {
    "elapsed": 107,
    "tree": {
      "MainContainer": { "ENTITY_TYPE": "WIDGET", "widgetId": "0", "type": "CANVAS_WIDGET" },
      "Text1": { "ENTITY_TYPE": "WIDGET", "text": "{{2 + 3}}" },
      "appsmith": { "ENTITY_TYPE": "APPSMITH", "store": {} }
    }
  }
}
```

**响应示例**（超时）：
```json
{ "success": true, "message": "", "result": { "timedOut": true, "elapsed": 30001, "tree": {} } }
```

---

### `POST /sessions/:id/eval/expression`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `expression` | string (body) | 是 | 要求值的表达式 |

**响应示例**：
```json
{ "success": true, "message": "", "result": { "expression": "1 + 1", "dispatched": true } }
```

---

### `POST /sessions/:id/eval/trigger`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `trigger` | string (body) | 是 | 触发器表达式 |
| `eventType` | string (body) | 否 | 事件类型 |
| `triggerMeta` | object (body) | 否 | 元数据 |

**响应示例**：
```json
{ "success": true, "message": "", "result": { "trigger": "{{Api1.run()}}", "dispatched": true } }
```

---

### `POST /sessions/:id/eval/validate`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `property` | string (body) | 是 | 属性路径 |
| `value` | any (body) | 否 | 要验证的值 |
| `props` | object (body) | 否 | Widget 属性上下文 |
| `validation` | object (body) | 否 | 验证规则 |

---

## 5. Selector 执行

### `POST /sessions/:id/select`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `selector` | string (body) | 是 | Selector 名称 |
| `args` | array (body) | 否 | 额外参数，默认 `[]` |

**可用 Selector**：`getDataTree`、`getUnevaluatedDataTree`、`getWidgets`、`getPageList`、`getCurrentPageId`、`getAppMode`

**响应示例**：
```json
{
  "success": true,
  "message": "",
  "result": {
    "0": { "widgetId": "0", "widgetName": "MainContainer" }
  }
}
```

**失败示例**：
```json
{ "success": false, "message": "Selector \"xxx\" not found. Available: getDataTree, getWidgets, ...", "errorCode": "SELECTOR_NOT_FOUND", "result": null }
```

---

## 6. Saga 操作

### `POST /sessions/:id/saga/init`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `applicationId` | string (body) | 是 | 应用 ID |
| `pageId` | string (body) | 是 | 页面 ID |

**响应示例**：

```json
{ "success": true, "message": "", "result": { "dispatched": true } }
```

---

### `POST /sessions/:id/saga/execute-action`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `actionId` | string (body) | 是 | Action ID |
| `params` | object (body) | 否 | 运行时参数 |

**响应示例**：
```json
{ "success": true, "message": "", "result": { "dispatched": true } }
```

---

## 7. 后端 API 代理

### `ALL /sessions/:id/proxy/{*path}`

透传到 Appsmith 后端。**代理成功时直接返回后端响应体（不套统一格式）**，仅在代理本身出错时使用统一错误格式。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | string (路径) | 是 | 后端路径（代理自动添加 `/api/` 前缀） |

**成功示例**（直接透传后端响应）：
```json
{ "responseMeta": { "status": 200 }, "data": { "name": "John" } }
```

**失败示例**（后端不可达）：
```json
{ "success": false, "message": "Backend unavailable: http://appsmith:8080/api/v1/users/me", "errorCode": "BACKEND_UNAVAILABLE", "result": null }
```

**失败示例**（超时）：
```json
{ "success": false, "message": "Backend timeout: http://appsmith:8080/api/v1/users/me", "errorCode": "BACKEND_TIMEOUT", "result": null }
```

---

## 8. 业务路由

### `POST /sessions/:id/biz/init`

初始化业务。dispatch `INITIALIZE_EDITOR`，竞速等待成功或失败。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pageId` | string (body) | 是 | 页面 ID |
| `pageContext` | object (body) | 是 | 页面上下文数据（可使用 mock/initData.json） |

**响应示例**（成功）：
```json
{ "success": true, "message": "", "result": "初始化成功" }
```

**响应示例**（失败）：
```json
{ "success": false, "message": "初始化异常", "errorCode": "INIT_CRASH", "result": null }
```

**响应示例**（超时）：
```json
{ "success": true, "message": "初始化成功", "result": null }
```

---

### `POST /sessions/:id/biz/update/js-action`

检查 JS Collection 的 body 是否与传入值一致。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string (body) | 是 | JS Collection ID |
| `body` | string (body) | 是 | 期望的 body 内容 |

**调用示例**：
```bash
curl -X POST http://localhost:3100/sessions/$SID/biz/update/js-action \
  -H "Content-Type: application/json" \
  -d '{"id": "js-collection-id-123", "body": "export default { myFunc: () => {} }"}'
```

**响应示例**（一致）：

```json
{ "success": true, "message": "", "result": { edit： false } }
```

**响应示例**（不一致）：
```json
{
    "success": true,
    "message": "",
    "result": {
        edit: true, 
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
                    "actionCollection": {
                        "defaultToBranchedActionIdsMap": {},
                        "id": "68f1e85f58f1ae33b5f4705e",
                        "applicationId": "6720810669698c35a598b44a",
                        "workspaceId": "64a3df72eca3553cdfdc423c",
                        "name": "VALID",
                        "pageId": "68f1957658f1ae33b5f46d87",
                        "pluginId": "64a257324cec4f198aa05848",
                        "pluginType": "JS",
                        "actions": [
                            {
                                "id": "68f2043658f1ae33b5f471d4",
                                "applicationId": "6720810669698c35a598b44a",
                                "workspaceId": "64a3df72eca3553cdfdc423c",
                                "pluginType": "JS",
                                "pluginId": "64a257324cec4f198aa05848",
                                "name": "openWindow",
                                "fullyQualifiedName": "VALID.openWindow",
                                "datasource": {
                                    "userPermissions": [],
                                    "name": "UNUSED_DATASOURCE",
                                    "pluginId": "64a257324cec4f198aa05848",
                                    "workspaceId": "64a3df72eca3553cdfdc423c",
                                    "datasourceStorages": {},
                                    "messages": [],
                                    "isValid": true,
                                    "new": true
                                },
                                "pageId": "68f1957658f1ae33b5f46d87",
                                "collectionId": "68f1e85f58f1ae33b5f4705e",
                                "actionConfiguration": {
                                    "timeoutInMillisecond": 10000,
                                    "paginationType": "NONE",
                                    "encodeParamsToggle": true,
                                    "body": "async function () {\n  showAlert('openWindow');\n}",
                                    "jsArguments": []
                                },
                                "executeOnLoad": false,
                                "dynamicBindingPathList": [
                                    {
                                        "key": "body"
                                    }
                                ],
                                "isValid": true,
                                "invalids": [],
                                "messages": [],
                                "jsonPathKeys": [
                                    "async function () {\n  showAlert('openWindow');\n}"
                                ],
                                "userSetOnLoad": false,
                                "confirmBeforeExecute": false,
                                "userPermissions": [
                                    "read:actions",
                                    "delete:actions",
                                    "execute:actions",
                                    "manage:actions"
                                ],
                                "defaultResources": {
                                    "actionId": "68f2043658f1ae33b5f471d4",
                                    "applicationId": "6720810669698c35a598b44a",
                                    "pageId": "68f1957658f1ae33b5f46d87",
                                    "collectionId": "68f1e85f58f1ae33b5f4705e"
                                },
                                "entityReferenceType": "JSACTION"
                            },
                            {
                                "id": "68f2043658f1ae33b5f471d5",
                                "applicationId": "6720810669698c35a598b44a",
                                "workspaceId": "64a3df72eca3553cdfdc423c",
                                "pluginType": "JS",
                                "pluginId": "64a257324cec4f198aa05848",
                                "name": "checkValid",
                                "fullyQualifiedName": "VALID.checkValid",
                                "datasource": {
                                    "userPermissions": [],
                                    "name": "UNUSED_DATASOURCE",
                                    "pluginId": "64a257324cec4f198aa05848",
                                    "workspaceId": "64a3df72eca3553cdfdc423c",
                                    "datasourceStorages": {},
                                    "messages": [],
                                    "isValid": true,
                                    "new": true
                                },
                                "pageId": "68f1957658f1ae33b5f46d87",
                                "collectionId": "68f1e85f58f1ae33b5f4705e",
                                "actionConfiguration": {
                                    "timeoutInMillisecond": 10000,
                                    "paginationType": "NONE",
                                    "encodeParamsToggle": true,
                                    "body": "async function (fieldId, values) {\n  if ([\"Sold\"].includes(fieldId)) {\n    const val = values[fieldId];\n    COMMON.text = val ? '' + val : '';\n    if (val === null) return true;\n    const flag = (val || val === 0) && val <= 10000 && val >= 0;\n    if (!flag) {\n      showAlert('Amount must bigger then 0 and small then 10000');\n    }\n    return flag;\n  }\n  if ([\"startDate\"].includes(fieldId)) {\n    const val = values[fieldId];\n    const flag = !val || val > '2025-05-10';\n    if (!flag) {\n      showAlert('startDate must after 2025-05-10');\n    }\n    return flag;\n  }\n  if ([\"startTime\"].includes(fieldId)) {\n    const val = values[fieldId];\n    const flag = !val || val > '08:00:00';\n    if (!flag) {\n      showAlert('startDate must after 08:00:00');\n    }\n    return flag;\n  }\n  if ([\"fullStartTime\"].includes(fieldId)) {\n    const val = values[fieldId];\n    const flag = !val || val > '2025-05-10 20:00:00';\n    if (!flag) {\n      showAlert('startDate must after 2025-05-10 20:00:00');\n    }\n    return flag;\n  }\n  if ([\"Country\"].includes(fieldId)) {}\n  const flag = values[fieldId]?.length < 8;\n  if (!flag) {\n    showAlert('error');\n  }\n  return flag;\n}",
                                    "jsArguments": [
                                        {
                                            "name": "fieldId"
                                        },
                                        {
                                            "name": "values"
                                        }
                                    ]
                                },
                                "executeOnLoad": false,
                                "dynamicBindingPathList": [
                                    {
                                        "key": "body"
                                    }
                                ],
                                "isValid": true,
                                "invalids": [],
                                "messages": [],
                                "jsonPathKeys": [
                                    "async function (fieldId, values) {\n  if ([\"Sold\"].includes(fieldId)) {\n    const val = values[fieldId];\n    COMMON.text = val ? '' + val : '';\n    if (val === null) return true;\n    const flag = (val || val === 0) && val <= 10000 && val >= 0;\n    if (!flag) {\n      showAlert('Amount must bigger then 0 and small then 10000');\n    }\n    return flag;\n  }\n  if ([\"startDate\"].includes(fieldId)) {\n    const val = values[fieldId];\n    const flag = !val || val > '2025-05-10';\n    if (!flag) {\n      showAlert('startDate must after 2025-05-10');\n    }\n    return flag;\n  }\n  if ([\"startTime\"].includes(fieldId)) {\n    const val = values[fieldId];\n    const flag = !val || val > '08:00:00';\n    if (!flag) {\n      showAlert('startDate must after 08:00:00');\n    }\n    return flag;\n  }\n  if ([\"fullStartTime\"].includes(fieldId)) {\n    const val = values[fieldId];\n    const flag = !val || val > '2025-05-10 20:00:00';\n    if (!flag) {\n      showAlert('startDate must after 2025-05-10 20:00:00');\n    }\n    return flag;\n  }\n  if ([\"Country\"].includes(fieldId)) {}\n  const flag = values[fieldId]?.length < 8;\n  if (!flag) {\n    showAlert('error');\n  }\n  return flag;\n}"
                                ],
                                "userSetOnLoad": false,
                                "confirmBeforeExecute": false,
                                "userPermissions": [
                                    "read:actions",
                                    "delete:actions",
                                    "execute:actions",
                                    "manage:actions"
                                ],
                                "defaultResources": {
                                    "actionId": "68f2043658f1ae33b5f471d5",
                                    "applicationId": "6720810669698c35a598b44a",
                                    "pageId": "68f1957658f1ae33b5f46d87",
                                    "collectionId": "68f1e85f58f1ae33b5f4705e"
                                },
                                "entityReferenceType": "JSACTION"
                            }
                        ],
                        "archivedActions": [],
                        "body": "export default {\n\tmyVar1: [],\n\tmyVar2: {},\n\tasync openWindow3 () {\n\t\t//\twrite code here\n\t\t//\tthis.myVar1 = [1,2,3]\n\t\t\tshowAlert('openWindow');\n\t},\n\tasync checkValid (fieldId, values) {\n\t\t//\tuse async-await or promises\n\t\t//\tawait storeValue('varName', 'hello world')\n\t\tif ([\"Sold\"].includes(fieldId)) {\n\t\t\tconst val = values[fieldId];\n\t\t\tCOMMON.text = val ? '' + val : '';\n\t\t\tif (val === null) return true;\n\t\t\tconst flag = (val || val === 0) && val <=10000 && val >= 0;\n\t\t\tif(!flag) {\n\t\t\t\tshowAlert('Amount must bigger then 0 and small then 10000');\n\t\t\t}\n\t\t\treturn flag;\n\t\t}\n\t\tif ([\"startDate\"].includes(fieldId)) {\n\t\t\tconst val = values[fieldId];\n\t\t\tconst flag = !val || val > '2025-05-10';\n\t\t\tif(!flag) {\n\t\t\t\tshowAlert('startDate must after 2025-05-10');\n\t\t\t}\n\t\t\treturn flag;\n\t\t}\n\t\tif ([\"startTime\"].includes(fieldId)) {\n\t\t\tconst val = values[fieldId];\n\t\t\tconst flag = !val || val > '08:00:00';\n\t\t\tif(!flag) {\n\t\t\t\tshowAlert('startDate must after 08:00:00');\n\t\t\t}\n\t\t\treturn flag;\n\t\t}\n\t\tif ([\"fullStartTime\"].includes(fieldId)) {\n\t\t\tconst val = values[fieldId];\n\t\t\tconst flag = !val || val > '2025-05-10 20:00:00';\n\t\t\tif(!flag) {\n\t\t\t\tshowAlert('startDate must after 2025-05-10 20:00:00');\n\t\t\t}\n\t\t\treturn flag;\n\t\t}\n\t\tif ([\"Country\"].includes(fieldId)) {\n\t\t\t// await new Promise(r => setTimeout(r, 1000));\n\t\t}\n\t\t\n\t\tconst flag = values[fieldId]?.length < 8\n\t\tif(!flag) {\n\t\t\tshowAlert('error');\n\t\t}\n\t\treturn flag;\n\t}\n}",
                        "variables": [
                            {
                                "name": "myVar1",
                                "value": "[]"
                            },
                            {
                                "name": "myVar2",
                                "value": "{}"
                            }
                        ],
                        "defaultResources": {
                            "applicationId": "6720810669698c35a598b44a",
                            "pageId": "68f1957658f1ae33b5f46d87",
                            "collectionId": "68f1e85f58f1ae33b5f4705e"
                        },
                        "userPermissions": [
                            "read:actions",
                            "delete:actions",
                            "execute:actions",
                            "manage:actions"
                        ]
                    }
                }
            }
        ]
    }
}
```

**失败示例**（未找到）：
```json
{ "success": false, "message": "未找到 id 为 xxx 的 JS Collection", "errorCode": "JS_COLLECTION_NOT_FOUND", "result": null }
```

---

### waitForAction / raceForAction 编排模式

业务路由可使用 `waitForAction` / `raceForAction` 实现"dispatch → 等待 saga 响应 → 继续处理"。

**关键**：必须先注册 listener（调用 raceForAction），再 dispatch 触发 action，否则同步 saga 响应会丢失。

```typescript
router.post("/sessions/:id/biz/load-page", async (req, res) => {
  const { store } = (req as any).session;
  const raceForAction = (req as any).raceForAction;

  // 1. 先注册 listener
  const racePromise = raceForAction([
    { actionType: "FETCH_PAGE_SUCCESS" },
    { actionType: "FETCH_PAGE_ERROR" },
  ], { timeout: 15000 });

  // 2. 再 dispatch
  store.dispatch({ type: "FETCH_PAGE_INIT", payload: { pageId } });

  // 3. 等待结果
  const { type, action } = await racePromise;
  if (type === "FETCH_PAGE_SUCCESS") ok(res, action.payload);
  else fail(res, "加载失败");
});
```

---

## 通用错误响应

所有错误响应 HTTP 状态码均为 **200**，通过 `errorCode` 区分错误类型：

| errorCode | 场景 | 示例 message |
|-----------|------|-------------|
| `MISSING_PARAM` | 必填参数缺失 | `"pageId 为必填参数"` |
| `SESSION_NOT_FOUND` | 会话不存在 | `"Session xxx not found"` |
| `SESSION_CREATE_FAILED` | 会话创建失败 | `"Cannot read property..."` |
| `SLICE_NOT_FOUND` | 状态切片不存在 | `"Slice \"xxx\" not found"` |
| `ACTION_INVALID` | Action 格式非法 | `"Action must have a \"type\" field"` |
| `INIT_CRASH` | 业务初始化异常 | `"初始化异常"` |
| `TIMEOUT` | 操作超时（通用） | `"初始化超时: ..."` / `"更新超时: ..."` |
| `JS_COLLECTION_NOT_FOUND` | JS Collection 不存在 | `"未找到 id 为 xxx 的 JS Collection"` |
| `EVAL_ERROR` | 求值引擎错误 | `"..."` |
| `SELECTOR_NOT_FOUND` | Selector 不存在 | `"Selector \"xxx\" not found..."` |
| `SELECTOR_ERROR` | Selector 执行错误 | `"..."` |
| `BACKEND_UNAVAILABLE` | 代理后端不可达 | `"Backend unavailable: ..."` |
| `BACKEND_TIMEOUT` | 代理后端超时 | `"Backend timeout: ..."` |
| `BACKEND_CONFIG_ERROR` | 代理后端未配置 | `"Session has no backendUrl configured"` |
| `INTERNAL_ERROR` | 服务内部错误 | `"..."` |
