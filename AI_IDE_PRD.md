# Appsmith AI-IDE 产品需求文档

| 字段 | 内容 |
|------|------|
| 文档版本 | V6.0 |
| 创建日期 | 2026-03-23 |
| 项目名称 | Appsmith AI-IDE |
| 文档状态 | 正式稿 |
| 目标读者 | 产品经理 / 前端工程师 / 后端工程师 / DevOps |

---

## 修订记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| V5.0 | 2026-03-23 | 初始正式稿 |
| V6.0 | 2026-03-23 | Git 架构改为内网 GitLab；增加 SSH Key 凭证管理；Skill 增加标签、版本号、使用次数排序；增加容器安全加固；增加工具黑白名单配置；增加系统资源配置；增加用户登录鉴权；补充已知限制 |

---

## 1. 项目概述

### 1.1 背景与目标

本项目在 Appsmith 低代码平台基础上，构建一套面向开发者的 **Web IDE 二次开发平台**。平台将 Appsmith Page 代码文件与 Claude AI 深度整合，通过隔离的 Docker 开发环境，实现 AI 全程参与的 Page 代码开发工作流。

**项目本身由 AI 辅助开发**，项目级开发文档由开发者手动维护，保存在代码仓库中供团队和 AI 查阅。

**核心目标：**

- 以 Appsmith Page 为开发单元，支持签出 / 签入式隔离开发流程
- Docker 容器内置 Claude AI，AI 上下文为当前 Page 的完整 Git 仓库代码
- 支持外部依赖库动态加载与实时更新，AI 可感知依赖库最新接口
- 提供可扩展的 Skill 系统，增强 AI 辅助开发能力
- 提供项目级开发文档的只读浏览与版本追踪

### 1.2 项目范围

| 模块 | 说明 |
|------|------|
| 用户认证 | 账号密码登录、JWT 鉴权、全局用户信息携带 |
| Page 签出 / 签入 | Page 级开发锁定、Docker 环境生命周期管理、GitLab 仓库同步 |
| IDE 工作区 | 代码编辑（语法高亮）、文件树、AI 对话、Skill 选择 |
| 依赖库管理 | 外部依赖库配置、动态加载、实时更新 |
| Skill 配置 | Skill 增删改查、标签管理、版本迭代、AI 对话时动态选择 |
| 系统配置 | 容器资源限制、工具黑白名单、SSH Key 管理 |

---

## 2. Appsmith 代码结构

平台所操作的 Appsmith Page 代码结构固定如下：

```
<page-name>/
├── canvas.json          # 布局代码（Widget 树、属性绑定、样式）
└── JsObjects/
    ├── COMMON.js        # 公共工具函数、常量、格式化方法
    └── PROCESS.js       # 核心业务逻辑、API 调用、状态管理
```

| 文件 | 类型 | 说明 |
|------|------|------|
| `canvas.json` | JSON | Widget 布局与属性配置 |
| `JsObjects/COMMON.js` | JavaScript | 跨 Action 公共逻辑 |
| `JsObjects/PROCESS.js` | JavaScript | 核心业务流程 |

> AI 上下文为**当前 Page 的 Git 仓库**内容，每个 Page 是独立的 Git 仓库。AI 建议也仅限于当前 Page 文件。

---

## 3. 用户角色

| 角色 | 描述 | 主要操作 |
|------|------|----------|
| 开发者 | 负责 Appsmith Page 功能开发的工程师 | 签出 Page、编辑代码、AI 对话协作、签入提交 |
| 管理员 | 负责平台配置与资源管理 | Skill 管理、依赖库配置、系统配置 |

### 3.1 用户场景

**场景 1：开发者签出 Page 进行功能开发**

1. 开发者打开平台，使用账号密码登录
2. 看到 Page 列表，选择「DashboardPage」，点击「签出并进入 IDE」
3. 系统创建容器，使用 SSH Key 从 GitLab 对应仓库克隆 dev 分支，加载依赖库，启动 AI
4. 开发者进入 IDE，打开 PROCESS.js，开始编码
5. 使用 AI 对话获取 `com.set_error()` 用法帮助
6. AI 返回带 Diff 的代码建议，开发者点击「应用到代码」
7. 开发者保存文件，然后点击「签入」提交并推送代码到 GitLab dev 分支

**场景 2：开发者使用 Skill 增强 AI 能力**

