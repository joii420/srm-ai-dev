# Java 后端接口规范 — 程序管理

前端已按以下格式对接，Java 端需要实现这些接口。

## 数据库表

```sql
-- 已存在
CREATE TABLE pages (
    id              UUID PRIMARY KEY,
    name            VARCHAR(200) UNIQUE NOT NULL,
    description     TEXT,
    type            VARCHAR(20) NOT NULL DEFAULT 'appsmith',  -- 'appsmith' | 'normal'
    gitlab_repo_url TEXT NOT NULL,
    git_branch      VARCHAR(200) NOT NULL DEFAULT 'dev',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 1. GET /api/pages — 程序列表

前端期望的响应格式（数组或 `{ pages: [...] }` 均可）：

```json
[
  {
    "id": "41528e52-e6b1-4efc-840b-b2056eab3ed4",
    "name": "DashboardPage",
    "type": "appsmith",
    "description": "Dashboard page",
    "gitlabRepoUrl": "git@gitlab.internal:appsmith/DashboardPage.git",
    "gitBranch": "dev",
    "status": "free",
    "checkedOutBy": null
  },
  {
    "id": "...",
    "name": "OrderPage",
    "type": "normal",
    "description": null,
    "gitlabRepoUrl": "...",
    "gitBranch": "dev",
    "status": "checkedout",
    "checkedOutBy": { "username": "dev1", "displayName": "开发者一" }
  }
]
```

### 字段说明

| 字段 | 来源 | 说明 |
|---|---|---|
| `id` | `pages.id` | UUID |
| `name` | `pages.name` | 程序名 |
| `type` | `pages.type` | `"appsmith"` 或 `"normal"` |
| `description` | `pages.description` | 可为 null |
| `gitlabRepoUrl` | `pages.gitlab_repo_url` | 注意 Java 驼峰映射 |
| `gitBranch` | `pages.git_branch` | 注意 Java 驼峰映射 |
| `status` | 计算值 | `"free"` / `"mine"` / `"checkedout"` |
| `checkedOutBy` | 计算值 | `null` 或 `{ username, displayName }` |

### status 计算逻辑

```java
// 查询该 page 的活跃 checkout
Checkout active = Checkout.find("pageId = ?1 and status = 'active'", page.id.toString()).firstResult();

if (active == null) {
    status = "free";
    checkedOutBy = null;
} else if (active.userId.equals(currentUserId)) {
    status = "mine";
    checkedOutBy = null;
} else {
    status = "checkedout";
    checkedOutBy = { username: active.user.username, displayName: active.user.displayName };
}
```

> **注意**: `checkouts.page_id` 是 `VARCHAR(200)`，存储的是 `pages.id` 的 UUID 字符串。比较时需要 `page.id.toString()`。

---

## 2. POST /api/pages/create — 新建程序

### 请求体

```json
{
  "name": "NewPage",
  "description": "描述（选填）",
  "type": "appsmith",
  "gitBranch": "dev"
}
```

### 处理流程

1. 校验 `name` 唯一（查 `pages` 表）
2. 拼接 `gitlabRepoUrl`：从 `system_configs` 读 `git.gitlabDomain` 前缀 + `name` + `.git`
3. 调用 GitLab API 校验仓库存在：`GET {gitlabApiUrl}/api/v4/projects/{urlEncode(projectPath)}`
4. 仓库不存在 → 400；存在 → 插入 `pages` 表

### 成功响应 — `201`

```json
{
  "page": {
    "id": "uuid",
    "name": "NewPage",
    "type": "appsmith",
    "description": "描述",
    "gitlabRepoUrl": "git@gitlab.internal:appsmith/NewPage.git",
    "gitBranch": "dev"
  }
}
```

### 错误响应

| 状态码 | 场景 | body |
|---|---|---|
| 409 | 名称已存在 | `{ "message": "Page \"NewPage\" already exists" }` |
| 400 | 仓库不存在 | `{ "message": "Remote Git repository not found: git@..." }` |
| 502 | GitLab 不可达 | `{ "message": "Failed to verify remote Git repository" }` |
