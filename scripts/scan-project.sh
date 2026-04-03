#!/bin/bash
# scan-project.sh — 通用项目信息扫描脚本
# 用法: bash scripts/scan-project.sh > project_scan.txt
# 支持: Node.js / Python / Go / Rust / C# / Java 等技术栈

set -euo pipefail

collect() {
  local label="$1"
  local cmd="$2"
  echo "=== $label ==="
  eval "$cmd" 2>/dev/null || echo "[未找到]"
  echo ""
}

echo "=== 项目扫描开始 $(date) ==="
echo ""

# ── 1. 目录结构 ────────────────────────────────────────────────────
collect "目录结构" \
  "find . -type f \
    -not -path '*/node_modules/*' \
    -not -path '*/.git/*' \
    -not -path '*/dist/*' \
    -not -path '*/build/*' \
    -not -path '*/.next/*' \
    -not -path '*/__pycache__/*' \
    -not -path '*/target/*' \
    -not -path '*/bin/*' \
    -not -path '*/obj/*' \
    -not -path '*/packages/*' \
    -not -path '*/.venv/*' \
    -not -path '*/vendor/*' \
    -not -name '*.png' -not -name '*.jpg' -not -name '*.ico' \
    -not -name '*.dll' -not -name '*.exe' -not -name '*.pdb' \
    | sort | head -200"

# ── 2. 包管理和依赖 ────────────────────────────────────────────────
# Node.js
collect "package.json" "cat package.json"
# Python
collect "pyproject.toml" "cat pyproject.toml"
collect "requirements.txt" "cat requirements.txt"
# Go
collect "go.mod" "cat go.mod"
# Rust
collect "Cargo.toml" "cat Cargo.toml"
# C#
collect "*.sln 列表" "find . -name '*.sln' -not -path '*/packages/*' | head -5"
collect "*.csproj 列表" "find . -name '*.csproj' -not -path '*/packages/*' -not -path '*/obj/*' | head -30"
# Java
collect "pom.xml（前60行）" "head -60 pom.xml"
collect "build.gradle（前60行）" "head -60 build.gradle"

# ── 3. 构建和配置 ──────────────────────────────────────────────────
collect "tsconfig.json" "cat tsconfig.json"
collect "next.config.*" "cat next.config.ts 2>/dev/null || cat next.config.js 2>/dev/null || cat next.config.mjs"
collect "vite.config.*" "cat vite.config.ts 2>/dev/null || cat vite.config.js"
collect ".eslintrc / eslint.config.*" \
  "cat .eslintrc.json 2>/dev/null || cat .eslintrc.js 2>/dev/null || cat eslint.config.js 2>/dev/null || cat eslint.config.mjs"
collect ".prettierrc" "cat .prettierrc 2>/dev/null || cat .prettierrc.json"
collect ".editorconfig" "cat .editorconfig"
collect "Makefile（前40行）" "head -40 Makefile"
collect "docker-compose.yml" "cat docker-compose.yml 2>/dev/null || cat docker-compose.yaml"
collect "Dockerfile" "cat Dockerfile"
collect ".env.example" "cat .env.example 2>/dev/null || cat .env.sample"