1. 在 IDE 中，开发者点击「Skills」按钮
2. 打开 Skill 抽屉，按标签筛选，启用「错误处理模板」和「代码审查」
3. AI 后续回复将融入错误处理模式和代码审查反馈
4. 开发者可在对话过程中切换 Skill

**场景 3：管理员配置依赖库**

1. 管理员进入依赖库管理页面
2. 添加新依赖：命名空间 `com`，URL 指向 JS 文件
3. 稍后，依赖库在源头更新了
4. 管理员点击「更新」，容器重新拉取最新代码
5. AI 上下文刷新，后续对话使用最新 API

**场景 4：多人并行开发不同 Page**

1. 开发者 A 签出 DashboardPage（GitLab 独立仓库）
2. 开发者 B 签出 UserPage（GitLab 独立仓库）
3. 两人在各自隔离的容器中独立工作
4. 不会发生冲突，因为每个 Page 拥有独立的 Git 仓库
5. 各自独立签入，推送到各自 GitLab 仓库 dev 分支

---

## 4. 导航结构

IDE 顶部固定 4 个 Tab，底部全局状态栏常驻：

```
[📋 Page 签出]  [⌨ IDE 工作区]  [📦 依赖库管理]  [⚡ Skill 配置]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                          全局状态栏（底部常驻）
```

---

## 5. 功能需求

### 5.0 用户认证

#### 5.0.1 登录

- 独立账号密码登录页，未登录时所有页面重定向至登录页
- 输入账号 + 密码，验证通过后签发 JWT Token
- Token 存储在客户端（localStorage），有效期可在系统配置中设置（默认 8 小时）
- Token 过期后自动跳转登录页，清除本地 Token

#### 5.0.2 鉴权机制

- 所有后端接口统一校验 JWT Token（`Authorization: Bearer <token>`）
- Token 解码后获取用户信息（userId、用户名、角色），注入请求上下文
- 前端所有请求统一携带 Token（axios 拦截器统一处理）
- Token 校验失败（过期 / 无效）返回 401，前端跳转登录页

#### 5.0.3 用户管理

- 管理员可在系统配置中增删用户、重置密码
- 用户角色分两种：**开发者** / **管理员**
- 管理员拥有 Skill 管理、系统配置、依赖库管理等额外权限

**API**

```
POST /auth/login          Body: { username, password }，返回 { token, userInfo }
POST /auth/logout         清除服务端 Token（可选黑名单机制）
GET  /auth/me             返回当前登录用户信息
```

---

### 5.1 Page 签出页

#### 5.1.1 Page 列表

- 卡片式展示所有可开发的 Appsmith Page
- 每张卡片展示：Page 名称、GitLab 仓库地址、当前分支（dev）、文件结构预览（canvas.json / JsObjects/）、状态标签
- 状态分三种：**空闲**（可签出）、**已签出**（显示签出人，禁止操作）、**我的签出**
- 支持关键字搜索、按状态过滤（全部 / 空闲 / 我的签出）

#### 5.1.2 签出流程

用户选中 Page 后点击「签出并进入 IDE」，系统依次执行：

| 步骤 | 执行方 | 描述 |
|------|--------|------|
| 1 | 后端 | 校验 Page 未被签出，标记为「已签出」，记录签出人（当前登录用户） |
| 2 | 后端 | 调用 Docker API 创建容器，注入 SSH Key（写入容器 tmpfs，不落盘） |
| 3 | 容器 | 使用注入的 SSH Key，`git clone -b dev <gitlab-repo-url>` 拉取代码至 `/workspace/` |
| 4 | 容器 | 按依赖库配置拉取所有外部库代码至 `/deps/` |
| 5 | 容器 | 启动 Claude AI 服务，注入当前 Page 仓库 + 依赖库完整上下文 |
| 6 | 后端 | 轮询 `/api/health`，健康检查通过（超时 60s 则回滚并解锁） |
| 7 | 前端 | 跳转至 IDE 工作区，加载当前 Page 文件树 |

全程以**步骤动画**展示进度（锁定 → 创建容器 → git clone → 依赖库加载 → AI 启动 → 健康检查）。

#### 5.1.3 签入流程

用户点击顶部「签入」按钮，系统依次执行：

