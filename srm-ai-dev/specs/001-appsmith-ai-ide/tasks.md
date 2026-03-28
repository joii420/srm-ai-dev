# Tasks: Appsmith AI-IDE Web 开发平台

**Input**: Design documents from `/specs/001-appsmith-ai-ide/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: TDD approach required per constitution check — tests included for all phases.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `packages/frontend/src/`, `packages/backend/src/`, `packages/container-services/src/`
- **Docker**: `docker/`
- **Tests**: `packages/*/tests/{unit,integration,contract}/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo initialization, package scaffolding, toolchain configuration

- [x] T001 Create monorepo root with pnpm-workspace.yaml, package.json, tsconfig.base.json, .nvmrc, .eslintrc.cjs, .prettierrc in appsmith-ai-ide/
- [x] T002 [P] Initialize frontend package with React 18 + Vite + TypeScript in packages/frontend/package.json and packages/frontend/vite.config.ts
- [x] T003 [P] Initialize backend package with Fastify + Prisma + TypeScript in packages/backend/package.json and packages/backend/tsconfig.json
- [x] T004 [P] Initialize container-services package with Fastify + TypeScript in packages/container-services/package.json and packages/container-services/tsconfig.json
- [x] T005 [P] Create Docker configuration files in docker/Dockerfile.container (base Node.js 20 image with git, pm2, container-services package), docker/docker-compose.dev.yml, and docker/pm2.config.js. Image tag: appsmith-ai-ide-container:latest (configurable via CONTAINER_IMAGE_NAME env var)
- [x] T006 [P] Create setup script in scripts/setup.sh (includes: pnpm install, prisma migrate, docker build -t appsmith-ai-ide-container:latest docker/, seed SystemConfig) and .env.example with all required environment variables (CLAUDE_API_KEY, SSH_KEY_ENCRYPT_SECRET, GITLAB_KNOWN_HOSTS, DATABASE_URL, CONTAINER_IMAGE_NAME, BACKEND_URL_FOR_CONTAINER)
- [x] T007 [P] Configure Vitest for all three packages in packages/frontend/vitest.config.ts, packages/backend/vitest.config.ts, packages/container-services/vitest.config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, authentication, middleware, frontend base architecture — MUST complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create Prisma schema with all entities (User, Skill, SkillField, SkillVersion, Dependency, Checkout, SystemConfig) and run initial migration in packages/backend/prisma/schema.prisma. Include the following indexes: @@index([page_id, status]) on Checkout (active checkout lookup), @@index([user_id, status]) on Checkout (user session recovery), @@index([call_count(sort: Desc)]) on Skill (sorted list), @@index([skill_id, sort_order]) on SkillField (ordered field rendering)
- [x] T009 [P] Implement Prisma client singleton in packages/backend/src/lib/prisma.ts
- [x] T010 [P] Implement structured Pino logger in packages/backend/src/lib/logger.ts
- [x] T011 [P] Implement JWT auth middleware (token validation, sliding renewal for active checkouts, role extraction) and role-based access control guard (admin-only decorator for routes: /skills CRUD, /deps, /system-config, /containers) in packages/backend/src/middleware/auth.ts — apply admin guard when registering routes in T014
- [x] T012 [P] Implement global error handler middleware with structured error responses in packages/backend/src/middleware/errorHandler.ts
- [x] T013 [P] Implement SshKeyService (encrypt/decrypt for sensitive config values) in packages/backend/src/services/SshKeyService.ts
- [x] T014 Setup Fastify server with plugin registration, route prefixes, and CORS in packages/backend/src/server.ts
- [x] T015 [P] Setup frontend routing with React Router v6 (LoginPage, PageListPage, IDEPage, DepsPage, SkillsPage, SystemConfigPage, ContainerOpsPage) in packages/frontend/src/App.tsx and packages/frontend/src/routes.tsx
- [x] T016 [P] Create Zustand stores (authStore, pageStore, editorStore, skillStore, chatStore) in packages/frontend/src/stores/
- [x] T017 [P] Setup Axios instance with JWT interceptor and React Query provider in packages/frontend/src/services/api.ts
- [x] T018 [P] Create shared UI components (Layout, Navbar with role-based nav, StatusBar) in packages/frontend/src/components/shared/
- [x] T019 [P] Write unit tests for auth middleware in packages/backend/tests/unit/middleware/auth.test.ts
- [x] T020 [P] Write unit tests for SshKeyService in packages/backend/tests/unit/services/SshKeyService.test.ts
- [x] T021 [P] Write unit tests for error handler middleware in packages/backend/tests/unit/middleware/errorHandler.test.ts

- [x] T129 [P] Write quickstart.md covering: environment requirements (Node.js 20, Docker, pnpm, PostgreSQL 16), step-by-step setup via scripts/setup.sh, dev server start commands for all three packages, test run commands (unit/integration/contract per package), and common troubleshooting (Docker build failures, SSH key setup, database connection) in specs/001-appsmith-ai-ide/quickstart.md

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 — 开发者登录并签出 Page 进入 IDE (Priority: P1) 🎯 MVP

**Goal**: Developer can login, view Page list, enter IDE page, checkout a Page (creating Docker container with git clone + deps + AI), and see status button transition from 「签出」to 「签入」

**Independent Test**: Login with valid credentials → see Page list → click Page card to enter IDE → click 「签出」button → observe step animation → confirm button becomes 「签入」and editor unlocked

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T022 [P] [US1] Contract test for POST /auth/login (success, invalid credentials, session conflict) in packages/backend/tests/contract/auth.login.test.ts
- [x] T023 [P] [US1] Contract test for GET /auth/me in packages/backend/tests/contract/auth.me.test.ts
- [x] T024 [P] [US1] Contract test for GET /pages (list with status aggregation) in packages/backend/tests/contract/pages.list.test.ts
- [x] T025 [P] [US1] Contract test for POST /pages/:pageId/checkout (SSE steps, 409, 503) in packages/backend/tests/contract/pages.checkout.test.ts
- [x] T026 [P] [US1] Contract test for GET /pages/:pageId/tree (GitLab proxy) in packages/backend/tests/contract/pages.tree.test.ts
- [x] T027 [P] [US1] Contract test for GET /pages/:pageId/files?path= (GitLab proxy) in packages/backend/tests/contract/pages.files.test.ts
- [x] T028 [P] [US1] Unit test for DockerService (create/destroy container, health check) in packages/backend/tests/unit/services/DockerService.test.ts
- [x] T029 [P] [US1] Unit test for GitService (clone, SSH key injection) in packages/backend/tests/unit/services/GitService.test.ts
- [x] T030 [P] [US1] Unit test for ContainerLifecycle (orchestrate checkout steps, timeout rollback) in packages/backend/tests/unit/services/ContainerLifecycle.test.ts

### Implementation for User Story 1

- [x] T031 [US1] Implement auth routes (POST /auth/login, GET /auth/me, POST /auth/logout) calling external user service in packages/backend/src/routes/auth.ts
- [x] T032 [P] [US1] Implement DockerService (createContainer, destroyContainer, getContainerStatus, healthCheck) using dockerode in packages/backend/src/services/DockerService.ts
- [x] T033 [P] [US1] Implement GitService (cloneRepo with SSH key via tmpfs, getBranch) using simple-git in packages/backend/src/services/GitService.ts
- [x] T034 [US1] Implement ContainerLifecycle (orchestrateCheckout: lock → create container → inject SSH key → git clone → load deps → start AI → health check, with 60s timeout rollback) in packages/backend/src/services/ContainerLifecycle.ts
- [x] T127 [US1] Implement Skill data injection into container during checkout: write all enabled Skills (id, name, prompt, keywords, fields) as /skills/skills.json inside container at checkout time, so AI Proxy can read Skill data without calling backend in packages/backend/src/services/ContainerLifecycle.ts (add injectSkillsData step after git clone)
- [x] T035 [US1] Implement DepsLoader (loadDepsIntoContainer from Dependency table URLs) in packages/backend/src/services/DepsLoader.ts
- [x] T036 [US1] Implement pages routes (GET /pages with third-party API aggregation, POST /pages/:pageId/checkout as SSE stream, GET /pages/:pageId/tree, GET /pages/:pageId/files) in packages/backend/src/routes/pages.ts
- [x] T037 [P] [US1] Create LoginPage component (username/password form, error display, redirect on success) in packages/frontend/src/pages/LoginPage/index.tsx
- [x] T038 [P] [US1] Create PageListPage component (card grid with status badges, search/filter by keyword and status) in packages/frontend/src/pages/PageListPage/index.tsx
- [x] T039 [US1] Create IDEPage layout component (FileTree left, Editor center, ChatPanel bottom, StatusButton top-right) in packages/frontend/src/pages/IDEPage/index.tsx
- [x] T040 [US1] Implement StatusButton three-state component (「签出」/「签入」/「已签出」with checkout SSE step animation) in packages/frontend/src/pages/IDEPage/StatusButton/index.tsx
- [x] T041 [US1] Implement FileTree component (readonly mode via GitLab proxy API, editable mode via container File Manager, folder collapse/expand) in packages/frontend/src/pages/IDEPage/FileTree/index.tsx
- [x] T042 [US1] Implement Editor component with Monaco Editor (JS/JSON syntax, multi-tab, readonly toggle, line numbers, 2-space indent) in packages/frontend/src/pages/IDEPage/Editor/index.tsx
- [x] T043 [US1] Implement re-login session recovery (detect active checkout on /auth/me, health check container, auto-redirect to IDE page) in packages/frontend/src/hooks/useSessionRecovery.ts
- [x] T044 [US1] Add structured logging for checkout flow (each step, timeout, rollback) in packages/backend/src/services/ContainerLifecycle.ts
- [x] T045 [P] [US1] Integration test for full checkout flow (login → checkout → verify container created) in packages/backend/tests/integration/checkout.flow.test.ts

**Checkpoint**: User Story 1 fully functional — developer can login, browse Pages, checkout, and see IDE in edit mode

---

## Phase 4: User Story 2 — 开发者在 IDE 中编写代码并与 AI 协作 (Priority: P1)

**Goal**: Developer can edit files in Monaco Editor, save all modified files, chat with AI via SSE streaming, receive code Diff suggestions, and apply/ignore them

**Independent Test**: With a checked-out Page, edit a file → click 「全部保存」→ ask AI a question → see streaming response → click 「应用修改」on a code suggestion → verify code applied in editor

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T046 [P] [US2] Contract test for container File Manager GET /files (tree listing) in packages/container-services/tests/contract/file-manager.files.test.ts
- [x] T047 [P] [US2] Contract test for container File Manager GET /files/:path, POST /files/batch-save, and GET /diff (unified diff output, changedFiles count) in packages/container-services/tests/contract/file-manager.rw.test.ts
- [x] T048 [P] [US2] Contract test for container AI Proxy POST /api/chat (SSE events: token, code_suggestion, done, system_message) in packages/container-services/tests/contract/ai-proxy.chat.test.ts
- [x] T049 [P] [US2] Contract test for container AI Proxy GET /api/health and GET /api/session in packages/container-services/tests/contract/ai-proxy.session.test.ts
- [x] T050 [P] [US2] Unit test for AI context assembly (workspace files + deps + skill prompts) in packages/container-services/tests/unit/ai-proxy/contextBuilder.test.ts

### Implementation for User Story 2

- [x] T051 [P] [US2] Implement File Manager routes (GET /files, GET /files/:path, POST /files/:path, PUT /files/:path, DELETE /files/:path, POST /files/batch-save, GET /diff) in packages/container-services/src/file-manager/routes/files.ts
- [x] T052 [P] [US2] Implement File Manager file service (readDir, readFile, writeFile, batchSave, getDiff) in packages/container-services/src/file-manager/services/fileService.ts
- [x] T053 [US2] Implement AI Proxy context builder (read /workspace files, inject deps from /deps, inject activated skill prompts from /skills/skills.json written at checkout by T127) in packages/container-services/src/ai-proxy/services/contextBuilder.ts
- [x] T054 [US2] Implement AI Proxy chat route with SSE streaming (POST /api/chat) using @anthropic-ai/sdk in packages/container-services/src/ai-proxy/routes/chat.ts
- [x] T055 [US2] Implement AI Proxy session management and health routes (GET /api/health, GET /api/session, DELETE /api/session) in packages/container-services/src/ai-proxy/routes/session.ts
- [x] T056 [US2] Implement AI Proxy Skill usage counting (call backend POST /skills/:id/use for each used skill after reply completes — requires T126 to be implemented first before integration testing) in packages/container-services/src/ai-proxy/services/skillUsageTracker.ts
- [x] T057 [US2] Implement backend proxy routes to forward file and chat requests to container services in packages/backend/src/routes/pages.ts (add proxy endpoints)
- [x] T058 [US2] Enhance Editor component with file content loading from container, unsaved change tracking per tab, and 「全部保存」button in packages/frontend/src/pages/IDEPage/Editor/index.tsx
- [x] T059 [US2] Implement ChatPanel component (message list with Markdown rendering, SSE streaming display, input area with Enter-to-send) in packages/frontend/src/pages/IDEPage/ChatPanel/index.tsx
- [x] T060 [US2] Implement code Diff suggestion display (Diff banner above editor with 「应用修改」and 「忽略」buttons, apply writes changes to editor buffer) in packages/frontend/src/pages/IDEPage/Editor/DiffBanner.tsx
- [x] T061 [US2] Implement global StatusBar for IDE page (filename, branch, line/column, language, encoding, changed file count) in packages/frontend/src/components/shared/StatusBar.tsx
- [x] T062 [US2] Add structured logging for AI chat requests/responses in packages/container-services/src/ai-proxy/routes/chat.ts

**Checkpoint**: User Story 2 fully functional — developer can edit, save, chat with AI, and apply code suggestions

---

## Phase 5: User Story 3 — 开发者签入代码提交到 GitLab (Priority: P1)

**Goal**: Developer can checkin (git add + commit + push to dev branch), with unsaved file check, commit message input, container destruction, and Page lock release

**Independent Test**: After checkout and editing, click 「签入」→ handle unsaved file prompt → enter commit message → verify push to GitLab → confirm Page returns to 「签出」state

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T063 [P] [US3] Contract test for POST /pages/:pageId/checkin (success, git conflict) in packages/backend/tests/contract/pages.checkin.test.ts
- [x] T064 [P] [US3] Unit test for checkin flow (git add → commit → push, conflict handling, container destroy) in packages/backend/tests/unit/services/ContainerLifecycle.checkin.test.ts

### Implementation for User Story 3

- [x] T065 [US3] Extend GitService with commitAndPush (git add all → git commit → git push origin dev, conflict detection) in packages/backend/src/services/GitService.ts
- [x] T066 [US3] Implement checkin orchestration in ContainerLifecycle (unsaved check delegation, commit, push, destroy container, release lock, update Checkout status) in packages/backend/src/services/ContainerLifecycle.ts
- [x] T067 [US3] Implement POST /pages/:pageId/checkin route in packages/backend/src/routes/pages.ts
- [x] T068 [US3] Implement checkin UI flow in StatusButton (read unsaved file state from editorStore established in T058 → show save prompt dialog if unsaved tabs exist → secondary confirmation dialog if user skips save → commit message modal → call POST /pages/:pageId/checkin → page refresh, button resets to 「签出」) in packages/frontend/src/pages/IDEPage/StatusButton/index.tsx
- [x] T069 [US3] Add structured logging for checkin flow (commit hash, push result, container destroy) in packages/backend/src/services/ContainerLifecycle.ts

**Checkpoint**: MVP complete — full login → checkout → edit → AI assist → checkin cycle works end-to-end

---

## Phase 6: User Story 4 — 开发者选择和切换 AI Skill (Priority: P2)

**Goal**: Developer can open Skill drawer, search/filter Skills, multi-select to activate, and AI incorporates activated Skill prompts in subsequent replies

**Independent Test**: Open Skill drawer → search for a Skill → select multiple → confirm → send AI message → verify response reflects activated Skills

### Tests for User Story 4 ⚠️

- [x] T070 [P] [US4] Contract test for GET /skills (list with fields, tags, sorting by callCount) in packages/backend/tests/contract/skills.list.test.ts

### Implementation for User Story 4

- [x] T071 [US4] Implement GET /skills route (list enabled skills with fields, sorted by callCount desc) in packages/backend/src/routes/skills.ts
- [x] T126 [US4] Implement POST /skills/:id/use route (increment call_count, enforce per-session +1 rule via session tracking) in packages/backend/src/routes/skills.ts — required by T056 (AI Proxy skill usage counting); implement after T071 as both modify the same file
- [x] T072 [US4] Implement SkillDrawer component with two tabs: 「选择 Skill」(search, tag filter, multi-select, confirm) in packages/frontend/src/pages/IDEPage/SkillDrawer/index.tsx
- [x] T073 [US4] Integrate skillStore with ChatPanel (pass activatedSkillIds in POST /api/chat requests) in packages/frontend/src/pages/IDEPage/ChatPanel/index.tsx
- [x] T074 [US4] Display activated Skill context tags (purple badges) in ChatPanel header in packages/frontend/src/pages/IDEPage/ChatPanel/index.tsx
- [x] T075 [US4] Update AI Proxy context builder to inject activated Skill prompts into AI context in packages/container-services/src/ai-proxy/services/contextBuilder.ts

**Checkpoint**: Skill selection functional — AI responses enhanced by activated Skills

---

## Phase 7: User Story 5 — 管理员配置和更新依赖库 (Priority: P2)

**Goal**: Admin can view dependency cards, add/delete dependencies, trigger single/batch refresh, and active users receive context update notification

**Independent Test**: Add a new dependency → trigger refresh → verify AI can reference the new library's interfaces in subsequent chat

### Tests for User Story 5 ⚠️

- [x] T076 [P] [US5] Contract test for deps CRUD (GET /deps, POST /deps, PUT /deps/:id, DELETE /deps/:id) in packages/backend/tests/contract/deps.crud.test.ts
- [x] T077 [P] [US5] Contract test for deps refresh (POST /deps/:id/refresh, POST /deps/batch/refresh) in packages/backend/tests/contract/deps.refresh.test.ts

### Implementation for User Story 5

- [x] T078 [US5] Implement deps routes (GET /deps, POST /deps, PUT /deps/:id, DELETE /deps/:id, POST /deps/:id/refresh, POST /deps/batch/refresh) in packages/backend/src/routes/deps.ts
- [x] T079 [US5] Implement DepsLoader refresh logic (fetch URL content, update container /deps directory, call POST /api/context/refresh on each active container to trigger AI context reload, notify active checkout users via system message mechanism defined in T082) in packages/backend/src/services/DepsLoader.ts
- [x] T080 [US5] Implement container AI Proxy deps routes (GET /api/deps, POST /api/deps/:name/refresh, POST /api/deps/refresh-all) in packages/container-services/src/ai-proxy/routes/deps.ts
- [x] T081 [US5] Create DepsPage component (card grid with namespace, description, URL, version, load status, interface preview; add/delete/refresh buttons) in packages/frontend/src/pages/DepsPage/index.tsx
- [x] T082 [US5] Handle system_message SSE event in ChatPanel: when AI Proxy sends `event: system_message`, display "依赖库已更新，后续对话将使用最新接口" as a system notification bubble in the chat area (distinct from normal AI messages) in packages/frontend/src/pages/IDEPage/ChatPanel/index.tsx
- [x] T128 [P] [US5] Implement system_message SSE event emission in AI Proxy chat route: track whether context has been refreshed since last message (via a per-session flag set when POST /api/context/refresh is called by T079's DepsLoader), emit `event: system_message` before token events on the next chat request if flag is set, then clear the flag — T079 must complete before integration testing of this task in packages/container-services/src/ai-proxy/routes/chat.ts

**Checkpoint**: Dependency management functional — admin can manage deps, AI uses latest library interfaces

---

## Phase 8: User Story 6 — 管理员管理 Skill 配置 (Priority: P2)

**Goal**: Admin can create, edit, enable/disable Skills, manage versions, rollback, and configure template parameters (fields)

**Independent Test**: Create a new Skill with prompt and fields → enable it → verify it appears in developer Skill drawer → edit prompt and create new version → rollback to previous version

### Tests for User Story 6 ⚠️

- [x] T083 [P] [US6] Contract test for skills CRUD (POST /skills, PUT /skills/:id, DELETE /skills/:id) in packages/backend/tests/contract/skills.crud.test.ts
- [x] T084 [P] [US6] Contract test for skills versioning (GET /skills/:id/versions, POST /skills/:id/versions, POST /skills/:id/rollback) in packages/backend/tests/contract/skills.versions.test.ts
- [x] T085 [P] [US6] Contract test for POST /skills/:id/use (usage count increment) in packages/backend/tests/contract/skills.use.test.ts

### Implementation for User Story 6

- [x] T086 [US6] Implement skills routes (POST /skills, PUT /skills/:id, DELETE /skills/:id, GET /skills/:id/versions, POST /skills/:id/versions, POST /skills/:id/rollback per FR-032) in packages/backend/src/routes/skills.ts — Note: POST /skills/:id/use already implemented in T126
- [x] T087 [US6] Create SkillsPage component (two sections: enabled/available Skills, sorted by callCount desc, enable/disable toggle, new Skill button) in packages/frontend/src/pages/SkillsPage/index.tsx
- [x] T088 [US6] Create Skill edit drawer with tabs: 「系统 Prompt」(prompt editor with {{placeholder}} highlighting) and 「模板参数」(fields CRUD: add/edit/delete field with id, label, type, required, placeholder, options, token) per FR-039 in packages/frontend/src/pages/SkillsPage/SkillEditDrawer.tsx
- [x] T089 [US6] Implement version management UI (version history list, create version button, rollback button) in packages/frontend/src/pages/SkillsPage/SkillVersionPanel.tsx

**Checkpoint**: Skill management functional — admin can fully configure Skills, developers see updated Skills

---

## Phase 9: User Story 8 — 多人并行开发不同 Page (Priority: P2)

**Goal**: Multiple developers can checkout different Pages simultaneously in isolated containers, with Page lock preventing concurrent checkout of the same Page, and max container limit enforcement

**Independent Test**: Two users checkout different Pages → both can edit independently → both checkin without interference → verify max container limit blocks new checkouts when reached

### Tests for User Story 8 ⚠️

- [x] T090 [P] [US8] Integration test for concurrent checkout isolation (two users, different Pages, independent containers) in packages/backend/tests/integration/concurrent.checkout.test.ts
- [x] T091 [P] [US8] Unit test for max container limit enforcement in DockerService in packages/backend/tests/unit/services/DockerService.concurrent.test.ts

### Implementation for User Story 8

- [x] T092 [US8] Add concurrent container count check (query SystemConfig container.maxConcurrent, compare with active Checkout count) to checkout flow in packages/backend/src/services/ContainerLifecycle.ts
- [x] T093 [P] [US8] Integration test for Page lock behavior under concurrency (two users attempt to checkout same Page, verify second returns 409 ALREADY_CHECKED_OUT — lock logic already implemented in T034/ContainerLifecycle) in packages/backend/tests/integration/page-lock.concurrent.test.ts
- [x] T094 [US8] Update PageListPage to display checkedOutBy info and disabled state for already-checked-out Pages in packages/frontend/src/pages/PageListPage/index.tsx
- [x] T095 [US8] Update IDEPage readonly mode for Pages checked out by others (「已签出」button, editor readonly, ChatPanel disabled, show checkout user info) in packages/frontend/src/pages/IDEPage/index.tsx

**Checkpoint**: Multi-user parallel development functional — isolated containers, Page locking, capacity enforcement

---

## Phase 10: User Story 10 — 开发者通过快速调用面板触发 Skill 模板 (Priority: P2)

**Goal**: Developer can use Quick Invoke tab in Skill panel to directly trigger no-param Skills or fill template parameters for param Skills, with live Prompt preview and auto-fill to chat input

**Independent Test**: Open Skill panel → switch to 「快速调用」tab → click 「直接触发」on a no-param Skill → verify AI responds → click 「填写并触发」on a param Skill → fill form → verify generated Prompt appears in chat input

### Tests for User Story 10 ⚠️

- [x] T096 [P] [US10] Unit test for template parameter replacement (replace {{placeholders}} with values, preserve unfilled optional placeholders) in packages/frontend/tests/unit/utils/templateReplacer.test.ts

### Implementation for User Story 10

- [x] T097 [US10] Add 「快速调用」tab to SkillDrawer (list enabled Skills, 「直接触发」for no-fields Skills, 「填写并触发」for Skills with fields) in packages/frontend/src/pages/IDEPage/SkillDrawer/index.tsx
- [x] T098 [US10] Implement SkillTemplateModal component (dynamic form rendering based on field config: text/textarea/select/chips, required field validation, live Prompt preview with {{placeholder}} replacement) per FR-037 in packages/frontend/src/pages/IDEPage/SkillTemplateModal/index.tsx
- [x] T099 [US10] Implement template parameter replacement utility (replace {{token}} with values, preserve unfilled optional {{token}}) in packages/frontend/src/utils/templateReplacer.ts
- [x] T100 [US10] Integrate SkillTemplateModal with ChatPanel (auto-fill generated Prompt into chat input, replace existing content, user confirms and sends) in packages/frontend/src/pages/IDEPage/ChatPanel/index.tsx

**Checkpoint**: Quick invoke and template parameters functional — Skills can be triggered with customized Prompts

---

## Phase 11: User Story 7 — 管理员进行系统配置 (Priority: P3)

**Goal**: Admin can configure container resource limits, Claude tool blacklist/whitelist, SSH Key management with connection test, and other system parameters

**Independent Test**: Modify container memory limit → checkout new Page → verify container uses new limit; upload SSH Key → test connection → verify success

### Tests for User Story 7 ⚠️

- [x] T101 [P] [US7] Contract test for system config CRUD (GET /system-config, PUT /system-config) in packages/backend/tests/contract/systemConfig.crud.test.ts
- [x] T102 [P] [US7] Contract test for SSH key management (PUT /system-config/ssh-key, POST /system-config/ssh-test) in packages/backend/tests/contract/systemConfig.ssh.test.ts

### Implementation for User Story 7

- [x] T103 [US7] Implement system config routes (GET /system-config, PUT /system-config, PUT /system-config/ssh-key, POST /system-config/ssh-test) with admin-only access in packages/backend/src/routes/systemConfig.ts
- [x] T104 [US7] Seed default SystemConfig entries (container.memoryLimit, container.cpuLimit, container.maxConcurrent, container.healthCheckTimeout, claude.disabledTools, claude.allowedPaths, claude.deniedPaths, auth.jwtExpiresIn, deps.urlWhitelist, git.gitlabDomain, pages.thirdPartyApiUrl: "", pages.thirdPartyApiToken: "") in packages/backend/prisma/seed.ts
- [x] T105 [US7] Integrate SystemConfig values into DockerService container creation (memory/CPU limits) and AI Proxy configuration (disabled tools, allowed/denied paths) in packages/backend/src/services/DockerService.ts
- [x] T106 [US7] Create SystemConfigPage component (config sections: container resources, Claude tools, SSH Key upload with test button, JWT settings) in packages/frontend/src/pages/SystemConfigPage/index.tsx
- [x] T107 [US7] Add structured logging for system config changes (who changed what, previous/new values, sensitive values masked) in packages/backend/src/routes/systemConfig.ts

**Checkpoint**: System configuration functional — admin can tune platform parameters

---

## Phase 12: User Story 11 — 系统自动识别用户输入并匹配 Skill 意图 (Priority: P3)

**Goal**: System auto-detects Skill intent from user input (300ms debounce), shows intent banner for matched param-Skills, user can click to fill template or dismiss

**Independent Test**: Type a Skill keyword in chat input → wait 300ms → verify intent banner shows matched Skill → click 「填写参数」→ verify template modal opens

### Tests for User Story 11 ⚠️

- [x] T108 [P] [US11] Unit test for intent matching logic (keyword matching, debounce, priority by callCount, param-only filter) in packages/frontend/tests/unit/hooks/useIntentDetection.test.ts

### Implementation for User Story 11

- [x] T109 [US11] Implement useIntentDetection hook (300ms debounce with use-debounce, match input against all enabled Skills' keywords, filter to param-Skills only, select highest callCount on multi-match, dismiss tracking) per FR-038 in packages/frontend/src/hooks/useIntentDetection.ts
- [x] T110 [US11] Implement IntentBanner component (show matched Skill name, 「填写参数」button opening SkillTemplateModal, × dismiss button) above chat input in packages/frontend/src/pages/IDEPage/ChatPanel/IntentBanner.tsx
- [x] T111 [US11] Integrate IntentBanner with ChatPanel input area (show/hide based on hook state, open SkillTemplateModal on click) in packages/frontend/src/pages/IDEPage/ChatPanel/index.tsx

**Checkpoint**: Intent recognition functional — smart Skill suggestion during typing

---

## Phase 13: Container Ops — 管理员容器运维管理 (FR-031)

**Goal**: Admin can view all running containers, force-checkin (auto-commit + push + destroy) or force-destroy (discard changes + destroy) containers

**Independent Test**: View running containers list → force-checkin a container → verify code pushed with auto-generated commit message → verify container destroyed and Page unlocked

### Tests for Container Ops ⚠️

- [x] T112 [P] Contract test for GET /containers (list running containers) in packages/backend/tests/contract/containers.list.test.ts
- [x] T113 [P] Contract test for POST /containers/:id/force-checkin and POST /containers/:id/force-destroy in packages/backend/tests/contract/containers.ops.test.ts

### Implementation for Container Ops

- [x] T114 Implement container ops routes (GET /containers, POST /containers/:id/force-checkin with auto commit message "[Admin Force Checkin] {PageName} {timestamp}", POST /containers/:id/force-destroy with admin-only access) in packages/backend/src/routes/containers.ts
- [x] T115 Extend ContainerLifecycle with forceCheckin (auto-commit + push, retry on failure, preserve container on push failure) and forceDestroy (destroy without commit, second confirmation tracked) in packages/backend/src/services/ContainerLifecycle.ts
- [x] T116 Create ContainerOpsPage component (table: checkoutUser, duration, pageName, containerStatus; force-checkin and force-destroy buttons with confirmation dialog) in packages/frontend/src/pages/ContainerOpsPage/index.tsx
- [x] T117 Add structured logging for admin container operations (force-checkin, force-destroy, who/when/which container) in packages/backend/src/services/ContainerLifecycle.ts

**Checkpoint**: Container ops functional — admin can manage runaway containers

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T118 [P] Validate all API error responses follow unified error format (error, message, pageId where applicable) across all routes in packages/backend/src/routes/
- [x] T119 [P] Ensure SSH Key and API Key never appear in frontend network requests or logs; verify tmpfs cleanup on container destroy in packages/backend/src/services/DockerService.ts
- [x] T120 [P] Validate Zod request schemas for all backend routes in packages/backend/src/routes/
- [x] T121 [P] Audit RBAC coverage completeness: verify all admin-only routes (/skills CRUD, /deps, /system-config, /containers) correctly return 403 for developer role, and developer-accessible routes (/pages, /auth, /skills GET) remain accessible; run automated role permission tests in packages/backend/tests/integration/rbac.audit.test.ts
- [x] T122 [P] Run quickstart.md validation (full setup → dev → test cycle) per specs/001-appsmith-ai-ide/quickstart.md
- [x] T123 Performance audit: verify checkout P95 < 60s, AI chat P95 < 15s, file ops P95 < 500ms, readonly file load P95 < 2s
- [x] T124 Security audit: validate OWASP top 10 (XSS, injection, CSRF) across frontend and backend
- [x] T125 [P] End-to-end smoke test: login → checkout → edit → AI chat → apply diff → save → checkin → verify GitLab push in packages/backend/tests/integration/e2e.smoke.test.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–12)**: All depend on Foundational phase completion
  - P1 stories (US1 → US2 → US3) should be done sequentially as each builds on the previous
  - P2 stories (US4, US5, US6, US8, US10) can proceed in parallel after P1 MVP
  - P3 stories (US7, US11) can proceed in parallel after P1 MVP
- **Container Ops (Phase 13)**: Depends on Phase 2 (foundational), can run parallel with P2/P3 stories
- **Polish (Phase 14)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependencies on other stories
- **US2 (P1)**: After US1 — requires checkout flow, container services
- **US3 (P1)**: After US2 — requires editor with unsaved state tracking
- **US4 (P2)**: After Foundational — independent, but enhanced by US6 (Skill admin creates Skills)
- **US5 (P2)**: After Foundational — independent
- **US6 (P2)**: After Foundational — independent, creates Skills used by US4/US10/US11
- **US7 (P3)**: After Foundational — independent
- **US8 (P2)**: After US1 — extends checkout with concurrency controls
- **US10 (P2)**: After US4 — extends Skill drawer with quick invoke tab and template modal
- **US11 (P3)**: After US10 — reuses SkillTemplateModal, adds intent detection
- **Cross-story note**: T126 (POST /skills/:id/use, implemented in US4) must complete before T056 (AI Proxy skill usage counting, in US2) can be integration-tested — ensure T126 is done before running T056 end-to-end tests even though US4 executes after US2 in the P1 MVP path

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models/schemas before services
- Services before routes/endpoints
- Backend before frontend (for API integration)
- Core implementation before integration/polish
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002–T007)
- All Foundational tasks marked [P] can run in parallel (T009–T021)
- All contract/unit tests marked [P] within a story can run in parallel
- Once Foundational completes: US4, US5, US6, US7 can start in parallel
- US8 can start once US1 is done
- Container Ops (Phase 13) can run parallel with any P2/P3 story

---

## Parallel Example: User Story 1

```bash
# Launch all contract tests together:
Task: "Contract test for POST /auth/login in packages/backend/tests/contract/auth.login.test.ts"
Task: "Contract test for GET /auth/me in packages/backend/tests/contract/auth.me.test.ts"
Task: "Contract test for GET /pages in packages/backend/tests/contract/pages.list.test.ts"
Task: "Contract test for POST /pages/:pageId/checkout in packages/backend/tests/contract/pages.checkout.test.ts"

# Launch all unit tests together:
Task: "Unit test for DockerService in packages/backend/tests/unit/services/DockerService.test.ts"
Task: "Unit test for GitService in packages/backend/tests/unit/services/GitService.test.ts"
Task: "Unit test for ContainerLifecycle in packages/backend/tests/unit/services/ContainerLifecycle.test.ts"

# Launch parallel implementation tasks:
Task: "Implement DockerService in packages/backend/src/services/DockerService.ts"
Task: "Implement GitService in packages/backend/src/services/GitService.ts"
Task: "Create LoginPage in packages/frontend/src/pages/LoginPage/index.tsx"
Task: "Create PageListPage in packages/frontend/src/pages/PageListPage/index.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1–3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Login + Checkout)
4. Complete Phase 4: User Story 2 (IDE + AI Collaboration)
5. Complete Phase 5: User Story 3 (Checkin)
6. **STOP and VALIDATE**: Test full cycle independently — login → checkout → edit → AI → checkin
7. Deploy/demo if ready — this is the MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Test login + checkout → First milestone
3. US2 → Test IDE + AI → Second milestone
4. US3 → Test full cycle → **MVP! Deploy/Demo**
5. US4 + US6 → Skill selection + management → Enhanced AI
6. US5 → Deps management → AI context enrichment
7. US8 + Container Ops → Multi-user + admin ops → Team-ready
8. US10 → Quick invoke templates → Power user features
9. US7 + US11 → System config + intent detection → Polish
10. Phase 14 → Security + performance audit → Production-ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 → US2 → US3 (P1 MVP path, sequential)
   - Developer B: US6 (Skill admin) → US4 (Skill selection) → US10 (Quick invoke)
   - Developer C: US5 (Deps) + US7 (System config)
3. After US1 done: Developer D starts US8 (concurrency) + Container Ops
4. After US10 done: Developer B continues with US11 (intent detection)
5. All converge on Phase 14 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD per constitution)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Container services (AI Proxy + File Manager) run inside Docker — test with container or mock
- All backend routes require Zod validation
- Pino structured JSON logging required for all critical operations
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
