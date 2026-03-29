package com.appsmith.aiide.resource;

import com.appsmith.aiide.config.AppConfig;
import com.appsmith.aiide.dto.CheckinRequest;
import com.appsmith.aiide.dto.CheckoutStepEvent;
import com.appsmith.aiide.dto.CreatePageRequest;
import com.appsmith.aiide.dto.PageDto;
import com.appsmith.aiide.entity.Checkout;
import com.appsmith.aiide.entity.Page;
import com.appsmith.aiide.entity.SystemConfig;
import com.appsmith.aiide.entity.User;
import com.appsmith.aiide.filter.RequestContext;
import com.appsmith.aiide.service.ContainerLifecycle;
import com.appsmith.aiide.service.DockerService;
import com.appsmith.aiide.service.EditLockService;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.infrastructure.Infrastructure;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.RestSseElementType;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;

@Path("/api/pages")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class PageResource {

    private static final Logger LOG = Logger.getLogger(PageResource.class);

    @Inject
    AppConfig appConfig;

    @Inject
    RequestContext requestContext;

    @Inject
    ContainerLifecycle containerLifecycle;

    @Inject
    DockerService dockerService;

    @Inject
    EditLockService editLockService;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    /**
     * List pages from the local pages table. Enrich with checkout status.
     */
    @GET
    public Response listPages() {
        String currentUserId = requestContext.getUserId();
        List<Page> pageEntities = Page.listAllOrdered();

        List<PageDto> pages = new ArrayList<>();
        for (Page entity : pageEntities) {
            PageDto dto = PageDto.from(entity);

            Checkout active = Checkout.findActiveByPageId(entity.id.toString());
            if (active != null) {
                if (active.user != null && active.user.id.toString().equals(currentUserId)) {
                    dto.status = "mine";
                } else {
                    dto.status = "checkedout";
                    if (active.user != null) {
                        dto.setCheckedOutByUser(active.user.username, active.user.displayName);
                    }
                }
            }
            pages.add(dto);
        }
        return Response.ok(Map.of("pages", pages)).build();
    }

    /**
     * Create a new page. Validates that the remote Git repo exists.
     */
    @POST
    @Path("/create")
    @Transactional
    public Response createPage(@Valid CreatePageRequest request) {
        // Check name uniqueness
        if (Page.findByName(request.name) != null) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("message", "Page \"" + request.name + "\" already exists"))
                    .build();
        }

        // Build repo URL
        String prefix = appConfig.getGitlabRepoPrefix();
        String sep = prefix.endsWith("/") || prefix.endsWith(":") ? "" : "/";
        String gitlabRepoUrl = prefix + sep + request.name + ".git";
        String branch = request.gitBranch != null ? request.gitBranch : "dev";

        // Only Appsmith programs need a remote Git repo
        String type = request.type != null ? request.type : "appsmith";
        if ("appsmith".equals(type)) {
            String token = appConfig.getGitToken().orElse("");
            if (token.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("message", "Git token not configured, cannot create remote repository"))
                        .build();
            }

            try {
                createRemoteRepo(prefix, request.name, branch, token,
                        request.description != null ? request.description : "");
            } catch (RepoAlreadyExistsException e) {
                LOG.infof("Remote repo already exists for %s, proceeding", request.name);
            } catch (Exception e) {
                LOG.errorf(e, "Failed to create remote repo for %s", request.name);
                return Response.status(Response.Status.BAD_GATEWAY)
                        .entity(Map.of("message", "Failed to create remote Git repository: " + e.getMessage()))
                        .build();
            }
        }

        // Create Page entity
        Page page = new Page();
        page.name = request.name;
        page.description = request.description;
        page.type = request.type != null ? request.type : "appsmith";
        page.gitlabRepoUrl = gitlabRepoUrl;
        page.gitBranch = branch;
        page.appsmithEditUrl = request.appsmithEditUrl;

        // Set creator if available
        String userId = requestContext.getUserId();
        if (userId != null) {
            try {
                User user = User.findById(UUID.fromString(userId));
                page.createdBy = user;
            } catch (Exception e) {
                LOG.warnf("Could not resolve creator user: %s", userId);
            }
        }

        page.persist();

        LOG.infof("Page created: id=%s, name=%s, type=%s, repo=%s", page.id, page.name, page.type, gitlabRepoUrl);
        return Response.status(Response.Status.CREATED)
                .entity(Map.of("page", PageDto.from(page)))
                .build();
    }

    /**
     * Query the external edit-lock state for a page.
     * Called when the frontend opens a program to check its current lock status.
     */
    @GET
    @Path("/{pageId}/edit-lock-state")
    public Response getEditLockState(@PathParam("pageId") String pageId) {
        Page page = Page.findById(UUID.fromString(pageId));
        if (page == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "NotFound", "message", "Page not found: " + pageId))
                    .build();
        }

        String username = requestContext.getUsername();
        Map<String, Object> state = editLockService.queryState(page.name, username);
        if (state == null) {
            return Response.ok(Map.of("enabled", false, "message", "Edit lock service not configured or unavailable")).build();
        }
        return Response.ok(state).build();
    }

    // --- Remote repo creation helpers ---

    private static class RepoAlreadyExistsException extends Exception {
        RepoAlreadyExistsException(String msg) { super(msg); }
    }

    /**
     * Create a remote Git repository on GitHub or GitLab.
     * Detects the platform from the repo prefix.
     *
     * Prefix examples:
     *   SSH:   git@github.com:owner/       → GitHub
     *   SSH:   git@gitlab.example.com:group/ → GitLab
     *   HTTPS: https://github.com/owner/    → GitHub
     *   HTTPS: https://gitlab.example.com/group/ → GitLab
     */
    private void createRemoteRepo(String prefix, String repoName, String defaultBranch,
                                   String token, String description) throws Exception {
        String host;
        String ownerOrGroup;

        if (prefix.startsWith("git@")) {
            // git@github.com:owner/
            String afterAt = prefix.substring(4); // github.com:owner/
            int colonIdx = afterAt.indexOf(':');
            host = afterAt.substring(0, colonIdx);
            ownerOrGroup = afterAt.substring(colonIdx + 1).replaceAll("/$", "");
        } else if (prefix.startsWith("https://")) {
            // https://github.com/owner/
            URI uri = URI.create(prefix);
            host = uri.getHost();
            ownerOrGroup = uri.getPath().replaceAll("^/", "").replaceAll("/$", "");
        } else {
            throw new IllegalArgumentException("Unsupported repo prefix format: " + prefix);
        }

        if (host.contains("github.com")) {
            createGitHubRepo(ownerOrGroup, repoName, defaultBranch, token, description);
        } else {
            createGitLabRepo(host, ownerOrGroup, repoName, defaultBranch, token, description);
        }
    }

    private void createGitHubRepo(String owner, String repoName, String defaultBranch,
                                   String token, String description) throws Exception {
        // Try org endpoint first; fall back to user endpoint
        String orgUrl = "https://api.github.com/orgs/" + owner + "/repos";
        String userUrl = "https://api.github.com/user/repos";

        // auto_init creates the repo with a main branch and initial commit
        String body = String.format(
                "{\"name\":\"%s\",\"description\":\"%s\",\"private\":true,\"auto_init\":true}",
                escapeJson(repoName), escapeJson(description));

        // Try org first
        HttpResponse<String> resp = sendGitApiRequest("POST", orgUrl, body, token, "github");
        if (resp.statusCode() == 404 || resp.statusCode() == 403) {
            // Not an org or no org access — try user repos
            resp = sendGitApiRequest("POST", userUrl, body, token, "github");
        }

        if (resp.statusCode() == 201) {
            LOG.infof("GitHub repo created: %s/%s", owner, repoName);

            // Create dev branch from the default branch (main)
            if (!"main".equals(defaultBranch)) {
                try {
                    createGitHubBranch(owner, repoName, "main", defaultBranch, token);
                } catch (Exception e) {
                    LOG.warnf("Failed to create branch '%s', will retry: %s", defaultBranch, e.getMessage());
                    // GitHub may need a moment after repo init — retry once
                    Thread.sleep(2000);
                    createGitHubBranch(owner, repoName, "main", defaultBranch, token);
                }
            }
            return;
        }
        if (resp.statusCode() == 422 && resp.body().contains("already exists")) {
            throw new RepoAlreadyExistsException("Repo already exists on GitHub");
        }
        throw new RuntimeException("GitHub API returned " + resp.statusCode() + ": " + resp.body());
    }

    /**
     * Create a branch on GitHub from a source branch.
     * 1. Get the SHA of the source branch
     * 2. Create a ref for the new branch
     */
    private void createGitHubBranch(String owner, String repoName, String sourceBranch,
                                     String newBranch, String token) throws Exception {
        // Get SHA of source branch
        String refUrl = "https://api.github.com/repos/" + owner + "/" + repoName + "/git/ref/heads/" + sourceBranch;
        HttpResponse<String> refResp = sendGitApiRequest("GET", refUrl, null, token, "github");
        if (refResp.statusCode() != 200) {
            throw new RuntimeException("Cannot get ref for " + sourceBranch + ": " + refResp.body());
        }

        // Extract SHA — simple JSON parse
        String sha = extractJsonField(refResp.body(), "sha");
        if (sha == null) {
            throw new RuntimeException("Cannot parse SHA from ref response");
        }

        // Create new branch ref
        String createRefUrl = "https://api.github.com/repos/" + owner + "/" + repoName + "/git/refs";
        String createBody = String.format("{\"ref\":\"refs/heads/%s\",\"sha\":\"%s\"}",
                escapeJson(newBranch), escapeJson(sha));
        HttpResponse<String> createResp = sendGitApiRequest("POST", createRefUrl, createBody, token, "github");

        if (createResp.statusCode() == 201) {
            LOG.infof("GitHub branch '%s' created on %s/%s", newBranch, owner, repoName);
        } else if (createResp.statusCode() == 422 && createResp.body().contains("Reference already exists")) {
            LOG.infof("GitHub branch '%s' already exists on %s/%s", newBranch, owner, repoName);
        } else {
            throw new RuntimeException("Failed to create branch: " + createResp.statusCode() + " " + createResp.body());
        }
    }

    private void createGitLabRepo(String host, String namespace, String repoName,
                                   String defaultBranch, String token, String description) throws Exception {
        String apiUrl = "https://" + host + "/api/v4/projects";
        String body = String.format(
                "{\"name\":\"%s\",\"description\":\"%s\",\"visibility\":\"private\",\"initialize_with_readme\":true,\"default_branch\":\"%s\",\"namespace_id\":null,\"path\":\"%s\"}",
                escapeJson(repoName), escapeJson(description), escapeJson(defaultBranch), escapeJson(repoName));

        // If namespace contains /, it's a nested group — resolve namespace_id
        // For simplicity, use the namespace path directly
        if (namespace != null && !namespace.isEmpty()) {
            body = String.format(
                    "{\"name\":\"%s\",\"description\":\"%s\",\"visibility\":\"private\",\"initialize_with_readme\":true,\"default_branch\":\"%s\",\"namespace_path\":\"%s\"}",
                    escapeJson(repoName), escapeJson(description), escapeJson(defaultBranch), escapeJson(namespace));
        }

        HttpResponse<String> resp = sendGitApiRequest("POST", apiUrl, body, token, "gitlab");

        if (resp.statusCode() == 201) {
            LOG.infof("GitLab repo created: %s/%s on %s", namespace, repoName, host);

            // Create dev branch if needed
            if (!"main".equals(defaultBranch) && !"master".equals(defaultBranch)) {
                try {
                    // Extract project id from response
                    String projectId = extractJsonField(resp.body(), "id");
                    if (projectId != null) {
                        Thread.sleep(1000); // Give GitLab a moment to init
                        createGitLabBranch(host, projectId, "main", defaultBranch, token);
                    }
                } catch (Exception e) {
                    LOG.warnf("Failed to create branch '%s' on GitLab: %s", defaultBranch, e.getMessage());
                }
            }
            return;
        }
        if (resp.statusCode() == 400 && resp.body().contains("has already been taken")) {
            throw new RepoAlreadyExistsException("Repo already exists on GitLab");
        }
        throw new RuntimeException("GitLab API returned " + resp.statusCode() + ": " + resp.body());
    }

    private void createGitLabBranch(String host, String projectId, String sourceBranch,
                                     String newBranch, String token) throws Exception {
        String url = "https://" + host + "/api/v4/projects/" + projectId + "/repository/branches"
                + "?branch=" + newBranch + "&ref=" + sourceBranch;
        HttpResponse<String> resp = sendGitApiRequest("POST", url, null, token, "gitlab");
        if (resp.statusCode() == 201) {
            LOG.infof("GitLab branch '%s' created on project %s", newBranch, projectId);
        } else if (resp.statusCode() == 400 && resp.body().contains("already exists")) {
            LOG.infof("GitLab branch '%s' already exists", newBranch);
        } else {
            throw new RuntimeException("Failed to create GitLab branch: " + resp.statusCode() + " " + resp.body());
        }
    }

    private HttpResponse<String> sendGitApiRequest(String method, String url, String body,
                                                    String token, String platform) throws Exception {
        var builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .timeout(Duration.ofSeconds(30));

        if ("github".equals(platform)) {
            builder.header("Authorization", "Bearer " + token);
        } else {
            builder.header("PRIVATE-TOKEN", token);
        }

        if ("POST".equals(method)) {
            builder.POST(HttpRequest.BodyPublishers.ofString(body));
        } else {
            builder.GET();
        }

        return httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }

    /**
     * Simple JSON field extraction — finds "key":"value" or "key":number.
     * Good enough for flat API responses without nested objects sharing the same key.
     */
    private static String extractJsonField(String json, String field) {
        // Match "field":"value" or "field":number
        String pattern = "\"" + field + "\"\\s*:\\s*";
        int idx = json.indexOf("\"" + field + "\"");
        if (idx < 0) return null;
        int colonIdx = json.indexOf(':', idx + field.length() + 2);
        if (colonIdx < 0) return null;
        int valueStart = colonIdx + 1;
        while (valueStart < json.length() && json.charAt(valueStart) == ' ') valueStart++;
        if (valueStart >= json.length()) return null;

        if (json.charAt(valueStart) == '"') {
            // String value
            int valueEnd = json.indexOf('"', valueStart + 1);
            return valueEnd > 0 ? json.substring(valueStart + 1, valueEnd) : null;
        } else {
            // Number or other value
            int valueEnd = valueStart;
            while (valueEnd < json.length() && json.charAt(valueEnd) != ',' && json.charAt(valueEnd) != '}') {
                valueEnd++;
            }
            return json.substring(valueStart, valueEnd).trim();
        }
    }

    /**
     * SSE checkout orchestration endpoint.
     * Streams step events as the checkout progresses.
     */
    @POST
    @Path("/{pageId}/checkout")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestSseElementType(MediaType.APPLICATION_JSON)
    public Multi<CheckoutStepEvent> checkout(@PathParam("pageId") String pageId) {
        String userId = requestContext.getUserId();
        String username = requestContext.getUsername();

        return Multi.createFrom().<CheckoutStepEvent>emitter(emitter -> {
            String editLockCode = null;
            boolean editLockAcquired = false;

            try {
                // Validate: check if page is already checked out
                Checkout existing = Checkout.findActiveByPageId(pageId);
                if (existing != null) {
                    String owner = existing.user != null ? existing.user.username : "unknown";
                    emitter.emit(new CheckoutStepEvent("error", "failed",
                            "Page is already checked out by " + owner));
                    emitter.complete();
                    return;
                }

                // Load page data from pages table
                Page page = Page.findById(UUID.fromString(pageId));
                if (page == null) {
                    emitter.emit(new CheckoutStepEvent("error", "failed",
                            "Page not found: " + pageId));
                    emitter.complete();
                    return;
                }

                // --- External edit lock: acquire lock before proceeding ---
                editLockCode = page.name;
                if (editLockService.isEnabled()) {
                    emitter.emit(new CheckoutStepEvent("edit_lock_checkout", "in_progress", null));
                    boolean canEdit = editLockService.checkOut(editLockCode, username);
                    if (!canEdit) {
                        emitter.emit(new CheckoutStepEvent("edit_lock_checkout", "failed",
                                "External edit lock denied: program is locked by another user"));
                        emitter.complete();
                        return;
                    }
                    editLockAcquired = true;
                    emitter.emit(new CheckoutStepEvent("edit_lock_checkout", "completed", null));
                }

                String pageName = page.name;
                String gitlabRepoUrl = page.gitlabRepoUrl;
                String branch = page.gitBranch != null ? page.gitBranch : "dev";

                // Delegate to ContainerLifecycle — it emits step events via the callback
                ContainerLifecycle.CheckoutResult result = containerLifecycle.orchestrateCheckout(
                        userId, pageId, pageName, gitlabRepoUrl, branch,
                        page.type, page.appsmithEditUrl,
                        emitter::emit
                );

                // Final done event with result
                emitter.emit(new CheckoutStepEvent("done", "completed",
                        "Checkout completed. Container: " + result.containerId()));
                emitter.complete();
            } catch (ContainerLifecycle.MaxContainersReachedException e) {
                // Rollback external edit lock if acquired
                if (editLockAcquired && editLockCode != null) {
                    LOG.info("Rolling back external edit lock due to max containers reached");
                    editLockService.checkIn(editLockCode, username);
                }
                emitter.emit(new CheckoutStepEvent("error", "failed", e.getMessage()));
                emitter.complete();
            } catch (Exception e) {
                // Rollback external edit lock if acquired
                if (editLockAcquired && editLockCode != null) {
                    LOG.infof("Rolling back external edit lock due to checkout failure: %s", e.getMessage());
                    editLockService.checkIn(editLockCode, username);
                }
                LOG.errorf(e, "Checkout failed for page %s", pageId);
                emitter.emit(new CheckoutStepEvent("error", "failed",
                        "Checkout failed: " + e.getMessage()));
                emitter.complete();
            }
        }).runSubscriptionOn(Infrastructure.getDefaultWorkerPool());
    }

    /**
     * Check in a page.
     * 1. Verify the current user owns this checkout
     * 2. Git add + commit + push inside the container
     * 3. Destroy the container
     * 4. Close the checkout record, restore page to available
     */
    @POST
    @Path("/{pageId}/checkin")
    @Transactional
    public Response checkin(@PathParam("pageId") String pageId, @Valid CheckinRequest request) {
        String userId = requestContext.getUserId();

        // Step 1: Find active checkout
        Checkout checkout = Checkout.findActiveByPageId(pageId);
        if (checkout == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "NotFound", "message", "No active checkout for this page"))
                    .build();
        }

        // Step 2: Verify the current user owns this checkout
        if (checkout.user == null || !checkout.user.id.toString().equals(userId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(Map.of("error", "Forbidden", "message", "Page is not checked out by you"))
                    .build();
        }

        String containerId = checkout.containerId;

        try {
            // Step 3: Ensure SSH key is available in container (may be missing for old checkouts)
            if (correctRepoUrl(checkout).startsWith("git@")) {
                LOG.info("Checkin: ensuring SSH key is injected before push");
                containerLifecycle.ensureSshKeyInContainer(containerId);
            }

            // Step 4: Fix remote origin URL to match current config
            String correctUrl = correctRepoUrl(checkout);
            LOG.infof("Checkin: setting remote origin to %s",
                    correctUrl.startsWith("https://") ? "[HTTPS with token]" : correctUrl);
            dockerService.execInContainer(containerId,
                    "git", "-C", "/workspace", "remote", "set-url", "origin", correctUrl);

            // Step 5: Git add + commit + push
            LOG.infof("Checkin: git operations in container %s for page %s", containerId, pageId);

            dockerService.execInContainer(containerId,
                    "git", "-C", "/workspace", "add", "-A");

            dockerService.execInContainer(containerId,
                    "git", "-C", "/workspace", "config", "user.email", "aiide@appsmith.local");
            dockerService.execInContainer(containerId,
                    "git", "-C", "/workspace", "config", "user.name", "AI-IDE");

            dockerService.execInContainer(containerId,
                    "git", "-C", "/workspace", "commit", "-m", request.commitMessage, "--allow-empty");

            String commitHash = dockerService.execInContainerFull(containerId,
                    "git", "-C", "/workspace", "rev-parse", "HEAD").stdout().trim();

            // Push — use execInContainerFull because git push writes progress to stderr
            DockerService.ExecResult pushResult = dockerService.execInContainerFull(containerId,
                    "git", "-C", "/workspace", "push", "origin", checkout.gitBranch);

            String pushAll = pushResult.combined().toLowerCase();
            LOG.infof("Checkin: git push exit=%d output=%s", pushResult.exitCode(), pushResult.combined());

            if (pushResult.exitCode() != 0) {
                if (pushAll.contains("rejected") || pushAll.contains("conflict")) {
                    return Response.status(Response.Status.CONFLICT)
                            .entity(Map.of("error", "GIT_CONFLICT", "message", "Push rejected: " + pushResult.combined()))
                            .build();
                }
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity(Map.of("error", "PushFailed", "message", "Git push failed: " + pushResult.combined()))
                        .build();
            }

            LOG.infof("Checkin: git push successful, commit=%s", commitHash);

            // Log changed files and their contents
            // Run everything inside a single sh -c to avoid Chinese filename encoding issues
            // when passing arguments through the Docker exec Java API
            try {
                String script =
                        "cd /workspace && " +
                        "git -c core.quotepath=false diff HEAD~1 --name-status | while read -r line; do " +
                        "  status=$(printf '%s' \"$line\" | cut -c1); " +
                        "  filepath=$(printf '%s' \"$line\" | sed 's/^[A-Z]\\t//;s/^[A-Z] *//'); " +
                        "  echo '===FILE_BEGIN==='; " +
                        "  echo \"STATUS:$status\"; " +
                        "  echo \"PATH:$filepath\"; " +
                        "  if [ \"$status\" != \"D\" ] && [ -f \"$filepath\" ]; then " +
                        "    echo 'CONTENT_BEGIN'; " +
                        "    cat \"$filepath\"; " +
                        "    echo; echo 'CONTENT_END'; " +
                        "  else " +
                        "    echo 'DELETED'; " +
                        "  fi; " +
                        "done";
                DockerService.ExecResult result = dockerService.execInContainerFull(containerId,
                        "sh", "-c", script);

                if (result.exitCode() == 0 && !result.stdout().isBlank()) {
                    // Parse structured output
                    String[] blocks = result.stdout().split("===FILE_BEGIN===");
                    int fileCount = 0;
                    for (String block : blocks) {
                        if (block.isBlank()) continue;
                        String[] blockLines = block.split("\n");
                        String status = "";
                        String filePath = "";
                        StringBuilder content = new StringBuilder();
                        boolean inContent = false;

                        for (String bl : blockLines) {
                            if (bl.startsWith("STATUS:")) {
                                status = bl.substring(7).trim();
                            } else if (bl.startsWith("PATH:")) {
                                filePath = bl.substring(5).trim();
                            } else if (bl.equals("CONTENT_BEGIN")) {
                                inContent = true;
                            } else if (bl.equals("CONTENT_END")) {
                                inContent = false;
                            } else if (bl.equals("DELETED")) {
                                // skip
                            } else if (inContent) {
                                if (content.length() > 0) content.append("\n");
                                content.append(bl);
                            }
                        }

                        if (filePath.isEmpty()) continue;
                        fileCount++;

                        String statusLabel = switch (status) {
                            case "A" -> "Added";
                            case "D" -> "Deleted";
                            case "M" -> "Modified";
                            default -> status;
                        };

                        LOG.infof("  [%s] %s", statusLabel, filePath);
                        if (!"D".equals(status)) {
                            LOG.infof("  Content of [%s]:\n%s", filePath, content);
                        }
                    }
                    LOG.infof("Checkin: %d file(s) changed in commit %s", fileCount, commitHash);
                } else {
                    LOG.info("Checkin: no file changes detected in commit");
                }
            } catch (Exception e) {
                LOG.warnf("Checkin: failed to list changed files: %s", e.getMessage());
            }

            // Step 4: Destroy the container
            try {
                dockerService.destroyContainer(containerId);
                LOG.infof("Checkin: container %s destroyed", containerId);
            } catch (Exception e) {
                LOG.warnf("Checkin: failed to destroy container %s: %s", containerId, e.getMessage());
            }

            // Step 5: Close checkout record
            checkout.status = "checked-in";
            checkout.checkedInAt = OffsetDateTime.now();
            checkout.commitHash = commitHash;

            // Step 6: Release external edit lock after successful checkin
            if (editLockService.isEnabled()) {
                try {
                    Page page = Page.findById(UUID.fromString(pageId));
                    if (page != null) {
                        editLockService.checkIn(page.name, requestContext.getUsername());
                    }
                } catch (Exception ex) {
                    LOG.warnf("Failed to release external edit lock after checkin: %s", ex.getMessage());
                }
            }

            return Response.ok(Map.of(
                    "success", true,
                    "commitHash", commitHash
            )).build();

        } catch (Exception e) {
            LOG.errorf(e, "Checkin failed for page %s", pageId);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "CheckinFailed", "message", "Checkin failed: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * Release a checkout without committing (container lost / health check failed).
     * Closes the checkout record and destroys the container if possible.
     */
    @POST
    @Path("/{pageId}/release")
    @Transactional
    public Response release(@PathParam("pageId") String pageId) {
        String userId = requestContext.getUserId();

        Checkout checkout = Checkout.findActiveByPageId(pageId);
        if (checkout == null) {
            return Response.ok(Map.of("success", true, "message", "No active checkout")).build();
        }

        // Verify the user owns this checkout
        if (checkout.user != null && !checkout.user.id.toString().equals(userId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(Map.of("error", "Forbidden", "message", "You do not own this checkout"))
                    .build();
        }

        // Close checkout record
        checkout.status = "released";
        checkout.checkedInAt = OffsetDateTime.now();

        // Best-effort destroy container
        if (checkout.containerId != null) {
            try {
                dockerService.destroyContainer(checkout.containerId);
            } catch (Exception e) {
                LOG.warnf("Failed to destroy container %s during release: %s", checkout.containerId, e.getMessage());
            }
        }

        LOG.infof("Checkout released: pageId=%s, userId=%s", pageId, userId);
        return Response.ok(Map.of("success", true)).build();
    }

    /**
     * Abandon a checkout: destroy container without pushing code, restore page.
     * Unlike checkin, no git push is performed — all local changes are discarded.
     */
    @POST
    @Path("/{pageId}/abandon")
    @Transactional
    public Response abandon(@PathParam("pageId") String pageId) {
        String userId = requestContext.getUserId();

        Checkout checkout = Checkout.findActiveByPageId(pageId);
        if (checkout == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "NotFound", "message", "No active checkout for this page"))
                    .build();
        }

        // Verify the current user owns this checkout
        if (checkout.user != null && !checkout.user.id.toString().equals(userId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(Map.of("error", "Forbidden", "message", "Page is not checked out by you"))
                    .build();
        }

        // Destroy container (best-effort)
        if (checkout.containerId != null) {
            try {
                dockerService.destroyContainer(checkout.containerId);
                LOG.infof("Abandon: container %s destroyed", checkout.containerId);
            } catch (Exception e) {
                LOG.warnf("Abandon: failed to destroy container %s: %s", checkout.containerId, e.getMessage());
            }
        }

        // Mark checkout as abandoned, release page
        checkout.status = "abandoned";
        checkout.checkedInAt = OffsetDateTime.now();

        // Release external edit lock after abandon
        if (editLockService.isEnabled()) {
            try {
                Page page = Page.findById(UUID.fromString(pageId));
                if (page != null) {
                    editLockService.checkIn(page.name, requestContext.getUsername());
                }
            } catch (Exception ex) {
                LOG.warnf("Failed to release external edit lock after abandon: %s", ex.getMessage());
            }
        }

        LOG.infof("Checkout abandoned: pageId=%s, userId=%s", pageId, userId);
        return Response.ok(Map.of("success", true)).build();
    }

    /**
     * Get file tree for a page (GitLab proxy or mock).
     */
    @GET
    @Path("/{pageId}/tree")
    public Response getTree(@PathParam("pageId") String pageId) {
        // TODO: Proxy to GitLab API or DemoDataService
        return Response.ok(Map.of(
                "pageId", pageId,
                "tree", List.of(
                        Map.of("name", "src", "type", "tree", "path", "src"),
                        Map.of("name", "README.md", "type", "blob", "path", "README.md"),
                        Map.of("name", "package.json", "type", "blob", "path", "package.json")
                )
        )).build();
    }

    /**
     * Get file content for a page (GitLab proxy or mock).
     */
    @GET
    @Path("/{pageId}/files")
    public Response getFile(@PathParam("pageId") String pageId, @QueryParam("path") String path) {
        if (path == null || path.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Bad Request", "message", "Query parameter 'path' is required"))
                    .build();
        }

        // TODO: Proxy to GitLab API or DemoDataService
        return Response.ok(Map.of(
                "pageId", pageId,
                "path", path,
                "content", "// Mock file content for " + path
        )).build();
    }

    // --- Container Proxy Routes ---

    /**
     * Proxy chat request to container AI Proxy or external AI Agent.
     *
     * Priority:
     * 1. Try forwarding to the container AI Proxy (has full context: code + deps + skills)
     * 2. If container is unavailable and aiide.ai-agent-url is configured, fallback to external AI agent
     * 3. If neither works, return error
     */
    @POST
    @Path("/{pageId}/chat")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    public Response proxyChat(@PathParam("pageId") String pageId, String body) {
        // Try container first
        Response containerResponse = proxyToContainer(pageId, "POST", "/api/chat", body, MediaType.SERVER_SENT_EVENTS);
        if (containerResponse.getStatus() < 400) {
            return containerResponse;
        }

        // Container unavailable — fallback to external AI agent
        String agentUrl = appConfig.getAiAgentUrl();
        if (agentUrl == null || agentUrl.isBlank()) {
            return containerResponse; // No fallback configured, return original error
        }

        LOG.infof("Container unavailable for page %s, falling back to AI agent at %s", pageId, agentUrl);
        try {
            var requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(agentUrl))
                    .header("Content-Type", MediaType.APPLICATION_JSON)
                    .header("Accept", MediaType.SERVER_SENT_EVENTS)
                    .timeout(Duration.ofSeconds(120))
                    .POST(body != null ? HttpRequest.BodyPublishers.ofString(body)
                            : HttpRequest.BodyPublishers.noBody());

            HttpResponse<InputStream> response = httpClient.send(
                    requestBuilder.build(),
                    HttpResponse.BodyHandlers.ofInputStream());

            var responseBuilder = Response.status(response.statusCode())
                    .entity(response.body());

            response.headers().firstValue("Content-Type")
                    .ifPresent(ct -> responseBuilder.header("Content-Type", ct));

            return responseBuilder.build();
        } catch (Exception e) {
            LOG.errorf(e, "Failed to reach AI agent for page %s", pageId);
            return Response.status(Response.Status.BAD_GATEWAY)
                    .entity(Map.of("error", "Bad Gateway",
                            "message", "Container unavailable and AI agent unreachable: " + e.getMessage()))
                    .build();
        }
    }

    /**
     * Proxy to container File Manager - list files.
     */
    @GET
    @Path("/{pageId}/container/files")
    public Response proxyContainerFiles(@PathParam("pageId") String pageId) {
        return proxyToContainer(pageId, "GET", "/files", null, MediaType.APPLICATION_JSON);
    }

    /**
     * Proxy to container File Manager - get file content.
     */
    @GET
    @Path("/{pageId}/container/files/{path: .+}")
    public Response proxyContainerFileContent(@PathParam("pageId") String pageId,
                                              @PathParam("path") String path) {
        return proxyToContainer(pageId, "GET", "/files/" + path, null, MediaType.APPLICATION_JSON);
    }

    /**
     * Proxy create file to container.
     */
    @POST
    @Path("/{pageId}/container/files/{path: .+}")
    public Response proxyContainerCreateFile(@PathParam("pageId") String pageId,
                                              @PathParam("path") String path, String body) {
        return proxyToContainer(pageId, "POST", "/files/" + path, body, MediaType.APPLICATION_JSON);
    }

    /**
     * Proxy update file to container.
     */
    @PUT
    @Path("/{pageId}/container/files/{path: .+}")
    public Response proxyContainerUpdateFile(@PathParam("pageId") String pageId,
                                              @PathParam("path") String path, String body) {
        return proxyToContainer(pageId, "PUT", "/files/" + path, body, MediaType.APPLICATION_JSON);
    }

    /**
     * Proxy delete file/directory to container.
     */
    @DELETE
    @Path("/{pageId}/container/files/{path: .+}")
    public Response proxyContainerDeleteFile(@PathParam("pageId") String pageId,
                                              @PathParam("path") String path) {
        return proxyToContainer(pageId, "DELETE", "/files/" + path, null, MediaType.APPLICATION_JSON);
    }

    /**
     * Proxy batch save to container.
     */
    @POST
    @Path("/{pageId}/container/files/batch-save")
    public Response proxyContainerBatchSave(@PathParam("pageId") String pageId, String body) {
        return proxyToContainer(pageId, "POST", "/files/batch-save", body, MediaType.APPLICATION_JSON);
    }

    /**
     * Proxy diff request to container.
     */
    @GET
    @Path("/{pageId}/container/diff")
    public Response proxyContainerDiff(@PathParam("pageId") String pageId) {
        return proxyToContainer(pageId, "GET", "/diff", null, MediaType.APPLICATION_JSON);
    }

    /**
     * Proxy health check to container.
     */
    @GET
    @Path("/{pageId}/container/health")
    public Response proxyContainerHealth(@PathParam("pageId") String pageId) {
        return proxyToContainer(pageId, "GET", "/api/health", null, MediaType.APPLICATION_JSON);
    }

    /**
     * Proxy tree request to container.
     */
    @GET
    @Path("/{pageId}/container/tree")
    public Response proxyContainerTree(@PathParam("pageId") String pageId) {
        return proxyToContainer(pageId, "GET", "/files", null, MediaType.APPLICATION_JSON);
    }

    // --- Private helpers ---

    /**
     * Build the correct repo URL from current config for a checkout record.
     */
    private String correctRepoUrl(Checkout checkout) {
        String prefix = appConfig.getGitlabRepoPrefix();
        String repoName = checkout.pageName != null ? checkout.pageName : checkout.pageId;
        String rawUrl = prefix + repoName + ".git";
        return rawUrl.startsWith("https://")
                ? appConfig.buildAuthenticatedRepoUrl(rawUrl)
                : rawUrl;
    }

    /**
     * Forward an HTTP request to the container associated with the given pageId.
     * Looks up the container IP from the active checkout record.
     */
    private Response proxyToContainer(String pageId, String method, String path,
                                      String body, String acceptType) {
        Checkout checkout = Checkout.findActiveByPageId(pageId);
        if (checkout == null || checkout.containerId == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found",
                            "message", "No active container for page " + pageId))
                    .build();
        }

        // Resolve actual container address via DockerService
        DockerService.ContainerEndpoints endpoints;
        try {
            endpoints = dockerService.getContainerEndpoints(checkout.containerId);
        } catch (Exception e) {
            LOG.errorf("Cannot resolve container endpoints for %s: %s", checkout.containerId, e.getMessage());
            return Response.status(Response.Status.BAD_GATEWAY)
                    .entity(Map.of("error", "Bad Gateway",
                            "message", "Cannot reach container: " + e.getMessage()))
                    .build();
        }

        // Route to correct service:
        //   File Manager (3001): /files, /diff
        //   AI Proxy (3000): /api/health, /api/chat, /api/session, etc.
        boolean isFileManagerPath = path.startsWith("/files") || path.startsWith("/diff");
        String host = isFileManagerPath ? endpoints.fileManager() : endpoints.aiProxy();
        String containerUrl = "http://" + host + path;

        try {
            var requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(containerUrl))
                    .header("Accept", acceptType)
                    .timeout(Duration.ofSeconds(30));

            switch (method) {
                case "POST" -> requestBuilder.POST(
                        body != null ? HttpRequest.BodyPublishers.ofString(body)
                                : HttpRequest.BodyPublishers.noBody());
                case "PUT" -> requestBuilder.PUT(
                        body != null ? HttpRequest.BodyPublishers.ofString(body)
                                : HttpRequest.BodyPublishers.noBody());
                case "DELETE" -> requestBuilder.DELETE();
                default -> requestBuilder.GET();
            }

            if (body != null) {
                requestBuilder.header("Content-Type", MediaType.APPLICATION_JSON);
            }

            HttpResponse<InputStream> response = httpClient.send(
                    requestBuilder.build(),
                    HttpResponse.BodyHandlers.ofInputStream());

            var responseBuilder = Response.status(response.statusCode())
                    .entity(response.body());

            response.headers().firstValue("Content-Type")
                    .ifPresent(ct -> responseBuilder.header("Content-Type", ct));

            return responseBuilder.build();
        } catch (Exception e) {
            LOG.errorf(e, "Container proxy failed for page %s, path %s", pageId, path);
            return Response.status(Response.Status.BAD_GATEWAY)
                    .entity(Map.of("error", "Bad Gateway",
                            "message", "Failed to reach container: " + e.getMessage()))
                    .build();
        }
    }
}
