# Appsmith Redux Node Service

将 Appsmith 前端（`project-web`）中的 **Redux 状态管理**、**Redux-Saga 副作用处理** 和 **Web Worker 求值引擎** 抽离为完全独立的 Node.js 服务，通过 REST API 暴露状态读写、DataTree 求值和 Appsmith 后端代理能力。

## 核心能力

| 能力 | 说明 |
|------|------|
| **Redux 状态管理** | 完整的 Appsmith Redux Store（85+ Reducer、19 entities 子状态、55 ui 子状态），支持 Action 派发和状态读取 |
| **DataTree 求值引擎** | 通过 `worker_threads` 运行 Appsmith 求值引擎，支持 `{{expression}}` 绑定、依赖追踪 |
| **58 个 Saga 副作用** | 全量集成 Appsmith 的 Redux-Saga（排除 PageVisibilitySaga），包括求值、布局计算、Action 执行、Git 操作等 |
| **多会话隔离** | 每个会话拥有独立的 Store、Saga、worker_thread，状态完全隔离 |
| **业务编排** | 业务路由支持 dispatch action -> 等待 action 响应 -> 继续处理的异步编排模式 |
| **后端 API 代理** | 透传 Appsmith 后端 API 请求，自动注入认证 Header |
| **@shared/ast + dsl** | 集成 JS 代码解析（AST）和 DSL 扁平化/嵌套/迁移（v1-89）包 |

## 快速开始

### 环境要求

- Node.js >= 18（需要原生 `fetch`、`crypto.randomUUID`、`worker_threads`）
- npm

### 安装

```bash
cd redux-node-service
npm install --legacy-peer-deps
```

### 启动

```bash
npm run dev
```

或手动启动：

```bash
npx ts-node -r tsconfig-paths/register --transpile-only src/index.ts
```

服务默认监听 `http://localhost:3100`。

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3100` | 服务端口 |
| `BACKEND_URL` | `http://localhost:8080` | Appsmith 后端地址（代理用） |

## 统一响应格式

所有接口（除代理透传外）HTTP 状态码始终为 **200**，通过 `success` + `errorCode` 区分结果：

```json
// 成功
{ "success": true, "message": "", "result": <any> }

// 失败
{ "success": false, "message": "错误描述", "errorCode": "MISSING_PARAM", "result": null }
```

ErrorCode 枚举值见 [src/utils/error-codes.ts](src/utils/error-codes.ts)。

## API 概览

所有业务操作都在会话上下文中进行。先创建会话，再执行操作。

```bash
# 1. 创建会话
SID=$(curl -s -X POST http://localhost:3100/sessions \
  -H "Content-Type: application/json" \
  -d '{"authToken":"your-token","backendUrl":"http://appsmith:8080"}' | jq -r '.result.sessionId')

# 2. 业务初始化
curl -X POST http://localhost:3100/sessions/$SID/biz/init \
  -H "Content-Type: application/json" \
  -d '{"pageId":"page_123","pageContext":{...}}'

# 3. JS Action 更新
curl -X POST http://localhost:3100/sessions/$SID/biz/update/js-action \
  -H "Content-Type: application/json" \
  -d '{"id":"js_collection_id","body":"export default { ... }"}'

# 4. 状态操作
curl -X POST http://localhost:3100/sessions/$SID/dispatch \
  -H "Content-Type: application/json" \
  -d '{"type":"UPDATE_LAYOUT","payload":{"widgets":{...}}}'

# 5. 读取状态
curl http://localhost:3100/sessions/$SID/state/evaluations/tree

# 6. 代理后端
curl http://localhost:3100/sessions/$SID/proxy/v1/users/me

# 7. 销毁
curl -X DELETE http://localhost:3100/sessions/$SID
```

### 端点清单

