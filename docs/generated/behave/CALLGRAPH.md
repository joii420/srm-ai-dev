---
type: callgraph
last_updated: 2026-04-03
generated_by: claude-code
prompt: docs/prompts/AI_BEHAVIOR_SCAN_PROMPT.md
related: [FLOWS.md, USAGE.md, ../struct/ARCHITECTURE.md]
reviewed_by: pending
ai_instruction: 修改任何核心函数前，先查此文件确认影响范围
---

# 关键调用链

> 格式说明：
> `───` 表示同步调用
> `↷` 表示异步调用
> `[DB]` 表示数据库操作
> `[EXT]` 表示外部服务/硬件
> `⚠` 表示副作用节点
> `🔴` 表示高风险节点

---

## 入口 → 执行链路

### 1. 登录链路

```text
POST /api/ide/auth/login
  ─── AuthResource.login()                           resource/AuthResource.java
       ─── HTTP POST 外部认证                         [EXT] 可选
       ─── User.upsert()                             [DB] users 表
       ─── JwtConfig.generateToken()                  config/JwtConfig.java
  ─── return {token, user}
```

### 2. 签出链路（核心） 🔴

```text
POST /api/ide/pages/{id}/checkout (SSE)
  ─── PageResource.checkout()                         resource/PageResource.java
       ─── ContainerLifecycle.checkout()              service/ContainerLifecycle.java
            ─── CheckoutPersistService.findActive()   [DB] checkouts 表
            ─── EditLockService.acquireLock()          [EXT] ⚠ script-engine
            ─── DockerService.createContainer()        [EXT] ⚠ Docker API
            ─── DockerService.injectSshKey()           [EXT] Docker exec
                 ─── SshKeyService.decrypt()           config/SshKeyService.java
            ─── GitService.cloneRepo()                 [EXT] ⚠ Git SSH
            ─── DepsLoader.loadAll()                   [DB] + [EXT] Docker exec
            ─── DockerService.healthCheck()            [EXT] Docker exec
            ─── CheckoutPersistService.create()        [DB] ⚠ INSERT checkout
  ─── SSE: {event: complete}
```

### 3. 签入链路（核心） 🔴

```text
POST /api/ide/pages/{id}/checkin
  ─── PageResource.checkin()                          resource/PageResource.java
       ─── ContainerLifecycle.checkin()               service/ContainerLifecycle.java
            ─── CheckoutPersistService.findActive()   [DB] checkouts 表
            ─── DockerService.ensureSshKey()           [EXT] Docker exec
            ─── DockerService.fixGitRemoteUrl()        [EXT] Docker exec
            ─── GitService.commitAndPush()             [EXT] 🔴 Git push (不可逆)
            ─── DockerService.destroyContainer()       [EXT] 🔴 容器销毁 (不可逆)
            ─── EditLockService.releaseLock()          [EXT] ⚠ script-engine
            ─── CheckoutPersistService.complete()      [DB] ⚠ UPDATE checkout
  ─── return {success, commitHash}
```

### 4. 请求认证链路

```text
任意 HTTP 请求 (非白名单路径)
  ─── AuthFilter.filter()                             filter/AuthFilter.java
       ─── JwtConfig.verifyToken()                    config/JwtConfig.java
       ─── RequestContext.set(userId, role, username)  http/RequestContext.java
  ─── 继续执行目标 Resource
  ─── [可选] AdminFilter.filter()                     filter/AdminFilter.java
       ─── 检查 @AdminOnly 注解
       ─── 验证 role == "admin"
```

### 5. 页面创建链路

```text
POST /api/ide/pages/create
  ─── PageResource.create()                           resource/PageResource.java
       ─── Page.find("name", name)                    [DB] 唯一性检查
       ─── SystemConfigService.get("gitlab.repo-prefix")  [DB] 配置读取
       ─── [可选] HTTP GET GitLab API                  [EXT] 仓库验证
       ─── Page.persist()                              [DB] ⚠ INSERT page
  ─── return PageDto
```

### 6. 依赖刷新链路

```text
POST /api/ide/deps/{id}/refresh
  ─── DependencyResource.refresh()                    resource/DependencyResource.java
       ─── Dependency.findById(id)                     [DB]
       ─── DepsLoader.reload(dependency)               service/DepsLoader.java
            ─── [遍历活跃容器] DockerService.exec()    [EXT] Docker exec
       ─── Dependency.update(lastLoaded)               [DB] ⚠ UPDATE
  ─── return 200 OK
```

---

## 反向依赖索引

| 函数 | 文件路径 | 被哪些文件调用 | 影响等级 |
|------|----------|---------------|----------|
| JwtConfig.generateToken() | config/JwtConfig.java | AuthResource | 低 |
| JwtConfig.verifyToken() | config/JwtConfig.java | AuthFilter | 高 |
| RequestContext.set() | http/RequestContext.java | AuthFilter | 高 |
| RequestContext.getUserId() | http/RequestContext.java | 所有 Resource | 高 |
| DockerService.createContainer() | service/DockerService.java | ContainerLifecycle | 高 |
| DockerService.destroyContainer() | service/DockerService.java | ContainerLifecycle, ContainerResource | 高 |
| DockerService.execInContainer() | service/DockerService.java | GitService, DepsLoader, ContainerLifecycle | 高 |
| GitService.cloneRepo() | service/GitService.java | ContainerLifecycle | 中 |
| GitService.commitAndPush() | service/GitService.java | ContainerLifecycle | 高 |
| SshKeyService.decrypt() | config/SshKeyService.java | DockerService (injectSshKey) | 中 |
| EditLockService.acquireLock() | service/EditLockService.java | ContainerLifecycle | 中 |
| EditLockService.releaseLock() | service/EditLockService.java | ContainerLifecycle | 中 |
| CheckoutPersistService.findActive() | service/CheckoutPersistService.java | ContainerLifecycle, PageResource | 中 |
| SystemConfigService.get() | service/SystemConfigService.java | PageResource, GitService, AppConfig | 中 |
| DepsLoader.loadAll() | service/DepsLoader.java | ContainerLifecycle | 中 |

---

## 高风险修改区域

| 级别 | 函数/模块 | 原因 | 修改前必须 |
|------|----------|------|-----------|
| 🔴 极高 | ContainerLifecycle | 编排签入签出全流程，涉及容器、Git、锁等多个外部资源 | 人工审查 + 完整测试 |
| 🔴 极高 | AuthFilter / JwtConfig | 认证核心，改动可能导致认证绕过或全站不可用 | 安全审查 |
| 🔴 极高 | DockerService.destroyContainer() | 不可逆操作，销毁容器及内部所有数据 | 确认影响范围 |
| 🔴 极高 | GitService.commitAndPush() | 不可逆操作，代码推送到远程仓库 | 确认影响范围 |
| ⚠ 高 | SshKeyService | SSH 密钥加解密，涉及安全和 Git 认证 | 安全审查 |
| ⚠ 高 | EditLockService | 外部服务集成，失败可能导致锁泄漏 | 确认错误处理 |
| ⚠ 高 | RequestContext | 请求作用域用户上下文，被所有 Resource 依赖 | 确认线程安全 |
| ⚠ 高 | SystemConfigService | 动态配置缓存，影响 Git URL、容器配置等核心参数 | 确认缓存一致性 |