| 步骤 | 执行方 | 描述 |
|------|--------|------|
| 1 | 容器 | `git add . && git commit -m "<message>" && git push origin dev` 推送代码至 GitLab 对应仓库 dev 分支 |
| 2 | 后端 | 停止并删除 Docker 容器（容器内 /workspace/ 代码随容器销毁） |
| 3 | 后端 | 解除 Page 签出锁定，状态恢复「空闲」 |
| 4 | 前端 | 跳回 Page 签出页 |

> 容器销毁后，本地克隆的代码随之消失，代码只保留在 GitLab 远程仓库中。

#### 5.1.4 异常处理

| 异常 | 处理方式 |
|------|----------|
| 容器启动超时（> 60s） | 自动回滚，解除 Page 锁定，提示用户重试 |
| git clone 失败（SSH Key 无效 / 网络异常） | 回滚，提示检查 SSH Key 配置 |
| git push 失败（冲突 / 权限问题） | 提示用户，容器保留，用户可处理后重试签入 |

---

### 5.2 IDE 工作区

IDE 工作区为三栏布局：**左侧文件树** ｜ **中间代码编辑器** ｜ **右侧 AI 对话区**。

#### 5.2.1 左侧文件树

- 仅展示**当前签出 Page** 的文件，不展示其他 Page：

  ```
  📁 <PageName>/
    📄 canvas.json  ●
    📁 JsObjects/
      ⚡ COMMON.js
      ⚡ PROCESS.js  ●
  ```

- `●` 表示文件有未保存修改
- 文件夹支持**折叠 / 展开**（点击切换，箭头旋转动画）
- 点击文件即切换编辑，对应 Tab 高亮激活
- 底部快捷跳转：「📦 管理依赖库」「⚡ Skill 配置」

#### 5.2.2 代码编辑器

**Tab 管理：**
- 多文件 Tab，支持关闭单个 Tab，关闭时自动切换至相邻 Tab

**编辑能力：**
- 语法高亮（JavaScript / JSON）
- 可编辑，Tab 键缩进（2 空格）
- 行号与代码区域同步滚动

**编辑工具栏（Tab 栏下方）：**
- 当前文件名
- `● 未保存` 状态标识（有修改时显示）
- **「↓ 保存」按钮**：将修改保存到容器本地文件
  - 悬停 Tooltip："保存修改到当前本地仓库，签入提交后才会应用到编辑页"
  - 保存成功后变为「✓ 已保存」状态
- 保存仅作用于容器内，**签入后才推送至 GitLab 远程仓库**

**AI Diff 提示条（AI 有代码建议时出现）：**
- 说明变更内容（涉及的文件与行范围）
- 「✓ 应用修改」：将建议写入编辑区，文件标记为「已修改」
- 「忽略」：关闭提示条，保留原始代码

**文件接口规范（容器内 File Manager :3001）：**

| 接口 | Method | 功能 |
|------|--------|------|
| `/files` | GET | 获取文件树 |
| `/files/{path}` | GET | 读取文件内容 |
| `/files/{path}` | POST | 创建文件 |
| `/files/{path}` | PUT | 更新文件内容（保存） |
| `/files/{path}` | DELETE | 删除文件 |
| `/files/diff` | GET | 获取 git diff（所有未提交变更） |

#### 5.2.3 AI 对话区

**头部工具栏：**
- AI 模型名称与上下文状态
- 「↻ 更新依赖」按钮：触发依赖库更新流程（含动画，不中断会话）
- 「⚡ Skills N」按钮：打开 Skill 选择抽屉

**上下文标签栏：**
- 展示当前注入 AI 的上下文来源：
  - 蓝色标签：当前打开的文件（如 `canvas.json`）
  - 橙色标签：已加载的依赖库（如 `com.js`、`utils.js`）
  - 紫色标签：激活的 Skill（如 `🛡 错误处理`）

**对话区域：**
- 多轮对话，用户消息右对齐，AI 回复左对齐
- AI 回复支持 Markdown 渲染与代码块高亮
- AI 代码建议以 Diff 块展示，含「✓ 应用到代码」「继续优化」等操作按钮
- AI 思考中显示 Typing 动画

**输入区：**
- `Enter` 发送，`Shift+Enter` 换行
- 快捷 Hint 按钮（布局优化 / 工具函数 / 查询依赖库 等）
- 发送按钮

