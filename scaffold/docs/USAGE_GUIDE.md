# AI 开发操作手册

> 本文档面向开发者，说明如何使用 Spec-Kit + 文档体系进行日常开发。
> 所有命令在 Claude Code 终端中执行。

---

## 一、环境准备

### 1.1 首次使用前检查

```bash
# 确认 specify CLI 已安装
export PATH="$HOME/.local/bin:$PATH"
specify check

# 如未安装，执行以下命令
pip install uv
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# 升级 spec-kit
uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git
```

### 1.2 项目结构确认

```
项目根目录/
├── CLAUDE.md                          # AI 上下文入口（技术栈、约定、命令速查）
│
├── .specify/                          # Spec-Kit 配置
│   ├── extensions.yml                     # 钩子配置（3 个自动触发点）
│   ├── memory/constitution.md             # 项目原则
│   ├── templates/                         # Spec-Kit 文档模板
│   └── scripts/bash/                      # Spec-Kit 辅助脚本
│
├── specs/                                 # Spec-Kit 需求/方案/任务（开发过程产物）
│   └── 001-feature-name/
│       ├── spec.md                            # 需求规格（/speckit.specify 生成）
│       ├── plan.md                            # 技术方案（/speckit.plan 生成）
│       ├── tasks.md                           # 任务清单（/speckit.tasks 生成）
│       └── checklists/                        # 质量检查清单（/speckit.checklist 生成）
│
├── .claude/commands/                  # Slash Commands
│   ├── speckit.*.md                       # Spec-Kit 开发命令（9 个，specify init 生成）
│   ├── speckit.load-context.md            # 加载项目上下文（自动触发）
│   ├── speckit.docs-sync.md               # 文档同步（自动触发）
│   ├── scan-struct.md                     # 全量结构扫描
│   ├── scan-behave.md                     # 全量行为分析
│   ├── gen-product-docs.md                # 产品文档生成
│   └── regen-all-docs.md                  # 全量重新生成
│
├── docs/
│   ├── DOCS_INDEX.md                  # 文档目录索引
│   ├── USAGE_GUIDE.md                 # 本文件
│   ├── CHANGELOG.md                   # 文档变更日志（按任务编号追溯）
│   ├── prompts/                       # AI 提示词（输入）
│   │   ├── AI_SCAN_PROMPT.md              # 阶段1：结构扫描提示词
│   │   ├── AI_BEHAVIOR_SCAN_PROMPT.md     # 阶段2：行为分析提示词
│   │   └── AI_PRODUCT_DOC_PROMPT.md       # 阶段3：产品文档生成提示词
│   ├── generated/                     # AI 生成产物（输出）
│   │   ├── struct/                        # 结构分析文档（7 个）
│   │   └── behave/                        # 行为分析文档（3 个）
│   ├── PRODUCT.md                     # 产品说明书（面向用户）
│   ├── API_GUIDE.md                   # 开发者指南
│   └── RUNBOOK.md                     # 运维手册
```

### 1.3 钩子配置说明

项目通过 `.specify/extensions.yml` 注册了 3 个自动触发钩子：

```yaml
hooks:
  before_specify:     # /speckit.specify 前 → 自动加载项目文档上下文
    - command: speckit.load-context

  before_plan:        # /speckit.plan 前 → 自动加载项目文档上下文
    - command: speckit.load-context

  after_implement:    # /speckit.implement 后 → 自动同步更新文档
    - command: speckit.docs-sync
```

| 钩子 | 触发时机 | 自动执行 | 作用 |
|------|----------|----------|------|
| `before_specify` | 每次 `/speckit.specify` 前 | `/speckit.load-context` | 让需求定义对齐现有架构 |
| `before_plan` | 每次 `/speckit.plan` 前 | `/speckit.load-context` | 让技术方案基于真实规范 |
| `after_implement` | 每次 `/speckit.implement` 后 | `/speckit.docs-sync` | 代码变更后自动更新文档 |

> 这三个钩子全部是 mandatory（强制执行），无需手动操作。

---

## 二、项目上下文自动加载

### 2.1 机制说明

每次执行 `/speckit.specify` 或 `/speckit.plan` 时，会自动先执行 `/speckit.load-context`，读取项目现有文档：

```
你输入：/speckit.specify 新增一个 XXX 功能
               ↓
自动触发：/speckit.load-context
               ↓ 读取 ARCHITECTURE.md、API.md、CONVENTIONS.md 等 10+ 个文档
               ↓ 提取架构约束、编码规范、术语体系、禁止区域
               ↓
继续执行：/speckit.specify（已带项目上下文）
```

### 2.2 加载了哪些文档

