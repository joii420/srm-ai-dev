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
  user_preferences: {
    reply_language: string;
    code_style: string;
    comment_style: string;
    custom: Record<string, string>;
  };
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
