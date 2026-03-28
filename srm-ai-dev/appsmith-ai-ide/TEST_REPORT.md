# SRM-AI-IDE 功能测试与空值兼容性检测报告

**生成日期**: 2026-03-26
**测试框架**: Vitest v4.1.1
**检测范围**: packages/backend, packages/frontend, packages/container-services

---

## 一、单元测试执行结果汇总

### 总体统计

| 分类 | 通过 | 失败 | 总计 |
|------|------|------|------|
| container-services 单元测试 | 16 | 0 | 16 |
| container-services 契约测试 | 25 | 0 | 25 |
| backend 单元测试 (middleware) | 全部通过 | 0 | - |
| backend 单元测试 (services) | 全部通过 | 0 | - |
| backend 单元测试 (validation) | 25 | 0 | 25 |
| backend 契约测试 | 53 | **13** | 66 |
| backend 集成测试 | 20 | **2** | 22 |
| **合计** | ~145 | **15** | ~160 |

---

## 二、测试失败项详情

### 失败 #1: GET /api/pages — 返回数据结构不匹配 (6 个用例)

**文件**: `packages/backend/tests/contract/pages.list.test.ts`

| 用例 | 错误 |
|------|------|
| returns 200 with enriched page list | `expected false to be true` |
| each page has expected shape with checkout status | `pages is not iterable` |
| page checked out by another user has status "checkedout" | `pages.find is not a function` |
| free page has status "free" and checkedOutBy null | `pages.find is not a function` |
| page checked out by current user has status "mine" | `pages.find is not a function` |
| returns 503 when pages API is not configured | `expected 200 to be 503` |

**触发原因**: 后端 `GET /pages` 路由返回格式为 `{ pages: [...] }` 包裹结构，但测试用例期望直接返回数组，导致 `pages.find` 调用在 `undefined` 上执行。

**触发场景**: 前端通过 `GET /api/pages` 获取页面列表时。

**风险内容**: 测试与实际 API 契约不一致。后端在未配置 `thirdPartyApiUrl` 时返回 200 + mock 数据（而非 503），这与测试期望冲突。

---

### 失败 #2: GET /api/pages/:pageId/tree — 缺少空值校验导致 fallback 兜底 (4 个用例)

**文件**: `packages/backend/tests/contract/pages.tree.test.ts`

| 用例 | 错误 |
|------|------|
| returns 404 when no active checkout exists | `expected 200 to be 404` |
| returns 503 when GitLab API is not configured | `expected 200 to be 503` |
| error responses follow { error, message } format | `expected 'undefined' to be 'string'` |

**触发原因**: `pages.ts:446` 的条件判断 `if (!checkout || !gitConfig?.gitlabApiUrl || !gitConfig.gitlabToken)` 将三种不同错误场景合并为一个 fallback 分支，统一返回 mock 数据（200），而非按场景返回 404/503 错误码。

**触发场景**:
- 用户访问一个没有 active checkout 的页面的文件树 → 应返回 404，实际返回 200 + mock 数据
- GitLab API 未配置 → 应返回 503，实际返回 200 + mock 数据

**风险内容**: 错误响应缺少 `error` 和 `message` 字段 (`typeof body.error === 'undefined'`)，前端无法区分"正常数据"和"降级数据"。

---

### 失败 #3: GET /api/pages/:pageId/files — 同类 fallback 问题 (1 个用例)

**文件**: `packages/backend/tests/contract/pages.files.test.ts`

| 用例 | 错误 |
|------|------|
| returns 503 when GitLab API is not configured | `expected 404 to be 503` |

**触发原因**: `pages.ts:516` 同样将 `!checkout` 和 `!gitConfig` 合并处理。当 GitLab 未配置但 checkout 存在时，返回的是 mock file 404（文件在 mock 中不存在），而非 503 服务不可用。

**触发场景**: GitLab API 未配置，用户尝试获取文件内容。

---

### 失败 #4: POST /api/pages/:pageId/checkout — 输入验证缺失 (2 个用例)

**文件**: `packages/backend/tests/contract/pages.checkout.test.ts`

| 用例 | 错误 |
|------|------|
| returns 400 when pageName is missing from body | `expected 200 to be 400` |
| returns 400 when gitlabRepoUrl is invalid | `expected 200 to be 400` |

