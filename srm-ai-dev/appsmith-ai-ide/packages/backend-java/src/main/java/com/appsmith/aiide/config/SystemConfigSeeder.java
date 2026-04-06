package com.appsmith.aiide.config;

import com.appsmith.aiide.entity.SystemConfig;
import com.appsmith.aiide.service.SystemConfigService;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Seeds managed system config entries into the database on application startup.
 * Only inserts if the key does not already exist (preserves user edits).
 * Reads initial default values from application properties file.
 */
@ApplicationScoped
public class SystemConfigSeeder {

    private static final Logger LOG = Logger.getLogger(SystemConfigSeeder.class);

    // Read raw defaults from properties file (these will be removed from properties later,
    // but kept here for initial seed on first startup)
    @ConfigProperty(name = "aiide.appsmith-session", defaultValue = "")
    String defaultAppsmithSession;

    @ConfigProperty(name = "aiide.gitlab-api-base-url", defaultValue = "")
    String defaultGitlabApiBaseUrl;

    @ConfigProperty(name = "aiide.gitlab-repo-prefix", defaultValue = "")
    String defaultGitlabRepoPrefix;

    @ConfigProperty(name = "aiide.git-token", defaultValue = "")
    String defaultGitToken;

    @Inject
    SystemConfigService systemConfigService;

    @Transactional
    void onStart(@Observes StartupEvent ev) {
        LOG.info("SystemConfigSeeder: checking managed config entries...");

        seedIfMissing(SystemConfigService.APPSMITH_SESSION, "APPSMITH会话",
                defaultAppsmithSession, "Appsmith API 会话标识", "input");
        seedIfMissing(SystemConfigService.GITLAB_API_BASE_URL, "GIT仓库地址",
                defaultGitlabApiBaseUrl, "GitLab API 基础地址", "input");
        seedIfMissing(SystemConfigService.GITLAB_REPO_PREFIX, "GIT仓库团队地址",
                defaultGitlabRepoPrefix, "GitLab 仓库前缀（SSH/HTTPS）", "input");
        seedIfMissing(SystemConfigService.GIT_TOKEN, "GIT仓库token",
                defaultGitToken, "GitLab/GitHub API Token", "input");
        seedIfMissing(SystemConfigService.CLAUDE_API_KEY, "Claude API Key",
                "", "Anthropic Claude API 密钥", "input");
        seedIfMissing(SystemConfigService.CLAUDE_MODEL, "Claude 模型",
                "claude-sonnet-4-20250514", "Claude 模型名称", "input");
        seedIfMissing(SystemConfigService.CLAUDE_BASE_URL, "Claude API 地址",
                "https://api.anthropic.com", "Claude API 基础地址（支持代理）", "input");
        seedIfMissing(SystemConfigService.CHAT_CONTEXT_MAX_CHARS, "AI上下文历史长度",
                "30000", "注入 Claude 的历史消息最大字符数", "input");
        seedIfMissing(SystemConfigService.CHAT_HISTORY_PAGE_SIZE, "聊天历史每页条数",
                "10", "前端每次滚动加载的消息条数", "input");

        // Clear cache so values are loaded fresh on first access
        systemConfigService.refreshCache();

        LOG.info("SystemConfigSeeder: done");
    }

    private void seedIfMissing(String key, String name, String defaultValue,
                                String description, String type) {
        SystemConfig existing = SystemConfig.findByKey(key);
        if (existing == null) {
            SystemConfig config = new SystemConfig();
            config.key = key;
            config.name = name;
            // JSONB column requires valid JSON — wrap string value in quotes
            String val = (defaultValue != null && !defaultValue.isEmpty()) ? defaultValue : "";
            config.value = "\"" + val.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
            config.description = description;
            config.type = type;
            config.persist();
            LOG.infof("SystemConfigSeeder: seeded '%s' (%s)", key, name);
        } else {
            // Update name if it was null (migration from old data)
            if (existing.name == null || existing.name.isBlank()) {
                existing.name = name;
                if (existing.type == null) existing.type = type;
                LOG.infof("SystemConfigSeeder: updated name for '%s' -> '%s'", key, name);
            }
        }
    }
}