**Skill 选择抽屉（从右侧滑入覆盖对话区）：**
- 支持搜索过滤、按标签筛选
- 多选勾选，已选 Skill 高亮
- 底部展示已选 Skill Chip，可点 × 移除
- 「确认并应用」后更新上下文标签栏

**AI 对话接口规范（容器内 Claude AI Proxy :3000）：**

| 接口 | Method | 说明 |
|------|--------|------|
| `/api/health` | GET | 健康检查 |
| `/api/chat` | POST | 发送消息，SSE 流式返回 AI 回复 |
| `/api/session` | GET | 获取当前会话信息 |
| `/api/session` | DELETE | 清理会话 |
| `/api/context/refresh` | POST | 刷新 AI 上下文（重读仓库 + 依赖库） |

`/api/chat` 请求体：

```json
{
  "message": "给 fetchData 函数添加 com.set_error() 错误处理",
  "currentFile": "JsObjects/PROCESS.js",
  "fileContent": "<当前文件完整内容>",
  "skills": ["error-handle", "code-review"]
}
```

> **注意**：对话历史由容器内 ClaudeClient 在服务端管理，前端无需传递 `history` 字段。

响应体（SSE 流式）：

```json
{
  "reply": "已在第 14 行添加 try/catch...",
  "codeSuggestion": {
    "file": "JsObjects/PROCESS.js",
    "diff": "<unified diff>"
  },
  "sessionId": "d4e9a2f"
}
```

#### 5.2.4 全局状态栏

底部状态栏在**所有页面**固定显示，内容随当前 Tab 调整：

- IDE 工作区时：`当前文件 │ Git 分支 │ 行列号 │ 文件语言 │ 编码 │ git 改动数`
- 其他页面时：显示平台基础信息（当前登录用户名）

---

### 5.3 依赖库管理页

#### 5.3.1 依赖库定义

依赖库是 Appsmith Page 运行时动态加载的外部 JavaScript 库，以**命名空间**方式调用：

```javascript
// PROCESS.js 中调用示例
com.set_error('NETWORK_ERROR');
com.request('/api/data', { method: 'GET' });
utils.formatDate(new Date(), 'YYYY-MM-DD');
```

AI 需读取库的源代码才能正确理解其接口，辅助开发者使用依赖库编写代码。

每个依赖库的配置字段：

| 字段 | 必填 | 说明 |
|------|------|------|
| 库名（命名空间） | ✅ | 代码中调用时的变量名，如 `com` |
| 代码 URL | ✅ | 库源代码的可访问地址（需在 URL 白名单内） |
| 版本备注 | 可选 | 当前版本描述，如 `v2.3.1` |
| 描述 | 可选 | 库的用途说明 |

#### 5.3.2 页面功能

- 卡片式展示所有已配置的依赖库
- 每张卡片显示：命名空间、描述、URL、版本、加载状态、**接口代码预览**
- 操作：**单个更新**（↻）、**删除**（✕）
- 顶部操作栏：「+ 添加依赖库」（弹窗）、「↻ 全部更新」
- 底部**更新日志**：记录每次更新的时间、库名、变化摘要

#### 5.3.3 容器内加载机制

容器启动时，依次拉取所有依赖库代码，以如下格式注入 AI 上下文：

```
[依赖库：com]
来源：https://cdn.example.com/com.js
---
<com.js 完整源代码>
```

#### 5.3.4 实时更新流程

| 步骤 | 说明 |
|------|------|
| 1 | 用户点击「更新依赖库」（单个或全部） |
| 2 | 容器重新从 URL 拉取最新库代码，写入 `/deps/` |
| 3 | 调用 `/api/context/refresh`，AI 重新加载依赖库上下文 |
| 4 | 对话区显示系统消息「依赖库已更新，最新接口已加载」 |
| 5 | 更新日志追加本次记录 |

更新过程**不中断**当前对话会话。

**依赖库接口（容器内 :3000）：**

| 接口 | Method | 说明 |
|------|--------|------|
| `/api/deps` | GET | 获取已加载依赖库列表及版本 |
| `/api/deps/{name}/refresh` | POST | 更新指定依赖库 |
| `/api/deps/refresh-all` | POST | 更新全部依赖库 |

---

### 5.4 Skill 配置页

#### 5.4.1 Skill 定义

Skill 是可配置的 AI 能力模块，以 Prompt 模板形式注入 AI 上下文，增强 AI 在特定场景下的能力。

