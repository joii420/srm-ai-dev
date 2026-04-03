---
project: appsmith-ai-ide
version: unknown
updated: 2026-04-03
stack: [java, quarkus, react, typescript, postgresql, docker]
ai_context_files:
  - docs/generated/struct/ARCHITECTURE.md
  - docs/generated/struct/CONVENTIONS.md
  - docs/generated/struct/API.md
  - docs/generated/struct/SCHEMA.md
  - docs/generated/struct/GLOSSARY.md
  - docs/generated/struct/BOUNDARIES.md
  - docs/generated/struct/DECISIONS.md
---

# Appsmith AI IDE

## 一句话描述
基于容器化的 Web IDE 平台，为 Appsmith 应用提供多用户开发环境，支持 AI 辅助编码、签入签出工作流和 Git 集成。

## 技术栈
| 类别 | 技术 |
|------|------|
| 语言 | Java 17, TypeScript 5.4 |
| 框架 | Quarkus 3.23.3 (后端), React 18.3 + Vite 5.2 (前端) |
| 数据库 | PostgreSQL 16 (Flyway 迁移 + Hibernate ORM with Panache) |
| 缓存 | 无 |
| 部署 | Docker Compose + Nginx 反向代理 |

## 快速定位（AI 必读）

| 任务类型 | 对应路径 | 参考文件 |
|----------|----------|----------|
| 修改 UI | srm-ai-dev/appsmith-ai-ide/packages/frontend/src/ | docs/generated/struct/CONVENTIONS.md |
| 修改 API | srm-ai-dev/appsmith-ai-ide/packages/backend-java/src/main/java/com/appsmith/aiide/resource/ | docs/generated/struct/API.md |
| 修改数据库 | srm-ai-dev/appsmith-ai-ide/packages/backend-java/src/main/resources/db/migration/ | docs/generated/struct/SCHEMA.md |
| 理解架构 | — | docs/generated/struct/ARCHITECTURE.md |

## 常用命令
```bash
# 开发 - 后端
cd srm-ai-dev/appsmith-ai-ide/packages/backend-java
mvn quarkus:dev

# 开发 - 前端
cd srm-ai-dev/appsmith-ai-ide/packages/frontend
pnpm install && pnpm dev

# Docker 全栈启动
cd srm-ai-dev/appsmith-ai-ide/deploy
docker compose up -d --build

# 测试 - 前端
cd srm-ai-dev/appsmith-ai-ide/packages/frontend
pnpm test
```

## 包管理器
- 后端: Maven (pom.xml)
- 前端: pnpm (pnpm-workspace.yaml)

## 重要约定
- 所有 REST API 路径前缀为 `/api/ide/`
- JWT 认证使用 HMAC-SHA256，通过 `Authorization: Bearer` 头传递
- 详细规范见 `docs/generated/struct/CONVENTIONS.md`

## 文档生成命令
| 命令 | 说明 |
|------|------|
| `/scan-struct` | 结构扫描，生成/更新 docs/generated/struct/ |
| `/scan-behave` | 行为分析，生成/更新 docs/generated/behave/ |
| `/gen-product-docs` | 生成产品文档（PRODUCT、API_GUIDE、RUNBOOK） |
| `/regen-all-docs` | 按顺序执行完整的三阶段文档重新生成流水线 |
