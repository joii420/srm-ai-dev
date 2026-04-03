---
type: flows
last_updated: 2026-04-03
generated_by: claude-code
prompt: docs/prompts/AI_BEHAVIOR_SCAN_PROMPT.md
related: [USAGE.md, CALLGRAPH.md, ../struct/ARCHITECTURE.md]
reviewed_by: pending
ai_instruction: 理解任何功能的实现路径前，先查此文件确认完整链路
---

# 核心业务流程

> 分析来源：入口函数、控制器、服务层代码
> 图例：实线 = 同步调用，虚线 = 异步/事件，[DB] = 数据库操作，[EXT] = 外部服务

---

## 1. 用户登录流程
> 触发入口：POST /api/ide/auth/login
> 影响数据：users 表（upsert）
> 副作用：无

```mermaid
sequenceDiagram
  autonumber
  participant C as 浏览器
  participant H as AuthResource
  participant S as 外部认证API
  participant D as PostgreSQL

  C->>+H: POST /auth/login {username, password}
  alt 配置了外部认证
    H->>+S: HTTP POST 外部认证接口
    S-->>-H: 认证结果 + 角色信息
  else Dev 模式
    H->>H: password == "dev" 直接通过
  end
  H->>+D: upsert User (by externalUserId)
  D-->>-H: User 实体
  H->>H: JwtConfig.generateToken(userId, role, username)
  H-->>-C: {token, user}
```

**关键节点说明：**
| 步骤 | 函数 | 文件路径 | 备注 |
|------|------|----------|------|
| 1 | login() | resource/AuthResource.java | 入口端点 |
| 2 | HTTP POST | config/AppConfig.java | 外部认证 URL 可配置 |
| 3 | generateToken() | config/JwtConfig.java | HMAC-SHA256, 8小时过期 |

---

## 2. 页面签出流程（核心）
> 触发入口：POST /api/ide/pages/{pageId}/checkout
> 影响数据：checkouts 表（INSERT）
> 副作用：创建 Docker 容器、Git 克隆仓库、注入 SSH 密钥、加载依赖、获取编辑锁

```mermaid
sequenceDiagram
  autonumber
  participant C as 浏览器(SSE)
  participant H as PageResource
  participant CL as ContainerLifecycle
  participant DS as DockerService
  participant GS as GitService
  participant EL as EditLockService
  participant DL as DepsLoader
  participant D as PostgreSQL

  C->>+H: POST /pages/{id}/checkout (SSE)
  H->>+CL: checkout(page, user)
  CL->>+D: 检查页面是否已签出
  D-->>-CL: 签出状态
  CL->>+EL: acquireLock(pageId)
  EL-->>-CL: 锁定成功
  CL->>CL: 检查并发容器数限制
  CL->>+DS: createContainer(image, config)
  DS-->>-CL: containerId
  CL->>+DS: injectSshKey(containerId)
  DS-->>-CL: done
  CL->>+GS: cloneRepo(containerId, repoUrl, branch)
  GS-->>-CL: done
  CL->>+DL: loadDependencies(containerId)
  DL-->>-CL: done
  CL->>+DS: healthCheck(containerId)
  DS-->>-CL: healthy
  CL->>+D: INSERT checkout record
  D-->>-CL: Checkout 实体
  CL-->>-H: CheckoutResult
  H-->>-C: SSE: {event: complete, sessionId}
```

**关键节点说明：**
| 步骤 | 函数 | 文件路径 | 备注 |
|------|------|----------|------|
| 2 | checkout() | service/ContainerLifecycle.java | 编排核心 |
| 5 | acquireLock() | service/EditLockService.java | [EXT] script-engine API |
| 7 | createContainer() | service/DockerService.java | Docker API 调用 |
| 9 | cloneRepo() | service/GitService.java | JGit SSH 克隆 |
| 10 | loadDependencies() | service/DepsLoader.java | 注入所有依赖到容器 |

---

## 3. 页面签入流程
> 触发入口：POST /api/ide/pages/{pageId}/checkin
> 影响数据：checkouts 表（UPDATE status=completed）
> 副作用：Git commit + push、销毁 Docker 容器、释放编辑锁