每个 Skill 的属性：

| 属性 | 说明 |
|------|------|
| 名称 | 唯一标识，显示在 AI 对话界面 |
| 描述 | 说明该 Skill 的用途与适用场景 |
| 标签 | 一个或多个自由填写的标签，用于分类筛选（如 `canvas.json`、`PROCESS.js`、`代码质量`） |
| Prompt 模板 | 注入 AI 上下文的具体指令（可编辑文本框） |
| 参数配置 | 可调参数（如审查级别、目标语言等） |
| 启用 / 禁用 | 控制该 Skill 是否出现在 IDE 选择器中 |
| 版本号 | Skill 版本号，格式建议 `v1.0`、`v1.1`，支持迭代记录 |
| 使用次数 | 系统自动统计，用于排序 |

#### 5.4.2 Skill 排序规则

Skill 列表按**使用次数降序**排列，使用次数越高的 Skill 越靠前展示。使用次数相同时，按创建时间降序排列。

#### 5.4.3 页面功能

- 分区展示：**已启用 Skill** / **可用 Skill**
- 顶部支持：关键字搜索、按标签筛选（标签 Chip 点击筛选）
- 每张 Skill 卡片包含：图标、名称 + 版本标签、标签 Chip、描述、参数表单、Prompt 模板编辑框、调用频率进度条（基于使用次数）
- 启用 / 禁用开关：切换后卡片在两区间移动，顶部计数实时更新
- 支持：新建 Skill、编辑参数与 Prompt、迭代版本（保留历史版本记录）、删除

#### 5.4.4 版本迭代

- 每次保存 Skill 时，可选择「更新当前版本」或「创建新版本」
- 历史版本列表可查看，支持回滚至任意历史版本
- 版本记录包含：版本号、修改时间、修改人、Prompt 内容快照

#### 5.4.5 预置 Skill 参考

| Skill | 建议标签 | 说明 |
|-------|----------|------|
| 代码审查 | `全部`, `代码质量` | 分析代码质量、Bug、性能问题 |
| Widget 生成 | `canvas.json` | 根据描述生成 Widget 配置 JSON |
| API 集成助手 | `PROCESS.js` | 生成 Datasource 配置和 Query Action |
| 错误处理模板 | `PROCESS.js` | 注入标准 try/catch + com.set_error() |
| 文档生成 | `COMMON.js`, `PROCESS.js` | 自动生成 JSDoc 注释 |
| 测试用例生成 | `PROCESS.js` | 生成 Jest 单元测试 |
| 性能分析 | `PROCESS.js` | 检测冗余调用和性能问题 |
| 国际化助手 | `canvas.json` | 提取文案，生成多语言键值对 |

---

### 5.5 系统配置页

系统配置页仅管理员可访问，提供平台级参数的动态配置能力。**配置修改后仅影响之后新建的 Docker 容器，不影响已运行的容器。**

#### 5.6.1 容器资源限制

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| 单容器内存上限 | 每个 Docker 容器可使用的最大内存 | 1 GB |
| 单容器 CPU 上限 | 每个 Docker 容器可占用的最大 CPU 核数 | 1 核 |
| 平台最大并发容器数 | 同时存在的 Docker 容器总数上限 | 20 个 |

- 当并发容器数达到上限时，新的签出请求被拒绝，提示用户等待
- 资源配置修改后立即生效，保存至数据库，服务重启后仍然有效

#### 5.6.2 Claude 工具黑白名单

配置 Claude AI 在容器内可调用的工具列表，用于控制 AI 的操作范围。

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| WebFetch | 允许 AI 访问外部 URL | **禁用** |
| WebSearch | 允许 AI 搜索外网 | **禁用** |
| Bash | 允许 AI 执行 Shell 命令 | 启用（受白名单约束） |
| Read / Write / Edit | 文件读写工具 | 启用 |

> 项目部署于内网环境，WebFetch / WebSearch 默认禁用。如需启用，请确认网络策略后由管理员手动开启。

#### 5.6.3 SSH Key 管理

平台级 SSH Key 用于容器访问内网 GitLab，统一由管理员配置。

| 配置项 | 说明 |
|--------|------|
| SSH 私钥 | 上传 PEM 格式私钥，加密存储，不在界面明文展示 |
| GitLab 域名 | 内网 GitLab 域名或 IP，用于 known_hosts 配置 |
| 连接测试 | 点击「测试连接」验证 SSH Key 是否可正常访问 GitLab |

