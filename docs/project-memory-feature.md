# 项目记忆功能开发文档

> **适用项目**：已集成 Claude SDK、具备 AI 对话与文件变更能力的 Agent 项目  
> **文档目的**：指导 Claude Code 在现有项目基础上补充项目记忆功能

---

## 目录

1. [功能概述](#1-功能概述)
2. [功能详细描述](#2-功能详细描述)
3. [文件结构规范](#3-文件结构规范)
4. [memory.json 初始化模板](#4-memoryjson-初始化模板)
5. [系统提示词修改样例](#5-系统提示词修改样例)
6. [实现代码参考](#6-实现代码参考)
7. [注意事项](#7-注意事项)

---

## 1. 功能概述

项目记忆功能使 Agent 具备**跨会话的项目上下文感知能力**。通过在每次 AI 对话前自动读取记忆文件、对话结束后自动更新记忆文件，让 Claude 在每次新会话中都能"记住"项目的历史状态、架构决策和用户偏好。

### 核心目标

- **消除重复解释**：用户无需每次重新介绍项目背景
- **任务状态持久化**：跨会话追踪任务进度
- **决策记录**：保留关键架构决策的上下文和原因
- **偏好学习**：记住用户的代码风格和交互偏好

### 记忆文件位置规范

```
your-project/
├── .agent/
│   ├── memory.json          # 核心记忆文件（本功能主体）
│   ├── tasks.json           # 任务详细记录（可选扩展）
│   └── decisions.md         # 架构决策日志（可选扩展）
├── src/
├── package.json
└── ...
```

> **约定**：记忆文件固定存储在项目根目录的 `.agent/memory.json`，文件名和路径不可动态变化，Agent 必须始终从该固定路径读取和写入。

---

## 2. 功能详细描述

### 2.1 整体生命周期

```
用户输入消息
      │
      ▼
┌─────────────────────────────┐
│  [PRE] 对话前：自动读取记忆  │
│  - 检查 .agent/memory.json  │
│  - 文件不存在则初始化        │
│  - 将记忆内容注入 system     │
│    prompt                   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  [EXEC] 发送请求给 Claude   │
│  - 携带注入记忆的 system     │
│    prompt                   │
│  - 携带用户消息和对话历史    │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  [POST] 对话后：自动更新记忆 │
│  - 触发记忆更新判断          │
│  - 满足条件则调用更新流程    │
│  - 写回 .agent/memory.json  │
└─────────────────────────────┘
```

---

### 2.2 对话前：自动读取记忆

**触发时机**：每次调用 Claude API 之前，无需用户干预，自动执行。

**执行步骤**：

1. 检测项目根目录下是否存在 `.agent/memory.json`
2. **若不存在**：使用初始化模板创建文件，并用当前项目基本信息填充
3. **若存在**：读取文件内容，解析为结构化对象
4. 从记忆对象中提取关键字段，构建记忆摘要字符串
5. 将记忆摘要追加注入到 system prompt 的指定位置

**注入内容选择原则**（避免 token 浪费）：

| 字段 | 是否注入 | 说明 |
|------|---------|------|
| `project.name` / `description` | ✅ 始终 | 基础上下文 |
| `project.tech_stack` | ✅ 始终 | 影响代码生成 |
| `architecture.summary` | ✅ 始终 | 架构感知 |
| `architecture.key_modules` | ✅ 始终 | 模块定位 |
| `current_tasks` | ✅ 始终 | 当前任务焦点 |
| `completed_tasks` | ⚠️ 仅摘要 | 只注入最近 3 条 |
| `decisions` | ⚠️ 仅摘要 | 只注入最近 5 条 |
| `user_preferences` | ✅ 始终 | 影响回复风格 |

---

### 2.3 对话后：自动更新记忆

**更新触发条件**（满足任意一条即触发，避免每轮都更新浪费 token）：

| 触发条件 | 说明 |
|---------|------|
| 本轮对话涉及文件变更 | Agent 已有文件变更能力，变更后必须更新记忆中的模块信息 |
| 用户明确表达记忆意图 | 消息中包含"记住"、"记录"、"下次"、"保存"等关键词 |
| 任务状态发生变化 | 检测到任务完成、新任务开始等关键词 |
| 出现架构决策 | 消息中包含"决定"、"方案"、"架构"、"改为"等关键词 |
| 对话轮次达到阈值 | 每 10 轮强制更新一次，防止记忆过期 |

**更新执行步骤**：

1. 满足触发条件后，向 Claude 发送**独立的记忆更新请求**（不展示给用户）
2. 请求中包含：当前 `memory.json` 内容 + 本轮对话摘要
3. Claude 返回需要变更的字段（JSON Patch 格式或完整 JSON）
4. Agent 合并更新内容到 `memory.json`
5. 更新 `meta.last_updated` 时间戳
6. 写回文件

**记忆更新请求的 Prompt 模板**：

```
以下是当前项目记忆文件内容：
<memory>
{当前 memory.json 内容}
</memory>

以下是刚刚完成的对话摘要：
<conversation>
用户：{用户消息摘要}
助手：{助手回复摘要，含文件变更信息}
</conversation>

请根据本轮对话，以 JSON 格式返回需要更新的记忆字段。
规则：
1. 只返回需要变更的字段，未变更的字段不要包含在返回中
2. current_tasks 中已完成的任务移入 completed_tasks
3. 新发现的架构信息补充到 architecture.key_modules
4. 用户表达的偏好更新到 user_preferences
5. 严格只返回 JSON，不要包含任何解释文字
```

---

### 2.4 记忆文件的初始化流程

当项目首次使用 Agent 时，需要初始化记忆文件：

1. 自动创建 `.agent/` 目录（若不存在）
2. 读取项目根目录的 `package.json` / `pyproject.toml` 等获取项目名称和描述
3. 扫描项目根目录结构，识别技术栈（检测 `package.json`、`requirements.txt`、`go.mod` 等）
4. 使用初始化模板生成 `memory.json`，填入自动识别到的信息
5. 将 `.agent/` 加入 `.gitignore`（可选，由用户决定是否纳入版本控制）

---

## 3. 文件结构规范

### 3.1 目录结构

```
.agent/
├── memory.json       # 必须：核心记忆文件，固定文件名
├── tasks.json        # 可选：详细任务记录
└── decisions.md      # 可选：人类可读的决策日志
```

### 3.2 读写权限

- **Agent 可读写**：`.agent/memory.json`、`.agent/tasks.json`
- **Agent 只读**：`.agent/decisions.md`（由人工维护，Agent 只追加，不覆盖）
- **禁止 Agent 删除**：任何记忆文件，只允许更新内容

---

## 4. memory.json 初始化模板

以下为完整的初始化模板，Agent 在首次初始化时使用此结构创建文件：

```json
{
  "meta": {
    "version": "1.0.0",
    "created_at": "{{ISO_TIMESTAMP}}",
    "last_updated": "{{ISO_TIMESTAMP}}",
    "agent_version": "1.0.0"
  },
  "project": {
    "name": "{{PROJECT_NAME}}",
    "description": "{{PROJECT_DESCRIPTION}}",
    "root_path": "{{PROJECT_ROOT_PATH}}",
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
  "user_preferences": {
    "reply_language": "中文",
    "code_style": "",
    "comment_style": "",
    "custom": {}
  },
  "session_stats": {
    "total_sessions": 0,
    "total_file_changes": 0,
    "last_session_at": null
  }
}
```

### 4.1 字段说明

#### `meta` — 元信息

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | string | 记忆文件格式版本，便于未来迁移 |
| `created_at` | ISO string | 文件创建时间 |
| `last_updated` | ISO string | 最后更新时间，每次写入时自动刷新 |
| `agent_version` | string | Agent 版本号，便于兼容性判断 |

#### `project` — 项目基础信息

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 项目名称，从 package.json 等自动识别 |
| `description` | string | 项目描述 |
| `root_path` | string | 项目根目录绝对路径 |
| `tech_stack` | string[] | 技术栈列表，如 `["TypeScript", "Node.js", "Claude SDK"]` |
| `main_language` | string | 主要编程语言 |
| `entry_point` | string | 项目入口文件路径 |
| `package_manager` | string | 包管理器，如 `npm` / `pnpm` / `yarn` |

#### `architecture` — 架构信息

| 字段 | 类型 | 说明 |
|------|------|------|
| `summary` | string | 架构概述，自然语言描述，100字以内 |
| `patterns` | string[] | 使用的架构模式，如 `["分层架构", "事件驱动"]` |
| `key_modules` | object[] | 关键模块列表，见下方结构 |

`key_modules` 单项结构：
```json
{
  "name": "claude-client",
  "path": "src/core/claude.ts",
  "role": "Claude SDK 封装，处理所有 AI 请求",
  "dependencies": ["anthropic"]
}
```

#### `current_tasks` — 进行中的任务

单项结构：
```json
{
  "id": "task-003",
  "title": "实现项目记忆功能",
  "description": "在 AI 对话前后自动读写 .agent/memory.json",
  "status": "in_progress",
  "priority": "high",
  "started_at": "{{ISO_TIMESTAMP}}",
  "context": "用户希望 Agent 能跨会话记住项目状态，避免重复解释背景"
}
```

#### `completed_tasks` — 已完成任务

单项结构：
```json
{
  "id": "task-001",
  "title": "Claude SDK 集成",
  "description": "集成 Anthropic SDK，实现基础 AI 对话能力",
  "completed_at": "{{ISO_TIMESTAMP}}"
}
```

#### `decisions` — 架构决策记录

单项结构：
```json
{
  "id": "decision-001",
  "date": "{{ISO_DATE}}",
  "title": "使用 Streaming 方式调用 Claude",
  "decision": "采用 stream: true 参数调用 Claude API",
  "reason": "用户体验更好，可实时看到输出，避免长时间等待",
  "alternatives_considered": ["普通请求模式"],
  "made_by": "user"
}
```

#### `user_preferences` — 用户偏好

| 字段 | 类型 | 说明 |
|------|------|------|
| `reply_language` | string | 回复语言，如 `"中文"` / `"English"` |
| `code_style` | string | 代码风格描述，如 `"TypeScript 严格模式，函数式优先"` |
| `comment_style` | string | 注释风格，如 `"关键逻辑必须注释，使用中文"` |
| `custom` | object | 其他自定义偏好，键值对形式 |

---

## 5. 系统提示词修改样例

### 5.1 修改前（原始 system prompt）

```typescript
const systemPrompt = `
你是一个智能编程助手，可以帮助用户完成代码编写、文件修改等任务。
你可以读取和修改项目中的文件。
请用中文回复。
`;
```

### 5.2 修改后（注入记忆的 system prompt）

```typescript
/**
 * 构建携带项目记忆的系统提示词
 * 在每次调用 Claude API 前调用此函数
 */
async function buildSystemPromptWithMemory(projectRoot: string): Promise<string> {
  const memory = await loadMemory(projectRoot); // 读取 .agent/memory.json

  // 基础能力描述（不变部分）
  const basePrompt = `
你是一个智能编程助手，可以帮助用户完成代码编写、文件修改等任务。
你可以读取和修改项目中的文件。
`;

  // 记忆注入部分（动态生成）
  const memorySection = buildMemorySection(memory);

  // 用户偏好部分
  const preferencesSection = `
## 用户偏好
- 回复语言：${memory.user_preferences.reply_language}
- 代码风格：${memory.user_preferences.code_style || '未指定'}
- 注释风格：${memory.user_preferences.comment_style || '未指定'}
`;

  return `${basePrompt}\n${memorySection}\n${preferencesSection}`;
}

/**
 * 从记忆对象构建记忆摘要字符串，注入到 system prompt
 */
function buildMemorySection(memory: ProjectMemory): string {
  const currentTasksText = memory.current_tasks.length > 0
    ? memory.current_tasks.map(t => `  - [${t.status}] ${t.title}：${t.description}`).join('\n')
    : '  - 暂无进行中的任务';

  const recentCompletedText = memory.completed_tasks.slice(-3).length > 0
    ? memory.completed_tasks.slice(-3).map(t => `  - ✅ ${t.title}`).join('\n')
    : '  - 暂无已完成任务';

  const keyModulesText = memory.architecture.key_modules.length > 0
    ? memory.architecture.key_modules.map(m => `  - \`${m.path}\`：${m.role}`).join('\n')
    : '  - 暂无模块记录';

  const recentDecisionsText = memory.decisions.slice(-5).length > 0
    ? memory.decisions.slice(-5).map(d => `  - ${d.title}：${d.reason}`).join('\n')
    : '  - 暂无决策记录';

  return `
## 项目记忆上下文
> 以下信息来自项目记忆文件，帮助你了解项目的当前状态。

### 项目信息
- **项目名称**：${memory.project.name}
- **项目描述**：${memory.project.description}
- **技术栈**：${memory.project.tech_stack.join('、') || '未记录'}
- **入口文件**：${memory.project.entry_point || '未记录'}

### 架构概述
${memory.architecture.summary || '暂无架构描述'}

### 关键模块
${keyModulesText}

### 当前任务
${currentTasksText}

### 最近完成的任务
${recentCompletedText}

### 近期架构决策
${recentDecisionsText}

---
请基于以上项目上下文理解用户的需求，保持与历史决策的一致性。
`;
}
```

### 5.3 注入后的 system prompt 实际效果示例

```
你是一个智能编程助手，可以帮助用户完成代码编写、文件修改等任务。
你可以读取和修改项目中的文件。

## 项目记忆上下文
> 以下信息来自项目记忆文件，帮助你了解项目的当前状态。

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
  - `src/cli/prompt.ts`：命令行交互，处理用户输入输出

### 当前任务
  - [in_progress] 实现项目记忆功能：在 AI 对话前后自动读写 .agent/memory.json

### 最近完成的任务
  - ✅ Claude SDK 集成
  - ✅ AI 对话与文件变更

### 近期架构决策
  - 使用 Streaming 方式调用 Claude：用户体验更好，可实时看到输出

---
请基于以上项目上下文理解用户的需求，保持与历史决策的一致性。

## 用户偏好
- 回复语言：中文
- 代码风格：TypeScript 严格模式，函数式优先
- 注释风格：关键逻辑必须注释，使用中文
```

---

## 6. 实现代码参考

### 6.1 记忆管理模块结构

```
src/
└── memory/
    ├── index.ts          # 对外暴露的接口
    ├── loader.ts         # 读取记忆文件
    ├── updater.ts        # 更新记忆文件
    ├── initializer.ts    # 初始化记忆文件
    ├── injector.ts       # 构建注入 system prompt 的记忆摘要
    └── types.ts          # TypeScript 类型定义
```

### 6.2 核心类型定义（types.ts）

```typescript
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
    root_path: string;
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
  user_preferences: {
    reply_language: string;
    code_style: string;
    comment_style: string;
    custom: Record<string, string>;
  };
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
```

### 6.3 更新触发判断（updater.ts 核心逻辑）

```typescript
/**
 * 判断本轮对话是否需要触发记忆更新
 */
export function shouldUpdateMemory(params: {
  userMessage: string;
  assistantReply: string;
  fileChanges: string[];
  roundCount: number;
}): boolean {
  const { userMessage, assistantReply, fileChanges, roundCount } = params;

  // 条件1：有文件变更
  if (fileChanges.length > 0) return true;

  // 条件2：用户明确要求记忆
  const memoryKeywords = ['记住', '记录', '下次', '保存', '别忘了', 'remember', 'save'];
  if (memoryKeywords.some(kw => userMessage.includes(kw))) return true;

  // 条件3：任务状态变化
  const taskKeywords = ['完成了', '做好了', '开始', '新功能', '新需求', 'done', 'finished'];
  if (taskKeywords.some(kw => userMessage.includes(kw) || assistantReply.includes(kw))) return true;

  // 条件4：出现决策性内容
  const decisionKeywords = ['决定', '方案', '架构', '改为', '采用', '选择'];
  if (decisionKeywords.some(kw => assistantReply.includes(kw))) return true;

  // 条件5：每 10 轮强制更新
  if (roundCount % 10 === 0) return true;

  return false;
}
```

---

## 7. 注意事项

### 7.1 .gitignore 建议

在项目 `.gitignore` 中添加以下内容（根据团队情况决定是否纳入版本控制）：

```gitignore
# Agent 记忆文件（包含项目路径等本地信息，建议不纳入版本控制）
.agent/
```

若团队协作需要共享记忆，则**不添加**此条目，并确保 `root_path` 字段使用相对路径。

### 7.2 记忆文件大小控制

- `completed_tasks` 最多保留 **50 条**，超出时删除最早的记录
- `decisions` 最多保留 **30 条**，超出时归档到 `.agent/decisions.md`
- 单次 system prompt 注入的记忆内容，token 建议控制在 **800 tokens 以内**

### 7.3 并发写入保护

Agent 需要对 `.agent/memory.json` 的写入操作加文件锁，防止多个 Agent 实例并发写入导致数据损坏。

### 7.4 记忆文件损坏处理

读取 `memory.json` 时若 JSON 解析失败：
1. 备份损坏文件为 `.agent/memory.json.bak`
2. 使用初始化模板重新创建 `memory.json`
3. 在日志中输出警告，提示用户检查备份文件

---

*文档版本：1.0.0 | 最后更新：2025-01*