# ── 4. 入口文件（前50行）──────────────────────────────────────────
collect "入口文件" \
  "for f in \
    src/index.ts src/index.tsx src/main.ts src/app.ts \
    app/page.tsx src/App.tsx \
    main.py app.py manage.py \
    cmd/main.go main.go \
    src/main.rs \
    Program.cs App.xaml.cs \
    src/main/java/*/Application.java; do
    if [ -f \"\$f\" ]; then
      echo \"--- \$f ---\"
      head -50 \"\$f\"
      echo \"\"
    fi
  done"

# ── 5. 路由 / API / 控制器 ────────────────────────────────────────
collect "API/路由/控制器目录" \
  "find . \( \
    -path '*/app/api/*' -o \
    -path '*/pages/api/*' -o \
    -path '*/routes/*' -o \
    -path '*/controllers/*' -o \
    -path '*/handlers/*' -o \
    -path '*/Views/*' -o \
    -path '*/ViewModels/*' \
  \) \
    -not -path '*/node_modules/*' \
    -not -path '*/packages/*' \
    -type f | sort | head -60"

# ── 6. 数据库 / 数据模型 ──────────────────────────────────────────
collect "Prisma schema" "cat prisma/schema.prisma"
collect "SQL / migration 文件" \
  "find . -name '*.sql' -not -path '*/node_modules/*' | head -5 | \
    xargs -I{} sh -c 'echo \"--- {} ---\"; head -40 \"{}\"'"
collect "models / entities 目录" \
  "find . \( \
    -path '*/models/*' -o -path '*/entities/*' -o -path '*/Models/*' \
  \) \
    -not -path '*/node_modules/*' -not -path '*/packages/*' \
    -type f | head -30"

# ── 7. 类型定义 ────────────────────────────────────────────────────
collect "TypeScript 类型定义文件" \
  "find . -path '*/types*' -name '*.ts' -not -path '*/node_modules/*' | head -5 | \
    xargs -I{} sh -c 'echo \"--- {} ---\"; cat \"{}\"'"

# ── 8. 核心 lib / service / utils ─────────────────────────────────
collect "lib/service/utils 目录结构" \
  "find . \( \
    -path '*/lib/*' -o -path '*/services/*' -o -path '*/service/*' -o \
    -path '*/utils/*' -o -path '*/helpers/*' -o -path '*/Common/*' -o \
    -path '*/Core/*' \
  \) \
    -not -path '*/node_modules/*' -not -path '*/packages/*' \
    -not -path '*/obj/*' -not -path '*/bin/*' \
    -type f | sort | head -60"

collect "核心 lib/service 文件内容（每文件前150行）" \
  "find . \( \
    -path '*/lib/*' -o -path '*/services/*' -o -path '*/service/*' \
  \) \
    -not -path '*/node_modules/*' -not -path '*/dist/*' \
    -not -path '*/packages/*' -not -path '*/obj/*' \
    \( -name '*.ts' -o -name '*.js' -o -name '*.py' -o -name '*.go' -o -name '*.cs' \) \
    | sort | head -20 | while read f; do
      echo \"--- \$f ---\"
      head -150 \"\$f\"
      echo \"\"
    done"

# ── 9. 测试文件 ────────────────────────────────────────────────────
collect "测试文件列表" \
  "find . \( \
    -name '*.test.ts' -o -name '*.test.js' -o \
    -name '*.spec.ts' -o -name '*.spec.js' -o \
    -name '*_test.go' -o -name 'test_*.py' -o \
    -path '*/__tests__/*' -o -path '*/Tests/*' \
  \) \
    -not -path '*/node_modules/*' -not -path '*/dist/*' \
    | sort | head -30"

# ── 10. Middleware / 认证 ──────────────────────────────────────────
collect "middleware 文件" \
  "find . \( \
    -name 'middleware.ts' -o -name 'middleware.js' -o \
    -path '*/middleware/*' -o -path '*/Middleware/*' \
  \) \
    -not -path '*/node_modules/*' \
    -type f | while read f; do
      echo \"--- \$f ---\"
      head -80 \"\$f\"
      echo \"\"
    done"

# ── 11. 配置文件 ──────────────────────────────────────────────────
collect "配置文件" \
  "for f in \
    appsettings.json appsettings.Development.json \
    config.json config.yaml config.yml \
    NLog.config log4j.properties; do
    if [ -f \"\$f\" ]; then
      echo \"--- \$f ---\"
      head -60 \"\$f\"
      echo \"\"
    fi
  done"

# ── 12. README 和文档 ──────────────────────────────────────────────
collect "README.md（前80行）" "head -80 README.md"
collect "CONTRIBUTING.md（前40行）" "head -40 CONTRIBUTING.md"

# ── 13. Git 信息 ───────────────────────────────────────────────────
collect "最近10条提交" "git log --oneline -10"
collect "分支列表" "git branch -a | head -10"

echo "=== 项目扫描完成 ==="