**SSH Key 注入机制：**
- 容器创建时，将私钥写入容器 tmpfs（`/run/secrets/id_git`，权限 600）
- 容器销毁后，tmpfs 随之清除，私钥不落盘
- Claude AI 无法读取 `/run/secrets/` 路径下的文件

#### 5.6.4 其他配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| JWT Token 有效期 | 用户登录 Token 的过期时间 | 8 小时 |
| 依赖库 URL 白名单 | 允许加载的依赖库 URL 前缀列表 | 空（允许所有） |
| 容器健康检查超时 | 签出时健康检查的最长等待时间 | 60 秒 |

---

## 6. Git 仓库管理

### 6.1 整体策略

项目使用**内网 GitLab** 作为中央仓库。**每个 Appsmith Page 在 GitLab 上拥有一个独立的仓库**：

```
GitLab（内网）
├── DashboardPage        ← DashboardPage 独立仓库，dev 分支
├── UserPage             ← UserPage 独立仓库，dev 分支
├── ...                  ← 其他 Page 各自独立
└── ai-ide-project       ← 本项目代码仓库
```

- **签出** = 从 GitLab 对应仓库 `git clone -b dev` 到容器 `/workspace/`
- **签入** = 容器内 `git push origin dev` 推回 GitLab，容器随后销毁
- 签出锁保证同一时刻只有一个用户操作某个 Page 仓库，**不会产生 Git 冲突**
- 容器销毁后，本地克隆代码随之消失，代码唯一来源为 GitLab

### 6.2 SSH Key 凭证安全

- SSH Key 由管理员在系统配置中统一维护
- 容器创建时注入 tmpfs（`/run/secrets/id_git`），不写入容器镜像或宿主机磁盘
- 容器销毁后，tmpfs 自动清除
- Claude AI 工具路径白名单明确拒绝读取 `/run/secrets/**`

### 6.3 Commit 规范

格式：`<type>(<scope>): <subject>`

| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 重构 |
| `docs` | 文档变更（含项目开发文档） |
| `chore` | 构建 / 工具链变更 |

示例：
```
feat(fe): add collapsible file tree with toggle animation
docs(decisions): record choice of GitLab over local bare repo
docs(api): update container AI proxy API after adding /context/refresh
```

---

## 7. 非功能需求

| 类别 | 指标 | 要求 |
|------|------|------|
| 性能 | 容器启动时间（含 git clone） | P95 < 60 秒 |
| 性能 | AI 对话响应时间 | P95 < 15 秒 |
| 性能 | 文件读写接口响应 | P95 < 500ms |
| 性能 | 依赖库更新时间（单个） | P95 < 10 秒 |
| 可用性 | Web IDE 可用率 | ≥ 99.5%（工作时间） |
| 并发 | 同时签出数量 | 支持最大并发容器数（可配置，默认 20） |
| 安全 | 用户认证 | 所有接口统一 JWT 鉴权，Token 过期自动跳转登录 |
| 安全 | Claude API Key | 仅注入容器环境变量，不暴露给前端 |
| 安全 | SSH Key（Git 凭证） | 仅注入容器 tmpfs，容器销毁即清除，不落盘 |
| 安全 | 容器隔离 | `no-new-privileges` + `ReadonlyRootfs` + 非 root 用户运行 |
| 安全 | 容器网络 | 禁止容器间通信，仅允许访问白名单地址（GitLab / Anthropic API） |
| 安全 | 依赖库来源 | 仅允许加载白名单内的 URL（可在系统配置中管理） |
| 安全 | Claude 工具限制 | WebFetch / WebSearch 默认禁用，可在系统配置中管理 |
| 资源 | 单容器内存 | 可配置，默认 1 GB 上限 |
| 资源 | 单容器 CPU | 可配置，默认 1 核上限 |
| 数据库 | PostgreSQL | 开发环境与生产环境均使用 PostgreSQL |

---

## 8. 核心数据流

### 8.1 登录流程

```
用户输入账号密码 → 后端验证 → 签发 JWT Token
  → 前端存储 Token → 后续请求统一携带 Authorization Header
```

### 8.2 签出流程

