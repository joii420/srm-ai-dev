# Research: Appsmith AI-IDE Web 开发平台

**Branch**: `001-appsmith-ai-ide` | **Date**: 2026-03-24

## R-001: 外部用户管理服务集成方案

**Decision**: 后端通过 REST API 调用外部用户管理服务完成认证，本项目不自建用户注册/登录模块。外部服务签发 JWT Token，本项目后端仅校验 Token 有效性并缓存用户角色信息。

**Rationale**: spec 明确要求"用户登录与鉴权由外部用户管理服务提供，本项目通过 API 集成"。避免重复实现用户管理逻辑，降低维护成本。

**Alternatives considered**:
- 自建用户管理模块：被 spec 明确排除
- OAuth2 集成：复杂度高于简单 API 调用，当前场景不需要

## R-002: Docker 容器生命周期管理

**Decision**: 使用 dockerode（Node.js Docker SDK）管理容器创建/销毁。每次签出创建一个容器，签入后销毁。SSH Key 通过 tmpfs 注入容器，容器销毁后自动清除。

**Rationale**: 技术文档 V5.0 已选定 dockerode。SSH Key 注入 tmpfs 方案满足安全需求（不落盘、AI 不可读）。

**Alternatives considered**:
- Kubernetes Pod：过度设计，当前 20 并发容器规模不需要
- Docker Compose 动态管理：不如 Docker SDK 灵活，无法精细控制单容器

## R-003: 前端状态管理方案

**Decision**: 使用 Zustand 管理全局状态（认证状态、当前 Page、编辑器状态、Skill 选择等）。

**Rationale**: 技术文档已选定 Zustand。轻量无模板代码，适合中等规模应用。

**Alternatives considered**:
- Redux Toolkit：模板代码多，当前规模不需要
- React Context：跨组件状态共享能力不足

## R-004: AI 对话流式传输方案

**Decision**: 使用 SSE（Server-Sent Events）实现 AI 回复流式输出。前端使用 EventSource API。后端代理容器内 AI Proxy 的 SSE 响应。

**Rationale**: 技术文档已选定 SSE。单向服务端推送完全满足 AI 流式回复需求，比 WebSocket 更简单。

**Alternatives considered**:
- WebSocket：双向通信能力在此场景下多余
- Long Polling：延迟高，体验差

## R-005: 代码编辑器选型

**Decision**: 使用 Monaco Editor（VS Code 同款引擎），支持 JavaScript/JSON 语法高亮、多 Tab 管理、行号、缩进控制。

**Rationale**: 技术文档已选定 Monaco Editor。语法高亮完善，API 丰富，可通过 readOnly 属性控制只读/编辑模式。

**Alternatives considered**:
- CodeMirror 6：轻量但生态不如 Monaco 丰富
- Ace Editor：功能较旧

## R-006: GitLab 代理接口设计

**Decision**: 后端提供两个 GitLab 代理接口（GET /api/pages/{pageId}/tree 和 GET /api/pages/{pageId}/files），通过 SSH Key 访问 GitLab API。服务端持有凭证，不向前端暴露。

**Rationale**: IDE 编辑页面只读模式需要在没有容器的情况下展示 Page 代码，必须通过后端代理访问 GitLab。

**Alternatives considered**:
- 前端直接访问 GitLab API：需要暴露凭证，安全风险
- 预缓存文件内容到数据库：数据一致性难保证

## R-007: Skill 模板参数与意图识别

**Decision**: Skill 实体新增 fields（模板参数字段列表）和 keywords（触发关键词列表）。意图识别在前端 300ms 防抖后执行关键词匹配，仅对含模板参数的 Skill 显示提示栏。

**Rationale**: spec 明确定义了模板参数数据结构（FR-035）和意图识别行为（FR-038）。前端匹配可避免服务端请求延迟。

**Alternatives considered**:
- 服务端意图识别（NLP）：复杂度高，当前关键词匹配已满足需求
- 无意图识别，仅手动选择：降低用户体验

## R-008: 测试策略

**Decision**: 采用 Vitest 作为测试框架，分三层：
- `tests/unit/`：纯逻辑单元测试（服务、工具函数）
- `tests/integration/`：需要数据库或 Docker 的集成测试
- `tests/contract/`：API 接口契约测试（请求/响应格式验证）

**Rationale**: Vitest 与 Vite 生态一致，支持 TypeScript 原生，性能优于 Jest。宪章要求测试目录分离。

**Alternatives considered**:
- Jest：配置复杂度高于 Vitest，ESM 支持需额外配置
- Mocha + Chai：需要更多手动配置

## R-009: 日志策略

**Decision**: 后端使用 Pino 输出 JSON 结构化日志。所有关键操作记录：签出/签入流程（含每个步骤）、容器生命周期、AI 对话请求/响应、SSH Key 操作（脱敏）、系统配置变更。

**Rationale**: 技术文档选定 Pino。宪章要求结构化 JSON 日志，包含 timestamp/level/message/context 字段。敏感数据（Token、SSH Key）绝不记录。

**Alternatives considered**:
- Winston：性能不如 Pino
- console.log：不满足结构化要求