```mermaid
sequenceDiagram
  autonumber
  participant C as 浏览器
  participant H as PageResource
  participant CL as ContainerLifecycle
  participant DS as DockerService
  participant GS as GitService
  participant EL as EditLockService
  participant D as PostgreSQL

  C->>+H: POST /pages/{id}/checkin {commitMessage}
  H->>+CL: checkin(page, user, commitMessage)
  CL->>+D: 查找 active checkout
  D-->>-CL: Checkout 实体
  CL->>+DS: ensureSshKey(containerId)
  DS-->>-CL: done
  CL->>+DS: fixGitRemoteUrl(containerId)
  DS-->>-CL: done
  CL->>+GS: commitAndPush(containerId, message)
  GS-->>-CL: commitHash
  CL->>+DS: destroyContainer(containerId)
  DS-->>-CL: done
  CL->>+EL: releaseLock(pageId)
  EL-->>-CL: 解锁成功
  CL->>+D: UPDATE checkout (status=completed, commitHash)
  D-->>-CL: done
  CL-->>-H: CheckinResult
  H-->>-C: {success, commitHash}
```

**关键节点说明：**
| 步骤 | 函数 | 文件路径 | 备注 |
|------|------|----------|------|
| 2 | checkin() | service/ContainerLifecycle.java | 编排核心 |
| 6 | fixGitRemoteUrl() | service/DockerService.java | 处理 token/SSH 认证切换 |
| 7 | commitAndPush() | service/GitService.java | 检测 non-fast-forward 冲突 |
| 8 | destroyContainer() | service/DockerService.java | Docker API 销毁 |

---

## 4. 页面创建流程
> 触发入口：POST /api/ide/pages/create
> 影响数据：pages 表（INSERT）
> 副作用：GitLab API 验证仓库存在性（Appsmith 类型）

```mermaid
sequenceDiagram
  autonumber
  participant C as 浏览器
  participant H as PageResource
  participant D as PostgreSQL
  participant G as GitLab API

  C->>+H: POST /pages/create {name, type, branch, ...}
  H->>+D: 检查 name 唯一性
  D-->>-H: 不存在
  H->>H: 构建 Git 仓库 URL (repo-prefix + name)
  alt type == appsmith
    H->>+G: 验证远程仓库存在
    G-->>-H: 仓库信息
  end
  H->>+D: INSERT Page
  D-->>-H: Page 实体
  H-->>-C: PageDto
```

---

## 5. 依赖加载流程
> 触发入口：容器签出时自动执行 / POST /api/ide/deps/{id}/refresh
> 影响数据：dependencies 表（UPDATE last_loaded）
> 副作用：向 Docker 容器内克隆/复制依赖

```mermaid
sequenceDiagram
  autonumber
  participant DL as DepsLoader
  participant D as PostgreSQL
  participant DS as DockerService
  participant Container as Docker容器

  DL->>+D: 查询所有 dependencies
  D-->>-DL: 依赖列表
  loop 每个依赖
    DL->>+DS: exec(containerId, "git clone {url}")
    DS->>+Container: docker exec
    Container-->>-DS: 结果
    DS-->>-DL: done
    DL->>+D: UPDATE last_loaded
    D-->>-DL: done
  end
```

---

## 6. 管理员强制操作流程
> 触发入口：POST /api/ide/containers/{id}/force-checkin 或 force-destroy
> 影响数据：checkouts 表（UPDATE status）
> 副作用：销毁 Docker 容器、释放编辑锁

```mermaid
sequenceDiagram
  autonumber
  participant A as 管理员
  participant H as ContainerResource
  participant CL as ContainerLifecycle
  participant DS as DockerService
  participant D as PostgreSQL

  A->>+H: POST /containers/{id}/force-checkin
  H->>H: 验证 @AdminOnly
  H->>+CL: forceCheckin(checkoutId)
  CL->>+DS: destroyContainer(containerId)
  DS-->>-CL: done
  CL->>+D: UPDATE checkout (status=force-checked-in)
  D-->>-CL: done
  CL-->>-H: done
  H-->>-A: 200 OK
```