| 文档 | 提供的上下文 | 对 specify/plan 的影响 |
|------|-------------|----------------------|
| `CLAUDE.md` | 项目概述、技术栈、常用命令 | 确定项目边界和技术基础 |
| `ARCHITECTURE.md` | 系统架构、模块职责边界 | 新功能应放在哪个模块/目录 |
| `API.md` | 现有接口、基类方法签名 | 新模块必须实现哪些接口 |
| `CONVENTIONS.md` | 命名规范、代码风格、文件组织 | 生成的代码遵循项目规范 |
| `GLOSSARY.md` | 业务术语与代码名称的映射 | 需求描述使用正确的术语 |
| `BOUNDARIES.md` | 可修改/需审批/禁止修改的区域 | 避免设计触碰禁区 |
| `SCHEMA.md` | 数据模型、持久化方式 | 数据模型设计对齐现有方式 |
| `DECISIONS.md` | 已确定的技术决策 | 不会建议推翻已有技术选择 |
| `FLOWS.md` | 核心业务流程 | 理解新功能如何嵌入现有流程 |
| `USAGE.md` | 模块使用说明、副作用标注 | 了解现有模块的调用方式 |
| `CALLGRAPH.md` | 调用链、反向依赖 | 评估修改的影响范围 |
| `constitution.md` | 项目原则 | 确保符合项目质量标准 |

### 2.3 手动加载

在其他场景下（如直接提问、调试等），可以手动加载上下文：

```
/speckit.load-context
```

---

## 三、新功能开发（完整流程）

### 第 1 步：建立项目原则（仅首次需要）

```
/speckit.constitution
```

输入示例：

```
建立以下项目原则：
- [你的代码质量标准]
- [你的架构约束]
- [你的测试要求]
```

> 项目原则保存在 `.specify/memory/constitution.md`，后续所有开发自动遵守。
> 只需执行一次，除非原则需要变更。

---

### 第 2 步：定义需求

```
/speckit.specify [在这里描述你的需求]
```

> 自动触发 `load-context` → 读取项目文档 → 基于项目架构生成精准需求。
> 生成物：`specs/<编号>-<短名称>/spec.md`

---

### 第 3 步：设计技术方案

```
/speckit.plan [在这里补充技术偏好和约束]
```

> 自动触发 `load-context` → 方案会基于真实的架构、目录结构、编码规范来设计。
> 生成物：`specs/<编号>-<短名称>/plan.md`

**可选 — 如果需求有模糊点（在 plan 之前执行）：**

```
/speckit.clarify
```

---

### 第 4 步：生成任务列表

```
/speckit.tasks
```

> 自动读取 spec.md + plan.md，生成分阶段的任务清单。
> 生成物：`specs/<编号>-<短名称>/tasks.md`

**可选 — 检查一致性（在 implement 之前执行）：**

```
/speckit.analyze
```

**可选 — 生成质量检查清单（在 plan 之后执行）：**

```
/speckit.checklist
```

---

### 第 5 步：执行实现

```
/speckit.implement
```

> AI 按照 tasks.md 逐任务执行：创建文件、编写代码、运行测试。
> 每完成一个任务自动在 tasks.md 中标记 `[X]`。
>
> **实现完成后自动触发 `/speckit.docs-sync`**，增量更新所有文档并记录变更。

---

## 四、文档同步与变更追踪

### 4.1 自动同步（推荐）

执行 `/speckit.implement` 完成后，会自动触发文档同步。无需额外操作。

同步流程：

```
/speckit.implement 完成
       ↓
自动触发 /speckit.docs-sync
       ↓
1. 解析 tasks.md，提取所有已完成任务（[X]）的编号和文件路径
2. 构建「任务 → 文档」映射表
3. 增量更新受影响的文档章节（不全量重写）
4. 在文档中标记来源任务编号
5. 追加变更记录到 docs/CHANGELOG.md
6. 输出更新摘要报告
```

### 4.2 任务编号追踪

每次文档同步会在两个层面记录任务编号：

**层面 1 — 文档 frontmatter 标记**

每个被更新的文档，frontmatter 中会新增/更新：

```yaml
---
last_updated: 2026-03-20
last_sync_spec: 001-feature-name          # 来源 feature 编号
last_sync_tasks: [T001, T003, T007]       # 触发本次更新的任务列表
---
```

**层面 2 — 行内注释标记**

新增/修改的内容旁会添加 HTML 注释，标注来源：

```markdown
| 新模块 | `src/modules/xxx/` | 模块说明 |
<!-- spec: 001-feature-name, tasks: T001, T003 -->
```

> 这些注释不影响文档渲染，但可以通过搜索 `<!-- spec:` 快速定位某次变更修改了哪些内容。

### 4.3 变更日志（docs/CHANGELOG.md）

每次 docs-sync 完成后，会在 `docs/CHANGELOG.md` 追加一条完整记录：

