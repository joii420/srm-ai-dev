---
description: "加载项目现有文档作为上下文，让后续 specify/plan 命令理解现有项目"
---

## 项目上下文加载

在执行 specify 或 plan 之前，必须先理解当前项目的现状。按以下步骤加载上下文。

### 第 1 步：加载核心文档

依次读取以下文件（如果存在），构建对项目的完整理解：

**必读（项目概览）：**
1. `CLAUDE.md` — 项目概述、技术栈、快速定位表、重要约定

**必读（结构层）：**
2. `docs/generated/struct/ARCHITECTURE.md` — 系统架构、模块结构、依赖关系
3. `docs/generated/struct/API.md` — 现有接口、基类方法签名
4. `docs/generated/struct/CONVENTIONS.md` — 编码规范、命名规则、文件组织
5. `docs/generated/struct/GLOSSARY.md` — 业务术语与代码名称的映射
6. `docs/generated/struct/BOUNDARIES.md` — 可修改/需审批/禁止修改的区域
7. `docs/generated/struct/SCHEMA.md` — 数据模型、持久化方式
8. `docs/generated/struct/DECISIONS.md` — 已确定的技术决策（不可推翻）

**选读（行为层，如果需要理解运行时行为）：**
9. `docs/generated/behave/FLOWS.md` — 核心业务流程
10. `docs/generated/behave/USAGE.md` — 模块使用说明、副作用标注
11. `docs/generated/behave/CALLGRAPH.md` — 关键调用链、反向依赖

**选读（项目原则）：**
12. `.specify/memory/constitution.md` — Spec-Kit 项目原则

### 第 2 步：提取关键约束

从上述文档中提取以下信息，作为后续 specify/plan 的硬约束：

**架构约束（来自 ARCHITECTURE.md + DECISIONS.md）：**
- 项目类型和整体架构
- 核心模块和它们的职责边界
- 不可推翻的技术决策

**开发约束（来自 CONVENTIONS.md + API.md）：**
- 新代码必须遵循的命名规范
- 新模块必须继承的基类和必须实现的方法
- 文件组织规则（目录结构、命名方式）

**安全约束（来自 BOUNDARIES.md）：**
- 禁止修改的代码区域
- 需要审批才能修改的区域

**术语约束（来自 GLOSSARY.md）：**
- 业务概念与代码命名的对应关系

### 第 3 步：输出上下文摘要

以下面的格式输出摘要，确认上下文已加载：

```
=== 项目上下文已加载 ===

项目：[项目名]
技术栈：[语言 + 框架 + 关键依赖]
架构类型：[从 ARCHITECTURE.md 提取]

关键约束：
  - [约束1]
  - [约束2]
  - [约束3]
  - ...

上下文就绪，继续执行后续命令。
```

### 重要说明

- 加载的上下文将影响后续 `/speckit.specify` 和 `/speckit.plan` 的输出质量
- 如果文档不存在（新项目），跳过对应步骤，不报错
