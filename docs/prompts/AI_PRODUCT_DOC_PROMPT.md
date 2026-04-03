# 产品文档生成提示词

> 前置条件：`docs/generated/struct/` 和 `docs/generated/behave/` 文档已生成
> 输出：PRODUCT.md、API_GUIDE.md、RUNBOOK.md

---

## 信息来源映射

| 生成内容 | 主要来源 | 辅助来源 |
|---------|---------|---------|
| 产品功能描述 | FLOWS.md | GLOSSARY.md |
| 用户操作步骤 | FLOWS.md (happy path) | SCHEMA.md |
| 常见问题 | FLOWS.md (error path) | USAGE.md |
| API 接口列表 | API.md | FLOWS.md |
| 部署命令 | CLAUDE.md | CONVENTIONS.md |
| 故障排查 | CALLGRAPH.md | FLOWS.md (error path) |
| 术语翻译 | GLOSSARY.md | SCHEMA.md |

---

## 提示词正文（从此处开始复制）

---

你是一名技术写作专家。
我将提供一个项目的完整分析文档，请根据这些文档生成三份面向不同读者的产品文档。

### 转化规则

**PRODUCT.md（产品说明书）：**
- 面向非技术用户
- GLOSSARY.md 的代码名词 → 改用业务名词
- FLOWS.md 的 sequenceDiagram → 改写为用户视角的步骤列表
- FLOWS.md 的 error path → 改写为"常见问题 Q&A"
- 禁止出现：函数名、HTTP 方法、数据库术语、代码片段

**API_GUIDE.md（开发者文档）：**
- 面向插件开发者 / API 调用方
- API.md 的每条接口 → 扩展为完整接口文档
- USAGE.md 的副作用 → 转化为"注意事项"
- CALLGRAPH.md 的 🔴 节点 → 转化为"重要提示"警告块

**RUNBOOK.md（运维手册）：**
- 面向运维工程师
- CLAUDE.md 的"常用命令" → 扩展为可执行命令块
- CALLGRAPH.md 的高风险修改区域 → 故障排查优先检查点
- BOUNDARIES.md 的禁止修改区域 → 操作限制说明
- 所有操作步骤必须是可执行命令

---

### 输入文档内容

#### [struct] CLAUDE.md
```
[粘贴 CLAUDE.md 全文]
```

#### [struct] ARCHITECTURE.md
```
[粘贴 docs/generated/struct/ARCHITECTURE.md 全文]
```

#### [struct] CONVENTIONS.md
```
[粘贴 docs/generated/struct/CONVENTIONS.md 全文]
```

#### [struct] API.md
```
[粘贴 docs/generated/struct/API.md 全文]
```

#### [struct] SCHEMA.md
```
[粘贴 docs/generated/struct/SCHEMA.md 全文]
```

#### [struct] GLOSSARY.md
```
[粘贴 docs/generated/struct/GLOSSARY.md 全文]
```

#### [struct] BOUNDARIES.md
```
[粘贴 docs/generated/struct/BOUNDARIES.md 全文]
```

#### [behave] FLOWS.md
```
[粘贴 docs/generated/behave/FLOWS.md 全文]
```

#### [behave] USAGE.md
```
[粘贴 docs/generated/behave/USAGE.md 全文]
```

#### [behave] CALLGRAPH.md
```
[粘贴 docs/generated/behave/CALLGRAPH.md 全文]
```

---

### 输出格式

每份文档必须包含标准化 frontmatter：

```yaml
---
title: [文档标题]
type: [product / api_reference / operations_manual]
last_updated: [今天日期]
target_audience: [面向人群]
generated_by: claude-code
prompt: docs/prompts/AI_PRODUCT_DOC_PROMPT.md
reviewed_by: pending
---
```

按以下顺序输出，文档之间用分隔线隔开：

```
=== docs/PRODUCT.md ===
[文档内容]
✓ PRODUCT.md 生成完毕

=== docs/API_GUIDE.md ===
[文档内容]
✓ API_GUIDE.md 生成完毕

=== docs/RUNBOOK.md ===
[文档内容]
✓ RUNBOOK.md 生成完毕
```