**触发原因**: `CheckoutBodySchema` 中 `pageName` 和 `gitlabRepoUrl` 均标记为 `z.string().optional()`，且路由代码在 290 行用 `rawBody.pageName || pageId` 做了 fallback。这意味着即使 body 为空，也不会触发验证错误。

**触发场景**: 前端发送空的 checkout 请求体 `{}`，后端不拒绝而是默认使用 pageId 作为 pageName，并动态构建 gitlabRepoUrl。

**风险内容**: 这本身是设计选择（宽容输入），但测试期望严格验证，两者矛盾。

---

### 失败 #5: Integration checkout flow (2 个用例)

**文件**: `packages/backend/tests/integration/checkout.flow.test.ts`

| 用例 | 错误 |
|------|------|
| completes the full flow | `expected false to be true` |
| emits steps in the correct orchestration order | `expected 'failed' to be 'completed'` |

**触发原因**: 集成测试中 checkout 编排失败，最终状态为 `failed` 而非 `completed`。可能由于测试环境中 Docker/SSH 相关依赖不可用导致。

**触发场景**: 在没有 Docker daemon 或 SSH key 的 CI 环境中运行完整 checkout 流程。

---

## 三、空值/空指针问题检测

### [严重] 问题 NP-01: `request.user` 未初始化导致空指针

**位置**: `packages/backend/src/routes/pages.ts:200`

```typescript
const userId = request.user.id;
```

**触发原因**: `request.user` 由 `authMiddleware` 注入。如果中间件跳过逻辑出错（如路由配置错误导致 auth 中间件未执行），`request.user` 为 `undefined`，直接访问 `.id` 会抛出 `TypeError: Cannot read properties of undefined`。

**触发场景**: 路由注册时如果错误地将 `/pages` 加入 auth 跳过列表，所有 page 路由将在无 user 上下文的情况下执行。

**报错内容**:
```
TypeError: Cannot read properties of undefined (reading 'id')
    at GET /pages handler (pages.ts:200)
```

**风险等级**: 严重 — 生产环境中会导致 500 错误

---

### [严重] 问题 NP-02: `commitHash` 变量跨作用域引用未定义

**位置**: `packages/backend/src/services/ContainerLifecycle.ts:365`

```typescript
commitHash: commitHash ?? null,
```

**触发原因**: `commitHash` 仅在 `else` 分支（生产模式，第 325 行）中声明为 `let commitHash: string | undefined`。在 dev mock 分支中 `commitHash` 不存在。然而 finalize 步骤（第 365 行）在两个分支之外，引用了这个可能未定义的变量。

**触发场景**: 生产模式下 checkout 完成时，如果 `getHeadCommitHash` 失败（第 328 行 catch 块），`commitHash` 保持 `undefined`，写入数据库为 `null`。

**风险内容**: TypeScript 编译不会报错（`commitHash` 在外层作用域可见），但在 dev mode 分支执行时，`commitHash` 实际上是**未声明的变量**，会触发 `ReferenceError`。

**报错内容**:
```
ReferenceError: commitHash is not defined
    at orchestrateCheckout (ContainerLifecycle.ts:365)
```

**风险等级**: 严重 — dev 模式下每次 checkout 都会触发

---

### [高] 问题 NP-03: 前端 `res.data.content` 未做空值保护

**位置**: `packages/frontend/src/pages/IDEPage/Editor/index.tsx:65`

```typescript
setFileContents((prev) => ({ ...prev, [filePath]: res.data.content }));
originalContents.current[filePath] = res.data.content;
```

**触发原因**: API 返回值类型声明为 `{ content: string }`，但实际后端在多个场景下可能不返回 `content` 字段：
- 容器 File Manager 返回 `{ tree: [...] }` 而非 `{ content: ... }`
- GitLab API 返回 base64 编码内容，字段名为 `content` 但值需要解码
- 网络错误或 502 时 `res.data` 可能是 `{ error: ..., message: ... }`

**触发场景**: 用户打开一个实际不存在的文件路径、或容器未就绪时文件加载。

**风险内容**: `res.data.content` 为 `undefined` 时，Monaco Editor 收到 `undefined` 值，可能导致白屏或编辑器崩溃。

