#!/bin/bash
# init-docs.sh — 在新项目中初始化文档体系
# 用法: bash scripts/init-docs.sh

set -euo pipefail

echo "=== AI 文档体系初始化 ==="

# 创建目录结构
dirs=(
  "docs/prompts"
  "docs/generated/struct"
  "docs/generated/behave"
  ".claude/commands"
)

for dir in "${dirs[@]}"; do
  if [ ! -d "$dir" ]; then
    mkdir -p "$dir"
    echo "[+] 创建目录: $dir"
  else
    echo "[=] 已存在: $dir"
  fi
done

# 检查必要文件
files=(
  "docs/prompts/AI_SCAN_PROMPT.md"
  "docs/prompts/AI_BEHAVIOR_SCAN_PROMPT.md"
  "docs/prompts/AI_PRODUCT_DOC_PROMPT.md"
  "docs/USAGE_GUIDE.md"
  "docs/CHANGELOG.md"
  ".claude/commands/scan-struct.md"
  ".claude/commands/scan-behave.md"
  ".claude/commands/gen-product-docs.md"
  ".claude/commands/regen-all-docs.md"
  ".claude/commands/speckit.load-context.md"
  ".claude/commands/speckit.docs-sync.md"
)

missing=0
for f in "${files[@]}"; do
  if [ ! -f "$f" ]; then
    echo "[!] 缺失文件: $f"
    missing=$((missing + 1))
  fi
done

# 生成 CLAUDE.md 骨架（如果不存在）
if [ ! -f "CLAUDE.md" ]; then
  PROJECT_NAME=$(basename "$(pwd)")
  cat > CLAUDE.md << 'CLAUDE_EOF'
---
project: __PROJECT_NAME__
version: unknown
updated: __DATE__
stack: []
ai_context_files:
  - docs/generated/struct/ARCHITECTURE.md
  - docs/generated/struct/CONVENTIONS.md
  - docs/generated/struct/API.md
  - docs/generated/struct/SCHEMA.md
  - docs/generated/struct/GLOSSARY.md
  - docs/generated/struct/BOUNDARIES.md
  - docs/generated/struct/DECISIONS.md
---

# __PROJECT_NAME__

## 一句话描述
[待补充]

## 技术栈
| 类别 | 技术 |
|------|------|
| 语言 | [待补充] |
| 框架 | [待补充] |

## 快速定位（AI 必读）
| 任务类型 | 对应路径 | 参考文件 |
|----------|----------|----------|
| 理解架构 | — | docs/generated/struct/ARCHITECTURE.md |
| 编码规范 | — | docs/generated/struct/CONVENTIONS.md |
| 查找术语 | — | docs/generated/struct/GLOSSARY.md |
| 操作限制 | — | docs/generated/struct/BOUNDARIES.md |

## 常用命令
```bash
# [待补充]
```

## 文档生成命令
| 命令 | 说明 |
|------|------|
| `/scan-struct` | 结构扫描，生成/更新 docs/generated/struct/ |
| `/scan-behave` | 行为分析，生成/更新 docs/generated/behave/ |
| `/gen-product-docs` | 生成产品文档（PRODUCT、API_GUIDE、RUNBOOK） |
| `/regen-all-docs` | 按顺序执行完整的三阶段文档重新生成流水线 |
CLAUDE_EOF

  sed -i "s/__PROJECT_NAME__/$PROJECT_NAME/g" CLAUDE.md
  sed -i "s/__DATE__/$(date +%Y-%m-%d)/g" CLAUDE.md
  echo "[+] 生成 CLAUDE.md 骨架"
else
  echo "[=] CLAUDE.md 已存在，跳过"
fi

# 生成 DOCS_INDEX.md 骨架（如果不存在）
if [ ! -f "docs/DOCS_INDEX.md" ]; then
  cat > docs/DOCS_INDEX.md << 'EOF'
# 文档索引

> 运行 `/scan-struct` 后此文件将被自动更新

## 文件结构

```
docs/
├── DOCS_INDEX.md
├── prompts/
│   ├── AI_SCAN_PROMPT.md
│   ├── AI_BEHAVIOR_SCAN_PROMPT.md
│   └── AI_PRODUCT_DOC_PROMPT.md
├── generated/
│   ├── struct/                (待生成)
│   └── behave/                (待生成)
├── PRODUCT.md                 (待生成)
├── API_GUIDE.md               (待生成)
└── RUNBOOK.md                 (待生成)
```

## 命令速查

| 命令 | 说明 |
|------|------|
| `/scan-struct` | 阶段1：结构扫描 |
| `/scan-behave` | 阶段2：行为分析 |
| `/gen-product-docs` | 阶段3：产品文档 |
| `/regen-all-docs` | 一键全量重新生成 |
EOF
  echo "[+] 生成 docs/DOCS_INDEX.md 骨架"
fi

# 生成 .specify/extensions.yml（如果不存在）
if [ ! -f ".specify/extensions.yml" ]; then
  mkdir -p .specify
  cat > .specify/extensions.yml << 'EOF'
hooks:
  before_specify:
    - extension: project-context
      command: speckit.load-context
      description: "加载项目现有文档，让 specify 理解项目上下文"
      enabled: true
      optional: false

  before_plan:
    - extension: project-context
      command: speckit.load-context
      description: "加载项目现有文档，让 plan 基于真实架构设计方案"
      enabled: true
      optional: false

  after_implement:
    - extension: docs-sync
      command: speckit.docs-sync
      description: "实现完成后，自动同步更新项目文档体系"
      enabled: true
      optional: false
EOF
  echo "[+] 生成 .specify/extensions.yml"
else
  echo "[=] .specify/extensions.yml 已存在，跳过"
fi

echo ""
echo "=== 初始化完成 ==="
if [ $missing -gt 0 ]; then
  echo "警告: 有 $missing 个文件缺失，请确认脚手架文件已完整复制"
fi
echo ""
echo "下一步:"
echo "  1. specify init --here --ai claude    # 初始化 spec-kit"
echo "  2. /speckit.constitution               # 建立项目原则"
echo "  3. /scan-struct                        # 首次结构扫描（已有项目）"
echo "  4. /speckit.specify                    # 开始第一个需求"
