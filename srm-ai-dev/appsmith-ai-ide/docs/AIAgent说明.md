# AI Agent 协助编码 - 调用流程与接口规范

## 一、架构概览

```
                        SSE Stream
  Frontend ChatPanel ──────────────────────────────────────────┐
        │                                                      │
        │ POST /api/pages/{pageId}/chat                        │
        ▼                                                      ▼
  ┌──────────────┐     HTTP Forward      ┌──────────────────────────┐
  │  Java 后端   │ ───────────────────► │  Container AI Proxy      │
  │  (Quarkus)   │     SSE Passthrough   │  (port 3000)             │
  │  port 3100   │ ◄─────────────────── │  Claude API 调用          │
  └──────────────┘                       └──────────────────────────┘
                                                   │
                                                   │ 读取上下文
                                                   ▼
                                         ┌──────────────────┐
                                         │ /workspace  代码   │
                                         │ /deps      依赖库  │
                                         │ /skills    技能    │
                                         └──────────────────┘
```

**核心链路：** 前端 → Java 后端 (代理) → Docker 容器内 AI Proxy → Claude API

---

## 二、完整调用流程

### 2.1 用户发送消息

```
用户输入消息 → ChatPanel.sendMessage()
  ├─ 1. 创建 user message (本地展示)
  ├─ 2. 创建 assistant message 占位 (流式填充)
  ├─ 3. POST /api/pages/{pageId}/chat (SSE 请求)
  ├─ 4. 逐 token 接收 AI 响应，实时渲染 Markdown
  ├─ 5. 如有 code_suggestion，弹出 DiffBanner
  └─ 6. 收到 done 事件，结束流式传输
```

### 2.2 后端代理转发

```
Java 后端接收请求
  ├─ 1. 从 Checkout 表查找 pageId 对应的 active 容器
  ├─ 2. 通过 DockerService 获取容器 IP
  ├─ 3. 转发请求到 http://{containerIp}:3000/api/chat
  └─ 4. SSE 响应直接透传回前端
```

### 2.3 容器内 AI Proxy 处理

```
AI Proxy 接收请求
  ├─ 1. 解析 { message, activatedSkillIds }
  ├─ 2. 构建上下文 (System Prompt)
  │     ├─ 读取 /workspace 全部代码文件
  │     ├─ 读取 /deps 依赖库 JS 文件
  │     └─ 读取 /skills/skills.json 中已激活的技能 Prompt
  ├─ 3. 调用 Claude API (流式)
  │     model: claude-sonnet-4-20250514
  │     max_tokens: 4096
  │     system: 拼装好的上下文
  │     messages: [{ role: "user", content: message }]
  ├─ 4. 逐 token 发送 SSE 事件
  ├─ 5. 流结束后提取代码建议 (正则匹配 diff 代码块)
  ├─ 6. 发送 code_suggestion 事件
  ├─ 7. 检测技能使用情况并上报
  └─ 8. 发送 done 事件，关闭连接
```

### 2.4 代码建议应用

```
前端收到 code_suggestion 事件
  ├─ 1. IDEPage 保存到 pendingSuggestion 状态
  ├─ 2. Editor 组件渲染 DiffBanner (显示文件名、增删行数)
  ├─ 3. 用户点击 "应用修改"
  │     ├─ 更新编辑器文件内容
  │     └─ 标记文件为未保存
  ├─ 4. 用户点击 "保存"
  │     └─ POST /api/pages/{pageId}/container/files/batch-save
  └─ 5. Container File Manager 写入 /workspace 目录
```

---

## 三、接口规范

### 3.1 发送聊天消息

**POST** `/api/pages/{pageId}/chat`

| 项目 | 说明 |
|------|------|
| Content-Type | `application/json` |
| Accept | `text/event-stream` |
| Authorization | `Bearer {JWT token}` |
| 响应格式 | Server-Sent Events (SSE) |

**请求体：**

```json
{
  "message": "帮我写一个排序函数",
  "activatedSkillIds": ["skill-id-1", "skill-id-2"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | 是 | 用户消息内容 |
| activatedSkillIds | string[] | 否 | 当前激活的技能 ID 列表，用于上下文注入 |

**SSE 响应事件：**

#### event: `token`

AI 响应的文本片段，逐 token 推送。

```
event: token
data: {"content": "下面是一个"}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| content | string | 文本片段 |

#### event: `code_suggestion`

AI 从响应中提取的代码修改建议。

```
event: code_suggestion
data: {"file": "src/utils/sort.ts", "diff": "--- a/src/utils/sort.ts\n+++ b/src/utils/sort.ts\n@@ -1,3 +1,10 @@\n+export function quickSort..."}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| file | string | 目标文件路径 |
| diff | string | unified diff 格式的变更内容 |

#### event: `system_message`

系统通知（如依赖库刷新后发出）。

```
event: system_message
data: {"message": "依赖库已更新，后续对话将使用最新接口", "filesLoaded": 5, "depsLoaded": 3, "skillsInjected": 2}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| message | string | 通知文本 |
| filesLoaded | number | 加载的代码文件数量 |
| depsLoaded | number | 加载的依赖库数量 |
| skillsInjected | number | 注入的技能数量 |

#### event: `done`

流式传输结束。

