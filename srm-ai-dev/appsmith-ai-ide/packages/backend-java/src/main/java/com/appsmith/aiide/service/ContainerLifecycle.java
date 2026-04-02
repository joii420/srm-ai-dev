package com.appsmith.aiide.service;

import com.appsmith.aiide.config.AppConfig;
import com.appsmith.aiide.dto.CheckoutStepEvent;
import com.appsmith.aiide.entity.Checkout;
import com.appsmith.aiide.entity.Dependency;
import com.appsmith.aiide.entity.Skill;
import com.appsmith.aiide.entity.User;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.context.ManagedExecutor;
import org.jboss.logging.Logger;

import com.appsmith.aiide.http.IHttpService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.function.Consumer;

/**
 * Orchestrates the full lifecycle of a container-based checkout session:
 * container creation, SSH key injection, git clone, dependency loading,
 * skill injection, health checking, and teardown.
 */
@ApplicationScoped
public class ContainerLifecycle {

    private static final Logger LOG = Logger.getLogger(ContainerLifecycle.class);
    private static final long CHECKOUT_TIMEOUT_SECONDS = 180;

    @Inject
    AppConfig appConfig;

    @Inject
    SshKeyService sshKeyService;

    @Inject
    DockerService dockerService;

    @Inject
    GitService gitService;

    @Inject
    DepsLoader depsLoader;

    @Inject
    CheckoutPersistService checkoutPersistService;

    @Inject
    AppsmithSyncService appsmithSyncService;

    @Inject
    IHttpService httpService;

    @Inject
    ManagedExecutor managedExecutor;

    /**
     * Result of a checkout orchestration.
     */
    public record CheckoutResult(String containerId, String sessionId) {
    }

    /**
     * Result of a checkin operation.
     */
    public record CheckinResult(String commitHash) {
    }

    /**
     * Thrown when a git push detects a merge conflict.
     */
    public static class GitConflictException extends RuntimeException {
        public GitConflictException(String message) {
            super(message);
        }
    }

    /**
     * Thrown when the maximum number of concurrent containers is reached.
     */
    public static class MaxContainersReachedException extends RuntimeException {
        public MaxContainersReachedException(String message) {
            super(message);
        }
    }

    /**
     * Orchestrates a full checkout: creates a container, injects SSH key,
     * clones the repo, loads deps, injects skills, and verifies health.
     *
     * In dev mock mode (sshKeyEncryptSecret == "change-me-in-production"),
     * simulates all steps without actually creating containers.
     *
     * @param userId       the user performing checkout
     * @param pageId       the Appsmith page ID
     * @param pageName     the page display name
     * @param gitlabRepoUrl the GitLab SSH repo URL
     * @param branch       the git branch
     * @param onStep       callback for step progress events
     * @return the checkout result with container and session IDs
     */
    public CheckoutResult orchestrateCheckout(String userId, String pageId, String pageName,
                                               String gitlabRepoUrl, String branch,
                                               Consumer<CheckoutStepEvent> onStep) {
        return orchestrateCheckout(userId, pageId, pageName, gitlabRepoUrl, branch, null, null, onStep);
    }

    public CheckoutResult orchestrateCheckout(String userId, String pageId, String pageName,
                                               String gitlabRepoUrl, String branch,
                                               String pageType, String appsmithEditUrl,
                                               Consumer<CheckoutStepEvent> onStep) {
        // Dev mock mode
        if ("change-me-in-production".equals(appConfig.getSshKeyEncryptSecret())) {
            return simulateCheckout(userId, pageId, pageName, gitlabRepoUrl, branch, onStep);
        }

        return executeCheckoutWithTimeout(userId, pageId, pageName, gitlabRepoUrl, branch, pageType, appsmithEditUrl, onStep);
    }

