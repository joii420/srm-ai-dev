# Agent 记忆功能开发文档

> **适用项目**：已集成 Claude SDK、具备 AI 对话与文件变更能力的 Agent 项目  
> **文档目的**：指导 Claude Code 在现有项目基础上补充完整的双层记忆功能  
> **文档版本**：2.0.0

---

## 目录

1. [架构总览](#1-架构总览)
2. [用户记忆功能](#2-用户记忆功能)
3. [项目记忆功能](#3-项目记忆功能)
4. [记忆注入与对话生命周期](#4-记忆注入与对话生命周期)
5. [数据库表结构](#5-数据库表结构)
6. [memory.json 初始化模板](#6-memoryjson-初始化模板)
7. [系统提示词修改样例](#7-系统提示词修改样例)
8. [实现代码参考](#8-实现代码参考)
9. [注意事项](#9-注意事项)

---

## 1. 架构总览

### 1.1 双层记忆设计

记忆系统分为两个完全独立的层，各自有不同的存储位置、生命周期和更新时机：

```
┌─────────────────────────────────────────────────────────┐
│                     用户记忆层                           │
│  存储位置：数据库（user_memories 表）                    │
│  作用范围：跨所有项目全局生效                            │
│  存储内容：语言偏好、代码风格、角色背景、交互习惯         │
│  更新时机：检测到用户级别的偏好变化                      │
└─────────────────────────┬───────────────────────────────┘
                          │ 每次进入任意项目时从 DB 查询注入
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     项目记忆层                           │
│  存储位置：项目 Git 仓库 .agent/memory.json              │
│  作用范围：仅限当前项目                                  │
│  存储内容：架构、任务、决策、模块信息                    │
│  更新时机：检测到项目级别的状态变化                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              两层记忆合并注入 System Prompt
                          │
                          ▼
                    发送给 Claude
```

### 1.2 两层记忆的核心区别

| 维度 | 用户记忆 | 项目记忆 |
|------|---------|---------|
| **存储位置** | 数据库 | 项目 Git 仓库 `.agent/memory.json` |
| **作用范围** | 跨所有项目 | 仅限当前项目 |
| **生命周期** | 与用户账号绑定，永久 | 与项目仓库共存亡 |
| **读取方式** | 每次启动查询数据库 | 读取本地文件 |
| **更新频率** | 很低，偏好相对稳定 | 随项目进展频繁更新 |
| **团队共享** | 个人私有，不共享 | 可通过 Git 共享给团队 |
| **版本控制** | 数据库管理 | Git 历史管理 |

### 1.3 目录与文件规范

```
your-project/                      ← Git 仓库根目录
├── .agent/
│   ├── memory.json                ← 项目记忆（纳入 Git）
│   ├── tasks.json                 ← 任务详细记录（可选）
│   └── decisions.md               ← 人工决策日志（可选）
├── src/
├── package.json
└── ...

数据库（独立服务）
└── user_memories 表               ← 用户记忆（所有用户共用一个库）
```

---

## 2. 用户记忆功能

### 2.1 什么属于用户记忆

用户记忆存储与**具体项目无关**、反映用户个人特征的信息：

- **语言与表达偏好**：回复语言、专业术语偏好、详细程度
- **代码风格偏好**：编程范式偏好、命名风格、注释习惯
- **角色背景**：职业角色、技术水平、主要使用场景
- **交互习惯**：是否喜欢逐步解释、是否需要示例代码、格式偏好
- **工具链偏好**：常用包管理器、测试框架偏好、部署方式

**判断标准：这个信息换一个项目后还适用吗？适用则属于用户记忆。**

### 2.2 用户记忆的读取时机

**每次用户进入任意项目（启动 Agent 会话）时自动触发**，流程如下：

```
用户启动 Agent（进入任意项目）
          │
          ▼
  从数据库查询该用户的 user_memories 记录
          │
    ┌─────┴─────┐
    │ 有记录     │ 无记录
    │           ▼
    │     使用默认用户记忆模板（空偏好）
    ▼
  解析用户记忆 JSON
          │
          ▼
  缓存到当前会话内存（避免每轮重查 DB）
          │
          ▼
  合并项目记忆后注入 System Prompt
```

> **性能优化**：用户记忆在会话启动时查询一次后缓存到内存，同一会话内不重复查库。仅在检测到用户记忆需要更新时才写库。

### 2.3 用户记忆的更新时机

用户记忆更新触发条件（满足任意一条）：

| 触发条件 | 示例 |
|---------|------|
| 用户明确表达全局偏好 | "以后都用中文回复我"、"我喜欢函数式风格" |
| 用户纠正 Agent 的行为模式 | "不要在回答末尾总结你做了什么" |
| 用户介绍自己的背景 | "我是后端工程师，主要写 Go" |
| 检测到跨会话重复出现的偏好信号 | 用户多次修正同一类问题 |

**更新流程**：

1. 检测到用户记忆触发条件
2. 向 Claude 发送独立的用户记忆提取请求（用户不可见）
3. Claude 返回需要更新的用户记忆字段（JSON 格式）
4. 合并更新到数据库 `user_memories` 表
5. 刷新当前会话的内存缓存

**用户记忆提取 Prompt 模板**：

```
以下是当前用户的记忆记录：
<user_memory>
{当前 user_memories 记录的 JSON 内容}
</user_memory>

以下是刚刚发生的对话片段：
<conversation>
用户：{用户消息}
助手：{助手回复}
</conversation>

请判断此次对话是否包含需要更新到用户记忆的信息。
用户记忆是指：语言偏好、代码风格、职业背景、交互习惯等跨项目通用的个人特征。

规则：
1. 如果没有需要更新的用户级别信息，返回空 JSON 对象 {}
2. 只返回需要变更的字段
3. 不要把项目特有信息（架构、任务等）放入用户记忆
4. 严格只返回 JSON，不包含任何解释文字
```

### 2.4 用户记忆数据结构

```json
{
  "meta": {
    "user_id": "{{USER_ID}}",
    "version": "1.0.0",
    "created_at": "{{ISO_TIMESTAMP}}",
    "last_updated": "{{ISO_TIMESTAMP}}"
  },
  "preferences": {
    "reply_language": "中文",
    "reply_detail_level": "detailed",
    "code_example_style": "always_include",
    "format_preference": "markdown"
  },
  "code_style": {
    "paradigm": "functional",
    "naming_convention": "camelCase",
    "comment_language": "中文",
    "comment_density": "key_logic_only",
    "test_style": "real_database_no_mock",
    "custom": {}
  },
  "background": {
    "role": "",
    "experience_level": "",
    "primary_languages": [],
    "domains": []
  },
  "interaction_habits": {
    "prefers_step_by_step": true,
    "prefers_alternatives": false,
    "dislikes": [],
    "custom": {}
  },
  "toolchain": {
    "package_manager": "",
    "preferred_frameworks": [],
    "custom": {}
  }
}
```

---

## 3. 项目记忆功能

### 3.1 什么属于项目记忆

项目记忆存储与**当前项目强绑定**的信息：

- **项目结构**：技术栈、入口文件、包管理器
- **架构信息**：架构模式、关键模块及其职责
- **任务状态**：进行中的任务、已完成的任务
- **架构决策**：重要的技术决策及其原因
- **项目统计**：会话次数、文件变更次数

**判断标准：这个信息换到另一个项目就完全无效了，则属于项目记忆。**

### 3.2 项目记忆存储在 Git 仓库

项目记忆文件 `.agent/memory.json` **纳入 Git 版本控制**，带来以下优势：

- **团队共享**：团队成员拉取代码后即可共享项目上下文
- **历史追溯**：可以通过 Git 历史查看项目记忆的演变
- **分支隔离**：不同功能分支可以有不同的任务状态记录
- **回滚能力**：记忆文件误更新时可以通过 Git 恢复

> **注意**：`root_path` 字段固定为 `"."`（相对路径），不存绝对路径，避免不同机器上路径不一致导致记忆文件失效。

### 3.3 项目记忆的读取时机

每次调用 Claude API 之前自动读取，流程见第 4 节。

### 3.4 项目记忆的更新时机

更新触发条件（满足任意一条即触发）：

| 触发条件 | 说明 |
|---------|------|
| 本轮对话涉及文件变更 | Agent 已有文件变更能力，变更后必须更新模块信息 |
| 用户明确表达项目记录意图 | "记住这个项目用 pnpm"、"记录这个架构决策" |
| 任务状态发生变化 | 检测到任务完成、新任务开始等关键词 |
| 出现架构决策 | 消息中包含"决定"、"方案"、"架构"、"改为"等关键词 |
| 对话轮次达到阈值 | 每 10 轮强制更新一次，防止记忆过期 |

---

## 4. 记忆注入与对话生命周期

### 4.1 完整生命周期

```
用户启动 Agent 会话（进入项目）
          │
          ▼
┌─────────────────────────────────┐
│  [INIT] 会话初始化               │
│  1. 从数据库查询用户记忆          │
│  2. 读取 .agent/memory.json      │
│  3. 缓存两份记忆到会话内存        │
└───────────────┬─────────────────┘
                │
                │ ← 用户每次发送消息时
                ▼
┌─────────────────────────────────┐
│  [PRE] 对话前                    │
│  1. 从缓存取用户记忆             │
│  2. 从文件取项目记忆             │
│  3. 合并构建 System Prompt       │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  [EXEC] 调用 Claude API          │
│  携带合并记忆的 System Prompt    │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  [POST] 对话后（异步执行）        │
│  ┌──────────────┬─────────────┐ │
│  │ 用户记忆判断  │ 项目记忆判断 │ │
│  │ 触发 → 更新DB│ 触发 → 更新 │ │
│  │              │ .agent/     │ │
│  │              │ memory.json │ │
│  └──────────────┴─────────────┘ │
└─────────────────────────────────┘
```

> **[POST] 步骤异步执行**：记忆更新不阻塞当前对话的响应返回，在后台静默完成。

### 4.2 System Prompt 合并顺序

```
[1] 基础角色描述（固定不变）
[2] 用户记忆注入（从数据库，全局）
    - 偏好：语言、代码风格、交互习惯
    - 背景：角色、技术水平
[3] 项目记忆注入（从 .agent/memory.json，项目级）
    - 项目信息：名称、技术栈、入口
    - 架构概述与关键模块
    - 当前任务与最近完成任务
    - 近期架构决策
[4] 冲突解决规则（项目级覆盖用户级）
    例：用户偏好"中文注释"，但项目记忆中有"本项目要求英文注释"
    → 以项目记忆为准
```

### 4.3 注入内容选择原则（控制 Token）

**用户记忆注入字段**：

| 字段 | 是否注入 | 说明 |
|------|---------|------|
| `preferences.*` | ✅ 始终 | 影响回复格式和语言 |
| `code_style.*` | ✅ 始终 | 影响代码生成 |
| `background.role` | ✅ 始终 | 影响解释深度 |
| `background.experience_level` | ✅ 始终 | 影响术语选择 |
| `interaction_habits.dislikes` | ✅ 始终 | 避免踩雷 |
| `toolchain.*` | ⚠️ 仅非空 | 有值才注入 |

**项目记忆注入字段**：

| 字段 | 是否注入 | 说明 |
|------|---------|------|
| `project.name` / `description` | ✅ 始终 | 基础上下文 |
| `project.tech_stack` | ✅ 始终 | 影响代码生成 |
| `architecture.summary` | ✅ 始终 | 架构感知 |
| `architecture.key_modules` | ✅ 始终 | 模块定位 |
| `current_tasks` | ✅ 始终 | 当前任务焦点 |
| `completed_tasks` | ⚠️ 仅最近 3 条 | 避免冗余 |
| `decisions` | ⚠️ 仅最近 5 条 | 避免冗余 |

> **Token 预算**：用户记忆注入控制在 300 tokens 以内，项目记忆注入控制在 600 tokens 以内，合计不超过 900 tokens。

---

## 5. 数据库表结构

### 5.1 推荐数据库

推荐使用 **SQLite**（单机/小团队）或 **PostgreSQL**（多用户/生产环境）。

### 5.2 user_memories 表

```sql
CREATE TABLE user_memories (
  id            TEXT PRIMARY KEY,           -- 用户唯一标识（user_id 或 email hash）
  memory_json   TEXT NOT NULL,              -- 用户记忆 JSON 字符串
  version       INTEGER NOT NULL DEFAULT 1, -- 记录版本号，每次更新递增
  created_at    TEXT NOT NULL,              -- 创建时间（ISO 8601）
  last_updated  TEXT NOT NULL,              -- 最后更新时间（ISO 8601）
  last_accessed TEXT                        -- 最后读取时间，用于清理过期记录
);

-- 索引：按 user_id 快速查找
CREATE UNIQUE INDEX idx_user_memories_id ON user_memories(id);
```

### 5.3 user_memory_history 表（可选，用于审计和回滚）

```sql
CREATE TABLE user_memory_history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL,
  memory_json   TEXT NOT NULL,   -- 变更前的记忆快照
  changed_at    TEXT NOT NULL,   -- 变更时间
  change_reason TEXT             -- 变更原因（如：用户明确指示/自动检测）
);

CREATE INDEX idx_memory_history_user ON user_memory_history(user_id);
```

### 5.4 典型查询

```sql
-- 查询用户记忆
SELECT memory_json FROM user_memories WHERE id = ?;

-- 创建或更新用户记忆（upsert）
INSERT INTO user_memories (id, memory_json, version, created_at, last_updated)
VALUES (?, ?, 1, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  memory_json  = excluded.memory_json,
  version      = user_memories.version + 1,
  last_updated = excluded.last_updated;

-- 更新最后访问时间
UPDATE user_memories SET last_accessed = ? WHERE id = ?;
```

---

## 6. memory.json 初始化模板

项目记忆文件的完整初始化模板（v2.0 已移除 `user_preferences` 字段，该字段迁移至数据库）：

```json
{
  "meta": {
    "version": "2.0.0",
    "created_at": "{{ISO_TIMESTAMP}}",
    "last_updated": "{{ISO_TIMESTAMP}}",
    "agent_version": "1.0.0"
  },
  "project": {
    "name": "{{PROJECT_NAME}}",
    "description": "{{PROJECT_DESCRIPTION}}",
    "root_path": ".",
    "tech_stack": [],
    "main_language": "{{DETECTED_LANGUAGE}}",
    "entry_point": "",
    "package_manager": ""
  },
  "architecture": {
    "summary": "",
    "patterns": [],
    "key_modules": []
  },
  "current_tasks": [],
  "completed_tasks": [],
  "decisions": [],
  "session_stats": {
    "total_sessions": 0,
    "total_file_changes": 0,
    "last_session_at": null
  }
}
```

> **v1 → v2 变更说明**：移除了 `user_preferences` 字段。用户偏好已统一迁移至数据库 `user_memories` 表，项目记忆文件只保留项目级别信息。`root_path` 固定为 `"."` 相对路径。

### 6.1 字段说明

#### `project` — 项目基础信息

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 项目名称，从 package.json 等自动识别 |
| `description` | string | 项目描述 |
| `root_path` | string | 固定为 `"."`，相对路径，跨机器兼容 |
| `tech_stack` | string[] | 技术栈列表 |
| `main_language` | string | 主要编程语言 |
| `entry_point` | string | 项目入口文件（相对路径） |
| `package_manager` | string | `npm` / `pnpm` / `yarn` |

#### `key_modules` 单项结构

```json
{
  "name": "claude-client",
  "path": "src/core/claude.ts",
  "role": "Claude SDK 封装，处理所有 AI 请求",
  "dependencies": ["anthropic"]
}
```

#### `current_tasks` 单项结构

```json
{
  "id": "task-003",
  "title": "实现双层记忆功能",
  "description": "用户记忆存 DB，项目记忆存 Git",
  "status": "in_progress",
  "priority": "high",
  "started_at": "{{ISO_TIMESTAMP}}",
  "context": "用户希望 Agent 能跨会话跨项目记住个人偏好"
}
```

#### `decisions` 单项结构

```json
{
  "id": "decision-001",
  "date": "{{ISO_DATE}}",
  "title": "使用 Streaming 方式调用 Claude",
  "decision": "采用 stream: true 参数调用 Claude API",
  "reason": "用户体验更好，可实时看到输出",
  "alternatives_considered": ["普通请求模式"],
  "made_by": "user"
}
```

---

## 7. 系统提示词修改样例

### 7.1 修改前（原始 system prompt）

```typescript
const systemPrompt = `
你是一个智能编程助手，可以帮助用户完成代码编写、文件修改等任务。
你可以读取和修改项目中的文件。
请用中文回复。
`;
```

### 7.2 修改后（双层记忆注入）

```typescript
/**
 * 构建携带双层记忆的系统提示词
 * 在每次调用 Claude API 前调用此函数
 */
async function buildSystemPromptWithMemory(
  userId: string,
  projectRoot: string,
  sessionCache: SessionCache
): Promise<string> {
  // 从会话缓存取用户记忆（启动时已从 DB 加载）
  const userMemory = sessionCache.getUserMemory(userId);

  // 读取项目记忆文件
  const projectMemory = await loadProjectMemory(projectRoot);

  const basePrompt = `
你是一个智能编程助手，可以帮助用户完成代码编写、文件修改等任务。
你可以读取和修改项目中的文件。
`;

  const userSection = buildUserMemorySection(userMemory);
  const projectSection = buildProjectMemorySection(projectMemory);
  const conflictRule = `
---
**优先级规则**：当用户偏好与项目要求冲突时，以项目记忆中的要求为准。
`;

  return [basePrompt, userSection, projectSection, conflictRule].join('\n');
}

/**
 * 构建用户记忆注入段（来自数据库，全局生效）
 */
function buildUserMemorySection(memory: UserMemory | null): string {
  if (!memory) return '';

  const dislikes = memory.interaction_habits?.dislikes?.length > 0
    ? `\n- 请避免：${memory.interaction_habits.dislikes.join('、')}`
    : '';

  const toolchain = memory.toolchain?.package_manager
    ? `\n- 惯用包管理器：${memory.toolchain.package_manager}`
    : '';

  return `
## 用户偏好（全局，跨所有项目生效）
- 回复语言：${memory.preferences?.reply_language || '中文'}
- 回复详细程度：${memory.preferences?.reply_detail_level || '详细'}
- 代码范式偏好：${memory.code_style?.paradigm || '未指定'}
- 注释语言：${memory.code_style?.comment_language || '中文'}
- 注释密度：${memory.code_style?.comment_density || '关键逻辑注释'}
- 测试风格：${memory.code_style?.test_style || '未指定'}
- 用户角色：${memory.background?.role || '未知'}
- 技术水平：${memory.background?.experience_level || '未知'}${dislikes}${toolchain}
`;
}

/**
 * 构建项目记忆注入段（来自 .agent/memory.json，仅当前项目生效）
 */
function buildProjectMemorySection(memory: ProjectMemory | null): string {
  if (!memory) return '';

  const currentTasksText = memory.current_tasks?.length > 0
    ? memory.current_tasks.map(t =>
        `  - [${t.status}] ${t.title}：${t.description}`
      ).join('\n')
    : '  - 暂无进行中的任务';

  const recentCompletedText = memory.completed_tasks?.slice(-3).map(t =>
    `  - ✅ ${t.title}`
  ).join('\n') || '  - 暂无已完成任务';

  const keyModulesText = memory.architecture?.key_modules?.map(m =>
    `  - \`${m.path}\`：${m.role}`
  ).join('\n') || '  - 暂无模块记录';

  const recentDecisionsText = memory.decisions?.slice(-5).map(d =>
    `  - ${d.title}：${d.reason}`
  ).join('\n') || '  - 暂无决策记录';

  return `
## 项目上下文（仅限当前项目）

### 项目信息
- **项目名称**：${memory.project?.name || '未知'}
- **项目描述**：${memory.project?.description || '未知'}
- **技术栈**：${memory.project?.tech_stack?.join('、') || '未记录'}
- **入口文件**：${memory.project?.entry_point || '未记录'}

### 架构概述
${memory.architecture?.summary || '暂无架构描述'}

### 关键模块
${keyModulesText}

### 当前任务
${currentTasksText}

### 最近完成的任务
${recentCompletedText}

### 近期架构决策
${recentDecisionsText}

请基于以上项目上下文理解用户的需求，保持与历史决策的一致性。
`;
}
```

### 7.3 注入后的实际效果

```
你是一个智能编程助手，可以帮助用户完成代码编写、文件修改等任务。
你可以读取和修改项目中的文件。

## 用户偏好（全局，跨所有项目生效）
- 回复语言：中文
- 回复详细程度：详细
- 代码范式偏好：函数式
- 注释语言：中文
- 注释密度：关键逻辑注释
- 测试风格：使用真实数据库，不用 mock
- 用户角色：后端工程师
- 技术水平：senior
- 请避免：在回答末尾总结你做了什么

## 项目上下文（仅限当前项目）

### 项目信息
- **项目名称**：my-agent-project
- **项目描述**：一个集成 Claude SDK 的智能编程 Agent 工具
- **技术栈**：TypeScript、Node.js、Claude SDK、tsx
- **入口文件**：src/index.ts

### 架构概述
采用分层架构：core 层封装 Claude API 调用，file 层处理文件变更，cli 层处理用户交互。

### 关键模块
  - `src/core/claude.ts`：Claude SDK 封装，处理所有 AI 请求和 streaming
  - `src/file/watcher.ts`：监听文件变更，解析 AI 返回的文件操作指令
  - `src/memory/index.ts`：双层记忆管理，用户记忆读写 DB，项目记忆读写文件

### 当前任务
  - [in_progress] 实现双层记忆功能：用户记忆存 DB，项目记忆存 Git

### 近期架构决策
  - 使用 Streaming 方式调用 Claude：用户体验更好，可实时看到输出

---
**优先级规则**：当用户偏好与项目要求冲突时，以项目记忆中的要求为准。
```

---

## 8. 实现代码参考

### 8.1 模块结构

```
src/
└── memory/
    ├── index.ts              # 对外暴露的统一接口
    ├── types.ts              # TypeScript 类型定义
    ├── session-cache.ts      # 会话内存缓存管理
    │
    ├── user/                 # 用户记忆模块（读写数据库）
    │   ├── loader.ts         # 从数据库读取用户记忆
    │   ├── updater.ts        # 更新用户记忆到数据库
    │   ├── detector.ts       # 检测用户记忆更新触发条件
    │   └── db.ts             # 数据库连接与 SQL 操作
    │
    └── project/              # 项目记忆模块（读写文件）
        ├── loader.ts         # 读取 .agent/memory.json
        ├── updater.ts        # 更新 .agent/memory.json
        ├── initializer.ts    # 初始化项目记忆文件
        └── detector.ts       # 检测项目记忆更新触发条件
```

### 8.2 核心类型定义（types.ts）

```typescript
// ─── 用户记忆（存数据库）──────────────────────────────────
export interface UserMemory {
  meta: {
    user_id: string;
    version: string;
    created_at: string;
    last_updated: string;
  };
  preferences: {
    reply_language: string;
    reply_detail_level: 'brief' | 'normal' | 'detailed';
    code_example_style: 'always_include' | 'on_request' | 'never';
    format_preference: 'markdown' | 'plain';
  };
  code_style: {
    paradigm: string;
    naming_convention: string;
    comment_language: string;
    comment_density: string;
    test_style: string;
    custom: Record<string, string>;
  };
  background: {
    role: string;
    experience_level: 'junior' | 'mid' | 'senior' | 'expert' | '';
    primary_languages: string[];
    domains: string[];
  };
  interaction_habits: {
    prefers_step_by_step: boolean;
    prefers_alternatives: boolean;
    dislikes: string[];
    custom: Record<string, string>;
  };
  toolchain: {
    package_manager: string;
    preferred_frameworks: string[];
    custom: Record<string, string>;
  };
}

// ─── 项目记忆（存 Git 仓库文件）──────────────────────────
export interface ProjectMemory {
  meta: {
    version: string;
    created_at: string;
    last_updated: string;
    agent_version: string;
  };
  project: {
    name: string;
    description: string;
    root_path: string;       // 固定为 "."
    tech_stack: string[];
    main_language: string;
    entry_point: string;
    package_manager: string;
  };
  architecture: {
    summary: string;
    patterns: string[];
    key_modules: Array<{
      name: string;
      path: string;
      role: string;
      dependencies?: string[];
    }>;
  };
  current_tasks: Task[];
  completed_tasks: CompletedTask[];
  decisions: Decision[];
  session_stats: {
    total_sessions: number;
    total_file_changes: number;
    last_session_at: string | null;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  started_at: string;
  context: string;
}

export interface CompletedTask {
  id: string;
  title: string;
  description: string;
  completed_at: string;
}

export interface Decision {
  id: string;
  date: string;
  title: string;
  decision: string;
  reason: string;
  alternatives_considered: string[];
  made_by: 'user' | 'agent';
}

// ─── 会话缓存接口 ─────────────────────────────────────────
export interface SessionCache {
  getUserMemory(userId: string): UserMemory | null;
  setUserMemory(userId: string, memory: UserMemory): void;
}
```

### 8.3 用户记忆触发检测（user/detector.ts）

```typescript
export function shouldUpdateUserMemory(params: {
  userMessage: string;
  assistantReply: string;
}): boolean {
  const { userMessage } = params;

  // 明确的全局偏好表达
  const globalPrefKeywords = [
    '以后都', '每次都', '我喜欢', '我习惯', '我不喜欢',
    '不要再', '请记住我', 'always', 'never', 'I prefer',
  ];
  if (globalPrefKeywords.some(kw => userMessage.includes(kw))) return true;

  // 用户介绍背景
  const backgroundKeywords = [
    '我是', '我的工作是', '我主要用', '我们团队', 'I am a', 'I work as',
  ];
  if (backgroundKeywords.some(kw => userMessage.includes(kw))) return true;

  // 用户明确纠正跨项目行为模式
  const correctionKeywords = [
    '不要总结', '不要重复', '不要解释', '直接给', '别废话',
  ];
  if (correctionKeywords.some(kw => userMessage.includes(kw))) return true;

  return false;
}
```

### 8.4 项目记忆触发检测（project/detector.ts）

```typescript
export function shouldUpdateProjectMemory(params: {
  userMessage: string;
  assistantReply: string;
  fileChanges: string[];
  roundCount: number;
}): boolean {
  const { userMessage, assistantReply, fileChanges, roundCount } = params;

  if (fileChanges.length > 0) return true;

  const projectMemoryKeywords = ['记住', '记录', '下次', '保存', '别忘了'];
  if (projectMemoryKeywords.some(kw => userMessage.includes(kw))) return true;

  const taskKeywords = ['完成了', '做好了', '开始', '新功能', '新需求', 'done', 'finished'];
  if (taskKeywords.some(kw =>
    userMessage.includes(kw) || assistantReply.includes(kw)
  )) return true;

  const decisionKeywords = ['决定', '方案', '架构', '改为', '采用', '选择'];
  if (decisionKeywords.some(kw => assistantReply.includes(kw))) return true;

  if (roundCount > 0 && roundCount % 10 === 0) return true;

  return false;
}
```

### 8.5 会话初始化（session-cache.ts）

```typescript
import { UserMemory, SessionCache } from './types';
import { loadUserMemoryFromDB } from './user/loader';

export class InMemorySessionCache implements SessionCache {
  private cache = new Map<string, UserMemory>();

  getUserMemory(userId: string): UserMemory | null {
    return this.cache.get(userId) ?? null;
  }

  setUserMemory(userId: string, memory: UserMemory): void {
    this.cache.set(userId, memory);
  }
}

/**
 * 会话启动时调用：预加载用户记忆到缓存
 * 避免每轮对话都查库
 */
export async function initSessionCache(
  userId: string,
  cache: SessionCache
): Promise<void> {
  const memory = await loadUserMemoryFromDB(userId);
  if (memory) {
    cache.setUserMemory(userId, memory);
  }
}
```

---

## 9. 注意事项

### 9.1 Git 相关

项目记忆文件 `.agent/memory.json` **纳入 Git 版本控制**，不需要加入 `.gitignore`：

```gitignore
# .agent/memory.json 应被 Git 追踪，不要忽略它
# 只忽略临时文件和数据库文件

.agent/*.bak
*.db
*.sqlite
*.sqlite3
```

`root_path` 字段固定为 `"."`，不存绝对路径，确保不同机器、不同开发者 checkout 后均能正常使用。

### 9.2 数据库安全

- 用户记忆中**不存储密码、密钥、Token** 等敏感信息
- 数据库文件（SQLite）**不能放在 Git 仓库中**
- 生产环境建议对 `memory_json` 字段加密存储
- Agent 检测到敏感信息时应拒绝写入并提示用户

### 9.3 用户身份识别

数据库中用户记忆以 `user_id` 为主键，来源取决于项目用户体系：

| 场景 | user_id 来源 |
|------|------------|
| 有登录系统 | 登录用户 ID 或 email hash |
| 本地 CLI 工具（无登录） | `os.homedir()` 路径 hash |
| 多人共用机器 | 操作系统用户名 + 机器 ID hash |

### 9.4 记忆大小控制

- `completed_tasks` 最多保留 **50 条**，超出时删除最早的记录
- `decisions` 最多保留 **30 条**，超出时归档到 `.agent/decisions.md`
- 用户记忆的 `dislikes` 数组最多保留 **20 条**
- System Prompt 合并注入总量控制在 **900 tokens 以内**

### 9.5 并发与容错

- `.agent/memory.json` 写入加**文件锁**，防止并发写入损坏
- JSON 解析失败时：备份为 `.bak` → 模板重建 → 日志告警
- 数据库查询失败时：降级为空用户记忆（不中断对话），后台记录错误日志

### 9.6 隐私与数据管理

- 提供用户导出自己记忆数据的接口（JSON 格式）
- 提供用户清除记忆的指令（如 `agent memory clear`）
- 项目记忆属于项目资产，随项目 Git 仓库统一管理

---

*文档版本：2.0.0 | 最后更新：2026-04*