---

### [高] 问题 NP-04: `handleSaveAll` 保存空内容覆盖文件

**位置**: `packages/frontend/src/pages/IDEPage/index.tsx:113`

```typescript
files: unsaved.map((filePath) => ({ path: filePath, content: '' })),
```

**触发原因**: IDEPage 顶栏的保存按钮 `handleSaveAll` 对所有 unsaved 文件发送 **空字符串** 作为 content，而非从 `fileContents` 状态中读取实际内容。

**触发场景**: 用户在 IDE 页面顶栏点击"保存"按钮（而非编辑器内部的保存按钮）。

**风险内容**: 所有未保存的文件被覆盖为空内容，用户工作丢失。Editor 组件中的 `handleSaveAll`（第 112-137 行）实现正确地从 `fileContents` 读取内容，但 IDEPage 中的副本未同步。

**报错内容**: 无报错，但文件内容被静默清空。

**风险等级**: 高 — 数据丢失风险

---

### [高] 问题 NP-05: SSE 事件中 `code_suggestion` 字段名不一致

**位置**:
- 后端 `packages/container-services/src/ai-proxy/routes/chat.ts:134-137`
- 前端 `packages/frontend/src/pages/IDEPage/ChatPanel/index.tsx:158-164`

**后端发送**:
```typescript
sendEvent("code_suggestion", { file, diff: blockContent });
// 字段: file, diff
```

**前端解析**:
```typescript
const parsed = JSON.parse(data) as {
  type?: string;
  filePath?: string;    // ← 期望 filePath
  content?: string;     // ← 期望 content
  diff?: string;
};
if (parsed.type === 'code_suggestion') {
  onCodeSuggestion({
    filePath: parsed.filePath ?? '',  // ← 永远为 ''
    content: parsed.content ?? '',     // ← 永远为 ''
    diff: parsed.diff,
  });
}
```

**触发原因**: 后端 SSE event 中字段名为 `file`，前端期望 `filePath`；后端不发送 `content`，前端期望 `content`。同时前端使用 `parsed.type === 'code_suggestion'` 判断，但后端是通过 SSE event 名区分，不是 data 中的 type 字段。

**触发场景**: AI 助手生成代码建议时。

**风险内容**: `filePath` 始终为空字符串，`content` 始终为空字符串，导致 DiffBanner 显示空建议，apply 后会用空内容覆盖目标文件。

**风险等级**: 高 — 功能失效 + 潜在数据丢失

---

### [中] 问题 NP-06: `extractProjectPath` 对空字符串返回非预期结果

**位置**: `packages/backend/src/routes/pages.ts:882-897`

```typescript
function extractProjectPath(repoUrl: string): string | null {
  const sshMatch = repoUrl.match(/:(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return sshMatch[1]; // 可能是 undefined
  }
  // ...
}
```

**触发原因**: 当 `repoUrl` 为空字符串 `""` 时，`match` 返回 `null`，进入 `new URL("")` 分支，抛出 `TypeError: Invalid URL`，被 catch 捕获返回 `null`。这是安全的。但当 `repoUrl` 为类似 `":"` 的畸形字符串时，`sshMatch[1]` 为空字符串，返回 `""`，导致后续 GitLab API 调用使用空的 project path。

**触发场景**: systemConfig 中 `gitlabDomain` 配置错误，或 `buildGitlabRepoUrl` 拼接结果异常。

**风险内容**: GitLab API 收到 `%2F` 编码的空路径请求，返回 404 或 400。

---

### [中] 问题 NP-07: `getGitConfig()` 返回空字符串作为有效配置

**位置**: `packages/backend/src/routes/pages.ts:134`

```typescript
gitlabApiUrl: (value.gitlabApiUrl as string) ?? '',
gitlabToken: (value.gitlabToken as string) ?? '',
```

**触发原因**: 当数据库中 `git` 配置存在但 `gitlabApiUrl` 或 `gitlabToken` 为空字符串时，返回 `{ gitlabApiUrl: '', gitlabToken: '' }`。后续检查 `!gitConfig.gitlabApiUrl` 对空字符串为 `true`（进入 fallback），这是安全的。但如果值为 `" "` (空格)，则通过检查，导致发起请求到 `" /api/v4/projects/..."` 的无效 URL。