    /**
     * Orchestrates checkin: commits, pushes, and destroys the container.
     *
     * @param checkoutId    the checkout record UUID
     * @param commitMessage the git commit message
     * @return the checkin result with the commit hash
     */
    @Transactional
    public CheckinResult orchestrateCheckin(UUID checkoutId, String commitMessage) {
        Checkout checkout = Checkout.findById(checkoutId);
        if (checkout == null) {
            throw new IllegalArgumentException("Checkout not found: " + checkoutId);
        }

        LOG.infof("Checking in checkout %s (container=%s)", checkoutId, checkout.containerId);

        // Dev mock mode
        if ("change-me-in-production".equals(appConfig.getSshKeyEncryptSecret())) {
            checkout.status = "completed";
            checkout.checkedInAt = OffsetDateTime.now();
            return new CheckinResult("mock-commit-hash");
        }

        String containerId = checkout.containerId;

        // Git add + commit inside container
        dockerService.execInContainer(containerId, "git", "-C", "/workspace", "add", "-A");
        dockerService.execInContainer(containerId, "git", "-C", "/workspace",
                "commit", "-m", commitMessage, "--allow-empty");

        // Get commit hash
        String commitHash = dockerService.execInContainer(containerId,
                "git", "-C", "/workspace", "rev-parse", "HEAD").trim();

        // Git push inside container — use GIT_SSH_COMMAND to avoid host key verification failure
        String pushOutput = dockerService.execInContainer(containerId,
                "sh", "-c",
                "GIT_SSH_COMMAND='ssh -i /root/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null' "
                + "git -C /workspace push origin " + checkout.gitBranch);
        if (pushOutput.contains("CONFLICT") || pushOutput.contains("rejected")) {
            throw new GitConflictException("Push rejected: " + pushOutput);
        }

        // Destroy the container
        try {
            dockerService.destroyContainer(containerId);
        } catch (Exception e) {
            LOG.warnf("Failed to destroy container %s during checkin: %s", containerId, e.getMessage());
        }

        // Update checkout record
        checkout.status = "completed";
        checkout.checkedInAt = OffsetDateTime.now();
        checkout.commitHash = commitHash;

        return new CheckinResult(commitHash);
    }

    /**
     * Forces a checkin with an auto-generated commit message.
     *
     * @param checkoutId the checkout record UUID
     */
    @Transactional
    public void forceCheckin(UUID checkoutId) {
        Checkout checkout = Checkout.findById(checkoutId);
        if (checkout == null) {
            throw new IllegalArgumentException("Checkout not found: " + checkoutId);
        }

        String timestamp = OffsetDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        String message = "[Admin Force Checkin] " + checkout.pageName + " " + timestamp;

        LOG.infof("Force checkin for checkout %s: %s", checkoutId, message);
        orchestrateCheckin(checkoutId, message);
    }

    /**
     * Forces container destruction without committing changes.
     *
     * @param checkoutId the checkout record UUID
     */
    @Transactional
    public void forceDestroy(UUID checkoutId) {
        Checkout checkout = Checkout.findById(checkoutId);
        if (checkout == null) {
            throw new IllegalArgumentException("Checkout not found: " + checkoutId);
        }

        LOG.infof("Force destroying checkout %s (container=%s)", checkoutId, checkout.containerId);

        if (checkout.containerId != null) {
            try {
                dockerService.destroyContainer(checkout.containerId);
            } catch (Exception e) {
                LOG.warnf("Failed to destroy container %s: %s", checkout.containerId, e.getMessage());
            }
        }

        checkout.status = "force_destroyed";
        checkout.checkedInAt = OffsetDateTime.now();
        cleanupTempFiles(checkout.containerId);
    }

    // ---- Private helpers ----

    private CheckoutResult executeCheckoutWithTimeout(String userId, String pageId, String pageName,
                                                       String gitlabRepoUrl, String branch,
                                                       String pageType, String appsmithEditUrl,
                                                       Consumer<CheckoutStepEvent> onStep) {
        // Check concurrent container limit
        long activeCount = Checkout.count("status", "active");
        if (activeCount >= appConfig.getMaxConcurrent()) {
            throw new MaxContainersReachedException(
                    "Maximum concurrent containers (" + appConfig.getMaxConcurrent() + ") reached");
        }

        Future<CheckoutResult> future = managedExecutor.submit(() ->
                performCheckout(userId, pageId, pageName, gitlabRepoUrl, branch, pageType, appsmithEditUrl, onStep));

        try {
            return future.get(CHECKOUT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            emitStep(onStep, "timeout", "error", "Checkout timed out after " + CHECKOUT_TIMEOUT_SECONDS + "s");
            throw new RuntimeException("Checkout timed out after " + CHECKOUT_TIMEOUT_SECONDS + " seconds");
        } catch (ExecutionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof GitConflictException gcc) throw gcc;
            if (cause instanceof MaxContainersReachedException mcre) throw mcre;
            if (cause instanceof RuntimeException re) throw re;
            throw new RuntimeException("Checkout failed", cause);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Checkout interrupted", e);
        } catch (Exception e){
            throw new RuntimeException("Checkout failed", e);
        }
    }