```markdown
## [001-feature-name] 功能名称 — 2026-03-20

**来源**: specs/001-feature-name/
**已完成任务**: T001, T003, T005, T007

### 文档变更明细

| 任务 | 变更描述 | 更新的文档 |
|------|----------|-----------|
| T001 | 新增项目结构 | ARCHITECTURE.md |
| T003 | 实现核心逻辑 | API.md, GLOSSARY.md |
| T005 | 创建 UI 界面 | — (纯 UI，无文档影响) |
| T007 | 添加集成逻辑 | USAGE.md, CALLGRAPH.md |

### 新增内容摘要

- **ARCHITECTURE.md**: 模块表新增 XXX
- **API.md**: 新增接口说明
- **GLOSSARY.md**: 新增术语
```

> CHANGELOG.md 按时间倒序排列，最新记录在最上面。
> 可用于回溯：某个文档的某段内容是哪个 feature 的哪个 task 引入的。

### 4.4 追溯查询示例

**问题：ARCHITECTURE.md 中某模块是什么时候加的？**

```bash
# 方法 1 — 搜索行内注释
grep "spec:.*feature-name" docs/generated/struct/ARCHITECTURE.md

# 方法 2 — 查看 CHANGELOG.md
grep -A 20 "001-feature-name" docs/CHANGELOG.md

# 方法 3 — 查看文档 frontmatter
head -10 docs/generated/struct/ARCHITECTURE.md
```

### 4.5 手动同步

手动改了代码（没走 spec-kit 流程），手动触发：

```
/speckit.docs-sync
```

> 手动触发时，如果找不到 feature 上下文，会基于文件变更内容推断影响面，
> CHANGELOG.md 中记录为 `[manual-sync]`。

### 4.6 全量重新生成

当文档严重过时或结构需要重建时：

```
/regen-all-docs              # 一键三阶段全量重建（最慢，最彻底）
```

也可以分阶段单独执行：

```
/scan-struct                 # 仅重新生成 docs/generated/struct/（7 个文件）
/scan-behave                 # 仅重新生成 docs/generated/behave/（3 个文件）
/gen-product-docs            # 仅重新生成 PRODUCT.md、API_GUIDE.md、RUNBOOK.md
```

> 全量重建会清除行内的任务标记注释，但 CHANGELOG.md 的历史记录会保留。

### 4.7 增量 vs 全量对比

| | 增量同步 (`docs-sync`) | 全量重建 (`regen-all-docs`) |
|---|---|---|
| 触发方式 | implement 后自动 / 手动 | 仅手动 |
| 更新范围 | 仅受变更影响的章节 | 所有文档全部重写 |
| 任务追踪 | 保留行内标记 + 写 CHANGELOG | 清除行内标记，CHANGELOG 保留 |
| 耗时 | 快（几十秒） | 慢（几分钟） |
| 适用场景 | 日常开发 | 文档严重过时、项目大重构 |
| 是否覆盖手动编辑 | 不会 | 会 |

---

## 五、常见场景速查

### 场景 1：新增一个功能模块

```
/speckit.specify    → 描述功能需求
/speckit.plan       → 指定技术方案
/speckit.tasks      → 生成任务
/speckit.implement  → 执行（自动加载上下文 + 自动同步文档）
```

### 场景 2：修改现有模块的业务逻辑

```
/speckit.specify    → 描述要修改什么、为什么修改
/speckit.plan       → 说明修改方案
/speckit.tasks
/speckit.implement  → 执行（自动同步文档）
```

### 场景 3：只改了几行代码，需要同步文档

```
/speckit.docs-sync
```

### 场景 4：新同事入职，需要了解项目

推荐阅读顺序：

1. `CLAUDE.md` — 项目概览、技术栈、命令速查
2. `docs/PRODUCT.md` — 产品功能介绍
3. `docs/generated/struct/ARCHITECTURE.md` — 系统架构
4. `docs/generated/struct/GLOSSARY.md` — 业务术语对照表
5. `docs/API_GUIDE.md` — 开发入门
6. `docs/USAGE_GUIDE.md` — 本文件（开发操作手册）

### 场景 5：文档全部过时，需要从头生成

```
/regen-all-docs
```

### 场景 6：想让 AI 先了解项目再提问

```
/speckit.load-context
```

### 场景 7：查看某个文档变更是哪个任务引入的

```bash
grep "spec:" docs/generated/struct/ARCHITECTURE.md   # 行内标记
grep -A 20 "feature-name" docs/CHANGELOG.md          # 变更日志
```

---

## 六、命令速查表

### Spec-Kit 开发命令

