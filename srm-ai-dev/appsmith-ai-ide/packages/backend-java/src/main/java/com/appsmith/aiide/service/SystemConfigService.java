package com.appsmith.aiide.service;

import com.appsmith.aiide.entity.SystemConfig;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Cached read service for system_configs table.
 * All business code reads config values through this service.
 */
@ApplicationScoped
public class SystemConfigService {

    private static final Logger LOG = Logger.getLogger(SystemConfigService.class);

    /** Config key constants */
    public static final String APPSMITH_SESSION = "appsmith.session";
    public static final String GITLAB_API_BASE_URL = "gitlab.api.base.url";
    public static final String GITLAB_REPO_PREFIX = "gitlab.repo.prefix";
    public static final String GIT_TOKEN = "git.token";
    public static final String CLAUDE_API_KEY = "claude.api.key";
    public static final String CLAUDE_MODEL = "claude.model";
    public static final String CLAUDE_BASE_URL = "claude.base.url";
    public static final String CHAT_CONTEXT_MAX_CHARS = "chat.context.max.chars";
    public static final String CHAT_HISTORY_PAGE_SIZE = "chat.history.page.size";

    /** Sentinel value to cache "key exists but value is empty" */
    private static final String EMPTY_SENTINEL = "__EMPTY__";

    private final ConcurrentHashMap<String, String> cache = new ConcurrentHashMap<>();

    /**
     * Get config value by key. Checks cache first, then DB.
     *
     * @return value string, or empty string if not found
     */
    public String getValue(String key) {
        String cached = cache.get(key);
        if (cached != null) {
            return EMPTY_SENTINEL.equals(cached) ? "" : cached;
        }

        // Cache miss — query DB
        try {
            SystemConfig config = SystemConfig.findByKey(key);
            if (config != null && config.value != null) {
                String raw = config.value instanceof String s ? s : config.value.toString();
                String val = com.appsmith.aiide.util.JsonUtil.unwrapJsonString(raw);
                LOG.infof("SystemConfigService: key='%s', raw='%.30s', resolved='%.30s'",
                        key, raw, val);
                cache.put(key, val.isEmpty() ? EMPTY_SENTINEL : val);
                return val;
            }
            LOG.warnf("SystemConfigService: key='%s' not found in DB", key);
        } catch (Exception e) {
            LOG.warnf("SystemConfigService: failed to read key '%s' from DB: %s", key, e.getMessage());
        }

        cache.put(key, EMPTY_SENTINEL);
        return "";
    }

    /**
     * Refresh cache for a single key (call after update).
     */
    public void refreshCache(String key) {
        cache.remove(key);
        LOG.infof("SystemConfigService: cache refreshed for key '%s'", key);
    }

    /**
     * Refresh entire cache (call for bulk changes).
     */
    public void refreshCache() {
        cache.clear();
        LOG.info("SystemConfigService: full cache cleared");
    }
}
