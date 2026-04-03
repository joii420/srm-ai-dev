---
type: conventions
last_updated: 2026-04-03
generated_by: claude-code
prompt: docs/prompts/AI_SCAN_PROMPT.md
related: [ARCHITECTURE.md, API.md]
reviewed_by: pending
ai_instruction: 生成任何代码前必须阅读此文件
---

# 编码规范

## 命名规范
| 类型 | 规范 | 示例 |
|------|------|------|
| Java 类名 | PascalCase | `ContainerLifecycle`, `PageResource` |
| Java 方法名 | camelCase | `checkoutPage()`, `getEditLockState()` |
| Java 常量 | UPPER_SNAKE_CASE | `MAX_CONCURRENT` |
| REST 路径 | kebab-case | `/api/ide/system-config`, `/edit-lock-state` |
| TypeScript 组件 | PascalCase | `ChatPanel`, `StatusBar` |
| TypeScript 函数/变量 | camelCase | `useSessionRecovery`, `authStore` |
| Zustand Store | camelCase + Store 后缀 | `authStore`, `pageStore`, `editorStore` |
| 数据库表名 | snake_case 复数 | `users`, `checkouts`, `skill_fields` |
| 数据库列名 | snake_case | `external_user_id`, `checked_out_at` |

## 后端代码风格
- 框架: Quarkus 3.x + RESTEasy Reactive
- ORM: Hibernate ORM with Panache (Active Record 模式)
- 使用 Lombok (`@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`)
- 依赖注入: CDI `@Inject`
- 事务管理: `@Transactional`
- 日志: `java.util.logging.Logger`
- REST 资源类以 `Resource` 结尾，服务类以 `Service` 结尾
- DTO 类以 `Dto` 结尾，放在 `dto` 包中
- 权限控制: 使用 `@AdminOnly` 自定义注解标记管理员端点

## 前端代码风格
- React 18 + TypeScript (严格模式)
- 构建工具: Vite
- 状态管理: Zustand (非 Redux)
- 数据请求: TanStack React Query + Axios
- 代码编辑器: Monaco Editor
- 路由: React Router
- CSS: 自定义类名（非 CSS-in-JS，非 Tailwind）

## API 规范
- 所有 REST 端点前缀: `/api/ide/`
- 认证: JWT Bearer Token (Authorization header)
- 响应格式: JSON
- SSE 用于长时间操作（如签出流程）
- 管理员端点使用 `@AdminOnly` 注解

## 测试规范
- 前端测试框架: Vitest 1.5
- 前端测试文件位置: 与源文件同目录，`.test.ts` / `.test.tsx` 后缀
- 后端测试: `src/test/java/` 目录，使用 Quarkus 测试框架
- 后端测试 profile: `application-test.properties`

## 数据库迁移
- 主要方式: Flyway (Java 后端)
- 迁移文件位置: `packages/backend-java/src/main/resources/db/migration/`
- 命名规范: `V{版本号}__{描述}.sql`
- 启动时自动执行: `quarkus.flyway.migrate-at-start=true`

## 禁止事项（AI 特别注意）
- 禁止直接修改 `deploy/` 下的生产配置文件，除非明确要求
- 禁止在前端代码中硬编码 API URL，必须通过环境变量或配置
- 禁止绕过 AuthFilter 的 JWT 验证
- 禁止在容器内直接操作数据库，所有数据操作通过后端 API
- 禁止在不了解影响的情况下修改 Docker 容器镜像构建文件
