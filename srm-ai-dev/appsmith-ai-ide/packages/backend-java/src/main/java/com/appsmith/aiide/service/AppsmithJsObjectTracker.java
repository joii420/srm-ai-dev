package com.appsmith.aiide.service;

import com.appsmith.aiide.config.AppConfig;
import com.appsmith.aiide.http.IHttpService;
import com.appsmith.aiide.http.RequestIpUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks Appsmith JsObject collection objects per container session.
 * <p>
 * During checkout sync, stores the full collection objects and editResponse.
 * During file operations (rename/create/delete), records pending API calls.
 * During checkin, executes pending operations and syncs content changes.
 */
@ApplicationScoped
public class AppsmithJsObjectTracker {

    private static final Logger LOG = Logger.getLogger(AppsmithJsObjectTracker.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    /** Long-timeout HttpClient for redux-node-service calls (biz/init can take up to 120s) */
    private static final Duration REDUX_REQUEST_TIMEOUT = Duration.ofSeconds(130);
    private final HttpClient longTimeoutClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Inject
    AppConfig appConfig;

    @Inject
    IHttpService httpService;
    @Inject
    RoutingContext ctx;

    /**
     * Per-container tracking state.
     */
    public static class ContainerState {
        /**
         * Full editResponse JSON string
         */
        public String editResponseJson;
        /**
         * appsmithEditUrl for re-fetching editResponse
         */
        public String appsmithEditUrl;
        /**
         * appsmith pageId (the appsmith internal page id)
         */
        public String appsmithPageId;
        /**
         * Collection name → full collection JSON object
         */
        public final Map<String, JsonNode> collectionsByName = new LinkedHashMap<>();
        /**
         * Pending operations to execute during checkin
         */
        public final List<PendingOperation> pendingOperations = new ArrayList<>();
        /**
         * Whether structural changes (rename/create/delete) have been made
         */
        public boolean hasStructuralChanges = false;

        // Common fields extracted from editResponse
        public String layoutId;
        public String pageId;        // appsmith internal pageId
        public String applicationId;
        public String workspaceId;
        public String pluginId;
    }

    /**
     * A pending Appsmith API operation to execute during checkin.
     */
    public static class PendingOperation {
        public enum Type {RENAME, CREATE, DELETE}

        public final Type type;
        public final String method;
        public final String url;
        public final String body;

        public PendingOperation(Type type, String method, String url, String body) {
            this.type = type;
            this.method = method;
            this.url = url;
            this.body = body;
        }

        @Override
        public String toString() {
            return type + " " + method + " " + url;
        }
    }

    /**
     * Container ID → tracking state
     */
    private final ConcurrentHashMap<String, ContainerState> containerStates = new ConcurrentHashMap<>();

    /**
     * Initialize tracking for a container after checkout sync.
     *
     * @param containerId      Docker container ID
     * @param editResponseJson full editResponse JSON
     * @param appsmithEditUrl  the edit URL for re-fetching
     * @param appsmithPageId   the appsmith internal page ID
     */
    public void initContainer(String containerId, String editResponseJson,
                              String appsmithEditUrl, String appsmithPageId) {
        ContainerState state = new ContainerState();
        state.editResponseJson = editResponseJson;
        state.appsmithEditUrl = appsmithEditUrl;
        state.appsmithPageId = appsmithPageId;

        try {
            JsonNode root = objectMapper.readTree(editResponseJson);
            JsonNode collections = root.path("data").path("unpublishedActionCollections").path("data");

            if (collections.isArray()) {
                for (JsonNode item : collections) {
                    String name = item.path("name").asText(null);
                    if (name != null && !name.isBlank()) {
                        state.collectionsByName.put(name, item);
                    }
                }
            }

            // Extract common fields from the first collection or from page data
            if (!state.collectionsByName.isEmpty()) {
                JsonNode firstCollection = state.collectionsByName.values().iterator().next();
                state.applicationId = firstCollection.path("applicationId").asText(null);
                state.workspaceId = firstCollection.path("workspaceId").asText(null);
                state.pluginId = firstCollection.path("pluginId").asText(null);
                state.pageId = firstCollection.path("pageId").asText(null);
            }

            // Extract layoutId from page data
            // Path: data.pages.data[*].layouts[*].id  (find the page matching appsmithPageId)
            // Or: data.pageWithMigratedDsl.data.layouts[0].id
            JsonNode pageWithDsl = root.path("data").path("pageWithMigratedDsl").path("data");
            if (!pageWithDsl.isMissingNode()) {
                JsonNode layouts = pageWithDsl.path("layouts");
                if (layouts.isArray() && layouts.size() > 0) {
                    state.layoutId = layouts.get(0).path("id").asText(null);
                }
                // Also try to get pageId from here if not found
                if (state.pageId == null) {
                    state.pageId = pageWithDsl.path("id").asText(null);
                }
            }

            // Fallback: try pages data
            if (state.layoutId == null) {
                JsonNode pagesData = root.path("data").path("pages").path("data");
                if (pagesData.isArray()) {
                    for (JsonNode page : pagesData) {
                        String pid = page.path("id").asText("");
                        if (pid.equals(appsmithPageId) || pagesData.size() == 1) {
                            JsonNode layouts = page.path("layouts");
                            if (layouts.isArray() && layouts.size() > 0) {
                                state.layoutId = layouts.get(0).path("id").asText(null);
                            }
                            break;
                        }
                    }
                }
            }

            // Use appsmithPageId as fallback pageId
            if (state.pageId == null) {
                state.pageId = appsmithPageId;
            }

            LOG.infof("JsObjectTracker: initialized container %s with %d collections, layoutId=%s, pageId=%s",
                    containerId, state.collectionsByName.size(), state.layoutId, state.pageId);
        } catch (Exception e) {
            LOG.errorf(e, "JsObjectTracker: failed to parse editResponse for container %s", containerId);
        }

        containerStates.put(containerId, state);
    }

    /**
     * Get tracking state for a container. Returns null if not tracked.
     */
    public ContainerState getState(String containerId) {
        return containerStates.get(containerId);
    }

    /**
     * Record a rename operation.
     */
    public void recordRename(String containerId, String oldName, String newName) {
        ContainerState state = containerStates.get(containerId);
        if (state == null) {
            LOG.warnf("JsObjectTracker: no state for container %s, cannot record rename", containerId);
            return;
        }

        JsonNode collection = state.collectionsByName.get(oldName);
        if (collection == null) {
            LOG.warnf("JsObjectTracker: collection '%s' not found for rename", oldName);
            return;
        }

        String collectionId = collection.path("id").asText("");
        String appsmithBaseUrl = getAppsmithBaseUrl();

        String body = String.format(
                "{\"layoutId\":\"%s\",\"actionCollectionId\":\"%s\",\"pageId\":\"%s\",\"oldName\":\"%s\",\"newName\":\"%s\"}",
                escapeJson(state.layoutId != null ? state.layoutId : ""),
                escapeJson(collectionId),
                escapeJson(state.pageId != null ? state.pageId : ""),
                escapeJson(oldName),
                escapeJson(newName)
        );

        PendingOperation op = new PendingOperation(
                PendingOperation.Type.RENAME,
                "PUT",
                appsmithBaseUrl + "/api/v1/collections/actions/refactor",
                body
        );

        state.pendingOperations.add(op);
        state.hasStructuralChanges = true;

        // Update internal mapping: move collection from oldName to newName
        state.collectionsByName.remove(oldName);
        state.collectionsByName.put(newName, collection);

        LOG.infof("JsObjectTracker: recorded rename %s -> %s (container %s)", oldName, newName, containerId);
    }

    /**
     * Record a create operation.
     */
    public void recordCreate(String containerId, String name) {
        ContainerState state = containerStates.get(containerId);
        if (state == null) {
            LOG.warnf("JsObjectTracker: no state for container %s, cannot record create", containerId);
            return;
        }

        String appsmithBaseUrl = getAppsmithBaseUrl();

        // Default JS object body template
        String defaultBody = "export default {\n\tmyVar1: [],\n\tmyVar2: {},\n\tmyFun1 () {\n\t\t//\twrite code here\n\t\t//\tthis.myVar1 = [1,2,3]\n\t},\n\tasync myFun2 () {\n\t\t//\tuse async-await or promises\n\t\t//\tawait storeValue('varName', 'hello world')\n\t}\n}";

        String body = String.format(
                "{\"name\":\"%s\",\"workspaceId\":\"%s\",\"pluginId\":\"%s\"," +
                        "\"body\":\"%s\"," +
                        "\"variables\":[{\"name\":\"myVar1\",\"value\":\"[]\"},{\"name\":\"myVar2\",\"value\":\"{}\"}]," +
                        "\"actions\":[" +
                        "{\"name\":\"myFun1\",\"workspaceId\":\"%s\",\"executeOnLoad\":false," +
                        "\"actionConfiguration\":{\"body\":\"function () {}\",\"timeoutInMillisecond\":0,\"jsArguments\":[]}," +
                        "\"clientSideExecution\":true,\"pageId\":\"%s\"}," +
                        "{\"name\":\"myFun2\",\"workspaceId\":\"%s\",\"executeOnLoad\":false," +
                        "\"actionConfiguration\":{\"body\":\"async function () {}\",\"timeoutInMillisecond\":0,\"jsArguments\":[]}," +
                        "\"clientSideExecution\":true,\"pageId\":\"%s\"}" +
                        "]," +
                        "\"pluginType\":\"JS\",\"pageId\":\"%s\",\"applicationId\":\"%s\"}",
                escapeJson(name),
                escapeJson(state.workspaceId != null ? state.workspaceId : ""),
                escapeJson(state.pluginId != null ? state.pluginId : ""),
                escapeJson(defaultBody),
                escapeJson(state.workspaceId != null ? state.workspaceId : ""),
                escapeJson(state.pageId != null ? state.pageId : ""),
                escapeJson(state.workspaceId != null ? state.workspaceId : ""),
                escapeJson(state.pageId != null ? state.pageId : ""),
                escapeJson(state.pageId != null ? state.pageId : ""),
                escapeJson(state.applicationId != null ? state.applicationId : "")
        );

        PendingOperation op = new PendingOperation(
                PendingOperation.Type.CREATE,
                "POST",
                appsmithBaseUrl + "/api/v1/collections/actions",
                body
        );

        state.pendingOperations.add(op);
        state.hasStructuralChanges = true;

        LOG.infof("JsObjectTracker: recorded create '%s' (container %s)", name, containerId);
    }

    /**
     * Record a delete operation.
     */
    public void recordDelete(String containerId, String name) {
        ContainerState state = containerStates.get(containerId);
        if (state == null) {
            LOG.warnf("JsObjectTracker: no state for container %s, cannot record delete", containerId);
            return;
        }

        JsonNode collection = state.collectionsByName.get(name);
        if (collection == null) {
            LOG.warnf("JsObjectTracker: collection '%s' not found for delete", name);
            return;
        }

        String collectionId = collection.path("id").asText("");
        String appsmithBaseUrl = getAppsmithBaseUrl();

        PendingOperation op = new PendingOperation(
                PendingOperation.Type.DELETE,
                "DELETE",
                appsmithBaseUrl + "/api/v1/collections/actions/" + collectionId,
                null
        );

        state.pendingOperations.add(op);
        state.hasStructuralChanges = true;

        // Remove from internal mapping
        state.collectionsByName.remove(name);

        LOG.infof("JsObjectTracker: recorded delete '%s' collectionId=%s (container %s)", name, collectionId, containerId);
    }

    /**
     * Execute all pending operations (rename/create/delete) by calling Appsmith APIs.
     *
     * @return null if all succeeded, or error message describing the first failure
     */
    public String executePendingOperations(String containerId) {
        ContainerState state = containerStates.get(containerId);
        if (state == null || state.pendingOperations.isEmpty()) {
            LOG.info("JsObjectTracker: no pending operations for container " + containerId);
            return null;
        }

        LOG.infof("JsObjectTracker: executing %d pending operations for container %s",
                state.pendingOperations.size(), containerId);

        Map<String, String> headers = buildAppsmithHeaders();
        String firstError = null;

        for (PendingOperation op : state.pendingOperations) {
            try {
                // Log request body without file content (truncate "body" field value)
                LOG.infof("JsObjectTracker: executing %s, request: %s", op, truncateBodyField(op.body));

                IHttpService.Response resp;
                switch (op.method) {
                    case "PUT" -> resp = putWithStatus(op.url, op.body, headers);
                    case "POST" -> resp = httpService.postJsonWithStatus(op.url, op.body, headers);
                    case "DELETE" -> {
                        String responseBody = httpService.delete(op.url, headers);
                        resp = new IHttpService.Response(200, responseBody);
                    }
                    default -> throw new IllegalArgumentException("Unsupported method: " + op.method);
                }

                if (resp.isSuccess()) {
                    LOG.infof("JsObjectTracker: %s succeeded (HTTP %d)", op, resp.statusCode);
                } else {
                    String errMsg = String.format("Appsmith API %s failed (HTTP %d): %s", op, resp.statusCode, resp.body);
                    LOG.errorf("JsObjectTracker: %s", errMsg);
                    if (firstError == null) firstError = errMsg;
                }
            } catch (Exception e) {
                String errMsg = String.format("Appsmith API %s exception: %s", op, e.getMessage());
                LOG.errorf(e, "JsObjectTracker: %s", errMsg);
                if (firstError == null) firstError = errMsg;
            }
        }

        state.pendingOperations.clear();
        return firstError;
    }

    /**
     * Sync content changes for files that had their body modified (not just renamed).
     * Uses redux-node-service sessions to process changes.
     *
     * @param containerId         Docker container ID
     * @param changedFiles        Map of collection name → new body content
     * @param reduxNodeServiceUrl full base URL of the redux-node-service (e.g. "http://localhost:3200")
     * @return null if all succeeded, or error message describing the failure
     */
    public String syncContentChanges(String containerId, Map<String, String> changedFiles, String reduxNodeServiceUrl) {
        if (changedFiles == null || changedFiles.isEmpty()) {
            LOG.info("JsObjectTracker: no content changes to sync");
            return null;
        }

        ContainerState state = containerStates.get(containerId);
        if (state == null) {
            String err = "JsObjectTracker: no state for container " + containerId + ", cannot sync content";
            LOG.warn(err);
            return err;
        }

        if (reduxNodeServiceUrl == null || reduxNodeServiceUrl.isBlank()) {
            String err = "redux-node-service URL is not configured, cannot sync content";
            LOG.warn("JsObjectTracker: " + err);
            return err;
        }

        // Step 1: If structural changes were made, re-fetch editResponse
        if (state.hasStructuralChanges) {
            LOG.info("JsObjectTracker: structural changes detected, re-fetching editResponse");
            try {
                String freshEditResponse = fetchEditResponse(state.appsmithEditUrl);
                if (freshEditResponse != null) {
                    state.editResponseJson = freshEditResponse;
                    JsonNode root = objectMapper.readTree(freshEditResponse);
                    JsonNode collections = root.path("data").path("unpublishedActionCollections").path("data");
                    state.collectionsByName.clear();
                    if (collections.isArray()) {
                        for (JsonNode item : collections) {
                            String name = item.path("name").asText(null);
                            if (name != null && !name.isBlank()) {
                                state.collectionsByName.put(name, item);
                            }
                        }
                    }
                    LOG.infof("JsObjectTracker: re-fetched editResponse, %d collections", state.collectionsByName.size());
                }
            } catch (Exception e) {
                LOG.errorf(e, "JsObjectTracker: failed to re-fetch editResponse");
            }
        }

        String reduxBaseUrl = reduxNodeServiceUrl;
        String sessionId = null;
        String firstError = null;

        try {
            // Step 2: POST /sessions to create a new session (use long-timeout client)
            String createSessionBody = "{\"authToken\":\"your-jwt-token\",\"backendUrl\":\"http://appsmith:8080\"}";
            LOG.info("JsObjectTracker: creating redux-node-service session");
            IHttpService.Response createResp = reduxPost(reduxBaseUrl + "/sessions", createSessionBody);

            if (!createResp.isSuccess()) {
                String err = String.format("Failed to create redux-node-service session (HTTP %d): %s",
                        createResp.statusCode, createResp.body);
                LOG.errorf("JsObjectTracker: %s", err);
                return err;
            }

            JsonNode createResult = objectMapper.readTree(createResp.body);
            if (!createResult.path("success").asBoolean(false)) {
                String err = "Create session returned success=false: " + createResp.body;
                LOG.errorf("JsObjectTracker: %s", err);
                return err;
            }

            sessionId = createResult.path("result").path("sessionId").asText(null);
            if (sessionId == null) {
                String err = "Create session response missing sessionId: " + createResp.body;
                LOG.errorf("JsObjectTracker: %s", err);
                return err;
            }

            LOG.infof("JsObjectTracker: created redux-node-service session %s", sessionId);

            // Step 3: POST /sessions/:id/biz/init
            String initBody;
            try {
                ObjectNode initObj = objectMapper.createObjectNode();
                initObj.put("pageId", state.pageId != null ? state.pageId : state.appsmithPageId);
                initObj.set("pageContext", objectMapper.readTree(state.editResponseJson));
                initBody = objectMapper.writeValueAsString(initObj);
            } catch (Exception e) {
                LOG.errorf(e, "JsObjectTracker: failed to build init body");
                return "Failed to build init body: " + e.getMessage();
            }

            LOG.infof("JsObjectTracker: POST biz/init, pageId=%s (timeout=%ds)", state.pageId, REDUX_REQUEST_TIMEOUT.toSeconds());
            IHttpService.Response initResp = reduxPost(
                    reduxBaseUrl + "/sessions/" + sessionId + "/biz/init", initBody);
            if (!initResp.isSuccess()) {
                String err = String.format("biz/init failed (HTTP %d): %s", initResp.statusCode, initResp.body);
                LOG.errorf("JsObjectTracker: %s", err);
                return err;
            }

            JsonNode initResult = objectMapper.readTree(initResp.body);
            if (!initResult.path("success").asBoolean(false)) {
                String err = "biz/init returned success=false: " + initResp.body;
                LOG.errorf("JsObjectTracker: %s", err);
                return err;
            }

            LOG.info("JsObjectTracker: biz/init succeeded");

            // Step 4: For each changed file, POST /sessions/:id/biz/update/js-action
            Map<String, String> appsmithHeaders = buildAppsmithHeaders();

            for (Map.Entry<String, String> entry : changedFiles.entrySet()) {
                String collectionName = entry.getKey();
                String newBody = entry.getValue();

                JsonNode collection = state.collectionsByName.get(collectionName);
                if (collection == null) {
                    LOG.warnf("JsObjectTracker: collection '%s' not found, skipping content sync", collectionName);
                    continue;
                }

                String collectionId = collection.path("id").asText("");
                LOG.infof("JsObjectTracker: updating js-action '%s' (id=%s), body length=%d",
                        collectionName, collectionId, newBody.length());

                String updateBody = String.format("{\"id\":\"%s\",\"body\":\"%s\"}",
                        escapeJson(collectionId), escapeJson(newBody));

                try {
                    IHttpService.Response updateResp = reduxPost(
                            reduxBaseUrl + "/sessions/" + sessionId + "/biz/update/js-action", updateBody);

                    if (!updateResp.isSuccess()) {
                        String err = String.format("update/js-action failed for '%s' (HTTP %d): %s",
                                collectionName, updateResp.statusCode, updateResp.body);
                        LOG.errorf("JsObjectTracker: %s", err);
                        if (firstError == null) firstError = err;
                        continue;
                    }

                    JsonNode updateResult = objectMapper.readTree(updateResp.body);
                    boolean success = updateResult.path("success").asBoolean(false);
                    boolean edit = updateResult.path("result").path("edit").asBoolean(false);
                    JsonNode httpActions = updateResult.path("result").path("httpActions");

                    if (success && edit && httpActions.isArray() && httpActions.size() > 0) {
                        LOG.infof("JsObjectTracker: '%s' has %d httpActions to execute", collectionName, httpActions.size());

                        String appsmithBaseUrl = getAppsmithBaseUrl();

                        // 4.1 Call PUT /api/v1/collections/actions/{collectionId}/body to update full content
                        String contentUpdateUrl = appsmithBaseUrl + "/api/v1/collections/actions/" + collectionId + "/body";
                        String contentUpdateBody = String.format("{\"body\":\"%s\"}", escapeJson(newBody));
                        LOG.infof("JsObjectTracker: 4.1 updating collection body: PUT %s, body length=%d",
                                contentUpdateUrl, newBody.length());
                        try {
                            IHttpService.Response contentResp = putWithStatus(contentUpdateUrl, contentUpdateBody, appsmithHeaders);
                            if (contentResp.isSuccess()) {
                                LOG.infof("JsObjectTracker: 4.1 collection body update succeeded for '%s'", collectionName);
                            } else {
                                String err = String.format("4.1 collection body update failed for '%s' (HTTP %d): %s",
                                        collectionName, contentResp.statusCode, contentResp.body);
                                LOG.errorf("JsObjectTracker: %s", err);
                                if (firstError == null) firstError = err;
                            }
                        } catch (Exception e) {
                            String err = String.format("4.1 collection body update exception for '%s': %s", collectionName, e.getMessage());
                            LOG.errorf(e, "JsObjectTracker: %s", err);
                            if (firstError == null) firstError = err;
                        }

                        // 4.2 Execute each httpAction from redux-node-service response
                        for (JsonNode action : httpActions) {
                            String actionMethod = action.path("method").asText("POST");
                            String actionUrl = appsmithBaseUrl + "/api/" + action.path("url").asText("");
                            String actionBody = action.has("body") ? objectMapper.writeValueAsString(action.path("body")) : null;

                            LOG.infof("JsObjectTracker: httpAction %s %s, request: %s",
                                    actionMethod, actionUrl, truncateBodyField(actionBody));

                            try {
                                IHttpService.Response actionResp;
                                switch (actionMethod.toUpperCase()) {
                                    case "PUT" -> actionResp = putWithStatus(actionUrl, actionBody, appsmithHeaders);
                                    case "POST" ->
                                            actionResp = httpService.postJsonWithStatus(actionUrl, actionBody, appsmithHeaders);
                                    case "DELETE" -> {
                                        String delBody = httpService.delete(actionUrl, appsmithHeaders);
                                        actionResp = new IHttpService.Response(200, delBody);
                                    }
                                    default -> {
                                        String getBody = httpService.get(actionUrl, appsmithHeaders);
                                        actionResp = new IHttpService.Response(200, getBody);
                                    }
                                }

                                if (actionResp.isSuccess()) {
                                    LOG.infof("JsObjectTracker: httpAction %s %s succeeded:　%s", actionMethod, actionUrl, actionResp.toString());
                                } else {
                                    String err = String.format("httpAction %s %s failed (HTTP %d): %s",
                                            actionMethod, actionUrl, actionResp.statusCode, actionResp.body);
                                    LOG.errorf("JsObjectTracker: %s", err);
                                    if (firstError == null) firstError = err;
                                }
                            } catch (Exception e) {
                                String err = String.format("httpAction %s %s exception: %s", actionMethod, actionUrl, e.getMessage());
                                LOG.errorf(e, "JsObjectTracker: %s", err);
                                if (firstError == null) firstError = err;
                            }
                        }
                    } else {
                        LOG.infof("JsObjectTracker: '%s' no content changes detected by redux-node-service", collectionName);
                    }
                } catch (Exception e) {
                    String err = String.format("Failed to update js-action for '%s': %s", collectionName, e.getMessage());
                    LOG.errorf(e, "JsObjectTracker: %s", err);
                    if (firstError == null) firstError = err;
                }
            }

            LOG.info("JsObjectTracker: content sync completed");
        } catch (Exception e) {
            String err = "Content sync failed: " + e.getMessage();
            LOG.errorf(e, "JsObjectTracker: %s", err);
            if (firstError == null) firstError = err;
        } finally {
            // Step 5: DELETE /sessions/:id — must always be called
            if (sessionId != null) {
                try {
                    reduxDelete(reduxBaseUrl + "/sessions/" + sessionId);
                    LOG.infof("JsObjectTracker: deleted redux-node-service session %s", sessionId);
                } catch (Exception e) {
                    LOG.warnf("JsObjectTracker: failed to delete session %s: %s", sessionId, e.getMessage());
                }
            }
        }
        return firstError;
    }

    /**
     * Clean up tracking state for a container.
     */
    public void cleanup(String containerId) {
        containerStates.remove(containerId);
        LOG.infof("JsObjectTracker: cleaned up container %s", containerId);
    }

    /**
     * Check if a container has tracking state.
     */
    public boolean isTracking(String containerId) {
        return containerStates.containsKey(containerId);
    }

    // --- Private helpers ---

    private String getAppsmithBaseUrl() {
        // Extract base URL from the configured appsmith-api-base-url
        // Configured as: http://test.srm.wzhf.com:9000/api/v1/consolidated-api/edit?...
        // We need: http://test.srm.wzhf.com:9000
        String fullUrl = appConfig.getAppsmithApiBaseUrl();
        if (fullUrl == null || fullUrl.isBlank()) {
            return "";
        }
        try {
            java.net.URI uri = java.net.URI.create(fullUrl.contains("%s") ? fullUrl.replace("%s", "placeholder") : fullUrl);
            int port = uri.getPort();
            return uri.getScheme() + "://" + uri.getHost() + (port > 0 ? ":" + port : "");
        } catch (Exception e) {
            LOG.warnf("JsObjectTracker: failed to parse appsmith base URL: %s", fullUrl);
            return "";
        }
    }

    private Map<String, String> buildAppsmithHeaders() {
        String session = appConfig.getAppsmithSession();
        String xsrfToken = appConfig.getAppsmithXsrfToken();

        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", "application/json");
        String clientIp = RequestIpUtils.getClientIp(ctx);
        if (clientIp.equals("127.0.0.1")) {
            clientIp = "10.177.157.9";
        }
        headers.put("X-CheckOut-Auth", clientIp + "#" + ctx.get("user"));
//        headers.put("Accept", "application/json");
        if (!session.isBlank()) {
            headers.put("Cookie", "SESSION=" + session); //+ (xsrfToken.isBlank() ? "" : "; XSRF-TOKEN=" + xsrfToken)
        }
//        if (!xsrfToken.isBlank()) {
//            headers.put("X-Xsrf-Token", xsrfToken);
//        }
        return headers;
    }

    private String fetchEditResponse(String editUrl) {
        if (editUrl == null || editUrl.isBlank()) return null;
        try {
            Map<String, String> headers = buildAppsmithHeaders();
            IHttpService.Response resp = httpService.getWithStatus(editUrl, headers);
            if (resp.isSuccess()) {
                return resp.body;
            }
            LOG.errorf("JsObjectTracker: failed to re-fetch editResponse (HTTP %d)", resp.statusCode);
        } catch (Exception e) {
            LOG.errorf(e, "JsObjectTracker: failed to re-fetch editResponse");
        }
        return null;
    }

    /**
     * PUT request with status response.
     * IHttpService.put returns String, so we wrap it.
     */
    private IHttpService.Response putWithStatus(String url, String body, Map<String, String> headers) {
        try {
            String responseBody = httpService.put(url, body, headers);
            return new IHttpService.Response(200, responseBody);
        } catch (Exception e) {
            return new IHttpService.Response(500, e.getMessage());
        }
    }

    /**
     * POST JSON to redux-node-service with long timeout (biz/init can take up to 120s).
     * Uses a dedicated HttpClient instead of the global IHttpService.
     */
    private IHttpService.Response reduxPost(String url, String json) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json;charset=UTF-8")
                    .header("Accept", "application/json")
                    .timeout(REDUX_REQUEST_TIMEOUT);
            if (json != null && !json.isEmpty()) {
                builder.POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8));
            } else {
                builder.POST(HttpRequest.BodyPublishers.noBody());
            }
            HttpResponse<String> resp = longTimeoutClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            return new IHttpService.Response(resp.statusCode(), resp.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new IHttpService.Response(500, "Interrupted: " + e.getMessage());
        } catch (IOException e) {
            return new IHttpService.Response(500, "IO error: " + e.getMessage());
        }
    }

    /**
     * DELETE to redux-node-service with long timeout.
     */
    private void reduxDelete(String url) throws IOException {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .DELETE()
                    .build();
            longTimeoutClient.send(req, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted", e);
        }
    }

    /**
     * Truncate the "body" field value in a JSON string for logging purposes.
     * Replaces the actual body content with "[...N chars]" to avoid flooding logs.
     */
    private static String truncateBodyField(String json) {
        if (json == null) return "null";
        // Find "body":"..." and truncate the value
        int bodyIdx = json.indexOf("\"body\"");
        if (bodyIdx < 0) return json;

        int colonIdx = json.indexOf(':', bodyIdx + 6);
        if (colonIdx < 0) return json;

        int valueStart = colonIdx + 1;
        while (valueStart < json.length() && json.charAt(valueStart) == ' ') valueStart++;
        if (valueStart >= json.length()) return json;

        if (json.charAt(valueStart) == '"') {
            // Find the end of the string value (handle escaped quotes)
            int valueEnd = valueStart + 1;
            while (valueEnd < json.length()) {
                if (json.charAt(valueEnd) == '\\') {
                    valueEnd += 2; // skip escaped char
                } else if (json.charAt(valueEnd) == '"') {
                    break;
                } else {
                    valueEnd++;
                }
            }
            int contentLen = valueEnd - valueStart - 1;
            return json.substring(0, valueStart) + "\"[..." + contentLen + " chars]\"" + json.substring(valueEnd + 1);
        }
        return json;
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }
}