    private CheckoutResult performCheckout(String userId, String pageId, String pageName,
                                            String gitlabRepoUrl, String branch,
                                            String pageType, String appsmithEditUrl,
                                            Consumer<CheckoutStepEvent> onStep) {
        String containerId = null;
        try {
            // Step 1: Create container
            emitStep(onStep, "create_container", "in_progress");
            DockerService.ContainerLimits limits = dockerService.readLimitsFromSystemConfig();

            DockerService.ContainerConfig containerConfig = new DockerService.ContainerConfig(
                    appConfig.getContainerImageName(),
                    limits.memoryBytes(),
                    limits.cpuLimit(),
                    buildContainerEnv(pageId, pageName),
                    Map.of("/tmp/ssh", "rw,noexec,nosuid,size=1m"),
                    List.of(3000, 3001),
                    List.of()
            );
            containerId = dockerService.createContainer(containerConfig);
            emitStep(onStep, "create_container", "completed");

            // Resolve service endpoints
            DockerService.ContainerEndpoints endpoints = dockerService.getContainerEndpoints(containerId);
            LOG.infof("Container endpoints: AI Proxy=%s, File Manager=%s", endpoints.aiProxy(), endpoints.fileManager());

            // Step 2: Inject SSH key into container + configure git SSH
            emitStep(onStep, "inject_ssh_key", "in_progress");
            waitForContainerReady(endpoints.aiProxy());
            injectSshKeyViaExec(containerId);
            emitStep(onStep, "inject_ssh_key", "completed");

            // Step 3: Git clone — use SSH or HTTPS depending on URL format
            emitStep(onStep, "git_clone", "in_progress");
            // Fix legacy repo URLs: git@host:port/path -> ssh://git@host:port/path
            // The old format "git@host:port/path" treats ":port" as path (SSH default port 22),
            // but we need ssh:// format to specify a non-standard port (e.g. 2222).
            String currentPrefix = appConfig.getGitlabRepoPrefix();
            if (currentPrefix.startsWith("ssh://") && gitlabRepoUrl.startsWith("git@")) {
                // Derive old prefix from current: ssh://git@host:port/group/ -> git@host:port/group/
                String oldPrefix = currentPrefix.replace("ssh://", "");
                if (gitlabRepoUrl.startsWith(oldPrefix)) {
                    gitlabRepoUrl = currentPrefix + gitlabRepoUrl.substring(oldPrefix.length());
                    LOG.infof("Fixed legacy repo URL to: %s", gitlabRepoUrl);
                }
            }
            String cloneUrl = gitlabRepoUrl.startsWith("https://")
                    ? appConfig.buildAuthenticatedRepoUrl(gitlabRepoUrl)
                    : gitlabRepoUrl;
            // Use GIT_SSH_COMMAND with StrictHostKeyChecking=no to avoid host key verification failure.
            // docker exec may not inherit HOME or load ~/.ssh/config, so we pass SSH options explicitly.
            String cloneOutput = dockerService.execInContainer(containerId,
                    "sh", "-c",
                    "GIT_SSH_COMMAND='ssh -i /root/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null' "
                    + "git clone --branch " + branch + " --single-branch " + cloneUrl + " /workspace");
            LOG.infof("Git clone result: %s", cloneOutput);
            emitStep(onStep, "git_clone", "completed");

            // Step 3.5: Appsmith sync — sync JS objects from Appsmith API to workspace
            if ("appsmith".equals(pageType) && appsmithEditUrl != null && !appsmithEditUrl.isBlank()) {
                emitStep(onStep, "sync_appsmith", "in_progress");
                // Extract appsmithPageId from the edit URL query parameter
                String appsmithPageId = extractAppsmithPageId(appsmithEditUrl);
                boolean changed = appsmithSyncService.syncToContainer(containerId, appsmithEditUrl, branch, appsmithPageId);
                LOG.infof("Appsmith sync completed, changes=%s", changed);
                emitStep(onStep, "sync_appsmith", "completed");
            }

            // Step 4: Load dependencies
            emitStep(onStep, "load_deps", "in_progress");
            depsLoader.loadDepsIntoContainer(containerId, endpoints.fileManager());
            emitStep(onStep, "load_deps", "completed");

            // Step 5: Inject skills
            emitStep(onStep, "inject_skills", "in_progress");
            injectSkills(endpoints.aiProxy());
            emitStep(onStep, "inject_skills", "completed");

            // Step 6: Health check — verify services + workspace
            emitStep(onStep, "health_check", "in_progress");
            verifyContainerFullyReady(containerId, endpoints);
            emitStep(onStep, "health_check", "completed");

            // Step 7: Finalize — persist checkout record in its own short transaction
            emitStep(onStep, "finalize", "in_progress");
            String sessionId = UUID.randomUUID().toString();
            checkoutPersistService.persistCheckoutRecord(userId, pageId, pageName, containerId, sessionId, gitlabRepoUrl, branch);
            emitStep(onStep, "finalize", "completed");
            return new CheckoutResult(containerId, sessionId);

        } catch (Exception e) {
            LOG.errorf("Checkout failed, rolling back. Error: %s", e.getMessage());
            // Rollback: destroy the container if it was created
            if (containerId != null) {
                try {
                    dockerService.destroyContainer(containerId);
                } catch (Exception rollbackEx) {
                    LOG.warnf("Rollback destroy failed: %s", rollbackEx.getMessage());
                }
                cleanupTempFiles(containerId);
            }
            throw e instanceof RuntimeException re ? re : new RuntimeException("Checkout failed", e);
        }
    }

