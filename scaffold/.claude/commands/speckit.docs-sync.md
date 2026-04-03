---
description: "spec-kit 实现完成后自动触发：增量更新项目文档体系，记录任务编号，确保文档与代码对齐"
---

## 文档同步更新（Spec-Kit After-Implement Hook）

代码实现已完成，现在需要将文档体系与最新代码对齐，并记录变更过程。

---

### 第 1 步：解析变更上下文

1. **定位 feature 目录**：
   - 运行 `.specify/scripts/bash/check-prerequisites.sh --json` 获取 FEATURE_DIR
   - 如果失败，在 `specs/` 下找到最近修改的 feature 目录

2. **读取 tasks.md**，提取所有已完成的任务：
   - 扫描所有 `- [X]` 或 `- [x]` 行
   - 提取每个任务的：**任务编号**（T001、T002...）、**描述**、**涉及的文件路径**

3. **读取 spec.md**，提取功能名称和编号

4. **读取 plan.md**，提取技术方案要点

---

### 第 2 步：分析影响面

将每个已完成任务的文件路径映射到受影响的文档。构建**任务-文档映射表**。

---

### 第 3 步：增量更新文档（带任务标记）

#### 3.1 更新结构文档 (docs/generated/struct/)

1. 读取现有文档内容
2. 读取变更涉及的源代码文件
3. **增量合并**：只修改/新增与变更相关的章节，保留未受影响的内容
4. **在新增/修改的内容旁添加任务标记注释**：
   ```markdown
   | 新模块 | `src/xxx/` | 模块说明 |
   <!-- spec: 001-feature-name, tasks: T001, T003 -->
   ```
5. 更新 frontmatter：
   ```yaml
   last_updated: [今天日期]
   last_sync_spec: [feature 编号]
   last_sync_tasks: [任务编号列表]
   ```

#### 3.2 更新行为文档 (docs/generated/behave/)

同 3.1 逻辑，增量合并 + 标记来源任务。

#### 3.3 更新产品文档 (docs/)

- **PRODUCT.md**：如果新增了用户可感知的功能 → 更新核心功能章节
- **API_GUIDE.md**：如果新增/修改了 API → 更新接口文档
- **RUNBOOK.md**：如果变更影响部署、运维、故障排查 → 更新对应章节

**重要**：不要全量重写，只增量更新受影响的部分。

---

### 第 4 步：写入变更日志

在 `docs/CHANGELOG.md` 中追加本次同步记录（如果文件不存在则创建）。

**格式**：

```markdown
## [feature-编号] 功能名称 — 日期

**来源**: specs/feature-编号/
**已完成任务**: T001, T003, T005, T007

### 文档变更明细

| 任务 | 变更描述 | 更新的文档 |
|------|----------|-----------|
| T001 | 变更描述 | 文档列表 |
| T003 | 变更描述 | 文档列表 |

### 新增内容摘要

- **ARCHITECTURE.md**: 新增了什么
- **API.md**: 新增了什么
```

> CHANGELOG.md 按时间倒序排列，最新记录在最上面。

---

### 第 5 步：验证与报告

1. 确认 `docs/DOCS_INDEX.md` 的文件结构树与实际文件一致
2. 确认所有更新的文档 frontmatter 中 `last_updated` 和 `last_sync_tasks` 已刷新
3. 确认 `docs/CHANGELOG.md` 已追加本次记录
4. 输出更新摘要（含每个任务对应更新了哪些文档）
