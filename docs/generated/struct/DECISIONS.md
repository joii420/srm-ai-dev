---
type: decisions
last_updated: 2026-04-03
generated_by: claude-code
prompt: docs/prompts/AI_SCAN_PROMPT.md
related: [ARCHITECTURE.md]
reviewed_by: pending
---

# 技术决策记录

> AI 注意：以下决策已经确定，不要在代码建议中推翻这些选择。

## 后端框架选择 Quarkus
- **时间**: [未知]
- **决策**: 使用 Quarkus 3.x 作为 Java 后端框架，而非 Spring Boot
- **原因**: Quarkus 原生支持 GraalVM、启动速度快、内存占用低，适合容器化部署场景
- **影响**: 依赖注入使用 CDI（非 Spring IoC），REST 使用 RESTEasy Reactive，ORM 使用 Panache

## 状态管理选择 Zustand
- **时间**: [未知]
- **决策**: 前端状态管理使用 Zustand，而非 Redux
- **原因**: 项目已有 Redux Node Service 用于 Appsmith 集成，IDE 前端本身选择轻量级方案避免混淆
- **影响**: 状态存储以 Store 为单位划分（authStore, pageStore, editorStore 等），无 Redux 样板代码

## 容器化隔离开发模式
- **时间**: [未知]
- **决策**: 每次签出为用户创建独立 Docker 容器作为开发环境
- **原因**: 实现用户间完全隔离，避免代码冲突，确保环境一致性
- **影响**: 需要管理容器生命周期、资源限制、并发数控制，增加了 DockerService 和 ContainerLifecycle 复杂度

## JWT 认证方案
- **时间**: [未知]
- **决策**: 使用 HMAC-SHA256 签名的 JWT 进行无状态认证
- **原因**: 后端无需维护会话状态，适合分布式部署；容器内服务也需要验证用户身份
- **影响**: token 有效期 8 小时，前端存储在 localStorage，401 时自动重定向登录

## 签出使用 SSE 推送进度
- **时间**: [未知]
- **决策**: 签出流程使用 Server-Sent Events 实时推送步骤进度
- **原因**: 签出涉及容器创建、Git 克隆、依赖加载等多步耗时操作，需要向用户展示实时进度
- **影响**: 前端使用 EventSource 监听，后端使用 RestMulti/SSE 流式返回

## 数据库迁移使用 Flyway
- **时间**: [未知]
- **决策**: Java 后端使用 Flyway 管理数据库迁移，启动时自动执行
- **原因**: 与 Quarkus 原生集成，版本化管理 SQL 变更，部署时无需手动执行迁移
- **影响**: 所有 schema 变更必须通过 V{版本号}__{描述}.sql 文件添加，禁止手动修改数据库

## Git 操作使用 JGit + SSH
- **时间**: [未知]
- **决策**: 容器内 Git 操作通过 JGit 库执行，认证使用 SSH 密钥
- **原因**: JGit 提供纯 Java 实现，无需容器内安装 Git CLI；SSH 密钥方式安全性高于 token
- **影响**: SSH 密钥需要加密存储和容器注入，增加了 SshKeyService 的复杂度

## 角色模型选择两级制
- **时间**: [未知]
- **决策**: 用户角色仅分 admin 和 developer 两级
- **原因**: 当前业务场景简单，管理员负责系统配置和容器管理，开发者负责页面开发
- **影响**: 权限控制通过 @AdminOnly 注解 + AdminFilter 实现，无需复杂的 RBAC
