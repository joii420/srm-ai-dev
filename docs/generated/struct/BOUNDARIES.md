---
type: boundaries
last_updated: 2026-04-03
generated_by: claude-code
prompt: docs/prompts/AI_SCAN_PROMPT.md
related: [CONVENTIONS.md, API.md]
reviewed_by: pending
ai_instruction: 执行任何写操作前必须检查此文件
---

# AI 操作边界

## 可以直接修改
- `packages/frontend/src/pages/` — 前端页面组件，影响范围局限于 UI 展示
- `packages/frontend/src/components/` — 可复用 UI 组件
- `packages/frontend/src/hooks/` — 自定义 React Hooks
- `packages/frontend/src/utils/` — 前端工具函数
- `packages/backend-java/src/main/java/.../dto/` — 数据传输对象，无副作用
- `docs/` — 文档目录，随时可重新生成
- `packages/backend-java/src/test/` — 测试代码

## 需要先说明计划再修改
- `packages/backend-java/src/main/java/.../resource/` — REST 端点，影响 API 契约
- `packages/backend-java/src/main/java/.../service/` — 业务逻辑层，可能影响多个端点
- `packages/frontend/src/stores/` — Zustand 状态管理，影响全局数据流
- `packages/frontend/src/services/api.ts` — API 客户端，影响所有请求
- `packages/backend-java/src/main/java/.../entity/` — 实体定义，需同步数据库迁移
- `packages/backend-java/src/main/resources/db/migration/` — 数据库迁移脚本，需谨慎
- `packages/backend-java/pom.xml` — Maven 依赖管理
- `packages/frontend/package.json` — 前端依赖管理

## 禁止直接修改
- `packages/backend-java/src/main/java/.../filter/AuthFilter.java` — 认证核心，修改可能导致安全漏洞
- `packages/backend-java/src/main/java/.../config/JwtConfig.java` — JWT 密钥配置，安全关键
- `packages/backend-java/src/main/java/.../config/SshKeyService.java` — SSH 密钥加解密，安全关键
- `deploy/` — 生产部署配置，误改可能导致服务中断
- `deploy/.env` / `deploy/.env.example` — 环境变量，可能包含密钥
- `docker/Dockerfile.container` — 容器镜像构建，影响所有开发环境
- `docker/nginx.conf` — Nginx 反向代理配置，影响路由和安全
- `packages/backend-java/src/main/java/.../service/ContainerLifecycle.java` — 容器编排核心，改动影响整个签入签出流程
- `packages/backend-java/src/main/java/.../service/DockerService.java` — Docker 操作核心，影响容器生命周期
- `.git/` — Git 内部文件，永远不要修改
