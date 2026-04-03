---
type: glossary
last_updated: 2026-04-03
generated_by: claude-code
prompt: docs/prompts/AI_SCAN_PROMPT.md
related: [ARCHITECTURE.md]
reviewed_by: pending
ai_instruction: 遇到不认识的业务词汇先查此表
---

# 领域术语表

| 术语 | 含义 | 代码对应 | 备注 |
|------|------|----------|------|
| Checkout / 签出 | 用户获取页面开发权，系统创建隔离容器，克隆代码仓库 | `Checkout` 实体, `ContainerLifecycle.checkout()` | 同一页面同一时间只能被一人签出 |
| Checkin / 签入 | 用户完成开发，提交代码并销毁容器，释放页面开发权 | `ContainerLifecycle.checkin()` | 包含 git commit + push + 容器销毁 |
| Page / 页面 | 一个独立的开发单元，对应一个 Git 仓库 | `Page` 实体, `PageResource` | 类型分为 appsmith 和 normal |
| Skill / 技能 | AI 辅助代码能力的模板，包含提示词和输入字段定义 | `Skill` 实体, `SkillResource` | 可启用/禁用，有版本管理 |
| Skill Field / 技能字段 | 技能的输入参数定义，用于构建用户输入表单 | `SkillField` 实体 | 支持 text、select、number 等类型 |
| Dependency / 依赖 | 可动态注入到开发容器中的外部库或工具 | `Dependency` 实体, `DepsLoader` | 在容器创建时自动加载 |
| Container / 容器 | 为每次签出动态创建的 Docker 隔离开发环境 | `DockerService` | 基于 appsmith-ai-ide-container 镜像 |
| Edit Lock / 编辑锁 | Appsmith 页面的外部互斥锁，防止同时编辑 | `EditLockService` | 通过 script-engine API 获取和释放 |
| Session / 会话 | 签出过程中分配的唯一会话标识，用于前端连接容器 | `Checkout.sessionId` | 容器内服务通过此 ID 通信 |
| SSE | Server-Sent Events，用于签出流程的实时进度推送 | `PageResource.checkout()` | 前端通过 EventSource 监听 |
| RequestContext | CDI 请求作用域 Bean，承载当前认证用户信息 | `RequestContext` | AuthFilter 验证后注入 |
| AdminOnly | 自定义注解，标记仅管理员可访问的端点 | `@AdminOnly` 注解 + `AdminFilter` | 非管理员访问返回 403 |
| Appsmith | 低代码应用开发平台，本 IDE 主要服务的目标平台 | 多处配置和集成代码 | 支持页面编辑和 JS 对象同步 |
| Redux Node Service | 用于 Appsmith Redux 操作的 Node.js 辅助服务 | redux-node-service/ | 挂载到开发容器内 |
| AI Agent / AI 代理 | 接收 AI 对话请求的代理服务（Claude API） | container-services/ | 容器内通过 HTTP 调用 |
| Force Checkin / 强制签入 | 管理员强制收回已签出的页面，不提交代码 | `ContainerResource.forceCheckin()` | 仅管理员可操作 |
| Force Destroy / 强制销毁 | 管理员强制销毁容器，不走签入流程 | `ContainerResource.forceDestroy()` | 仅管理员可操作 |
| System Config / 系统配置 | 存储在数据库中的动态配置项，运行时可修改 | `SystemConfig` 实体, `SystemConfigService` | 缓存在内存中 |
| Flyway | 数据库迁移工具，管理 SQL 版本升级 | db/migration/ | 启动时自动执行 |
| Panache | Quarkus 的 ORM 扩展，简化 Hibernate 操作 | 所有实体类继承 `PanacheEntityBase` | Active Record 模式 |
