import type { ProjectMemory } from "./types.js";

/**
 * Build memory summary string for injection into system prompt.
 * Follows token budget guidelines from project-memory-feature.md.
 */
export function buildMemorySection(memory: ProjectMemory): string {
  const currentTasksText = memory.current_tasks.length > 0
    ? memory.current_tasks.map(t => `  - [${t.status}] ${t.title}：${t.description}`).join("\n")
    : "  - 暂无进行中的任务";

  const recentCompletedText = memory.completed_tasks.slice(-3).length > 0
    ? memory.completed_tasks.slice(-3).map(t => `  - ✅ ${t.title}`).join("\n")
    : "  - 暂无已完成任务";

  const keyModulesText = memory.architecture.key_modules.length > 0
    ? memory.architecture.key_modules.map(m => `  - \`${m.path}\`：${m.role}`).join("\n")
    : "  - 暂无模块记录";

  const recentDecisionsText = memory.decisions.slice(-5).length > 0
    ? memory.decisions.slice(-5).map(d => `  - ${d.title}：${d.reason}`).join("\n")
    : "  - 暂无决策记录";

  return `
## 项目记忆上下文
> 以下信息来自项目记忆文件(.agent/memory.json)，帮助你了解项目的当前状态。

### 项目信息
- **项目名称**：${memory.project.name}
- **项目描述**：${memory.project.description || "未记录"}
- **技术栈**：${memory.project.tech_stack.join("、") || "未记录"}

### 架构概述
${memory.architecture.summary || "暂无架构描述"}

### 关键模块
${keyModulesText}

### 当前任务
${currentTasksText}

### 最近完成的任务
${recentCompletedText}

### 近期架构决策
${recentDecisionsText}

---
请基于以上项目上下文理解用户的需求，保持与历史决策的一致性。

## 用户偏好
- 回复语言：${memory.user_preferences.reply_language}
- 代码风格：${memory.user_preferences.code_style || "未指定"}
- 注释风格：${memory.user_preferences.comment_style || "未指定"}
`;
}
