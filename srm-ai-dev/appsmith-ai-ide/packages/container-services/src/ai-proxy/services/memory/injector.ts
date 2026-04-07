import type { UserMemory, ProjectMemory } from "./types.js";

/**
 * Build user memory section for system prompt (global, cross-project).
 */
export function buildUserMemorySection(memory: UserMemory | null): string {
  if (!memory) return "";

  const dislikes = memory.interaction_habits?.dislikes?.length
    ? `\n- 请避免：${memory.interaction_habits.dislikes.join("、")}`
    : "";

  const toolchain = memory.toolchain?.package_manager
    ? `\n- 惯用包管理器：${memory.toolchain.package_manager}`
    : "";

  const frameworks = memory.toolchain?.preferred_frameworks?.length
    ? `\n- 偏好框架：${memory.toolchain.preferred_frameworks.join("、")}`
    : "";

  return `
## 用户偏好（全局，跨所有项目生效）
- 回复语言：${memory.preferences?.reply_language || "中文"}
- 回复详细程度：${memory.preferences?.reply_detail_level || "详细"}
- 代码范式偏好：${memory.code_style?.paradigm || "未指定"}
- 命名规范：${memory.code_style?.naming_convention || "未指定"}
- 注释语言：${memory.code_style?.comment_language || "中文"}
- 注释密度：${memory.code_style?.comment_density || "关键逻辑注释"}
- 测试风格：${memory.code_style?.test_style || "未指定"}
- 用户角色：${memory.background?.role || "未知"}
- 技术水平：${memory.background?.experience_level || "未知"}${dislikes}${toolchain}${frameworks}
`;
}

/**
 * Build project memory section for system prompt (project-specific).
 */
export function buildProjectMemorySection(memory: ProjectMemory | null): string {
  if (!memory) return "";

  const currentTasksText = memory.current_tasks?.length > 0
    ? memory.current_tasks.map(t => `  - [${t.status}] ${t.title}：${t.description}`).join("\n")
    : "  - 暂无进行中的任务";

  const recentCompletedText = memory.completed_tasks?.slice(-3).length > 0
    ? memory.completed_tasks.slice(-3).map(t => `  - ✅ ${t.title}`).join("\n")
    : "  - 暂无已完成任务";

  const keyModulesText = memory.architecture?.key_modules?.length > 0
    ? memory.architecture.key_modules.map(m => `  - \`${m.path}\`：${m.role}`).join("\n")
    : "  - 暂无模块记录";

  const recentDecisionsText = memory.decisions?.slice(-5).length > 0
    ? memory.decisions.slice(-5).map(d => `  - ${d.title}：${d.reason}`).join("\n")
    : "  - 暂无决策记录";

  return `
## 项目上下文（仅限当前项目）

### 项目信息
- **项目名称**：${memory.project?.name || "未知"}
- **项目描述**：${memory.project?.description || "未记录"}
- **技术栈**：${memory.project?.tech_stack?.join("、") || "未记录"}

### 架构概述
${memory.architecture?.summary || "暂无架构描述"}

### 关键模块
${keyModulesText}

### 当前任务
${currentTasksText}

### 最近完成的任务
${recentCompletedText}

### 近期架构决策
${recentDecisionsText}

请基于以上项目上下文理解用户的需求，保持与历史决策的一致性。
`;
}
