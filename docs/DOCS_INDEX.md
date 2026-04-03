# 文档索引

> 最后更新: 2026-04-03 | 生成工具: claude-code

## 产品文档（面向人）

| 文档 | 面向 | 说明 |
|------|------|------|
| [PRODUCT.md](PRODUCT.md) | 非技术用户 | 产品功能说明、操作步骤、常见问题 |
| [API_GUIDE.md](API_GUIDE.md) | 开发者 | 完整 REST API 接口文档，含请求/响应示例 |
| [RUNBOOK.md](RUNBOOK.md) | 运维工程师 | 部署、日常运维、故障排查、备份恢复 |

## AI 辅助文档（结构层）

| 文档 | 说明 |
|------|------|
| [generated/struct/ARCHITECTURE.md](generated/struct/ARCHITECTURE.md) | 系统架构、模块结构、数据流、外部依赖 |
| [generated/struct/CONVENTIONS.md](generated/struct/CONVENTIONS.md) | 编码规范、命名约定、测试规范 |
| [generated/struct/API.md](generated/struct/API.md) | API 接口速查表（按模块分组） |
| [generated/struct/SCHEMA.md](generated/struct/SCHEMA.md) | 数据库模型、表结构、实体关系 |
| [generated/struct/GLOSSARY.md](generated/struct/GLOSSARY.md) | 领域术语表（业务词汇 ↔ 代码映射） |
| [generated/struct/BOUNDARIES.md](generated/struct/BOUNDARIES.md) | AI 操作边界（可改/需确认/禁止） |
| [generated/struct/DECISIONS.md](generated/struct/DECISIONS.md) | 技术决策记录 |

## AI 辅助文档（行为层）

| 文档 | 说明 |
|------|------|
| [generated/behave/FLOWS.md](generated/behave/FLOWS.md) | 核心业务流程图（Mermaid 序列图） |
| [generated/behave/USAGE.md](generated/behave/USAGE.md) | 模块使用说明、正确/错误用法 |
| [generated/behave/CALLGRAPH.md](generated/behave/CALLGRAPH.md) | 关键调用链、反向依赖、高风险区域 |

## 提示词模板

| 文档 | 说明 |
|------|------|
| [prompts/AI_SCAN_PROMPT.md](prompts/AI_SCAN_PROMPT.md) | 阶段1：结构扫描提示词 |
| [prompts/AI_BEHAVIOR_SCAN_PROMPT.md](prompts/AI_BEHAVIOR_SCAN_PROMPT.md) | 阶段2：行为分析提示词 |
| [prompts/AI_PRODUCT_DOC_PROMPT.md](prompts/AI_PRODUCT_DOC_PROMPT.md) | 阶段3：产品文档生成提示词 |

## 命令速查

| 命令 | 说明 |
|------|------|
| `/scan-struct` | 阶段1：结构扫描 → docs/generated/struct/ |
| `/scan-behave` | 阶段2：行为分析 → docs/generated/behave/ |
| `/gen-product-docs` | 阶段3：产品文档 → docs/ |
| `/regen-all-docs` | 一键全量重新生成 |

## 文件结构

```
docs/
├── DOCS_INDEX.md              ← 本文件
├── PRODUCT.md                 产品说明书
├── API_GUIDE.md               开发者接口文档
├── RUNBOOK.md                 运维手册
├── 测试用例文档.md             测试用例
├── prompts/
│   ├── AI_SCAN_PROMPT.md
│   ├── AI_BEHAVIOR_SCAN_PROMPT.md
│   └── AI_PRODUCT_DOC_PROMPT.md
├── generated/
│   ├── struct/
│   │   ├── ARCHITECTURE.md
│   │   ├── CONVENTIONS.md
│   │   ├── API.md
│   │   ├── SCHEMA.md
│   │   ├── GLOSSARY.md
│   │   ├── BOUNDARIES.md
│   │   └── DECISIONS.md
│   └── behave/
│       ├── FLOWS.md
│       ├── USAGE.md
│       └── CALLGRAPH.md
├── USAGE_GUIDE.md
└── CHANGELOG.md
```