```
GET  /health                                         — 健康检查

POST   /sessions                                     — 创建会话
GET    /sessions                                     — 列出会话
DELETE /sessions/:id                                 — 销毁会话

GET    /sessions/:id/state[/:slice[/:sub]]           — 状态读取
POST   /sessions/:id/dispatch                        — 派发 Action
POST   /sessions/:id/dispatch-batch                  — 批量派发

POST   /sessions/:id/eval/setup                      — 初始化求值
POST   /sessions/:id/eval/tree                       — DataTree 求值
POST   /sessions/:id/eval/expression                 — 表达式求值
POST   /sessions/:id/eval/trigger                    — 触发器求值
POST   /sessions/:id/eval/validate                   — 属性验证

POST   /sessions/:id/select                          — Selector 执行
POST   /sessions/:id/saga/init                       — 编辑器初始化
POST   /sessions/:id/saga/execute-action             — 执行 Action

POST   /sessions/:id/biz/init                        — 业务初始化
POST   /sessions/:id/biz/update/js-action            — JS Action body 更新

ALL    /sessions/:id/proxy/{*path}                   — 后端 API 代理
```

详细参数、示例和响应格式见 [docs/node-service-api.md](docs/node-service-api.md)。

Postman 集合文件：[docs/node-service-api.postman_collection.json](docs/node-service-api.postman_collection.json)。

Appsmith 后端代理 API 文档见 [docs/appsmith-backend-api.md](docs/appsmith-backend-api.md)。

## 项目结构

```
redux-node-service/
├── packages/                           共享包（从 project-web 复制）
│   ├── ast/                            @shared/ast — JS 代码解析（acorn）
│   └── dsl/                            @shared/dsl — DSL 扁平化/嵌套/迁移 v1-89
│
├── src/
│   ├── index.ts                        启动入口（模块预热 + graceful shutdown + 端口检测）
│   ├── server.ts                       Express 应用（路由注册、中间件）
│   ├── config.ts                       配置（端口、后端 URL）
│   │
│   ├── adapters/                       浏览器 → Node.js 适配层
│   │   ├── globals.ts                  window/localStorage/navigator 内存 shim
│   │   ├── storeContext.ts             AsyncLocalStorage 请求级 Store 上下文
│   │   ├── worker-adapter.ts           NodeEvalService（替代 GracefulWorkerService）
│   │   ├── module-stubs.ts             运行时 catch-all 未知模块拦截
│   │   └── empty-module.ts             Proxy 空模块（callable、可属性访问）
│   │
│   ├── utils/
│   │   ├── action-waiter.ts            Action 等待器（业务路由异步编排）
│   │   ├── error-codes.ts             ErrorCode 枚举（统一错误管理）
│   │   └── response.ts                ok()/fail() 统一响应工具
│   │
│   ├── store/
│   │   ├── create-store.ts             Redux Store 创建（reduxBatch + sagaMiddleware）
│   │   └── saga-runner.ts              rootSaga + 58 个 Saga 注册
│   │
│   ├── evaluation/
│   │   └── worker-thread-entry.ts      worker_threads 入口（Web Worker API 映射）
│   │
│   ├── sessions/                       多会话管理
│   │   ├── session-manager.ts          SessionManager（生命周期管理）
│   │   ├── session-store.ts            Per-session Store + Saga + ActionWaiter
│   │   └── session-evaluator.ts        Per-session NodeEvalService 工厂
│   │
│   ├── routes/
│   │   ├── session.routes.ts           会话级全功能路由（lifecycle + state + eval + saga）
│   │   ├── business.routes.ts          业务路由（biz/init、biz/update/js-action）
│   │   └── action-proxy.routes.ts      后端 API 代理
│   │
│   └── appsmith/                       从 project-web 复制并适配的源码（~935 文件）
│       ├── reducers/                   85+ Reducer
│       ├── sagas/                      142 Saga 文件（58 个顶级 generator）
│       ├── workers/                    求值引擎（Evaluation + common）
│       ├── actions/                    Action Creators
│       ├── selectors/                  Selectors
│       ├── constants/                  常量
│       ├── entities/                   实体类型
│       ├── utils/                      工具函数
│       ├── api/                        API 模块
│       ├── layoutSystems/              布局系统（Anvil + FixedLayout + common，16 个文件）
│       ├── stubs/                      浏览器模块 stub
│       ├── UITelemetry/                遥测 stub
│       ├── WidgetProvider/             Widget 类型配置
│       ├── ee/                         Enterprise Edition
│       ├── ce/                         Community Edition
│       └── middleware/                 Redux 中间件
│
└── docs/
    ├── node-service-api.md             Node Service REST API 文档
    ├── node-service-api.postman_collection.json   Postman 导入文件
    └── appsmith-backend-api.md         Appsmith 后端代理 API 文档（14 个模块）
```

