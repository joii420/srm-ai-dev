# AI 文档体系脚手架

> 将本目录内容复制到任意项目根目录，即可启动标准化的 AI 文档分析流水线。

## 快速开始

```bash
# 1. 复制脚手架到目标项目
cp -r scaffold/* /path/to/your-project/
cp -r scaffold/.claude /path/to/your-project/

# 2. 进入目标项目，运行初始化脚本
cd /path/to/your-project
bash scripts/init-docs.sh

# 3. 运行结构扫描（收集项目信息）
bash scripts/scan-project.sh > project_scan.txt

# 4. 在 Claude Code 中执行 slash commands
/scan-struct      # 阶段1：结构扫描 → docs/generated/struct/
/scan-behave      # 阶段2：行为分析 → docs/generated/behave/
/gen-product-docs # 阶段3：产品文档 → docs/
/regen-all-docs   # 一键执行全部三阶段
```

## 目录结构

```
your-project/
├── CLAUDE.md                          # AI 上下文入口（init 时生成骨架）
├── docs/
│   ├── DOCS_INDEX.md                  # 文档目录索引
│   ├── prompts/                       # AI 提示词（输入，不要修改生成逻辑）
│   │   ├── AI_SCAN_PROMPT.md              # 阶段1：结构扫描
│   │   ├── AI_BEHAVIOR_SCAN_PROMPT.md     # 阶段2：行为分析
│   │   └── AI_PRODUCT_DOC_PROMPT.md       # 阶段3：产品文档生成
│   └── generated/                     # AI 生成产物（输出，可随时重新生成）
│       ├── struct/                        # 结构分析
│       └── behave/                        # 行为分析
├── .claude/commands/                  # Claude Code slash commands
│   ├── scan-struct.md
│   ├── scan-behave.md
│   ├── gen-product-docs.md
│   └── regen-all-docs.md
└── scripts/
    ├── init-docs.sh                   # 初始化脚本
    └── scan-project.sh                # 项目信息扫描脚本
```

## 适配不同技术栈

prompt 文件已设计为通用模板，适用于任意技术栈。扫描脚本覆盖了：
- **前端**: Node.js / React / Vue / Next.js
- **后端**: Python / Go / Rust / Java / C#
- **数据库**: Prisma / TypeORM / SQLAlchemy / SqlSugar
- **部署**: Docker / Kubernetes / 本地部署

如需针对特定技术栈优化，修改 `docs/prompts/` 下的提示词即可。
