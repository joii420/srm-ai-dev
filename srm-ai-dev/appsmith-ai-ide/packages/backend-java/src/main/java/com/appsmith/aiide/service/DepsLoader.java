package com.appsmith.aiide.service;

import com.appsmith.aiide.entity.Checkout;
import com.appsmith.aiide.entity.Dependency;
import com.appsmith.aiide.http.IHttpService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Loads external dependency scripts into running containers.
 * Dependencies are fetched from their configured URL and written into
 * the container's /deps/ directory via the File Manager API.
 */
@ApplicationScoped
public class DepsLoader {

    private static final Logger LOG = Logger.getLogger(DepsLoader.class);

    @Inject
    IHttpService httpService;

    @Inject
    DockerService dockerService;

    /**
     * Loads all configured dependencies into a container.
     *
     * @param containerId the Docker container ID
     * @param containerIp the container's bridge network IP
     */
    public void loadDepsIntoContainer(String containerId, String containerIp) {
        LOG.infof("Loading dependencies into container %s (ip=%s)", containerId, containerIp);

        List<Dependency> deps = Dependency.listAll();
        for (Dependency dep : deps) {
            try {
                String content = fetchDependencyContent(dep);
                if (content != null) {
                    writeDependencyToContainer(containerIp, dep.namespace, content);
                    LOG.infof("DepsLoader: wrote %s.js (%d chars) into container %s",
                            dep.namespace, content.length(), containerId);
                }
            } catch (Exception e) {
                LOG.warnf("Failed to load dependency %s into container %s: %s",
                        dep.namespace, containerId, e.getMessage());
            }
        }

        LOG.infof("Finished loading %d dependencies into container %s", deps.size(), containerId);
    }

    /**
     * Re-fetches a single dependency and updates all active containers.
     *
     * @param depId the dependency UUID
     */
    @Transactional
    public void refreshDep(UUID depId) {
        Dependency dep = Dependency.findById(depId);
        if (dep == null) {
            LOG.warnf("Dependency not found: %s", depId);
            return;
        }

        LOG.infof("Refreshing dependency: %s (%s)", dep.namespace, dep.url);
        String content = fetchDependencyContent(dep);
        if (content == null) {
            LOG.warnf("Could not fetch content for dependency: %s", dep.namespace);
            return;
        }

        dep.lastLoaded = OffsetDateTime.now();

        List<Checkout> activeCheckouts = Checkout.list("status", "active");
        for (Checkout checkout : activeCheckouts) {
            try {
                DockerService.ContainerEndpoints endpoints = dockerService.getContainerEndpoints(checkout.containerId);
                writeDependencyToContainer(endpoints.fileManager(), dep.namespace, content);
                notifyContainerRefresh(endpoints.aiProxy());
                LOG.infof("DepsLoader: refreshed dep %s in container %s", dep.namespace, checkout.containerId);
            } catch (Exception e) {
                LOG.warnf("DepsLoader: failed to refresh dep %s in container %s: %s",
                        dep.namespace, checkout.containerId, e.getMessage());
            }
        }
    }

    /**
     * Refreshes all dependencies in all active containers.
     */
    public void refreshAllDeps() {
        LOG.info("Refreshing all dependencies");
        List<Dependency> deps = Dependency.listAll();
        for (Dependency dep : deps) {
            refreshDep(dep.id);
        }
    }

    /**
     * Fetches the content of a dependency from its URL.
     */
    private String fetchDependencyContent(Dependency dep) {
        if (dep.url == null || dep.url.isBlank()) {
            LOG.infof("DepsLoader: no URL configured for dependency: %s, skipping", dep.namespace);
            return null;
        }

        LOG.infof("DepsLoader: >>> GET %s (namespace=%s)", dep.url, dep.namespace);
        try {
            IHttpService.Response response = httpService.getWithStatus(dep.url);
            if (response.statusCode == 200) {
                int len = response.body != null ? response.body.length() : 0;
                LOG.infof("DepsLoader: <<< GET %s HTTP %d, content length=%d",
                        dep.url, response.statusCode, len);
                return response.body;
            }
            LOG.warnf("DepsLoader: <<< GET %s HTTP %d, response: %s",
                    dep.url, response.statusCode,
                    response.body != null && response.body.length() > 200
                            ? response.body.substring(0, 200) + "...[truncated]" : response.body);
            return null;
        } catch (Exception e) {
            LOG.errorf("DepsLoader: <<< GET %s failed: %s", dep.url, e.getMessage());
            return null;
        }
    }

    /**
     * Writes dependency content to a container via the File Manager API.
     */
    private void writeDependencyToContainer(String fileManagerAddr, String namespace, String content) {
        try {
            // File Manager API: POST /files/{path} with body {"content": "..."}
            String filePath = "deps/" + namespace + ".js";
            String fileManagerUrl = "http://" + fileManagerAddr + "/files/" + filePath;
            String jsonBody = String.format("{\"content\":%s}", escapeJson(content));

            LOG.infof("DepsLoader: >>> POST %s", fileManagerUrl);
            IHttpService.Response response = httpService.postJsonWithStatus(fileManagerUrl, jsonBody);
            if (response.statusCode != 200 && response.statusCode != 201) {
                LOG.warnf("DepsLoader: <<< POST %s HTTP %d, write failed: %s",
                        fileManagerUrl, response.statusCode, response.body);
            } else {
                LOG.infof("DepsLoader: <<< POST %s HTTP %d, write ok", fileManagerUrl, response.statusCode);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to write dependency to container: " + e.getMessage(), e);
        }
    }

    /**
     * Notifies a container to refresh its context after dependency update.
     */
    private void notifyContainerRefresh(String containerIp) {
        try {
            httpService.post("http://" + containerIp + "/api/context/refresh", null);
        } catch (Exception e) {
            LOG.warnf("Failed to notify container refresh at %s: %s", containerIp, e.getMessage());
        }
    }

    /**
     * Escapes and wraps a string as a JSON string value: xxx → "xxx"
     */
    private String escapeJson(String value) {
        if (value == null) return "null";
        return com.appsmith.aiide.util.JsonUtil.wrapJsonString(value);
    }
}