```
用户选择 Page → 点击「签出」（携带 JWT Token）
  → 后端鉴权 → 锁定 Page（记录签出人）
  → 创建 Docker 容器
  → SSH Key 注入容器 tmpfs
  → git clone -b dev <gitlab-url>（容器 /workspace/）
  → 拉取依赖库代码（→ 容器 /deps/）
  → 启动 Claude AI（注入当前 Page 仓库 + 依赖库上下文）
  → 健康检查通过
  → 前端进入 IDE，加载当前 Page 文件树
```

### 8.3 签入流程

```
用户点击「签入」
  → 容器 git add . && git commit && git push origin dev（→ GitLab）
  → 销毁 Docker 容器（本地代码随容器销毁）
  → 解除 Page 锁定
  → 前端跳回 Page 签出页
```

### 8.4 AI 对话流程

```
用户发送消息
  → 前端携带 [消息 + 当前文件内容 + 选中 Skill 列表]（不含对话历史）
  → 调用容器 /api/chat（SSE 流式返回）
  → 容器内 ClaudeClient 管理对话历史，结合当前 Page 仓库 + 依赖库上下文 + Skill Prompt 生成回复
  → 前端渲染 AI 回复 + Diff 建议
  → 用户点击「应用到代码」→ 调用 /files/{path} PUT 写入文件
  → Skill 使用次数 +1（若本次对话使用了 Skill）
```

### 8.5 依赖库更新流程

```
用户点击「更新依赖库」
  → 容器重新拉取库代码 → 写入 /deps/
  → 调用 /api/context/refresh → AI 重新加载依赖库上下文
  → 对话区显示系统消息「依赖库已更新」
  → 更新日志记录
```

---

## 9. 风险评估

| 风险 | 等级 | 应对措施 |
|------|------|----------|
| 仓库代码量大，超出 AI Token 限制 | 高 | 分块加载，优先注入当前 Page 相关文件；支持按需检索 |
| git clone 耗时导致签出超时 | 中 | 设置 60s 超时；支持 shallow clone；预热镜像缓存 |
| GitLab 不可用导致签出 / 签入失败 | 中 | 提示用户，容器保留，用户可等待 GitLab 恢复后重试 |
| SSH Key 泄露 | 中 | 只存 tmpfs，容器销毁即清除；后端加密存储；定期轮换 |
| 依赖库 URL 不可用导致加载失败 | 中 | 降级跳过，AI 标注上下文缺失；提示用户检查配置 |
| 依赖库更新后 AI 上下文不一致 | 中 | 强制刷新上下文并告知用户 |
| 多人同时签出同一 Page | 低 | 签出加锁，已签出禁止重复操作 |
| 并发容器超出资源上限 | 中 | 达到上限时拒绝新签出，提示用户等待；系统配置可动态调整上限 |

---

## 10. 验收标准

**用户认证：**
- 未登录时所有页面重定向至登录页
- 账号密码登录成功后签发 JWT Token，所有接口统一携带
- Token 过期后自动跳转登录页

**Page 签出 / 签入：**
- Page 列表状态（空闲 / 已签出 / 我的签出）展示正确，显示签出人，搜索过滤有效
- 签出全流程（含 SSH Key 注入 + git clone + AI 启动）在 60 秒内完成，步骤动画正确展示
- 签入后代码正确推送至 GitLab 对应仓库 dev 分支，容器销毁，Page 状态恢复空闲

**IDE 工作区：**
- 文件树仅展示当前签出 Page 的文件（canvas.json + JsObjects/），折叠/展开正常
- 点击文件切换编辑，语法高亮生效（JS / JSON）
- 代码可编辑，保存按钮将修改写入容器文件，Tooltip 内容正确显示
- AI 对话能引用仓库代码并给出建议，Diff 展示正确，「应用到代码」功能正常

**依赖库：**
- AI 对话能正确理解并使用依赖库接口（如 `com.set_error()`）
- 点击「更新依赖库」后，AI 在后续对话中能感知最新接口
- 更新日志记录正确

**Skill：**
- Skill 配置页支持新增、编辑 Prompt、设置标签、版本迭代、启用 / 禁用
- Skill 列表按使用次数降序排列
- 支持按标签筛选和关键字搜索
- IDE 对话界面可多选 Skill，选中后 AI 回复体现对应 Skill 能力
- 每次 Skill 被使用后，使用次数正确 +1

