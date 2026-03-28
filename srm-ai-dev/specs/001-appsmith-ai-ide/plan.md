# Implementation Plan: Appsmith AI-IDE Web 开发平台

**Branch**: `001-appsmith-ai-ide` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-appsmith-ai-ide/spec.md`

## Summary

构建 Appsmith AI-IDE Web 开发平台——一个以 Page 为单元的 AI 辅助编码平台。系统采用 pnpm monorepo 三包架构（frontend / backend / container-services），前端 React 18 + Monaco Editor 提供 IDE 编辑页面（含三态按钮切换只读/编辑模式），后端 Fastify + Prisma 管理 Page 签出/签入生命周期和 Docker 容器编排，容器内 Claude AI Proxy + File Manager 双服务提供 AI 对话和文件管理能力。AI Proxy 直接读取容器内 /workspace 目录（git clone 后的本地文件系统）获取完整仓库代码作为上下文，无需前端传递文件内容。Skill 系统支持模板参数、触发关键词和意图识别。

## Technical Context

**Language/Version**: TypeScript 严格模式 + Node.js 20 LTS
**Primary Dependencies**:
- 前端：React 18、Vite、Zustand、React Router v6、Monaco Editor、Axios + React Query、SSE (EventSource)、use-debounce（FR-038，300ms 防抖）
- 后端：Fastify、Prisma、dockerode、simple-git、jsonwebtoken、Zod、Pino、axios（用于调用第三方 Page 列表接口）
- 容器服务：Fastify、@anthropic-ai/sdk、PM2
**Storage**: PostgreSQL 16（Prisma ORM）
**Testing**: Vitest（单元 + 集成），契约测试需覆盖所有 API 边界
**Target Platform**: 内网 Linux 服务器（Docker 宿主机）+ 浏览器端
**Project Type**: Web 应用（前端 + 后端 + 容器服务）
**Performance Goals**: 签出 P95 < 60s；AI 对话 P95 < 15s；文件操作 P95 < 500ms；只读模式文件加载 P95 < 2s
**Constraints**: 最大并发容器 20 个（可配置）；单容器内存 ≤ 1GB（可配置）；内网部署，WebFetch/WebSearch 默认禁用
**Scale/Scope**: 20 并发用户，6 个主页面（登录、Page 列表、IDE 编辑、依赖库管理、Skill 管理、系统配置 + 容器运维）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
|------|------|------|
| 一、规格驱动开发 | ✅ 通过 | spec.md 已通过 10 轮审阅迭代，包含 11 个 User Story（P1-P3）、39 个 FR、10 个 SC |
| 二、测试优先开发 | ✅ 通过 | 计划要求 TDD：先写失败测试，再实现。测试目录分离为 unit/integration/contract |
| 三、模块化架构 | ✅ 通过 | 三包 monorepo（frontend/backend/container-services），模块间通过 REST/SSE 接口通信，无循环依赖 |
| 四、可观测性与结构化日志 | ✅ 通过 | 后端使用 Pino 结构化 JSON 日志，所有关键操作（签出/签入/容器生命周期/AI 对话）均需日志覆盖 |
| 五、简洁性与 YAGNI | ✅ 通过 | 严格遵循 spec 需求范围，不添加推测性功能。pnpm monorepo 为技术文档既定方案，非过度设计 |

**技术约束对齐**:
- ✅ TypeScript 严格模式
- ✅ ESM 模块（新代码不使用 CommonJS）
- ⚠️ 包管理器：技术文档指定 pnpm workspaces，宪章指定 npm。**决策：遵循技术文档使用 pnpm**（见 Complexity Tracking）
- ✅ ESLint + Prettier
- ✅ Conventional Commits

## Project Structure

### Documentation (this feature)

```text
specs/001-appsmith-ai-ide/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/           # Phase 1 输出
└── tasks.md             # Phase 2 输出（/speckit.tasks 生成）
```

### Source Code (repository root)

```text
appsmith-ai-ide/
├── packages/
│   ├── frontend/                    ← React 18 + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage/
│   │   │   │   ├── PageListPage/
│   │   │   │   ├── IDEPage/
│   │   │   │   │   ├── FileTree/
│   │   │   │   │   ├── Editor/
│   │   │   │   │   ├── ChatPanel/
│   │   │   │   │   ├── SkillDrawer/
│   │   │   │   │   ├── SkillTemplateModal/
│   │   │   │   │   └── StatusButton/
│   │   │   │   ├── DepsPage/
│   │   │   │   ├── SkillsPage/
│   │   │   │   ├── SystemConfigPage/
│   │   │   │   └── ContainerOpsPage/
│   │   │   ├── components/shared/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── stores/
│   │   └── tests/
│   │       ├── unit/
│   │       └── integration/
│   ├── backend/                     ← Node.js 20 + Fastify + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── pages.ts          ← 含 GitLab 代理接口（/pages/:pageId/tree, /pages/:pageId/files）
│   │   │   │   ├── skills.ts
│   │   │   │   ├── deps.ts
│   │   │   │   ├── containers.ts
│   │   │   │   └── systemConfig.ts
│   │   │   ├── services/
│   │   │   │   ├── DockerService.ts
│   │   │   │   ├── GitService.ts
│   │   │   │   ├── ContainerLifecycle.ts
│   │   │   │   ├── DepsLoader.ts
│   │   │   │   └── SshKeyService.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   └── errorHandler.ts
│   │   │   └── lib/
│   │   │       └── prisma.ts
│   │   └── tests/
│   │       ├── unit/
│   │       ├── integration/
│   │       └── contract/
│   └── container-services/          ← Docker 容器内双服务
│       ├── src/
│       │   ├── ai-proxy/
│       │   │   ├── routes/
│       │   │   └── services/
│       │   └── file-manager/
│       │       ├── routes/
│       │       └── services/
│       └── tests/
│           ├── unit/
│           └── integration/
├── docker/
│   ├── Dockerfile.container
│   ├── docker-compose.dev.yml
│   └── pm2.config.js
├── scripts/
│   └── setup.sh
├── .nvmrc
├── pnpm-workspace.yaml
├── package.json
├── .eslintrc.cjs
├── .prettierrc
└── tsconfig.base.json
```

**Structure Decision**: 采用 pnpm workspaces monorepo 三包结构，与技术文档 V5.0 完全对齐。前端 / 后端 / 容器服务独立构建、独立测试，通过 REST/SSE 接口通信。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| pnpm 替代 npm（宪章指定 npm） | 技术文档 V5.0 明确使用 pnpm workspaces 管理 monorepo 三包结构 | npm workspaces 在 monorepo 场景下的依赖提升和磁盘效率不如 pnpm；且技术文档已做出此决策，变更将导致与既有文档不一致 |
| 三个独立子包（frontend / backend / container-services） | 容器服务在 Docker 镜像内独立运行，与后端管理服务部署环境完全隔离 | 合并为两包会导致容器镜像包含不必要的后端管理代码，增大镜像体积并引入安全风险 |
| 第三方接口提供 Page 列表（替代独立 Page 表） | 客户侧已有 GitLab/Appsmith 管理服务维护 Page 元数据，本项目作为消费方 | 在本项目中维护 Page 表需要独立的 Page CRUD 管理界面，增加不必要的功能范围；且与第三方系统存在数据双写风险 |
