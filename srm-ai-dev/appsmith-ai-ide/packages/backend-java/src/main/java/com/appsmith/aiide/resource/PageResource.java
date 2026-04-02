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
import com.appsmith.aiide.http.IHttpService;
import com.appsmith.aiide.service.AppsmithJsObjectTracker;
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

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.io.InputStream;
import java.net.ProxySelector;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.cert.X509Certificate;
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

    @Inject
    IHttpService httpService;

    @Inject
    AppsmithJsObjectTracker jsObjectTracker;

    /**
     * Trust-all HttpClient — kept only for streaming proxy (HttpResponse<InputStream>)
     * which IHttpService does not support.
     */
    private final HttpClient streamingHttpClient = buildTrustAllHttpClient();

    private static HttpClient buildTrustAllHttpClient() {
        try {
            TrustManager[] trustAll = new TrustManager[]{
                    new X509TrustManager() {
                        public X509Certificate[] getAcceptedIssuers() {
                            return new X509Certificate[0];
                        }

                        public void checkClientTrusted(X509Certificate[] certs, String authType) {
                        }

                        public void checkServerTrusted(X509Certificate[] certs, String authType) {
                        }
                    }
            };
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAll, new java.security.SecureRandom());
            return HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(30))
                    .sslContext(sslContext)
