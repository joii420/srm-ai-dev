// ─── 用户记忆（存数据库，跨项目全局生效）──────────────────
export interface UserMemory {
  meta?: {
    version?: string;
  };
  preferences?: {
    reply_language?: string;
    reply_detail_level?: string;
    code_example_style?: string;
    format_preference?: string;
  };
  code_style?: {
    paradigm?: string;
    naming_convention?: string;
    comment_language?: string;
    comment_density?: string;
    test_style?: string;
    custom?: Record<string, string>;
  };
  background?: {
    role?: string;
    experience_level?: string;
    primary_languages?: string[];
    domains?: string[];
  };
  interaction_habits?: {
    prefers_step_by_step?: boolean;
    prefers_alternatives?: boolean;
    dislikes?: string[];
    custom?: Record<string, string>;
  };
  toolchain?: {
    package_manager?: string;
    preferred_frameworks?: string[];
    custom?: Record<string, string>;
  };
}

// ─── 项目记忆（存 Git 仓库 .agent/memory.json，仅当前项目）──
export interface ProjectMemory {
  meta: {
    version: string;
    created_at: string;
    last_updated: string;
    agent_version: string;
  };
  project: {
    name: string;
    description: string;
    root_path: string;
    tech_stack: string[];
    main_language: string;
    entry_point: string;
    package_manager: string;
  };
  architecture: {
    summary: string;
    patterns: string[];
    key_modules: Array<{
      name: string;
      path: string;
      role: string;
      dependencies?: string[];
    }>;
  };
  current_tasks: Task[];
  completed_tasks: CompletedTask[];
  decisions: Decision[];
  session_stats: {
    total_sessions: number;
    total_file_changes: number;
    last_session_at: string | null;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "blocked";
  priority: "low" | "medium" | "high";
  started_at: string;
  context: string;
}

export interface CompletedTask {
  id: string;
  title: string;
  description: string;
  completed_at: string;
}

export interface Decision {
  id: string;
  date: string;
  title: string;
  decision: string;
  reason: string;
  alternatives_considered: string[];
  made_by: "user" | "agent";
}