| 命令 | 必须 | 说明 | 产物 |
|------|------|------|------|
| `/speckit.constitution` | 首次 | 建立项目原则 | `.specify/memory/constitution.md` |
| `/speckit.specify` | 是 | 定义需求和用户故事 | `spec.md` |
| `/speckit.clarify` | 可选 | 澄清模糊需求（plan 前） | 输出到终端 |
| `/speckit.plan` | 是 | 设计技术实现方案 | `plan.md` |
| `/speckit.checklist` | 可选 | 生成质量检查清单（plan 后） | `checklists/*.md` |
| `/speckit.tasks` | 是 | 生成任务列表 | `tasks.md` |
| `/speckit.analyze` | 可选 | 交叉一致性检查（tasks 后） | 输出到终端 |
| `/speckit.implement` | 是 | 执行实现 → 自动触发文档同步 | 代码 + 文档更新 |

### 上下文与文档命令

| 命令 | 触发方式 | 说明 |
|------|----------|------|
| `/speckit.load-context` | specify/plan 前自动 | 加载项目文档上下文到会话 |
| `/speckit.docs-sync` | implement 后自动 | 增量更新文档 + 写 CHANGELOG |
| `/scan-struct` | 手动 | 全量重新生成 `generated/struct/`（7 个文件） |
| `/scan-behave` | 手动 | 全量重新生成 `generated/behave/`（3 个文件） |
| `/gen-product-docs` | 手动 | 全量重新生成 PRODUCT + API_GUIDE + RUNBOOK |
| `/regen-all-docs` | 手动 | 一键全量重新生成所有文档 |

---

## 七、执行顺序规则

```
speckit.constitution（仅首次）
       ↓
speckit.specify（每次新需求）
  ↑ 自动：load-context 加载项目上下文
       ↓
   [speckit.clarify]（可选，plan 前澄清需求）
       ↓
speckit.plan
  ↑ 自动：load-context 加载项目上下文
       ↓
   [speckit.checklist]（可选，plan 后生成检查清单）
       ↓
speckit.tasks
       ↓
   [speckit.analyze]（可选，implement 前检查一致性）
       ↓
speckit.implement
       ↓ 自动：docs-sync 增量更新文档 + 写 CHANGELOG
       ✓ 完成
```

**规则：**
- `specify` → `plan` → `tasks` → `implement` 四步是必须的，不可跳步
- `constitution` 只需首次执行一次，除非原则需要变更
- 方括号 `[]` 表示可选步骤
- 三个自动钩子（`load-context` x2 + `docs-sync` x1）无需手动操作

---

## 八、文件产物一览

| 阶段 | 产物位置 | 说明 | 生命周期 |
|------|----------|------|----------|
| constitution | `.specify/memory/constitution.md` | 项目原则 | 长期保留 |
| specify | `specs/<编号>-<短名称>/spec.md` | 需求规格 | 开发完成后可归档 |
| plan | `specs/<编号>-<短名称>/plan.md` | 技术方案 | 开发完成后可归档 |
| tasks | `specs/<编号>-<短名称>/tasks.md` | 任务清单 | 开发完成后可归档 |
| implement | 项目源代码 | 实际代码变更 | 永久保留 |
| docs-sync | `docs/generated/**/*.md` + `docs/*.md` | 文档增量更新 | 随项目持续维护 |
| changelog | `docs/CHANGELOG.md` | 文档变更日志 | 永久保留，可追溯 |

---

## 九、注意事项

1. **不要手动编辑 `docs/generated/` 下的文件** — 它们会被 `docs-sync` 或 `scan-*` 覆盖。如需永久修改，改对应的 prompt 模板（`docs/prompts/`）。

2. **`PRODUCT.md`、`API_GUIDE.md`、`RUNBOOK.md` 可以手动编辑** — `docs-sync` 只增量更新受影响的章节，不会覆盖你的手动修改（除非执行 `/gen-product-docs` 全量重建）。

3. **specs 目录是开发过程产物** — `specs/<编号>-<短名称>/` 下的 spec.md、plan.md、tasks.md 是需求和方案记录，功能完成后可以归档或删除，不影响已生成的代码和文档。

4. **文档同步是增量的** — `/speckit.docs-sync` 只更新受变更影响的部分，并在 CHANGELOG.md 记录变更明细。需要全量重建时用 `/regen-all-docs`。

5. **上下文加载是会话级的** — `/speckit.load-context` 加载的上下文只在当前 Claude Code 会话中有效。新会话需要重新加载（specify/plan 会自动触发，无需手动）。

6. **PATH 配置** — 如果 `specify` 命令找不到，执行：
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   ```

7. **不要修改 `.specify/extensions.yml` 中的钩子** — 除非你清楚后果。三个钩子是文档体系与 spec-kit 融合的核心机制。

8. **CHANGELOG.md 不要删除** — 它是唯一的全局变更追溯记录，全量重建也不会覆盖。
