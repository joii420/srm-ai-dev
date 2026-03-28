# Page (程序) 数据模型设计

## 1. 背景

当前程序列表数据来源于第三方 API (`pages.thirdPartyApiUrl`) 或 `demo.json` mock 数据，本地无程序表。
本次改造将程序数据本地化，支持系统内自主管理程序的增删改查。

## 2. Prisma Model

```prisma
model Page {
  id            String   @id @default(uuid()) @db.Uuid
  name          String   @unique @db.VarChar(200)          // 程序名称，唯一
  description   String?  @db.Text                          // 程序描述
  type          String   @default("appsmith") @db.VarChar(20) // 程序类型：appsmith | normal
  gitlabRepoUrl String   @map("gitlab_repo_url") @db.Text  // 远程仓库地址（创建时校验）
  gitBranch     String   @default("dev") @map("git_branch") @db.VarChar(200) // 默认分支
  createdById   String?  @map("created_by") @db.Uuid       // 创建人
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  createdBy  User?      @relation("PageCreator", fields: [createdById], references: [id])
  checkouts  Checkout[]

  @@map("pages")
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | UUID | 自动 | 主键 |
| `name` | varchar(200) | 是 | 程序名称，唯一约束，也用作 Git 仓库名匹配 |
| `description` | text | 否 | 程序描述 |
| `type` | varchar(20) | 是 | `appsmith` = Appsmith 程序（签入时执行额外操作，TODO）；`normal` = 普通程序 |
| `gitlabRepoUrl` | text | 是 | 远程 Git 仓库完整地址（SSH/HTTPS），新建时校验仓库存在性 |
| `gitBranch` | varchar(200) | 是 | 默认工作分支，默认 `dev` |
| `createdById` | UUID | 否 | 关联 `users.id`，记录谁创建的 |
| `createdAt` | timestamptz | 自动 | 创建时间 |
| `updatedAt` | timestamptz | 自动 | 最后更新时间 |

### 程序类型枚举

| 值 | 含义 | 签入行为 |
|---|---|---|
| `appsmith` | Appsmith 程序 | 签入时执行额外操作（TODO：待定义具体逻辑） |
| `normal` | 普通程序 | 标准签入流程 |

## 3. 关联变更

### 3.1 Checkout 表关联

现有 `Checkout.pageId` 为 `varchar(200)` 字符串。改造后改为外键关联 `Page.id`：

```prisma
model Checkout {
  // 变更：pageId 改为关联 Page 表
  pageId  String @map("page_id") @db.Uuid   // 原 varchar(200) → uuid，外键
  page    Page   @relation(fields: [pageId], references: [id])

  // 以下字段可从 Page 表获取，不再在 Checkout 中冗余存储：
  // pageName      → page.name
  // gitlabRepoUrl → page.gitlabRepoUrl
  // gitBranch     → page.gitBranch（可按需在 Checkout 中覆盖）
  // ... 其余字段不变
}
```

### 3.2 User 表关联

```prisma
model User {
  // 新增
  pagesCreated Page[] @relation("PageCreator")
}
```

## 4. API 设计

### 4.1 程序列表（改造现有接口）

```
GET /api/pages
```

**改造前**：调用第三方 API 获取列表 + 查询 Checkout 状态拼接。
**改造后**：直接查询 `Page` 表 + JOIN `Checkout` 状态。

响应格式保持不变（前端无感知）：
```json
{
  "pages": [
    {
      "pageId": "uuid",
      "pageName": "DashboardPage",
      "type": "appsmith",
      "description": "...",
      "gitlabRepoUrl": "git@gitlab.internal:appsmith/DashboardPage.git",
      "branch": "dev",
      "status": "free | checkedout | mine",
      "checkedOutBy": null
    }
  ]
}
```

> 新增返回字段 `type`、`description`，其余字段格式不变。

### 4.2 新建程序

```
POST /api/pages
```

请求体：
```json
{
  "name": "NewPage",
  "description": "描述",
  "type": "appsmith",
  "gitBranch": "dev"
}
```

处理流程：
1. 根据 `name` + SystemConfig `git.gitlabDomain` 拼接 `gitlabRepoUrl`
2. 调用 GitLab API (`GET /api/v4/projects/:encoded_path`) 校验远程仓库是否存在
3. 仓库不存在 → 返回 `400`（提示先在 GitLab 创建仓库）
4. 仓库存在 → 入库

响应：
```json
{
  "page": { "id": "uuid", "name": "NewPage", ... }
}
```

### 4.3 编辑程序

```
PUT /api/pages/:pageId
```

仅允许修改 `description`、`gitBranch`。`name`、`type`、`gitlabRepoUrl` 创建后不可变。

### 4.4 删除程序

```
DELETE /api/pages/:pageId
```

前置校验：该程序无活跃 Checkout（`status = 'active'`）才允许删除。

## 5. 新建程序时的 Git 仓库校验

```
GitLab API: GET {gitlabApiUrl}/api/v4/projects/{urlEncode(projectPath)}
Header: PRIVATE-TOKEN: {gitlabToken}
```

- `projectPath` 由 `git.gitlabDomain` 前缀 + `name` 拼接（复用现有 `buildGitlabRepoUrl` + `extractProjectPath` 逻辑）
- 返回 200 → 仓库存在，允许创建
- 返回 404 → 仓库不存在，拒绝创建
- 其他错误 → 返回 502

## 6. 数据迁移策略

对于已有 `Checkout` 记录中的 `pageId`（旧的字符串 ID）：
- 方案 A：写迁移脚本，根据已有 `Checkout.pageName` 创建对应 `Page` 记录，将 `Checkout.pageId` 更新为新的 UUID
- 方案 B：`Checkout.pageId` 保持 varchar，不改为外键；`Page` 表新增 `legacyId varchar` 用于兼容

> **建议采用方案 A**（一次性迁移，长期干净）。

## 7. 签入额外操作（TODO）

当 `page.type === 'appsmith'` 时，签入流程 `orchestrateCheckin` 需在 `commitAndPush` 后执行额外操作：

```
// TODO: 定义 Appsmith 程序签入时的额外操作
// 可能的场景：
// - 通知 Appsmith 实例刷新页面定义
// - 触发 Appsmith 重新部署
// - 调用 Appsmith API 同步元数据
```

此部分暂不实现，在 `orchestrateCheckin` 中预留分支判断即可。

## 8. 实施影响评估

| 模块 | 影响 | 说明 |
|---|---|---|
| `schema.prisma` | 新增 `Page` model，修改 `Checkout` 和 `User` 关联 | 需要 `prisma migrate` |
| `routes/pages.ts` | `GET /pages` 改为查 Page 表；新增 POST/PUT/DELETE | 核心改造 |
| `ContainerLifecycle.ts` | `orchestrateCheckout` 改为从 Page 表取 repoUrl/branch；签入预留 type 判断 | 小改 |
| `PageListPage` (前端) | 增加新建按钮和表单 | 新功能 |
| `IDEPage` (前端) | 无变化（数据格式兼容） | 无影响 |
| `demo.json` | 可保留作为 seed 数据，不再作为运行时 fallback | 低影响 |

---

**请审阅以上设计，确认后我将开始实施。**