**触发场景**: 管理员在系统配置页面保存了含空格的 GitLab URL。

**风险内容**: `axios.get` 对无效 URL 抛出错误，被 catch 处理为 502，不会崩溃但用户体验差。

---

### [中] 问题 NP-08: 前端 `useSessionRecovery` 中 `activeCheckout.pageId` 可能为空

**位置**: `packages/frontend/src/hooks/useSessionRecovery.ts:54-58`

```typescript
const activeCheckout: ActiveCheckout = {
  pageId: rawCheckout.pageId,
  pageName: rawCheckout.pageName,
  branch: rawCheckout.gitBranch,
};
```

**触发原因**: 后端 `/auth/me` 返回的 `activeCheckout` 可能存在但 `pageId` 为 `null`（数据库记录异常），前端不做空值检查直接使用。

**触发场景**: 数据库中存在 `status='active'` 但 `pageId` 被意外清空的 checkout 记录。

**风险内容**: `navigate('/ide/null')` 导致路由到不存在的页面。

---

### [中] 问题 NP-09: `batchSave` 发送空 body 导致保存无效

**位置**: `packages/frontend/src/pages/IDEPage/StatusButton/index.tsx:166-173`

```typescript
const batchSave = useCallback(async () => {
  const response = await fetch(`/api/pages/${pageId}/container/files/batch-save`, {
    method: 'POST',
    // ...
    body: JSON.stringify({}),  // ← 空对象，没有 files 数组
  });
```

**触发原因**: StatusButton 中的 `batchSave` 发送空 body `{}`，后端 Zod schema 要求 `{ files: [{path, content}] }`，空 body 会触发验证错误。

**触发场景**: 用户在签入流程中选择"保存"再签入。

**风险内容**: Zod 验证失败返回 400，`batchSave` 抛出 `Error('批量保存失败 (HTTP 400)')`，签入流程中断。

---

### [中] 问题 NP-10: `localStorage.getItem('userInfo')` 返回畸形 JSON

**位置**: `packages/frontend/src/stores/authStore.ts:30-35`

```typescript
userInfo: (() => {
  try {
    const stored = localStorage.getItem('userInfo');
    return stored ? (JSON.parse(stored) as UserInfo) : null;
  } catch {
    return null;
  }
})(),
```

**触发原因**: 如果 localStorage 中存储了非法 JSON（如用户手动修改），`JSON.parse` 抛出异常，catch 返回 `null`，但 `isAuthenticated` 仍为 `true`（因为 token 存在）。

**触发场景**: token 有效但 userInfo 解析失败。

**风险内容**: `isAuthenticated = true` 但 `userInfo = null`，前端代码中多处使用 `userInfo.username`、`userInfo.role` 等会触发空指针：
- `Layout.tsx` 渲染用户头像时
- `routes.tsx` 中 `AdminRoute` 检查角色时

---

### [低] 问题 NP-11: `markdownToHtml` 对空字符串或 null 内容不安全

**位置**: `packages/frontend/src/pages/IDEPage/ChatPanel/index.tsx:26-48`

```typescript
function markdownToHtml(md: string): string {
  let html = md.replace(...)
```

**触发原因**: 如果 `message.content` 在流式传输中间状态为 `undefined`（ChatStore 的 `addStreamChunk` 理论上可以将 content 设为 undefined），传入 `markdownToHtml(undefined)` 会导致 `TypeError: Cannot read properties of undefined (reading 'replace')`。

**触发场景**: SSE 流中断、assistant 消息初始化时 content 为空。

---

### [低] 问题 NP-12: `dangerouslySetInnerHTML` 存在 XSS 风险

**位置**: `packages/frontend/src/pages/IDEPage/ChatPanel/index.tsx:370`

```typescript
dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }}
```

**触发原因**: `markdownToHtml` 仅对 code block 内部做了 HTML 转义，但对普通文本中的 `<script>` 标签、HTML 事件属性等未做过滤。如果 AI 模型返回含恶意 HTML 的内容，会直接注入 DOM。

**触发场景**: AI 助手返回含 HTML 标签的响应（可通过 prompt injection 触发）。

