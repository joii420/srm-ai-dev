# Appsmith 后端 API 接口文档（代理透传）

> 以下接口通过 Node Service 代理调用：`ALL /sessions/:id/proxy/{path}`
>
> 例如：`GET /sessions/:id/proxy/v1/users/me` → 代理到 `{backendUrl}/api/v1/users/me`
>
> Node Service 自身 API 文档见 [node-service-api.md](./node-service-api.md)

---

## 通用请求头（代理自动注入）

| 请求头 | 值 | 说明 |
|--------|------|------|
| `Authorization` | `Bearer {authToken}` | 会话创建时传入的 Token |
| `X-Requested-By` | `Appsmith` | CSRF 防护（非 GET/HEAD 请求自动添加） |
| `Content-Type` | `application/json` | 默认请求体格式 |

---

## ActionAPI — Action 操作

基础路径：`v1/actions`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| POST | /v1/actions | body: `{name, pageId, pluginId, datasourceId, actionConfiguration}` | name, pageId, pluginId | 创建 Action |
| GET | /v1/actions | query: `applicationId` | applicationId | 获取 Action 列表 |
| PUT | /v1/actions/{id} | path: `id`; body: Action 字段 | id | 更新 Action |
| DELETE | /v1/actions/{id} | path: `id` | id | 删除 Action |
| POST | /v1/actions/execute | body: `{actionId, viewMode}` (multipart) | actionId | 执行 Action |
| PUT | /v1/actions/move | body: `{actionId, destinationPageId}` | actionId, destinationPageId | 移动 Action |
| POST | /v1/actions/{id}/copy | path: `id`; body: `{pageId}` | id, pageId | 复制 Action |
| PUT | /v1/actions/refactor | body: `{actionId, oldName, newName, pageId}` | 全部 | 重命名 Action |

---

## PageApi — 页面操作

基础路径：`v1/pages`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| POST | /v1/pages | body: `{name, applicationId}` | name, applicationId | 创建页面 |
| GET | /v1/pages/{pageId} | path: `pageId` | pageId | 获取页面详情 |
| PUT | /v1/pages/{pageId} | path: `pageId`; body: `{name}` | pageId | 更新页面 |
| DELETE | /v1/pages/{pageId} | path: `pageId` | pageId | 删除页面 |
| PUT | /v1/layouts/{layoutId}/pages/{pageId} | path: `layoutId, pageId`; body: DSL JSON | layoutId, pageId | 保存页面布局 |
| POST | /v1/pages/clone/{pageId} | path: `pageId` | pageId | 克隆页面 |
| GET | /v1/pages | query: `applicationId, mode` | applicationId | 获取应用所有页面 |

---

## ApplicationApi — 应用操作

基础路径：`v1/applications`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| POST | /v1/applications | body: `{name, workspaceId}` | name, workspaceId | 创建应用 |
| GET | /v1/applications/{id} | path: `id` | id | 获取应用详情 |
| PUT | /v1/applications/{id} | path: `id`; body: 更新字段 | id | 更新应用 |
| DELETE | /v1/applications/{id} | path: `id` | id | 删除应用 |
| POST | /v1/applications/publish/{id} | path: `id` | id | 发布应用 |
| POST | /v1/applications/{id}/fork/{workspaceId} | path: `id, workspaceId` | id, workspaceId | Fork 应用 |
| GET | /v1/applications/export/{id} | path: `id` | id | 导出应用 JSON |
| POST | /v1/applications/import/{workspaceId} | path: `workspaceId`; body: file (multipart) | workspaceId | 导入应用 |

---

## DatasourcesApi — 数据源操作

基础路径：`v1/datasources`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| GET | /v1/datasources | query: `workspaceId` | workspaceId | 获取数据源列表 |
| POST | /v1/datasources | body: `{name, pluginId, workspaceId, datasourceConfiguration}` | name, pluginId, workspaceId | 创建数据源 |
| POST | /v1/datasources/test | body: `{pluginId, workspaceId, datasourceConfiguration}` | pluginId, workspaceId | 测试数据源连接 |
| PUT | /v1/datasources/{id} | path: `id`; body: 更新字段 | id | 更新数据源 |
| DELETE | /v1/datasources/{id} | path: `id` | id | 删除数据源 |
| GET | /v1/datasources/{id}/structure | path: `id`; query: `ignoreCache` | id | 获取数据源 Schema |
| GET | /v1/datasources/mocks | — | — | 获取模拟数据源列表 |

---

## ConsolidatedPageLoadApi — 整合页面加载