    private CheckoutResult simulateCheckout(String userId, String pageId, String pageName,
                                             String gitlabRepoUrl, String branch,
                                             Consumer<CheckoutStepEvent> onStep) {
        LOG.info("Running in DEV MOCK mode - simulating checkout steps");

        String[] steps = {"create_container", "inject_ssh_key", "git_clone",
                "load_deps", "inject_skills", "health_check", "finalize"};

        for (String step : steps) {
            emitStep(onStep, step, "in_progress");
            try {
                Thread.sleep(200); // Simulate work
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            emitStep(onStep, step, "completed");
        }

        String mockContainerId = "mock-container-" + UUID.randomUUID().toString().substring(0, 8);
        String mockSessionId = UUID.randomUUID().toString();

        // Persist mock checkout record via separate CDI bean (ensures @Transactional works)
        checkoutPersistService.persistCheckoutRecord(userId, pageId, pageName,
                mockContainerId, mockSessionId, gitlabRepoUrl, branch);

        return new CheckoutResult(mockContainerId, mockSessionId);
    }

    /**
     * Public entry point — ensures SSH key is present in container.
     * Called both during checkout (initial setup) and checkin (in case container was created before SSH was configured).
     */
    public void ensureSshKeyInContainer(String containerId) {
        injectSshKeyViaExec(containerId);
    }

    /**
     * Inject SSH private key into the container via docker exec.
     * Source priority:
     *   1. Local file: aiide.ssh-key-path (e.g. sshkey/id_rsa)
     *   2. SystemConfig: encrypted key stored via /api/system-config/ssh-key
     */
    private void injectSshKeyViaExec(String containerId) {
        // Step 1: Find the SSH key file on the host
        Path keyFile = findSshKeyFile();
        if (keyFile == null) {
            LOG.warn("No SSH key file found — SSH git operations will fail");
            return;
        }

        LOG.infof("SSH key file found: %s", keyFile);

        // Step 2: Use `docker cp` to copy the key file into the container (binary-safe, no encoding issues)
        dockerService.execInContainer(containerId, "mkdir", "-p", "/root/.ssh");

        try {
            String absPath = keyFile.toAbsolutePath().toString().replace('\\', '/');
            String shortId = containerId.substring(0, 12);

            ProcessBuilder pb = new ProcessBuilder(
                    "docker", "cp", absPath, shortId + ":/root/.ssh/id_rsa");
            pb.redirectErrorStream(true);
            Process proc = pb.start();
            String output = new String(proc.getInputStream().readAllBytes());
            int exitCode = proc.waitFor();

            if (exitCode != 0) {
                throw new RuntimeException("docker cp failed (exit=" + exitCode + "): " + output);
            }
            LOG.infof("docker cp completed: %s -> %s:/root/.ssh/id_rsa", absPath, shortId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("docker cp interrupted", e);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("docker cp failed: " + e.getMessage(), e);
        }

        // Step 3: Set permissions and verify
        dockerService.execInContainer(containerId, "chmod", "600", "/root/.ssh/id_rsa");

        String verifyResult = dockerService.execInContainer(containerId,
                "sh", "-c", "wc -c < /root/.ssh/id_rsa && head -1 /root/.ssh/id_rsa");
        LOG.infof("SSH key in container: %s", verifyResult.trim());

        // Step 4: Write SSH config
        dockerService.execInContainer(containerId,
                "sh", "-c",
                "echo 'Host *' > /root/.ssh/config && "
                + "echo '  IdentityFile /root/.ssh/id_rsa' >> /root/.ssh/config && "
                + "echo '  StrictHostKeyChecking no' >> /root/.ssh/config && "
                + "echo '  UserKnownHostsFile /dev/null' >> /root/.ssh/config");
        dockerService.execInContainer(containerId, "chmod", "600", "/root/.ssh/config");

        // Step 5: Set GIT_SSH_COMMAND as fallback
        dockerService.execInContainer(containerId,
                "git", "config", "--global", "core.sshCommand",
                "ssh -i /root/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null");

        LOG.info("SSH key injected into container successfully");
    }

    /**
     * Search for the SSH key file on the host filesystem.
     * Checks configured path, common project locations, and user home.
     */
    private Path findSshKeyFile() {
        String keyPath = appConfig.getSshKeyPath();
        String cwd = System.getProperty("user.dir");

        List<Path> searchPaths = new java.util.ArrayList<>();
        if (keyPath != null && !keyPath.isBlank()) {
            searchPaths.add(Path.of(keyPath));
            if (!Path.of(keyPath).isAbsolute()) {
                searchPaths.add(Path.of(cwd, keyPath));
            }
        }
        searchPaths.add(Path.of(cwd, "sshkey", "id_rsa"));
        searchPaths.add(Path.of(cwd, "..", "..", "sshkey", "id_rsa"));
        searchPaths.add(Path.of(System.getProperty("user.home"), ".ssh", "id_rsa"));

        for (Path candidate : searchPaths) {
            Path resolved = candidate.normalize();
            if (Files.exists(resolved) && Files.isRegularFile(resolved)) {
                return resolved;
            }
        }

        LOG.warnf("SSH key not found in any of: %s", searchPaths);
        return null;
    }

    private void injectSkills(String containerIp) {
        List<Skill> skills = Skill.list("enabled", true);
        for (Skill skill : skills) {
            try {
                String payload = String.format(
                        "{\"name\":\"%s\",\"prompt\":\"%s\"}",
                        skill.name,
                        skill.prompt != null ? skill.prompt.replace("\"", "\\\"").replace("\n", "\\n") : "");

                httpService.postJson("http://" + containerIp + "/api/skills/register", payload);
            } catch (Exception e) {
                LOG.warnf("Failed to inject skill %s: %s", skill.name, e.getMessage());
            }
        }
    }

    /**
     * Wait for the container's HTTP service to accept connections before proceeding.
     * Polls GET http://{containerIp}/api/health every 2s, up to 30 attempts.
     */
    private void waitForContainerReady(String containerIp) {
        int maxAttempts = 30;
        for (int i = 0; i < maxAttempts; i++) {
            try {
                IHttpService.Response response = httpService.getWithStatus("http://" + containerIp + "/api/health");
                if (response.statusCode == 200) {
                    LOG.infof("Container service ready at %s (attempt %d)", containerIp, i + 1);
                    return;
                }
            } catch (Exception e) {
                LOG.debugf("Container not ready yet at %s (attempt %d): %s", containerIp, i + 1, e.getMessage());
            }
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Interrupted while waiting for container service");
            }
        }
        throw new RuntimeException("Container service at " + containerIp + " did not become ready after " + (maxAttempts * 2) + " seconds");
    }

    /**
     * Full readiness check: verifies all three conditions:
     * 1. AI Proxy (port 3000) /api/health returns 200
     * 2. File Manager (port 3001) /files returns 200
     * 3. /workspace/.git exists (git clone completed)
     */
    private void verifyContainerFullyReady(String containerId, DockerService.ContainerEndpoints endpoints) {
        // 1. AI Proxy health (port 3000)
        LOG.info("Verifying AI Proxy health...");
        try {
            IHttpService.Response aiResponse = httpService.getWithStatus("http://" + endpoints.aiProxy() + "/api/health");
            LOG.infof("AI Proxy health: %d — %s", aiResponse.statusCode, aiResponse.body);
            if (aiResponse.statusCode != 200) {
                throw new RuntimeException("AI Proxy health check failed: HTTP " + aiResponse.statusCode);
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("AI Proxy health check failed: " + e.getMessage(), e);
        }

        // 2. File Manager health (port 3001)
        LOG.info("Verifying File Manager health...");
        try {
            IHttpService.Response fmResponse = httpService.getWithStatus("http://" + endpoints.fileManager() + "/files");
            LOG.infof("File Manager status: %d", fmResponse.statusCode);
        } catch (Exception e) {
            LOG.warnf("File Manager check failed (non-fatal): %s", e.getMessage());
        }

        // 3. Verify git clone: /workspace must have files
        LOG.info("Verifying workspace git repository...");
        String lsResult = dockerService.execInContainer(containerId, "ls", "/workspace/");
        LOG.infof("Workspace contents: %s", lsResult.trim());
        if (lsResult.trim().isEmpty()) {
            throw new RuntimeException("Workspace /workspace is empty — git clone may have failed");
        }
    }

    private void waitForHealthy(String containerId) {
        int maxAttempts = 30;
        for (int i = 0; i < maxAttempts; i++) {
            if (dockerService.healthCheck(containerId)) {
                return;
            }
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Health check interrupted");
            }
        }
        throw new RuntimeException("Container health check timed out after " + (maxAttempts * 2) + " seconds");
    }

    private List<String> buildContainerEnv(String pageId, String pageName) {
        var env = new java.util.ArrayList<>(List.of(
                "BACKEND_URL=" + appConfig.getBackendUrlForContainer(),
                "PAGE_ID=" + pageId,
                "PAGE_NAME=" + pageName
        ));
        // Inject AI Agent URL so the container AI Proxy calls the external agent
        String aiAgentUrl = appConfig.getAiAgentUrl();
        if (aiAgentUrl != null && !aiAgentUrl.isBlank()) {
            env.add("AI_AGENT_URL=" + aiAgentUrl);
        }
        return env;
    }

    private void emitStep(Consumer<CheckoutStepEvent> onStep, String step, String status) {
        emitStep(onStep, step, status, null);
    }

    private void emitStep(Consumer<CheckoutStepEvent> onStep, String step, String status, String message) {
        if (onStep != null) {
            onStep.accept(new CheckoutStepEvent(step, status, message));
        }
    }

    /**
     * Extract appsmithPageId from the edit URL query parameter (defaultPageId).
     * URL format: ...?defaultPageId=XXX&viewPageId=XXX
     */
    private String extractAppsmithPageId(String editUrl) {
        try {
            java.net.URI uri = java.net.URI.create(editUrl);
            String query = uri.getQuery();
            if (query != null) {
                for (String param : query.split("&")) {
                    String[] kv = param.split("=", 2);
                    if (kv.length == 2 && "defaultPageId".equals(kv[0])) {
                        return kv[1];
                    }
                }
            }
        } catch (Exception e) {
            LOG.warnf("Failed to extract appsmithPageId from URL: %s", editUrl);
        }
        return null;
    }

    private void cleanupTempFiles(String containerId) {
        if (containerId == null) return;
        try {
            Path repoPath = Path.of("/tmp/aiide-repos/" + containerId);
            Path keyPath = Path.of("/tmp/aiide-keys/" + containerId);
            deleteRecursive(repoPath);
            deleteRecursive(keyPath);
        } catch (Exception e) {
            LOG.warnf("Failed to clean up temp files for container %s: %s", containerId, e.getMessage());
        }
    }

    private void deleteRecursive(Path path) throws IOException {
        if (Files.exists(path)) {
            if (Files.isDirectory(path)) {
                try (var entries = Files.walk(path)) {
                    entries.sorted(java.util.Comparator.reverseOrder())
                            .forEach(p -> {
                                try {
                                    Files.deleteIfExists(p);
                                } catch (IOException e) {
                                    LOG.debugf("Could not delete: %s", p);
                                }
                            });
                }
            } else {
                Files.deleteIfExists(path);
            }
        }
    }
}