**风险内容**: 可执行任意 JavaScript，窃取 localStorage 中的 JWT token。

---

### [低] 问题 NP-13: 前端 401 拦截器中 `window.location.href` 强制跳转

**位置**: `packages/frontend/src/services/api.ts:29`

```typescript
window.location.href = '/login';
```

**触发原因**: 每个 401 响应都触发页面跳转，即使是并发请求。多个请求同时返回 401 时会触发多次 `logout()` 和页面跳转。

**触发场景**: Token 过期后，页面上有多个并发 API 请求（如健康检查 + 文件列表）同时返回 401。

**风险内容**: 多次执行 `logout()` 清理 localStorage，多次触发浏览器导航，可能导致状态异常。

---

## 四、前后端接口兼容性问题

### COMPAT-01: GET /api/pages 返回结构不一致

| | 期望 | 实际 |
|--|------|------|
| 测试用例 | 数组 `PageItem[]` | - |
| 后端实现 | - | `{ pages: PageItem[] }` |
| 前端处理 | 兼容两种: `Array.isArray(data) ? data : data.pages` | 安全 |

**结论**: 前端做了兼容处理，测试用例未适配。后端返回 `{ pages: [...] }` 是正确的。

### COMPAT-02: SSE 事件 step status 值不匹配

| | 后端发送 | 前端期望 |
|--|---------|---------|
| 步骤进行中 | `status: 'started'` | `status: 'in_progress'` |
| 步骤完成 | `status: 'completed'` | `status: 'completed'` |

**位置**: 后端 `ContainerLifecycle.ts:256` vs 前端 `StatusButton/index.tsx:126`

**影响**: 前端 `if (data.status === 'in_progress')` 永远不匹配，步骤进度条不会正确高亮当前步骤，但 `completed` 匹配正常所以最终结果不受影响。

### COMPAT-03: /auth/me activeCheckout 字段名差异

| 字段 | 后端返回 | 前端接收 (MeResponse 类型) |
|------|---------|--------------------------|
| 分支 | `gitBranch` | `gitBranch` (匹配) |
| containerId | 有返回 | `containerId?: string` (匹配) |
| id | 有返回 | 未声明但不使用 (安全) |

**结论**: 基本兼容。

### COMPAT-04: checkout lock 步骤未在前端步骤列表中

后端发送 `step: 'lock'` 事件，但前端 `CHECKOUT_STEPS` 列表不包含 `lock`。`findIndex` 返回 -1，条件 `stepIdx >= 0` 不满足，该事件被静默忽略。不会出错但用户看不到 lock 步骤的进度。

---

## 五、问题严重程度汇总

| 等级 | 数量 | 问题编号 |
|------|------|---------|
| 严重 | 2 | NP-01, NP-02 |
| 高 | 3 | NP-03, NP-04, NP-05 |
| 中 | 5 | NP-06, NP-07, NP-08, NP-09, NP-10 |
| 低 | 3 | NP-11, NP-12, NP-13 |
| 测试失败 | 15 | 详见第二节 |
| 接口兼容 | 4 | COMPAT-01 ~ COMPAT-04 |

---

## 六、修复优先级建议

### P0 (立即修复)
1. **NP-02**: `commitHash` 变量作用域问题 — dev 模式下每次 checkout 必崩
2. **NP-04**: IDEPage 顶栏保存发送空内容 — 会导致用户文件被清空

### P1 (尽快修复)
3. **NP-05**: SSE code_suggestion 字段名不一致 — AI 代码建议功能完全失效
4. **NP-09**: StatusButton batchSave 发送空 body — 签入保存流程失败
5. **NP-01**: 添加 `request.user` 空值防御 — 防止配置错误导致 500

### P2 (计划修复)
6. **NP-10**: localStorage userInfo 解析失败后的级联空指针
7. **NP-03**: Editor 文件内容加载空值保护
8. **NP-12**: markdownToHtml XSS 防护
9. **COMPAT-02**: SSE step status 值对齐
10. 修复 15 个失败的测试用例（主要是测试与实现的契约不一致）

---

*报告生成工具: Claude Code*
*检测方法: Vitest 测试执行 + 静态代码审查 + 前后端接口契约比对*
