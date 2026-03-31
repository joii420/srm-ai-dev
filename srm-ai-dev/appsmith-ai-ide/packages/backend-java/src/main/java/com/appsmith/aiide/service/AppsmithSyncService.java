package com.appsmith.aiide.service;

import com.appsmith.aiide.config.AppConfig;
import com.appsmith.aiide.http.IHttpService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.*;

/**
 * Syncs JS objects from Appsmith edit API into the container workspace.
 *
 * Flow:
 * 1. Call Appsmith edit URL → get unpublishedActionCollections
 * 2. Extract name/body pairs from the response
 * 3. Write/delete files in container to match the API state
 * 4. If any changes, git commit + push
 */
@ApplicationScoped
public class AppsmithSyncService {

    private static final Logger LOG = Logger.getLogger(AppsmithSyncService.class);
    private static final String JS_DIR = "/workspace/jsObjects";

    @Inject
    AppConfig appConfig;

    @Inject
    DockerService dockerService;

    @Inject
    IHttpService httpService;

    @Inject
    AppsmithJsObjectTracker jsObjectTracker;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Sync Appsmith JS objects into the container workspace.
     *
     * @param containerId  the Docker container ID
     * @param appsmithEditUrl  the full Appsmith edit page URL
     * @param branch  the git branch for push
     * @return true if changes were committed and pushed, false if no changes
     */
    public boolean syncToContainer(String containerId, String appsmithEditUrl, String branch) {
        return syncToContainer(containerId, appsmithEditUrl, branch, null);
    }

    /**
     * Sync Appsmith JS objects into the container workspace.
     * Also initializes the JsObject tracker for recording file operations.
     *
     * @param containerId      the Docker container ID
     * @param appsmithEditUrl  the full Appsmith edit page URL
     * @param branch           the git branch for push
     * @param appsmithPageId   the appsmith internal page ID (for tracker init)
     * @return true if changes were committed and pushed, false if no changes
     */
    public boolean syncToContainer(String containerId, String appsmithEditUrl, String branch, String appsmithPageId) {
        if (appsmithEditUrl == null || appsmithEditUrl.isBlank()) {
            LOG.info("AppsmithSync: no edit URL configured, skipping");
            return false;
        }

        // 1. Fetch raw editResponse from Appsmith API
        String editResponseJson = fetchEditResponseRaw(appsmithEditUrl);
        if (editResponseJson == null) {
            LOG.warn("AppsmithSync: failed to fetch editResponse, skipping");
            return false;
        }

        // 1.5 Initialize JsObject tracker with full editResponse
        jsObjectTracker.initContainer(containerId, editResponseJson, appsmithEditUrl, appsmithPageId);

        // 2. Parse JS objects from the response
        Map<String, String> jsObjects = parseJsObjects(editResponseJson);
        LOG.infof("AppsmithSync: fetched %d JS objects from Appsmith", jsObjects.size());

        // 3. Ensure jsObjects directory exists
        dockerService.execInContainer(containerId, "mkdir", "-p", JS_DIR);

        // 4. List existing .js files in workspace
        Set<String> existingFiles = listExistingJsFiles(containerId);
        LOG.infof("AppsmithSync: %d existing files in %s", existingFiles.size(), JS_DIR);

        // 5. Sync: create/update/delete
        Set<String> apiFileNames = new HashSet<>();
        for (Map.Entry<String, String> entry : jsObjects.entrySet()) {
            String fileName = entry.getKey() + ".js";
            apiFileNames.add(fileName);
            writeFileToContainer(containerId, JS_DIR + "/" + fileName, entry.getValue());
        }

        // Delete files not in API
        for (String existing : existingFiles) {
            if (!apiFileNames.contains(existing)) {
                LOG.infof("AppsmithSync: deleting %s (not in API)", existing);
                dockerService.execInContainer(containerId, "rm", "-f", JS_DIR + "/" + existing);
            }
        }

        // 5. Check if there are any changes
        DockerService.ExecResult statusResult = dockerService.execInContainerFull(containerId,
                "git", "-C", "/workspace", "status", "--porcelain");
        if (statusResult.stdout().isBlank()) {
            LOG.info("AppsmithSync: no changes detected, skipping commit");
            return false;
        }

        LOG.infof("AppsmithSync: changes detected:\n%s", statusResult.stdout());

        // 6. Git add + commit + push
        dockerService.execInContainer(containerId,
                "git", "-C", "/workspace", "add", "-A");
        dockerService.execInContainer(containerId,
                "git", "-C", "/workspace", "config", "user.email", "aiide@appsmith.local");
        dockerService.execInContainer(containerId,
                "git", "-C", "/workspace", "config", "user.name", "AI-IDE");
        dockerService.execInContainer(containerId,
                "git", "-C", "/workspace", "commit", "-m", "版本同步");

        // Push
        String gitSshCmd = "GIT_SSH_COMMAND='ssh -i /root/.ssh/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'";
        DockerService.ExecResult pushResult = dockerService.execInContainerFull(containerId,
                "sh", "-c", gitSshCmd + " git -C /workspace push origin " + branch);

        if (pushResult.exitCode() != 0) {
            LOG.errorf("AppsmithSync: push failed: %s", pushResult.combined());
            throw new RuntimeException("Appsmith sync push failed: " + pushResult.combined());
        }

        LOG.info("AppsmithSync: changes committed and pushed successfully");
        return true;
    }

