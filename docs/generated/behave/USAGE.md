---
type: usage
last_updated: 2026-04-03
generated_by: claude-code
prompt: docs/prompts/AI_BEHAVIOR_SCAN_PROMPT.md
related: [../struct/CONVENTIONS.md, CALLGRAPH.md, ../struct/API.md]
reviewed_by: pending
ai_instruction: 调用任何核心模块或函数前先查此文件
---

# 模块使用说明

> 标注说明：⚠ = 需注意，🔴 = 危险/不可逆，✅ = 推荐写法，❌ = 禁止写法

---

## ContainerLifecycle (`service/ContainerLifecycle.java`)

**职责：** 编排容器签出和签入的完整生命周期
**运行环境：** Quarkus 后端
**状态：** 有状态（依赖 CheckoutPersistService 中的数据库记录）

### `checkout(Page page, User user): CheckoutResult`

**用途：** 为用户创建隔离开发容器，克隆代码，加载依赖

**副作用：**
- [x] 数据库写入（INSERT checkout 记录）
- [x] 外部 HTTP 请求（编辑锁 API）
- [x] Docker 容器创建
- [ ] 无副作用

⚠ 该函数是一个多步骤编排操作，中间失败会导致资源泄漏（容器未销毁、锁未释放）

**✅ 正确用法：**
```java
// 通过 PageResource 的 SSE 端点间接调用
@POST @Path("/{pageId}/checkout")
@Produces(MediaType.SERVER_SENT_EVENTS)
public Multi<SseEvent> checkout(@PathParam("pageId") String pageId) { ... }
```

**❌ 错误用法（AI 禁止）：**
```java
// 不要直接调用 checkout 而不处理异常和资源清理
containerLifecycle.checkout(page, user); // 如果失败，容器和锁可能泄漏
```

### `checkin(Page page, User user, String commitMessage): CheckinResult` 🔴

**用途：** 提交代码、推送远程、销毁容器、释放锁

**副作用：**
- [x] 数据库写入（UPDATE checkout 状态）
- [x] Git push（代码推送到远程仓库，不可逆）
- [x] Docker 容器销毁（不可逆）
- [x] 外部 HTTP 请求（释放编辑锁）

🔴 该操作不可逆：一旦容器销毁，容器内未提交的修改将丢失

---

## DockerService (`service/DockerService.java`)

**职责：** Docker 容器操作的封装层
**运行环境：** Quarkus 后端
**状态：** 无状态

### `createContainer(String imageName, ContainerConfig config): String`

**用途：** 创建新的 Docker 容器

**副作用：**
- [x] Docker 资源创建
- [ ] 数据库写入
- [ ] 无副作用

### `execInContainer(String containerId, String... command): ExecResult`

**用途：** 在容器内执行命令

**副作用：**
- [x] 容器内文件系统操作
- [ ] 数据库写入

⚠ 注意命令注入风险，不要拼接用户输入到命令中

### `destroyContainer(String containerId): void` 🔴

**用途：** 停止并删除容器

**副作用：**
- [x] Docker 容器销毁（不可逆）

---

## GitService (`service/GitService.java`)

**职责：** JGit 封装，处理仓库克隆和推送
**运行环境：** Quarkus 后端
**状态：** 无状态

### `cloneRepo(String containerId, String repoUrl, String branch): void`

**用途：** 在容器内通过 SSH 克隆 Git 仓库

**副作用：**
- [x] 容器内文件系统操作
- [x] SSH 网络连接（Git 仓库）

### `commitAndPush(String containerId, String message): String` 🔴

**用途：** 在容器内执行 git add、commit、push

**副作用：**
- [x] Git 远程推送（不可逆）

⚠ 检测 non-fast-forward 推送失败，但不自动解决冲突

---

## AuthFilter (`filter/AuthFilter.java`)

**职责：** 拦截所有请求，验证 JWT Token
**运行环境：** Quarkus 后端
**状态：** 无状态

### `filter(ContainerRequestContext ctx): void`

**用途：** 从 Authorization header 提取 JWT，验证签名和过期，注入 RequestContext

**副作用：**
- [ ] 无副作用（只读验证）

**跳过验证的路径：** `/auth/login`, `/health`, `/q/`

---

## EditLockService (`service/EditLockService.java`)

**职责：** 与外部 script-engine 服务通信，管理 Appsmith 页面编辑锁
**运行环境：** Quarkus 后端
**状态：** 无状态

### `acquireLock(String pageId): boolean`

**用途：** 获取页面编辑锁

**副作用：**
- [x] 外部 HTTP 请求

### `releaseLock(String pageId): void`

**用途：** 释放页面编辑锁

**副作用：**
- [x] 外部 HTTP 请求

---

## DepsLoader (`service/DepsLoader.java`)

**职责：** 将数据库中的依赖加载到容器内
**运行环境：** Quarkus 后端
**状态：** 无状态

### `loadAll(String containerId): void`

**用途：** 查询所有依赖并注入到容器

**副作用：**
- [x] 数据库读取
- [x] 容器内文件系统操作

---

## 前端 Stores

### authStore (`stores/authStore.ts`)

**职责：** 管理用户认证状态和 JWT token
**运行环境：** 浏览器
**状态：** 有状态（Zustand）

**✅ 正确用法：**
```typescript
const { token, user, login, logout } = useAuthStore();
```

### pageStore (`stores/pageStore.ts`)

**职责：** 管理页面列表和当前选中页面
**运行环境：** 浏览器
**状态：** 有状态（Zustand）

### editorStore (`stores/editorStore.ts`)

**职责：** 管理 Monaco 编辑器的内容和状态
**运行环境：** 浏览器
**状态：** 有状态（Zustand）

---

## 前端 API 客户端 (`services/api.ts`)

**职责：** Axios 实例封装，自动注入 JWT，处理 401 重定向
**运行环境：** 浏览器
**状态：** 无状态

⚠ 所有 API 请求都通过此模块发送，修改会影响全局

**✅ 正确用法：**
```typescript
import api from '@/services/api';
const { data } = await api.get('/pages');
```

**❌ 错误用法（AI 禁止）：**
```typescript
// 不要直接使用 axios，绕过了认证拦截器
import axios from 'axios';
axios.get('/api/ide/pages'); // 缺少 JWT token
```
