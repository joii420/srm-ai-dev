package com.appsmith.aiide.config;

import com.appsmith.aiide.service.SystemConfigService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Optional;

/**
 * Central application configuration.
 *
 * Static configs: read from application.properties (immutable at runtime).
 * Dynamic configs (4 items): read from system_configs DB table via SystemConfigService (with cache).
 */
@ApplicationScoped
public class AppConfig {

    @Inject
    SystemConfigService systemConfigService;

    // ---- Static configs (from properties file) ----

    @ConfigProperty(name = "aiide.ssh-key-encrypt-secret")
    String sshKeyEncryptSecret;

    @ConfigProperty(name = "aiide.container.image-name")
    String containerImageName;

    @ConfigProperty(name = "aiide.container.max-concurrent")
    int maxConcurrent;

    @ConfigProperty(name = "aiide.external-auth-api-url")
    Optional<String> externalAuthApiUrl;

    @ConfigProperty(name = "aiide.backend-url-for-container")
    String backendUrlForContainer;

    @ConfigProperty(name = "aiide.ssh-key-path", defaultValue = "")
    String sshKeyPath;

    @ConfigProperty(name = "aiide.ai-agent-url", defaultValue = "")
    String aiAgentUrl;

    @ConfigProperty(name = "aiide.appsmith-api-base-url", defaultValue = "")
    String appsmithApiBaseUrl;

    @ConfigProperty(name = "aiide.appsmith-xsrf-token", defaultValue = "")
    String appsmithXsrfToken;

    @ConfigProperty(name = "aiide.edit-lock-api-url", defaultValue = "")
    String editLockApiUrl;

    @ConfigProperty(name = "aiide.redux-node-service-path", defaultValue = "")
    String reduxNodeServicePath;

    @ConfigProperty(name = "aiide.redux-node-service-url", defaultValue = "http://localhost:3200")
    String reduxNodeServiceUrl;

    // ---- Static config getters ----

    public String getSshKeyEncryptSecret() { return sshKeyEncryptSecret; }
    public String getContainerImageName() { return containerImageName; }
    public int getMaxConcurrent() { return maxConcurrent; }
    public Optional<String> getExternalAuthApiUrl() { return externalAuthApiUrl; }
    public String getBackendUrlForContainer() { return backendUrlForContainer; }
    public String getSshKeyPath() { return sshKeyPath; }
    public String getAiAgentUrl() { return aiAgentUrl; }
    public String getAppsmithApiBaseUrl() { return appsmithApiBaseUrl; }
    public String getAppsmithXsrfToken() { return appsmithXsrfToken; }
    public String getEditLockApiUrl() { return editLockApiUrl; }
    public String getReduxNodeServicePath() { return reduxNodeServicePath; }
    public String getReduxNodeServiceUrl() { return reduxNodeServiceUrl; }

    // ---- Dynamic config getters (from DB via SystemConfigService) ----

    public String getAppsmithSession() {
        return systemConfigService.getValue(SystemConfigService.APPSMITH_SESSION);
    }

    public String getGitlabApiBaseUrl() {
        return systemConfigService.getValue(SystemConfigService.GITLAB_API_BASE_URL);
    }

    public String getGitlabRepoPrefix() {
        return systemConfigService.getValue(SystemConfigService.GITLAB_REPO_PREFIX);
    }

    public Optional<String> getGitToken() {
        String val = systemConfigService.getValue(SystemConfigService.GIT_TOKEN);
        return (val != null && !val.isBlank()) ? Optional.of(val) : Optional.empty();
    }

    /**
     * Build a git repo URL with embedded token for HTTPS authentication.
     */
    public String buildAuthenticatedRepoUrl(String repoUrl) {
        Optional<String> token = getGitToken();
        if (token.isEmpty() || token.get().isBlank()) {
            return repoUrl;
        }
        if (!repoUrl.startsWith("https://")) {
            return repoUrl;
        }
        return repoUrl.replace("https://", "https://" + token.get() + "@");
    }
}
