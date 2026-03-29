package com.appsmith.aiide.config;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Optional;

/**
 * Central application configuration backed by MicroProfile Config.
 * Values are sourced from application.properties and environment variables.
 */
@ApplicationScoped
public class AppConfig {

    @ConfigProperty(name = "aiide.ssh-key-encrypt-secret")
    String sshKeyEncryptSecret;

    @ConfigProperty(name = "aiide.container.image-name")
    String containerImageName;

    @ConfigProperty(name = "aiide.container.max-concurrent")
    int maxConcurrent;

    @ConfigProperty(name = "aiide.external-auth-api-url")
    Optional<String> externalAuthApiUrl;

    @ConfigProperty(name = "aiide.gitlab-repo-prefix")
    String gitlabRepoPrefix;

    @ConfigProperty(name = "aiide.backend-url-for-container")
    String backendUrlForContainer;

    @ConfigProperty(name = "aiide.git-token")
    Optional<String> gitToken;

    @ConfigProperty(name = "aiide.ssh-key-path", defaultValue = "")
    String sshKeyPath;

    @ConfigProperty(name = "aiide.ai-agent-url", defaultValue = "")
    String aiAgentUrl;

    @ConfigProperty(name = "aiide.appsmith-session", defaultValue = "")
    String appsmithSession;

    @ConfigProperty(name = "aiide.appsmith-xsrf-token", defaultValue = "")
    String appsmithXsrfToken;

    @ConfigProperty(name = "aiide.edit-lock-api-url", defaultValue = "")
    String editLockApiUrl;

    public String getSshKeyEncryptSecret() {
        return sshKeyEncryptSecret;
    }

    public String getContainerImageName() {
        return containerImageName;
    }

    public int getMaxConcurrent() {
        return maxConcurrent;
    }

    public Optional<String> getExternalAuthApiUrl() {
        return externalAuthApiUrl;
    }

    public String getGitlabRepoPrefix() {
        return gitlabRepoPrefix;
    }

    public String getBackendUrlForContainer() {
        return backendUrlForContainer;
    }

    public Optional<String> getGitToken() {
        return gitToken;
    }

    public String getSshKeyPath() {
        return sshKeyPath;
    }

    public String getAiAgentUrl() {
        return aiAgentUrl;
    }

    public String getAppsmithSession() {
        return appsmithSession;
    }

    public String getAppsmithXsrfToken() {
        return appsmithXsrfToken;
    }

    public String getEditLockApiUrl() {
        return editLockApiUrl;
    }

    /**
     * Build a git repo URL with embedded token for HTTPS authentication.
     * Input:  https://github.com/user/Repo.git
     * Output: https://{token}@github.com/user/Repo.git
     *
     * If no token is configured or URL is SSH, returns the original URL.
     */
    public String buildAuthenticatedRepoUrl(String repoUrl) {
        if (gitToken.isEmpty() || gitToken.get().isBlank()) {
            return repoUrl;
        }
        if (!repoUrl.startsWith("https://")) {
            return repoUrl;
        }
        return repoUrl.replace("https://", "https://" + gitToken.get() + "@");
    }
}