**系统配置：**
- 容器资源限制（内存 / CPU / 最大并发数）可动态配置，修改后仅影响新建容器
- Claude 工具黑白名单可配置，WebFetch / WebSearch 默认禁用
- SSH Key 可上传，连接测试通过后容器可正常访问 GitLab
- SSH Key 注入容器 tmpfs，容器销毁后自动清除

**安全：**
- Claude API Key 与 SSH Key 不在前端网络请求中暴露
- 容器以非 root 用户运行，启用 `no-new-privileges` 和 `ReadonlyRootfs`
- 全局状态栏在所有页面底部常驻显示（含当前登录用户名）
- 数据库使用 PostgreSQL（开发和生产环境统一）

---

## 11. 待办 / 已知限制

- [ ] **会话状态持久化**：当前使用内存 Map 存储 sessionId 与容器状态，服务重启后会话数据丢失，用户需重新签出。待后续改用 Redis 实现持久化，支持服务重启后会话恢复
- [ ] 完整的 git push 冲突 UI 处理（当前提示用户自行解决）
- [ ] Skill 的参数配置（高级参数表单）尚未完整实现
- [ ] 管理后台（Token 用量统计、工具调用监控）暂不实现

---

## 12. 附录

### 12.1 术语说明

| 术语 | 说明 |
|------|------|
| 签出（Checkout） | 锁定 Page 并创建 Docker 开发环境的操作 |
| 签入（Checkin） | 提交代码变更至 GitLab 并销毁 Docker 容器的操作 |
| Docker 开发环境 | 每次签出创建的隔离容器，含 AI 服务、文件服务、Git 仓库 |
| AI 上下文 | 注入 Claude 的背景信息，含完整仓库代码 + 依赖库代码 + Skill Prompt |
| Skill | 可配置的 AI 能力模块，以 Prompt 模板形式注入上下文，支持标签和版本管理 |
| 依赖库 | 动态加载的外部 JS 库，以命名空间方式在 Page 代码中调用 |
| SSH Key | 用于访问内网 GitLab 的 SSH 私钥，注入容器 tmpfs，不落盘 |
| JWT Token | 用户登录后签发的身份凭证，所有接口统一鉴权 |
| canvas.json | Appsmith Page 的布局文件，描述 Widget 树和属性配置 |
| JsObjects | Appsmith Page 的 JS 逻辑目录（COMMON.js + PROCESS.js） |
| tmpfs | Linux 内存文件系统，数据只存内存，进程 / 容器销毁后自动清除 |

### 12.2 依赖库配置示例

```json
{
  "dependencies": [
    {
      "name": "com",
      "url": "https://cdn.example.com/libs/com.js",
      "version": "v2.3.1",
      "description": "公共工具库，提供错误处理、网络请求等核心方法"
    },
    {
      "name": "utils",
      "url": "https://cdn.example.com/libs/utils.js",
      "version": "v1.0.4",
      "description": "通用工具函数库"
    }
  ]
}
```

### 12.3 系统配置数据结构示例

```json
{
  "container": {
    "memoryLimit": "1g",
    "cpuLimit": 1.0,
    "maxConcurrent": 20,
    "healthCheckTimeout": 60
  },
  "claude": {
    "disabledTools": ["WebFetch", "WebSearch"],
    "allowedPaths": ["/workspace/**"],
    "deniedPaths": ["/run/secrets/**", "/etc/**"]
  },
  "git": {
    "gitlabDomain": "gitlab.internal.example.com",
    "sshKeyPath": "/run/secrets/id_git"
  },
  "auth": {
    "jwtExpiresIn": "8h"
  },
  "deps": {
    "urlWhitelist": ["https://cdn.example.com/"]
  }
}
```

### 12.4 Appsmith Page GitLab 仓库结构示例

```
GitLab（内网）
├── DashboardPage/           ← 独立仓库，dev 分支
│   ├── DashboardPage/
│   │   ├── canvas.json
│   │   └── JsObjects/
│   │       ├── COMMON.js
│   │       └── PROCESS.js
├── UserPage/                ← 独立仓库，dev 分支
│   ├── UserPage/
│   │   ├── canvas.json
│   │   └── JsObjects/
│   │       ├── COMMON.js
│   │       └── PROCESS.js
└── ai-ide-project/          ← 本项目代码仓库
```

---

*文档结束 · V6.0 · 2026-03-23*
