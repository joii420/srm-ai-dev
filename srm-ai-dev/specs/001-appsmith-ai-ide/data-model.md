# Data Model: Appsmith AI-IDE Web 开发平台

**Branch**: `001-appsmith-ai-ide` | **Date**: 2026-03-24

## 实体关系概览

```
User (外部服务) 1──N Checkout
Checkout N──1 Page (由第三方接口提供，本项目无独立 Page 表；pageId/pageName/gitlabRepoUrl 在 Checkout 中冗余存储)
Skill 1──N SkillVersion
Skill 1──N SkillField (模板参数字段)
Dependency (独立实体)
SystemConfig (键值对)
```

## 实体定义

### E-001: User（用户）

用户身份由外部用户管理服务维护。本项目本地缓存用户信息用于关联业务数据。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK, gen_random_uuid() | 本地主键 |
| external_user_id | VARCHAR(200) | UNIQUE, NOT NULL | 外部用户管理服务的用户 ID |
| username | VARCHAR(100) | NOT NULL | 登录账号（从外部服务同步） |
| display_name | VARCHAR(100) | | 展示名称（从外部服务同步） |
| role | VARCHAR(20) | DEFAULT 'developer' | 角色缓存：'developer' \| 'admin' |
| active_skills | JSONB | DEFAULT '[]' | 上次使用的 Skill ID 列表 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**验证规则**:
- external_user_id 必须唯一
- role 仅接受 'developer' 或 'admin'

### E-002: Skill（AI 能力模块）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Skill 唯一名称 |
| description | TEXT | | 用途说明 |
| icon | VARCHAR(10) | DEFAULT '⚡' | 图标 Emoji |
| category | VARCHAR(50) | | 分类标签 |
| prompt | TEXT | NOT NULL | Prompt 模板（含 {{占位符}}） |
| keywords | JSONB | DEFAULT '[]' | 触发关键词列表 |
| tags | JSONB | DEFAULT '[]' | 标签数组 |
| enabled | BOOLEAN | DEFAULT true | 是否启用 |
| version | VARCHAR(20) | DEFAULT 'v1.0' | 当前版本号 |
| call_count | INTEGER | DEFAULT 0 | 使用次数（降序排列） |
| created_by | UUID | FK → users(id) | 创建人 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**验证规则**:
- name 必须唯一且非空
- prompt 必须非空
- call_count ≥ 0
- 使用次数统计：每次会话最多 +1

### E-003: SkillField（Skill 模板参数字段）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| skill_id | UUID | FK → skills(id), NOT NULL | 所属 Skill |
| field_id | VARCHAR(50) | NOT NULL | 字段唯一标识（Skill 内唯一） |
| label | VARCHAR(100) | NOT NULL | 显示标签 |
| type | VARCHAR(20) | NOT NULL | 输入类型：text / textarea / select / chips |
| required | BOOLEAN | DEFAULT false | 是否必填 |
| placeholder | TEXT | | 占位文本 |
| options | JSONB | DEFAULT '[]' | 可选项列表（select/chips 类型） |
| token | VARCHAR(100) | NOT NULL | Prompt 占位符名称（对应 {{token}}） |
| sort_order | INTEGER | DEFAULT 0 | 排序权重 |

**验证规则**:
- (skill_id, field_id) 联合唯一
- type 仅接受 'text', 'textarea', 'select', 'chips'
- token 在同一 Skill 内唯一

### E-004: SkillVersion（Skill 版本历史）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| skill_id | UUID | FK → skills(id), NOT NULL | 所属 Skill |
| version | VARCHAR(20) | NOT NULL | 版本号 |
| prompt_snapshot | TEXT | NOT NULL | Prompt 内容快照 |
| fields_snapshot | JSONB | DEFAULT '[]' | 模板参数字段快照 |
| modified_by | UUID | FK → users(id) | 修改人 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**验证规则**:
- (skill_id, version) 联合唯一

### E-005: Dependency（依赖库）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| namespace | VARCHAR(50) | UNIQUE, NOT NULL | 调用时的变量名（如 com） |
| url | TEXT | NOT NULL | 库源代码 URL |
| version | VARCHAR(50) | | 版本备注 |
| description | TEXT | | 用途说明 |
| last_loaded | TIMESTAMPTZ | | 上次成功拉取时间 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**验证规则**:
- namespace 必须唯一
- url 必须非空

### E-006: Checkout（签出记录）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| page_id | VARCHAR(200) | NOT NULL | GitLab 仓库标识 |
| page_name | VARCHAR(200) | NOT NULL | 展示名称 |
| gitlab_repo_url | TEXT | NOT NULL | SSH 格式 GitLab 仓库地址 |
| git_branch | VARCHAR(200) | DEFAULT 'dev' | 分支名 |
| user_id | UUID | FK → users(id) | 签出人 |
| container_id | VARCHAR(100) | | Docker 容器 ID |
| session_id | VARCHAR(100) | | AI 会话 ID |
| status | VARCHAR(20) | DEFAULT 'active' | active / checkedin / failed |
| checked_out_at | TIMESTAMPTZ | DEFAULT NOW() | 签出时间 |
| checked_in_at | TIMESTAMPTZ | | 签入时间 |
| commit_hash | VARCHAR(40) | | git clone 时的 HEAD commit hash，用于签入时计算 diff 和追溯基线 |

**状态转换**:
```
[新建] → active（签出成功，容器运行中）
active → checkedin（签入成功，容器已销毁）
active → failed（签出/签入异常回滚，Page 锁定已解除）
```

**验证规则**:
- 同一 page_id 同一时刻只能有一条 status='active' 的记录
- status 仅接受 'active', 'checkedin', 'failed'
- 签出成功时 MUST 记录 commit_hash；签入时通过 commit_hash 与当前 HEAD 计算变更范围

### E-007: SystemConfig（系统配置）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| key | VARCHAR(100) | UNIQUE, NOT NULL | 配置键 |
| value | JSONB | NOT NULL | 配置值 |
| description | TEXT | | 说明 |
| updated_by | UUID | FK → users(id) | 最后修改人 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**默认配置项**:

| 配置键 | 默认值 | 说明 |
|--------|--------|------|
| container.memoryLimit | "1g" | 单容器内存上限 |
| container.cpuLimit | 1.0 | 单容器 CPU 上限 |
| container.maxConcurrent | 20 | 最大并发容器数 |
| container.healthCheckTimeout | 60 | 健康检查超时（秒） |
| claude.disabledTools | ["WebFetch","WebSearch"] | 禁用工具 |
| claude.allowedPaths | ["/workspace/**","/deps/**"] | AI 可读写路径 |
| claude.deniedPaths | ["/run/secrets/**","/etc/**"] | AI 禁止路径 |
| auth.jwtExpiresIn | "8h" | JWT 有效期 |
| deps.urlWhitelist | [] | 依赖库 URL 白名单 |
| git.gitlabDomain | "" | GitLab 域名 |
| pages.thirdPartyApiUrl | "" | 第三方 Page 列表接口 URL |
| pages.thirdPartyApiToken | "" | 第三方接口访问 Token（加密存储） |

**验证规则**:
- 敏感配置键（pages.thirdPartyApiToken、git.gitlabDomain 对应的 SSH Key 等）由应用层在写入前加密，读取时解密，不以明文存储在数据库中；加密算法由后端 SshKeyService 统一管理
- pages.thirdPartyApiToken 的"加密存储"与 SSH Key 采用相同的应用层加密策略，并非数据库字段加密