## 架构设计

### 求值引擎

```
EvaluationsSaga → NodeEvalService → worker_threads.Worker → worker-thread-entry.ts → evaluation.worker.ts
     │                  │                                           │
     │            postMessage (JSON序列化)                    parentPort.on("message")
     │                  │                                           │
     └── yield take(channel) ←── channel.put(response) ←── parentPort.postMessage(response)
```

### 多会话隔离

```
Session A                              Session B
┌──────────────────┐                   ┌──────────────────┐
│  Store A         │                   │  Store B         │
│  sagaMiddleware A│                   │  sagaMiddleware B│
│  rootSaga A      │                   │  rootSaga B      │
│  actionWaiter A  │                   │  actionWaiter B  │
│  evalWorker A ───┼── worker_thread   │  evalWorker B ───┼── worker_thread
└──────────────────┘                   └──────────────────┘
```

### 业务路由异步编排（raceForAction）

```
POST /sessions/:id/biz/some-action
  → raceForAction(["SUCCESS","ERROR"], {timeout}) 先注册监听
  → store.dispatch({ type: "TRIGGER" })
  → saga 处理完毕 → dispatch SUCCESS
  → raceForAction resolve → 拿到 action payload
  → 返回响应
```

### 浏览器兼容策略

| 层级 | 策略 | 示例 |
|------|------|------|
| **全局 shim** | `adapters/globals.ts` 内存实现 | window、localStorage、navigator、document |
| **Stub 文件** | `appsmith/stubs/` no-op 实现 | toast、analytics、socket、performanceTracker |
| **模块拦截** | `Module._resolveFilename` 运行时 catch-all | 浏览器模块 → Proxy 空模块 |
| **真实实现** | 从 project-web 移植 | layoutSystems（16 文件）、@shared/ast、@shared/dsl、localforage |
| **UITelemetry** | 专用 stub 目录 | profileFn 正确调用 fn() 并返回结果 |
| **DOM 操作** | 环境检测跳过 | `typeof dataTreeTypeDefCreator !== "function"` |
| **浏览器 API** | console.debug 记录 | navigate → log、copy → log、download → log |

## 能力边界

### 完整支持

Redux 状态读写、DataTree 求值、依赖追踪、Action/Query 执行调度、JS 对象执行、appsmith.store、Widget 布局计算（自动高度、Flex、碰撞检测）、DSL 布局转换、DSL 迁移（v1-89）、JS 代码解析（AST）、Undo/Redo 数据回放、Git 操作调度、模板/快照管理、全部编辑器面板状态、Widget CRUD、localforage 数据持久化

### 兼容处理（降级运行）

| 功能 | 处理方式 |
|------|----------|
| Toast 提示 | console.info + debugger state |
| 页面导航 | memory history + console.debug |
| 文件下载 | 保留数据获取，跳过浏览器下载 |
| 剪贴板 | console.debug 记录 |
| 模态框/抽屉 | 状态更新，无渲染 |
| DOM 变更 | 环境检测跳过 |
| 地理位置 | 返回空坐标 + 警告日志 |
| 窗口消息 | 空 channel（不接收消息） |
| Tern 自动补全 | typeof 检测跳过 |

### 已知限制

- TypeScript 类型检查：1379 个类型错误（`transpileOnly` 模式运行，不影响功能）
- `{{expression}}` 绑定表达式求值需要完整的应用初始化流程

## 相关文档

| 文档 | 说明 |
|------|------|
| [docs/node-service-api.md](docs/node-service-api.md) | Node Service REST API 文档（参数、示例、响应） |
| [docs/node-service-api.postman_collection.json](docs/node-service-api.postman_collection.json) | Postman 导入文件 |
| [docs/appsmith-backend-api.md](docs/appsmith-backend-api.md) | Appsmith 后端代理 API 文档（14 个模块） |