基础路径：`v1/consolidated-api`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| GET | /v1/consolidated-api/edit | query: `defaultPageId` | defaultPageId | 编辑模式加载（返回页面+Action+数据源等全部数据） |
| GET | /v1/consolidated-api/view | query: `defaultPageId` | defaultPageId | 查看模式加载 |

---

## GitSyncAPI — Git 版本控制

基础路径：`v1/git`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| POST | /v1/git/connect/app/{id} | path: `id`; body: `{remoteUrl, gitProfile}` | id, remoteUrl | 连接 Git |
| POST | /v1/git/commit/app/{id} | path: `id`; body: `{commitMessage}` | id, commitMessage | 提交 |
| POST | /v1/git/push/app/{id} | path: `id`; body: `{branchName}` | id | 推送 |
| POST | /v1/git/pull/app/{id} | path: `id` | id | 拉取 |
| POST | /v1/git/merge/app/{id} | path: `id`; body: `{sourceBranch, destinationBranch}` | id, sourceBranch, destinationBranch | 合并 |
| GET | /v1/git/branch/app/{id} | path: `id` | id | 获取分支列表 |
| POST | /v1/git/create-branch/app/{id} | path: `id`; body: `{branchName}` | id, branchName | 创建分支 |
| POST | /v1/git/checkout-branch/app/{id} | path: `id`; body: `{branchName}` | id, branchName | 切换分支 |
| GET | /v1/git/status/app/{id} | path: `id` | id | 获取 Git 状态 |

---

## UserApi — 用户操作

基础路径：`v1/users`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| GET | /v1/users/me | — | — | 获取当前用户信息 |
| GET | /v1/users/features | — | — | 获取功能开关（Feature Flags） |
| POST | /v1/login | body: `{username, password}` | username, password | 登录 |
| POST | /v1/logout | — | — | 登出 |
| PUT | /v1/users | body: `{name, role}` | — | 更新用户资料 |

---

## WorkspaceApi — 工作区操作

基础路径：`v1/workspaces`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| GET | /v1/workspaces/home | — | — | 获取所有工作区 |
| GET | /v1/workspaces/{id} | path: `id` | id | 获取工作区详情 |
| POST | /v1/workspaces | body: `{name}` | name | 创建工作区 |
| PUT | /v1/workspaces/{id} | path: `id`; body: `{name, website}` | id | 更新工作区 |
| DELETE | /v1/workspaces/{id} | path: `id` | id | 删除工作区 |
| GET | /v1/workspaces/{id}/members | path: `id` | id | 获取成员列表 |

---

## TenantApi — 租户操作

基础路径：`v1/tenants`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| GET | /v1/tenants/current | — | — | 获取当前租户配置 |
| PUT | /v1/tenants | body: `{tenantConfiguration}` | — | 更新租户配置 |

---

## PluginApi — 插件操作

基础路径：`v1/plugins`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| GET | /v1/plugins | query: `workspaceId` | workspaceId | 获取插件列表 |
| GET | /v1/plugins/{id}/form | path: `id` | id | 获取插件表单配置 |
| GET | /v1/plugins/default/icons | — | — | 获取默认插件图标 |

---

## JSActionAPI — JS 集合操作

基础路径：`v1/collections/actions`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| POST | /v1/collections/actions | body: `{name, pageId, body, actions}` | name, pageId | 创建 JS 集合 |
| GET | /v1/collections/actions | query: `applicationId` | applicationId | 获取 JS 集合列表 |
| PUT | /v1/collections/actions/{id} | path: `id`; body: 更新字段 | id | 更新 JS 集合 |
| DELETE | /v1/collections/actions/{id} | path: `id` | id | 删除 JS 集合 |

---

## TemplatesAPI — 模板操作

基础路径：`v1/app-templates`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| GET | /v1/app-templates | — | — | 获取所有模板 |
| GET | /v1/app-templates/{id} | path: `id` | id | 获取模板详情 |
| POST | /v1/app-templates/{id}/import/{workspaceId} | path: `id, workspaceId` | id, workspaceId | 导入模板 |
| GET | /v1/app-templates/filters | — | — | 获取筛选选项 |

---

## LibraryApi — JS 库管理

基础路径：`v1/libraries`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| POST | /v1/libraries | body: `{url, applicationId}` | url, applicationId | 添加 JS 库 |
| DELETE | /v1/libraries/{id} | path: `id` | id | 移除 JS 库 |
| GET | /v1/libraries | query: `applicationId` | applicationId | 获取已安装 JS 库列表 |

---

## SearchApi — 实体搜索

基础路径：`v1/search-entities`

| 方法 | 路径 | 参数 | 必填 | 说明 |
|------|------|------|------|------|
| GET | /v1/search-entities | query: `keyword, workspaceId` | keyword | 搜索实体（Action、Widget、Page 等） |