//                    .proxy(ProxySelector.of(null))
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("Failed to create trust-all HttpClient", e);
        }
    }

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
                dto.checkedOutAt = active.checkedOutAt != null ? active.checkedOutAt.toString() : null;
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
     * Get a single page by ID with checkout status.
     */
    @GET
    @Path("/{pageId}")
    public Response getPage(@PathParam("pageId") String pageId) {
        String currentUserId = requestContext.getUserId();

        Page entity = Page.findById(UUID.fromString(pageId));
        if (entity == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "NotFound", "message", "Page not found: " + pageId))
                    .build();
        }

        PageDto dto = PageDto.from(entity);
        Checkout active = Checkout.findActiveByPageId(pageId);
        if (active != null) {
            dto.checkedOutAt = active.checkedOutAt != null ? active.checkedOutAt.toString() : null;
            if (active.user != null && active.user.id.toString().equals(currentUserId)) {
                dto.status = "mine";
            } else {
                dto.status = "checkedout";
                if (active.user != null) {
                    dto.setCheckedOutByUser(active.user.username, active.user.displayName);
                }
            }
        }

        return Response.ok(dto).build();
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
        page.appsmithPageId = request.appsmithPageId;

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
        RepoAlreadyExistsException(String msg) {
            super(msg);
        }
    }

    /**
     * Create a remote Git repository on GitHub or GitLab.
     * Detects the platform from the repo prefix.
     * <p>
     * Prefix examples:
     * SSH:   git@github.com:owner/       → GitHub
     * SSH:   git@gitlab.example.com:group/ → GitLab
     * SSH:   ssh://git@host:port/group/   → GitLab (SSH URL format)
     * HTTPS: https://github.com/owner/    → GitHub
     * HTTPS: https://gitlab.example.com/group/ → GitLab
     */
    private void createRemoteRepo(String prefix, String repoName, String defaultBranch,
                                  String token, String description) throws Exception {
        String host;
        String ownerOrGroup;
        String apiBaseUrl; // e.g. "https://gitlab.example.com" or "http://10.0.0.1:3000"

        if (prefix.startsWith("ssh://")) {
            // ssh://git@host:port/owner/ e.g. ssh://git@10.177.152.5:2222/srm-dev/
            URI sshUri = URI.create(prefix);
            host = sshUri.getHost();
            int port = sshUri.getPort();
            // Remove leading "/" and trailing "/" from path to get owner/group
            ownerOrGroup = sshUri.getPath().replaceAll("^/", "").replaceAll("/$", "");

            // Use explicit gitlab-api-base-url if configured, otherwise build from host/port
            String configuredBase = appConfig.getGitlabApiBaseUrl();
            if (configuredBase != null && !configuredBase.isEmpty()) {
                apiBaseUrl = configuredBase;
            } else if (port > 0) {
                apiBaseUrl = "http://" + host + ":" + port;
            } else {
                apiBaseUrl = "https://" + host;
            }
        } else if (prefix.startsWith("git@")) {
            // git@host:owner/ or git@host:port/owner/
            String afterAt = prefix.substring(4); // host:owner/ or host:port/owner/
            int colonIdx = afterAt.indexOf(':');
            host = afterAt.substring(0, colonIdx);
            String pathPart = afterAt.substring(colonIdx + 1).replaceAll("/$", "");

            // Check if path starts with a port number, e.g. "3000/srm-dev"
            int slashIdx = pathPart.indexOf('/');
            String detectedPort = null;
            if (slashIdx > 0) {
                String firstSegment = pathPart.substring(0, slashIdx);
                if (firstSegment.matches("\\d+")) {
                    detectedPort = firstSegment;
                    ownerOrGroup = pathPart.substring(slashIdx + 1);
                } else {
                    ownerOrGroup = pathPart;
                }
            } else {
                ownerOrGroup = pathPart;
            }

            // Use explicit gitlab-api-base-url if configured, otherwise build from host/port
            String configuredBase = appConfig.getGitlabApiBaseUrl();
            if (configuredBase != null && !configuredBase.isEmpty()) {
                apiBaseUrl = configuredBase;
            } else if (detectedPort != null) {
                apiBaseUrl = "http://" + host + ":" + detectedPort;
            } else {
                apiBaseUrl = "https://" + host;
            }
        } else if (prefix.startsWith("https://") || prefix.startsWith("http://")) {
            // https://github.com/owner/ or http://10.0.0.1:3000/group/
            URI uri = URI.create(prefix);
            host = uri.getHost();
            ownerOrGroup = uri.getPath().replaceAll("^/", "").replaceAll("/$", "");
            // Preserve the original scheme and port
            int port = uri.getPort();
            apiBaseUrl = uri.getScheme() + "://" + host + (port > 0 ? ":" + port : "");
        } else {
            throw new IllegalArgumentException("Unsupported repo prefix format: " + prefix);
        }

        LOG.infof("createRemoteRepo: prefix=%s, apiBaseUrl=%s, host=%s, ownerOrGroup=%s", prefix, apiBaseUrl, host, ownerOrGroup);

        if (host.contains("github.com")) {
            createGitHubRepo(ownerOrGroup, repoName, defaultBranch, token, description);
        } else {
            createGitLabRepo(apiBaseUrl, ownerOrGroup, repoName, defaultBranch, token, description);
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
        IHttpService.Response resp = sendGitApiRequest("POST", orgUrl, body, token, "github");
        if (resp.statusCode == 404 || resp.statusCode == 403) {
            // Not an org or no org access — try user repos
            resp = sendGitApiRequest("POST", userUrl, body, token, "github");
        }

        if (resp.statusCode == 201) {
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
        if (resp.statusCode == 422 && resp.body.contains("already exists")) {
            throw new RepoAlreadyExistsException("Repo already exists on GitHub");
        }
        throw new RuntimeException("GitHub API returned " + resp.statusCode + ": " + resp.body);
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
        IHttpService.Response refResp = sendGitApiRequest("GET", refUrl, null, token, "github");
        if (refResp.statusCode != 200) {
            throw new RuntimeException("Cannot get ref for " + sourceBranch + ": " + refResp.body);
        }

        // Extract SHA — simple JSON parse
        String sha = extractJsonField(refResp.body, "sha");
        if (sha == null) {
            throw new RuntimeException("Cannot parse SHA from ref response");
        }

        // Create new branch ref
        String createRefUrl = "https://api.github.com/repos/" + owner + "/" + repoName + "/git/refs";
        String createBody = String.format("{\"ref\":\"refs/heads/%s\",\"sha\":\"%s\"}",
                escapeJson(newBranch), escapeJson(sha));
        IHttpService.Response createResp = sendGitApiRequest("POST", createRefUrl, createBody, token, "github");

        if (createResp.statusCode == 201) {
            LOG.infof("GitHub branch '%s' created on %s/%s", newBranch, owner, repoName);
        } else if (createResp.statusCode == 422 && createResp.body.contains("Reference already exists")) {
            LOG.infof("GitHub branch '%s' already exists on %s/%s", newBranch, owner, repoName);
        } else {
            throw new RuntimeException("Failed to create branch: " + createResp.statusCode + " " + createResp.body);
        }
    }

    private void createGitLabRepo(String apiBaseUrl, String namespace, String repoName,
                                  String defaultBranch, String token, String description) throws Exception {
        String apiUrl = apiBaseUrl + "/api/v4/projects";
        String body;

        if (namespace != null && !namespace.isEmpty()) {
            // Resolve namespace_id from group path
            String namespaceId = resolveGitLabNamespaceId(apiBaseUrl, namespace, token);
            if (namespaceId != null) {
                body = String.format(
                        "{\"name\":\"%s\",\"description\":\"%s\",\"visibility\":\"private\",\"initialize_with_readme\":true,\"default_branch\":\"%s\",\"path\":\"%s\",\"namespace_id\":%s}",
                        escapeJson(repoName), escapeJson(description), escapeJson(defaultBranch), escapeJson(repoName), namespaceId);
            } else {
                throw new RuntimeException("Cannot resolve GitLab namespace ID for group: " + namespace);
            }
        } else {
            body = String.format(
                    "{\"name\":\"%s\",\"description\":\"%s\",\"visibility\":\"private\",\"initialize_with_readme\":true,\"default_branch\":\"%s\",\"path\":\"%s\"}",
                    escapeJson(repoName), escapeJson(description), escapeJson(defaultBranch), escapeJson(repoName));
        }

        IHttpService.Response resp = sendGitApiRequest("POST", apiUrl, body, token, "gitlab");

        if (resp.statusCode == 201) {
            LOG.infof("GitLab repo created: %s/%s on %s", namespace, repoName, apiBaseUrl);

            // Create dev branch if needed
            if (!"main".equals(defaultBranch) && !"master".equals(defaultBranch)) {
                try {
                    // Extract project id from response
                    String projectId = extractJsonField(resp.body, "id");
                    if (projectId != null) {
                        Thread.sleep(1000); // Give GitLab a moment to init
                        createGitLabBranch(apiBaseUrl, projectId, "main", defaultBranch, token);
                    }
                } catch (Exception e) {
                    LOG.warnf("Failed to create branch '%s' on GitLab: %s", defaultBranch, e.getMessage());
                }
            }
            return;
        }
        if (resp.statusCode == 400 && resp.body.contains("has already been taken")) {
            throw new RepoAlreadyExistsException("Repo already exists on GitLab");
        }
        throw new RuntimeException("GitLab API returned " + resp.statusCode + ": " + resp.body);
    }

    private void createGitLabBranch(String apiBaseUrl, String projectId, String sourceBranch,
                                    String newBranch, String token) throws Exception {
        String url = apiBaseUrl + "/api/v4/projects/" + projectId + "/repository/branches"
                + "?branch=" + newBranch + "&ref=" + sourceBranch;
        IHttpService.Response resp = sendGitApiRequest("POST", url, null, token, "gitlab");
        if (resp.statusCode == 201) {
            LOG.infof("GitLab branch '%s' created on project %s", newBranch, projectId);
        } else if (resp.statusCode == 400 && resp.body.contains("already exists")) {
            LOG.infof("GitLab branch '%s' already exists", newBranch);
        } else {
            throw new RuntimeException("Failed to create GitLab branch: " + resp.statusCode + " " + resp.body);
        }
    }

    /**
     * Resolve a GitLab group/namespace path (e.g. "srm-dev") to its numeric namespace_id.
     */
    private String resolveGitLabNamespaceId(String apiBaseUrl, String namespacePath, String token) throws Exception {
        String url = apiBaseUrl + "/api/v4/groups/" + java.net.URLEncoder.encode(namespacePath, "UTF-8");
        IHttpService.Response resp = sendGitApiRequest("GET", url, null, token, "gitlab");
        if (resp.statusCode == 200) {
            String id = extractJsonField(resp.body, "id");
            LOG.infof("Resolved GitLab namespace '%s' to id=%s", namespacePath, id);
            return id;
        }
        LOG.errorf("Failed to resolve GitLab namespace '%s': %d %s", namespacePath, resp.statusCode, resp.body);
        return null;
    }

    private IHttpService.Response sendGitApiRequest(String method, String url, String body,
                                                    String token, String platform) throws Exception {
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", "application/json");
        headers.put("Accept", "application/json");

        if ("github".equals(platform)) {
            headers.put("Authorization", "Bearer " + token);
        } else {
            headers.put("PRIVATE-TOKEN", token);
        }

        if ("POST".equals(method)) {
            return httpService.postJsonWithStatus(url, body, headers);
        } else {
            return httpService.getWithStatus(url, headers);
        }
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

                // Build Appsmith edit URL from config base + pageId
                String appsmithEditUrl = null;
                if ("appsmith".equals(page.type) && page.appsmithPageId != null && !page.appsmithPageId.isBlank()) {
                    String baseUrl = appConfig.getAppsmithApiBaseUrl();
                    if (!baseUrl.isBlank()) {
//                        String sep = baseUrl.endsWith("/") ? "" : "/";
//                        appsmithEditUrl = baseUrl + sep + page.appsmithPageId + "/edit";
                        appsmithEditUrl = String.format(baseUrl, page.appsmithPageId, page.appsmithPageId);
                    }
                }

                // Delegate to ContainerLifecycle — it emits step events via the callback
                ContainerLifecycle.CheckoutResult result = containerLifecycle.orchestrateCheckout(
                        userId, pageId, pageName, gitlabRepoUrl, branch,
                        page.type, appsmithEditUrl,
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

            // Step 4: Appsmith sync — execute pending operations and sync content changes
            List<String> appsmithErrors = new ArrayList<>();
            if (jsObjectTracker.isTracking(containerId)) {
                try {
                    // 4a. Execute pending operations (rename/create/delete) via Appsmith API
                    String opsError = jsObjectTracker.executePendingOperations(containerId);
                    if (opsError != null) {
                        LOG.errorf("Checkin: appsmith pending operations had errors: %s", opsError);
                        appsmithErrors.add(opsError);
                    } else {
                        LOG.info("Checkin: appsmith pending operations executed successfully");
                    }

                    // 4b. Read all jsObject files — let redux-node-service compare internally
                    Map<String, String> changedJsFiles = collectAllJsObjectContents(containerId);
                    if (!changedJsFiles.isEmpty()) {
                        LOG.infof("Checkin: %d jsObject file(s) with content changes", changedJsFiles.size());

                        // 4c. Sync content changes via redux-node-service (runs locally, not in container)
                        String reduxUrl = appConfig.getReduxNodeServiceUrl();
                        String syncError = jsObjectTracker.syncContentChanges(containerId, changedJsFiles, reduxUrl);
                        if (syncError != null) {
                            LOG.errorf("Checkin: content sync had errors: %s", syncError);
                            appsmithErrors.add(syncError);
                        }
                    }
                } catch (Exception e) {
                    LOG.errorf(e, "Checkin: appsmith sync failed: %s", e.getMessage());
                    appsmithErrors.add("Appsmith sync exception: " + e.getMessage());
                } finally {
                    jsObjectTracker.cleanup(containerId);
                }
            }

            // Step 5: Destroy the container
            try {
                dockerService.destroyContainer(containerId);
                LOG.infof("Checkin: container %s destroyed", containerId);
            } catch (Exception e) {
                LOG.warnf("Checkin: failed to destroy container %s: %s", containerId, e.getMessage());
            }

            // Step 6: Close checkout record
            checkout.status = "checked-in";
            checkout.checkedInAt = OffsetDateTime.now();
            checkout.commitHash = commitHash;

            // Step 7: Release external edit lock after successful checkin
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

            if (!appsmithErrors.isEmpty()) {
                // Git push succeeded but Appsmith sync had errors — report partial success
                return Response.ok(Map.of(
                        "success", true,
                        "commitHash", commitHash,
                        "appsmithSyncErrors", appsmithErrors
                )).build();
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

        if (checkout != null) {
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
                jsObjectTracker.cleanup(checkout.containerId);
                try {
                    dockerService.destroyContainer(checkout.containerId);
                } catch (Exception e) {
                    LOG.warnf("Failed to destroy container %s during release: %s", checkout.containerId, e.getMessage());
                }
            }
        }

        // Always release external edit lock (even if checkout record is gone)
        if (editLockService.isEnabled()) {
            try {
                Page page = Page.findById(UUID.fromString(pageId));
                if (page != null) {
                    editLockService.checkIn(page.name, requestContext.getUsername());
                    LOG.infof("Release: edit lock released for page %s", page.name);
                }
            } catch (Exception ex) {
                LOG.warnf("Failed to release external edit lock after release: %s", ex.getMessage());
            }
        }

        LOG.infof("Checkout released: pageId=%s, userId=%s, hadCheckoutRecord=%s", pageId, userId, checkout != null);
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
            jsObjectTracker.cleanup(checkout.containerId);
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
     * Get file tree for a page (readonly mode).
     * Appsmith type: fetches from Appsmith API.
     * Normal type: returns empty tree (no container running).
     */
    @GET
    @Path("/{pageId}/tree")
    public Response getTree(@PathParam("pageId") String pageId) {
        try {
            Page page = Page.findById(UUID.fromString(pageId));
            if (page != null && "appsmith".equals(page.type)
                    && page.appsmithPageId != null && !page.appsmithPageId.isBlank()) {
                return buildAppsmithFileTree(page);
            }
        } catch (Exception e) {
            LOG.warnf("Failed to build tree for page %s: %s", pageId, e.getMessage());
        }

        // Normal type without container: return empty tree
        return Response.ok(List.of()).build();
    }

    /**
     * Get file content for a page (readonly mode).
     * Appsmith type: fetches body from Appsmith API editResponse.
     * Normal type: returns empty content (no container running).
     */
    @GET
    @Path("/{pageId}/files")
    public Response getFile(@PathParam("pageId") String pageId, @QueryParam("path") String path) {
        if (path == null || path.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Bad Request", "message", "Query parameter 'path' is required"))
                    .build();
        }

        try {
            Page page = Page.findById(UUID.fromString(pageId));
            if (page != null && "appsmith".equals(page.type)
                    && page.appsmithPageId != null && !page.appsmithPageId.isBlank()
                    && path.startsWith("jsObjects/") && path.endsWith(".js")) {

                // Extract collection name from path: jsObjects/Xxx.js → Xxx
                String collectionName = path.substring("jsObjects/".length(), path.length() - ".js".length());
                String content = fetchAppsmithCollectionBody(page, collectionName);
                if (content != null) {
                    return Response.ok(Map.of("content", content)).build();
                }
                return Response.ok(Map.of("content", "")).build();
            }
        } catch (Exception e) {
            LOG.warnf("Failed to fetch appsmith file content for %s: %s", path, e.getMessage());
        }

        return Response.ok(Map.of("content", "")).build();
    }

    /**
     * Fetch a single collection's body from Appsmith editResponse.
     */
    private String fetchAppsmithCollectionBody(Page page, String collectionName) {
        String baseUrl = appConfig.getAppsmithApiBaseUrl();
        if (baseUrl.isBlank()) return null;

        String editUrl = String.format(baseUrl, page.appsmithPageId, page.appsmithPageId);
        Map<String, String> headers = jsObjectTracker.buildAppsmithHeaders();

        try {
            IHttpService.Response resp = httpService.getWithStatus(editUrl, headers);
            if (!resp.isSuccess()) return null;

            com.fasterxml.jackson.databind.JsonNode root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(resp.body);
            com.fasterxml.jackson.databind.JsonNode collections = root.path("data").path("unpublishedActionCollections").path("data");

            if (collections.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode item : collections) {
                    if (collectionName.equals(item.path("name").asText())) {
                        return item.path("body").asText("");
                    }
                }
            }
        } catch (Exception e) {
            LOG.warnf("Failed to fetch collection body '%s': %s", collectionName, e.getMessage());
        }
        return null;
    }

    // --- JsObject naming validation ---

    /**
     * Validate jsObject name: must start with letter, no Chinese, only letters/digits/underscore.
     * @return error message or null if valid
     */
    private static String validateJsObjectName(String name) {
        if (name == null || name.isBlank()) return "名称不能为空";
        if (!name.matches("^[a-zA-Z].*")) return "名称必须以英文字母开头";
        if (name.matches(".*[\\u4e00-\\u9fff].*")) return "名称不能包含汉字";
        if (!name.matches("^[a-zA-Z][a-zA-Z0-9_]*$")) return "名称只能包含英文字母、数字和下划线";
        return null;
    }

    // --- JsObject Operation Endpoints (Appsmith pages only) ---

    /**
     * Rename a JsObject file in the container and record the operation for checkin.
     * Body: {"oldName": "JSObject1", "newName": "JSObject_renamed"}
     */
    @POST
    @Path("/{pageId}/jsobject/rename")
    public Response renameJsObject(@PathParam("pageId") String pageId, String body) {
        Checkout checkout = Checkout.findActiveByPageId(pageId);
        if (checkout == null || checkout.containerId == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "NotFound", "message", "No active container for page " + pageId))
                    .build();
        }

        try {
            com.fasterxml.jackson.databind.JsonNode reqNode = new com.fasterxml.jackson.databind.ObjectMapper().readTree(body);
            String oldName = reqNode.path("oldName").asText(null);
            String newName = reqNode.path("newName").asText(null);

            if (oldName == null || oldName.isBlank() || newName == null || newName.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "BadRequest", "message", "oldName and newName are required"))
                        .build();
            }

            String nameError = validateJsObjectName(newName);
            if (nameError != null) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "BadRequest", "message", nameError))
                        .build();
            }

            String containerId = checkout.containerId;
            String jsDir = "/workspace/jsObjects";

            // Rename file in container: read old content, write to new, delete old
            DockerService.ExecResult readResult = dockerService.execInContainerFull(containerId,
                    "cat", jsDir + "/" + oldName + ".js");
            if (readResult.exitCode() != 0) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(Map.of("error", "NotFound", "message", "File not found: " + oldName + ".js"))
                        .build();
            }

            String content = readResult.stdout();
            String encoded = Base64.getEncoder().encodeToString(content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            dockerService.execInContainer(containerId,
                    "sh", "-c", "echo '" + encoded + "' | base64 -d > " + jsDir + "/" + newName + ".js");
            dockerService.execInContainer(containerId, "rm", "-f", jsDir + "/" + oldName + ".js");

            // Record the rename operation in the tracker
            jsObjectTracker.recordRename(containerId, oldName, newName);

            LOG.infof("JsObject renamed: %s -> %s (page %s)", oldName, newName, pageId);
            return Response.ok(Map.of("success", true)).build();
        } catch (Exception e) {
            LOG.errorf(e, "Failed to rename JsObject for page %s", pageId);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "RenameFailed", "message", e.getMessage()))
                    .build();
        }
    }

    /**
     * Create a new JsObject file in the container and record the operation for checkin.
     * Body: {"name": "JSObject_new"}
     */
    @POST
    @Path("/{pageId}/jsobject/create")
    public Response createJsObject(@PathParam("pageId") String pageId, String body) {
        Checkout checkout = Checkout.findActiveByPageId(pageId);
        if (checkout == null || checkout.containerId == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "NotFound", "message", "No active container for page " + pageId))
                    .build();
        }

        try {
            com.fasterxml.jackson.databind.JsonNode reqNode = new com.fasterxml.jackson.databind.ObjectMapper().readTree(body);
            String name = reqNode.path("name").asText(null);

            if (name == null || name.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "BadRequest", "message", "name is required"))
                        .build();
            }

            String nameError = validateJsObjectName(name);
            if (nameError != null) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "BadRequest", "message", nameError))
                        .build();
            }

            String containerId = checkout.containerId;
            String jsDir = "/workspace/jsObjects";

            // Create file in container with default JS template
            String defaultBody = "export default {\n\tmyVar1: [],\n\tmyVar2: {},\n\tmyFun1 () {\n\t\t//\twrite code here\n\t\t//\tthis.myVar1 = [1,2,3]\n\t},\n\tasync myFun2 () {\n\t\t//\tuse async-await or promises\n\t\t//\tawait storeValue('varName', 'hello world')\n\t}\n}";
            String encoded = Base64.getEncoder().encodeToString(defaultBody.getBytes(java.nio.charset.StandardCharsets.UTF_8));

            dockerService.execInContainer(containerId, "mkdir", "-p", jsDir);
            dockerService.execInContainer(containerId,
                    "sh", "-c", "echo '" + encoded + "' | base64 -d > " + jsDir + "/" + name + ".js");

            // Record the create operation in the tracker
            jsObjectTracker.recordCreate(containerId, name);

            LOG.infof("JsObject created: %s (page %s)", name, pageId);
            return Response.status(Response.Status.CREATED)
                    .entity(Map.of("success", true))
                    .build();
        } catch (Exception e) {
            LOG.errorf(e, "Failed to create JsObject for page %s", pageId);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "CreateFailed", "message", e.getMessage()))
                    .build();
        }
    }

    /**
     * Delete a JsObject file from the container and record the operation for checkin.
     */
    @DELETE
    @Path("/{pageId}/jsobject/{name}")
    public Response deleteJsObject(@PathParam("pageId") String pageId, @PathParam("name") String name) {
        Checkout checkout = Checkout.findActiveByPageId(pageId);
        if (checkout == null || checkout.containerId == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "NotFound", "message", "No active container for page " + pageId))
                    .build();
        }

        try {
            String containerId = checkout.containerId;
            String jsDir = "/workspace/jsObjects";

            // Delete file in container
            dockerService.execInContainer(containerId, "rm", "-f", jsDir + "/" + name + ".js");

            // Record the delete operation in the tracker
            jsObjectTracker.recordDelete(containerId, name);

            LOG.infof("JsObject deleted: %s (page %s)", name, pageId);
            return Response.ok(Map.of("success", true)).build();
        } catch (Exception e) {
            LOG.errorf(e, "Failed to delete JsObject for page %s", pageId);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "DeleteFailed", "message", e.getMessage()))
                    .build();
        }
    }

    // --- Container Proxy Routes ---

    /**
     * Proxy chat request to container AI Proxy or external AI Agent.
     * <p>
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

            HttpResponse<InputStream> response = streamingHttpClient.send(
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
     * Get file tree.
     * - Appsmith type + current user has active checkout → proxy to container (git repo)
     * - Appsmith type + NOT checked out by current user → fetch from Appsmith API
     * - Normal type → proxy to container
     */
    @GET
    @Path("/{pageId}/container/tree")
    public Response proxyContainerTree(@PathParam("pageId") String pageId) {
        try {
            Page page = Page.findById(UUID.fromString(pageId));
            if (page != null && "appsmith".equals(page.type)
                    && page.appsmithPageId != null && !page.appsmithPageId.isBlank()) {

                // Check if current user has active checkout (container is running)
                String currentUserId = requestContext.getUserId();
                Checkout active = Checkout.findActiveByPageId(pageId);
                boolean myCheckout = active != null && active.user != null
                        && active.user.id.toString().equals(currentUserId);

                if (!myCheckout) {
                    // Not checked out by me → use Appsmith API
                    return buildAppsmithFileTree(page);
                }
                // My checkout → fall through to container proxy
            }
        } catch (Exception e) {
            LOG.warnf("Failed to check page type for tree, falling back to container: %s", e.getMessage());
        }

        // Normal type or my checkout: proxy to container File Manager
        return proxyToContainer(pageId, "GET", "/files", null, MediaType.APPLICATION_JSON);
    }

    /**
     * Build file tree for appsmith pages from Appsmith editResponse API.
     * Extracts collection names from unpublishedActionCollections.data.
     */
    private Response buildAppsmithFileTree(Page page) {
        String baseUrl = appConfig.getAppsmithApiBaseUrl();
        if (baseUrl.isBlank()) {
            return Response.status(Response.Status.BAD_GATEWAY)
                    .entity(Map.of("error", "Bad Gateway", "message", "Appsmith API base URL not configured"))
                    .build();
        }

        String editUrl = String.format(baseUrl, page.appsmithPageId, page.appsmithPageId);
        Map<String, String> headers = jsObjectTracker.buildAppsmithHeaders();

        try {
            IHttpService.Response resp = httpService.getWithStatus(editUrl, headers);
            if (!resp.isSuccess()) {
                LOG.errorf("Appsmith tree API returned HTTP %d for page %s", resp.statusCode, page.name);
                return Response.status(resp.statusCode == 401 ? Response.Status.UNAUTHORIZED : Response.Status.BAD_GATEWAY)
                        .entity(Map.of("error", "AppsmithApiError",
                                "message", resp.statusCode == 401
                                        ? "Appsmith API 认证失败，请检查系统配置中的 APPSMITH会话"
                                        : "Appsmith API 请求失败 (HTTP " + resp.statusCode + ")"))
                        .build();
            }

            // Parse unpublishedActionCollections.data[*].name
            com.fasterxml.jackson.databind.JsonNode root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(resp.body);
            com.fasterxml.jackson.databind.JsonNode collections = root.path("data").path("unpublishedActionCollections").path("data");

            List<Map<String, Object>> children = new ArrayList<>();
            if (collections.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode item : collections) {
                    String name = item.path("name").asText(null);
                    if (name != null && !name.isBlank()) {
                        children.add(new LinkedHashMap<>(Map.of(
                                "name", name + ".js",
                                "path", "jsObjects/" + name + ".js",
                                "type", "file"
                        )));
                    }
                }
            }
            // Sort by file name
            children.sort((a, b) -> String.valueOf(a.get("name")).compareToIgnoreCase(String.valueOf(b.get("name"))));

            // Build tree: jsObjects directory with children + deps directory placeholder
            List<Map<String, Object>> tree = new ArrayList<>();
            tree.add(Map.of(
                    "name", "jsObjects",
                    "path", "jsObjects",
                    "type", "directory",
                    "children", children
            ));

            // Also include deps directory from container (if available)
            try {
                Checkout checkout = Checkout.findActiveByPageId(page.id.toString());
                if (checkout != null && checkout.containerId != null) {
                    Response containerResp = proxyToContainer(page.id.toString(), "GET", "/files", null, MediaType.APPLICATION_JSON);
                    if (containerResp.getStatus() == 200) {
                        Object entity = containerResp.getEntity();
                        if (entity instanceof java.io.InputStream is) {
                            String json = new String(is.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                            com.fasterxml.jackson.databind.JsonNode containerTree = new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
                            if (containerTree.isArray()) {
                                for (com.fasterxml.jackson.databind.JsonNode node : containerTree) {
                                    if ("deps".equals(node.path("name").asText())) {
                                        tree.add(new com.fasterxml.jackson.databind.ObjectMapper().convertValue(node,
                                                new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {}));
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                LOG.debugf("Could not fetch deps from container for appsmith tree: %s", e.getMessage());
            }

            return Response.ok(tree).build();
        } catch (Exception e) {
            LOG.errorf(e, "Failed to build appsmith file tree for page %s", page.name);
            return Response.status(Response.Status.BAD_GATEWAY)
                    .entity(Map.of("error", "AppsmithApiError", "message", "获取文件列表失败: " + e.getMessage()))
                    .build();
        }
    }

    // --- Private helpers ---

    /**
     * Read ALL jsObject files from the container's jsObjects/ directory.
     * Returns every file's content so that redux-node-service can do its own
     * body comparison (biz/update/js-action returns edit=false for unchanged files).
     *
     * This approach avoids relying on git diff status parsing, which fails
     * for combined rename+modify operations (git status 'R' is neither 'M' nor 'A').
     *
     * @return Map of collection name (without .js extension) → file content
     */
    private Map<String, String> collectAllJsObjectContents(String containerId) {
        Map<String, String> result = new LinkedHashMap<>();
        try {
            String script =
                    "for f in /workspace/jsObjects/*.js; do " +
                    "  [ -f \"$f\" ] || continue; " +
                    "  echo '===JS_FILE_BEGIN==='; " +
                    "  echo \"NAME:$(basename \"$f\" .js)\"; " +
                    "  echo 'CONTENT_BEGIN'; " +
                    "  cat \"$f\"; " +
                    "  echo; echo 'CONTENT_END'; " +
                    "done";

            DockerService.ExecResult execResult = dockerService.execInContainerFull(containerId,
                    "sh", "-c", script);

            if (execResult.exitCode() == 0 && !execResult.stdout().isBlank()) {
                String[] blocks = execResult.stdout().split("===JS_FILE_BEGIN===");
                for (String block : blocks) {
                    if (block.isBlank()) continue;
                    String[] lines = block.split("\n");
                    String collectionName = "";
                    StringBuilder content = new StringBuilder();
                    boolean inContent = false;

                    for (String line : lines) {
                        if (line.startsWith("NAME:")) {
                            collectionName = line.substring(5).trim();
                        } else if (line.equals("CONTENT_BEGIN")) {
                            inContent = true;
                        } else if (line.equals("CONTENT_END")) {
                            inContent = false;
                        } else if (inContent) {
                            if (content.length() > 0) content.append("\n");
                            content.append(line);
                        }
                    }

                    if (!collectionName.isEmpty()) {
                        result.put(collectionName, content.toString());
                    }
                }
            }
        } catch (Exception e) {
            LOG.warnf("Checkin: failed to read jsObject contents: %s", e.getMessage());
        }
        return result;
    }

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

            HttpResponse<InputStream> response = streamingHttpClient.send(
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