```
event: done
data: {"sessionId": "uuid-xxx", "skillsUsed": ["skill-id-1"]}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| sessionId | string | 会话 ID |
| skillsUsed | string[] | 本次响应实际使用到的技能 ID |

#### event: `error`

流式传输异常。

```
event: error
data: {"message": "Stream failed"}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| message | string | 错误信息 |

---

### 3.2 容器内辅助接口

以下接口运行在容器内部，通过后端代理访问，路径前缀为 `/api/pages/{pageId}/container/`。

#### 3.2.1 会话管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查，返回 `{ status, sessionId, uptime }` |
| GET | `/api/session` | 获取当前会话元数据 |
| DELETE | `/api/session` | 重置会话 |

#### 3.2.2 上下文刷新

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/context/refresh` | 重新构建上下文（重新读取代码/依赖/技能） |
| POST | `/api/deps/refresh-all` | 刷新所有依赖库，并标记上下文需刷新 |
| POST | `/api/deps/{name}/refresh` | 刷新单个依赖库 |
| GET | `/api/deps` | 列出已加载的依赖库 |

#### 3.2.3 文件操作 (File Manager, port 3001)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/files` | 列出 workspace 目录树 |
| GET | `/files/{path}` | 读取文件内容 |
| POST | `/files/{path}` | 创建文件 |
| PUT | `/files/{path}` | 更新文件 |
| DELETE | `/files/{path}` | 删除文件 |
| POST | `/files/batch-save` | 批量保存文件 |
| GET | `/diff` | 执行 `git diff` 获取变更 |

**批量保存请求体：**

```json
{
  "files": [
    { "path": "src/App.tsx", "content": "import React..." },
    { "path": "src/utils.ts", "content": "export function..." }
  ]
}
```

---

## 四、System Prompt 上下文结构

AI Proxy 发送给 Claude API 的 System Prompt 由三部分拼接而成：

```
## Page Code
### src/App.tsx
```tsx
// 文件实际内容
```

### src/components/Header.tsx
```tsx
// 文件实际内容
```

## Dependencies
### apiClient.js
```javascript
// 依赖库代码
```

## Active Skills
你是一个专注于 React 开发的助手，请遵循以下规范...

---

你是一个代码审查助手...
```

| 部分 | 数据来源 | 说明 |
|------|---------|------|
| Page Code | `/workspace` 目录全部文件 | 当前页面的完整代码 |
| Dependencies | `/deps/*.js` 文件 | 管理员配置的公共依赖库 |
| Active Skills | `/skills/skills.json` + activatedSkillIds | 用户激活的技能 Prompt |

---

## 五、代码建议提取规则

AI 响应中的代码建议通过正则提取：

1. 匹配所有 ` ```diff ` 或 ` ```patch ` 代码块
2. 从代码块内容中提取文件名：匹配 `--- a/path` 和 `+++ b/path` 格式
3. 生成 `{ file, diff }` 对象

**AI 响应示例：**

````markdown
我建议修改 `src/App.tsx`：

```diff
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -10,5 +10,8 @@
 export function App() {
   return (
-    <div>Hello</div>
+    <div>
+      <Header />
+      <Main />
+    </div>
   );
 }
```
````

**提取结果：**

```json
{
  "file": "src/App.tsx",
  "diff": "--- a/src/App.tsx\n+++ b/src/App.tsx\n@@ -10,5 +10,8 @@\n..."
}
```

---

## 六、技能使用追踪

### 6.1 检测逻辑

AI 响应完成后，遍历 `activatedSkillIds`，检查响应文本中是否包含技能 ID 或技能名称。

### 6.2 上报接口

**POST** `/api/skills/{skillId}/use`

容器内 AI Proxy 异步调用后端接口上报技能使用情况，用于统计 `callCount`。

同一会话内相同技能只上报一次（去重）。

---

## 七、关键文件索引

| 模块 | 文件路径 |
|------|---------|
| 前端 ChatPanel | `packages/frontend/src/pages/IDEPage/ChatPanel/index.tsx` |
| 前端 Chat Store | `packages/frontend/src/stores/chatStore.ts` |
| 前端 Skill Store | `packages/frontend/src/stores/skillStore.ts` |
| 前端 DiffBanner | `packages/frontend/src/pages/IDEPage/Editor/DiffBanner.tsx` |
| 前端 Editor (应用建议) | `packages/frontend/src/pages/IDEPage/Editor/index.tsx` |
| Java 后端代理 | `packages/backend-java/src/main/java/com/appsmith/aiide/resource/PageResource.java` |
| AI Proxy 聊天路由 | `packages/container-services/src/ai-proxy/routes/chat.ts` |
| 上下文构建器 | `packages/container-services/src/ai-proxy/services/contextBuilder.ts` |
| 技能使用追踪 | `packages/container-services/src/ai-proxy/services/skillUsageTracker.ts` |
| 会话管理 | `packages/container-services/src/ai-proxy/routes/session.ts` |
| File Manager | `packages/container-services/src/file-manager/routes/files.ts` |

---

## 八、错误处理

| 场景 | HTTP 状态码 | 响应 |
|------|------------|------|
| 页面无 active checkout | 404 | `{ error: "Not Found", message: "No active container for page {pageId}" }` |
| 容器不可达 | 502 | `{ error: "Bad Gateway", message: "Failed to reach container" }` |
| Claude API 流异常 | SSE error 事件 | `{ message: "Stream failed" }` |
| 未授权 | 401 | 前端自动跳转登录页 |

---

*文档生成日期: 2026-03-26*
