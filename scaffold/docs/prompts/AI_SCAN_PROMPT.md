# AI 项目扫描提示词模板

> 使用方式：将以下内容完整复制，作为提示词发给任意 AI（Claude / GPT / Gemini 等），
> 配合项目扫描结果一起发送，AI 将严格按格式生成所有辅助文件。

---

## 使用步骤

1. 运行 `bash scripts/scan-project.sh > project_scan.txt`
2. 将扫描输出内容粘贴到提示词的 `[PROJECT_SCAN_RESULT]` 位置
3. 发送给 AI，等待生成
4. 将生成内容按文件名保存到对应路径

---

## 提示词正文（从此处开始复制）

---

你是一名资深软件架构师，负责分析以下项目扫描结果，并严格按照指定格式生成一套完整的 AI 辅助文件。

**核心要求：**
- 所有内容必须从扫描结果中推断，禁止捏造不存在的模块或依赖
- 每个文件必须有完整的 YAML front matter
- 不确定的内容用 `[待补充]` 标注，不要猜测
- 输出时每个文件用 `=== 文件名 ===` 分隔，便于拆分保存

---

### 项目扫描结果

```
[PROJECT_SCAN_RESULT]
```

---

### 请按以下格式和顺序生成全部文件

---

#### 文件 1：`CLAUDE.md`（根目录）

```markdown
---
project: [从配置文件提取项目名]
version: [提取版本号，找不到填 unknown]
updated: [今天日期，格式 YYYY-MM-DD]
stack: [用数组列出主要技术，如 [typescript, nextjs, postgresql]]
ai_context_files:
  - docs/generated/struct/ARCHITECTURE.md
  - docs/generated/struct/CONVENTIONS.md
  - docs/generated/struct/API.md
  - docs/generated/struct/SCHEMA.md
  - docs/generated/struct/GLOSSARY.md
  - docs/generated/struct/BOUNDARIES.md
  - docs/generated/struct/DECISIONS.md
---

# [项目名]

## 一句话描述
[用一句话描述这个项目做什么、服务谁、解决什么问题]

## 技术栈
| 类别 | 技术 |
|------|------|
| 语言 | [从配置文件提取] |
| 框架 | [从依赖提取] |
| 数据库 | [从依赖/配置提取，找不到填 [待补充]] |
| 缓存 | [找不到填 无] |
| 部署 | [从配置文件推断，找不到填 [待补充]] |

## 快速定位（AI 必读）

| 任务类型 | 对应路径 | 参考文件 |
|----------|----------|----------|
| 修改 UI | [前端目录路径] | docs/generated/struct/CONVENTIONS.md |
| 修改 API | [API 目录路径] | docs/generated/struct/API.md |
| 修改数据库 | [schema 文件路径] | docs/generated/struct/SCHEMA.md |
| 理解架构 | — | docs/generated/struct/ARCHITECTURE.md |

## 常用命令
```bash
# 开发
[从 package.json scripts / Makefile 提取]

# 测试
[提取测试命令]

# 构建
[提取构建命令]
```

## 包管理器
[pnpm / npm / yarn / pip / go / cargo / NuGet 等]

## 重要约定
- [从代码风格配置文件推断 1-3 条最重要的约定]
- 详细规范见 `docs/generated/struct/CONVENTIONS.md`

## 文档生成命令
| 命令 | 说明 |
|------|------|
| `/scan-struct` | 结构扫描，生成/更新 docs/generated/struct/ |
| `/scan-behave` | 行为分析，生成/更新 docs/generated/behave/ |
| `/gen-product-docs` | 生成产品文档（PRODUCT、API_GUIDE、RUNBOOK） |
| `/regen-all-docs` | 按顺序执行完整的三阶段文档重新生成流水线 |
```

---

#### 文件 2：`project.json`（根目录）

```json
{
  "name": "[项目名]",
  "version": "[版本号]",
  "description": "[一句话描述]",
  "stack": {
    "language": "[语言 + 版本]",
    "framework": "[框架 + 版本]",
    "database": "[数据库，无则 null]",
    "cache": "[缓存，无则 null]",
    "deploy": "[部署平台，无则 null]"
  },
  "package_manager": "[pnpm/npm/yarn/pip/go/cargo/nuget]",
  "commands": {
    "dev": "[开发命令]",
    "test": "[测试命令]",
    "build": "[构建命令]"
  },
  "ai_context": {
    "entry": "CLAUDE.md",
    "architecture": "docs/generated/struct/ARCHITECTURE.md",
    "conventions": "docs/generated/struct/CONVENTIONS.md",
    "api": "docs/generated/struct/API.md",
    "schema": "docs/generated/struct/SCHEMA.md",
    "glossary": "docs/generated/struct/GLOSSARY.md",
    "boundaries": "docs/generated/struct/BOUNDARIES.md"
  }
}
```

---

#### 文件 3：`docs/generated/struct/ARCHITECTURE.md`