    /**
     * Fetch the raw editResponse JSON from Appsmith edit URL.
     *
     * @return raw JSON string or null on failure
     */
    private String fetchEditResponseRaw(String editUrl) {
        String session = appConfig.getAppsmithSession();
        String xsrfToken = appConfig.getAppsmithXsrfToken();

        if (session.isBlank()) {
            LOG.warn("AppsmithSync: APPSMITH_SESSION not configured, cannot call Appsmith API");
            return null;
        }

        try {
            Map<String, String> headers = new LinkedHashMap<>();
            headers.put("Accept", "application/json");
            headers.put("Content-Type", "application/json");
            headers.put("Cookie", "SESSION=" + session
                    + (xsrfToken.isBlank() ? "" : "; XSRF-TOKEN=" + xsrfToken));
            if (!xsrfToken.isBlank()) {
                headers.put("X-Xsrf-Token", xsrfToken);
            }

            IHttpService.Response response = httpService.getWithStatus(editUrl, headers);

            if (response.statusCode != 200) {
                LOG.errorf("AppsmithSync: API returned %d: %s",
                        response.statusCode, response.body.substring(0, Math.min(500, response.body.length())));
                return null;
            }

            return response.body;
        } catch (Exception e) {
            LOG.errorf(e, "AppsmithSync: failed to fetch from Appsmith");
            return null;
        }
    }

    /**
     * Call Appsmith edit URL and extract JS objects (name → body).
     */
    private Map<String, String> fetchJsObjects(String editUrl) {
        String rawJson = fetchEditResponseRaw(editUrl);
        if (rawJson == null) {
            return Map.of();
        }
        return parseJsObjects(rawJson);
    }

    /**
     * Parse the Appsmith edit API response to extract JS object name→body pairs.
     * Path: data.unpublishedActionCollections.data[*] → { name, body }
     */
    private Map<String, String> parseJsObjects(String json) {
        Map<String, String> result = new LinkedHashMap<>();
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode collections = root.path("data").path("unpublishedActionCollections").path("data");

            if (collections.isMissingNode() || !collections.isArray()) {
                LOG.warn("AppsmithSync: unpublishedActionCollections.data not found or not array");
                return result;
            }

            for (JsonNode item : collections) {
                String name = item.path("name").asText(null);
                String body = item.path("body").asText(null);
                if (name != null && !name.isBlank() && body != null) {
                    result.put(name, body);
                }
            }
        } catch (Exception e) {
            LOG.errorf(e, "AppsmithSync: failed to parse API response");
        }
        return result;
    }

    /**
     * List existing .js files in the jsObjects directory.
     */
    private Set<String> listExistingJsFiles(String containerId) {
        Set<String> files = new HashSet<>();
        try {
            DockerService.ExecResult result = dockerService.execInContainerFull(containerId,
                    "sh", "-c", "ls " + JS_DIR + "/*.js 2>/dev/null | xargs -n1 basename 2>/dev/null");
            if (result.exitCode() == 0 && !result.stdout().isBlank()) {
                for (String line : result.stdout().split("\n")) {
                    String trimmed = line.trim();
                    if (!trimmed.isEmpty()) {
                        files.add(trimmed);
                    }
                }
            }
        } catch (Exception e) {
            LOG.warnf("AppsmithSync: failed to list existing files: %s", e.getMessage());
        }
        return files;
    }

    /**
     * Write content to a file inside the container.
     */
    private void writeFileToContainer(String containerId, String filePath, String content) {
        // Use sh -c with heredoc to write file content safely
        // Base64 encode to avoid shell escaping issues
        String encoded = Base64.getEncoder().encodeToString(content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        dockerService.execInContainer(containerId,
                "sh", "-c", "echo '" + encoded + "' | base64 -d > " + filePath);
    }
}