```markdown
---
type: architecture
last_updated: [今天日期]
generated_by: claude-code
prompt: docs/prompts/AI_SCAN_PROMPT.md
related: [SCHEMA.md, API.md]
reviewed_by: pending
---

# 系统架构

## 整体架构类型
[从代码结构判断：单体应用 / 前后端分离 / 微服务 / 插件化桌面应用 等]

## 模块结构
| 模块 | 路径 | 职责 |
|------|------|------|
| [模块名] | [路径] | [一句话职责] |

## 请求/数据流
```mermaid
flowchart LR
  [根据实际技术栈绘制数据流]
```

## 关键依赖关系
```mermaid
graph TD
  [列出核心模块间的依赖，不超过 8 个节点]
```

## 外部依赖服务
| 服务 | 用途 | 配置位置 |
|------|------|----------|
| [从 import / 环境变量名推断] | [用途] | [配置文件路径] |
```

---

#### 文件 4：`docs/generated/struct/CONVENTIONS.md`

```markdown
---
type: conventions
last_updated: [今天日期]
generated_by: claude-code
prompt: docs/prompts/AI_SCAN_PROMPT.md
related: [ARCHITECTURE.md, API.md]
reviewed_by: pending
ai_instruction: 生成任何代码前必须阅读此文件
---

# 编码规范

## 命名规范
| 类型 | 规范 | 示例 |
|------|------|------|
| [从代码推断] | [PascalCase/camelCase/snake_case] | [示例] |

## 代码风格
[从配置文件提取关键规则]

## 测试规范
- 测试框架：[从依赖推断]
- 测试文件位置：[从目录结构推断]

## 禁止事项（AI 特别注意）
- [从配置或代码推断]
```

---

#### 文件 5：`docs/generated/struct/API.md`

```markdown
---
type: api
last_updated: [今天日期]
generated_by: claude-code
prompt: docs/prompts/AI_SCAN_PROMPT.md
related: [SCHEMA.md]
reviewed_by: pending
---

# API / 接口速查

## 基础信息
- 类型：[HTTP API / 插件 API / CLI 等]
- 认证方式：[从代码推断]

## 接口列表
[按模块分组列出所有接口]
```

---

#### 文件 6：`docs/generated/struct/SCHEMA.md`

```markdown
---
type: schema
last_updated: [今天日期]
generated_by: claude-code
prompt: docs/prompts/AI_SCAN_PROMPT.md
related: [API.md, ARCHITECTURE.md]
reviewed_by: pending
---

# 数据模型

## 持久化方式
| 数据 | 存储方式 | 文件位置 |
|------|----------|----------|
| [数据类型] | [存储方式] | [路径] |

## 核心数据模型
[从 schema / models / entities 提取]
```

---

#### 文件 7：`docs/generated/struct/GLOSSARY.md`

```markdown
---
type: glossary
last_updated: [今天日期]
generated_by: claude-code
prompt: docs/prompts/AI_SCAN_PROMPT.md
related: [ARCHITECTURE.md]
reviewed_by: pending
ai_instruction: 遇到不认识的业务词汇先查此表
---

# 领域术语表

| 术语 | 含义 | 代码对应 | 备注 |
|------|------|----------|------|
| [业务名词] | [语义解释] | [对应的类/表/变量名] | [同义词或注意事项] |
```

---

#### 文件 8：`docs/generated/struct/BOUNDARIES.md`

```markdown
---
type: boundaries
last_updated: [今天日期]
generated_by: claude-code
prompt: docs/prompts/AI_SCAN_PROMPT.md
related: [CONVENTIONS.md, API.md]
reviewed_by: pending
ai_instruction: 执行任何写操作前必须检查此文件
---

# AI 操作边界

## 可以直接修改
- `[路径]` — [说明为什么低风险]

## 需要先说明计划再修改
- `[路径]` — [说明影响范围]

## 禁止直接修改
- `[路径]` — [说明原因]
```

---

#### 文件 9：`docs/generated/struct/DECISIONS.md`

```markdown
---
type: decisions
last_updated: [今天日期]
generated_by: claude-code
prompt: docs/prompts/AI_SCAN_PROMPT.md
related: [ARCHITECTURE.md]
reviewed_by: pending
---

# 技术决策记录

> AI 注意：以下决策已经确定，不要在代码建议中推翻这些选择。

## [决策标题]
- **时间**：[找不到填 [未知]]
- **决策**：[从依赖和代码推断]
- **原因**：[从 README / 注释 / 配置推断]
- **影响**：[约束了哪些后续选择]
```

---

### 输出要求

1. 按顺序输出全部 9 个文件
2. 每个文件之间用 `=== 文件路径 ===` 分隔
3. 找不到信息的字段统一用 `[待补充]`，绝不猜测或捏造
4. 每个文件生成完毕后输出一行：`✓ [文件名] 生成完毕`
