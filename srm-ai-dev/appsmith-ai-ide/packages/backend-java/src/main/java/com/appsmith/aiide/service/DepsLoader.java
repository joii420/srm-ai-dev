package com.appsmith.aiide.service;

import com.appsmith.aiide.entity.Checkout;
import com.appsmith.aiide.entity.Dependency;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
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

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

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
                    LOG.debugf("Loaded dep %s into container %s", dep.namespace, containerId);
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
                String containerIp = dockerService.getContainerIp(checkout.containerId);
                writeDependencyToContainer(containerIp, dep.namespace, content);
                notifyContainerRefresh(containerIp);
                LOG.debugf("Refreshed dep %s in container %s", dep.namespace, checkout.containerId);
            } catch (Exception e) {
                LOG.warnf("Failed to refresh dep %s in container %s: %s",
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
            LOG.debugf("No URL configured for dependency: %s", dep.namespace);
            return null;
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(dep.url))
                    .timeout(Duration.ofSeconds(30))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                return response.body();
            }
            LOG.warnf("Non-200 response (%d) fetching dependency %s from %s",
                    response.statusCode(), dep.namespace, dep.url);
            return null;
        } catch (Exception e) {
            LOG.warnf("Error fetching dependency %s from %s: %s", dep.namespace, dep.url, e.getMessage());
            return null;
        }
    }

    /**
     * Writes dependency content to a container via the File Manager API.
     */
    private void writeDependencyToContainer(String containerIp, String namespace, String content) {
        try {
            String fileManagerUrl = "http://" + containerIp + "/api/files/write";
            String jsonBody = String.format(
                    "{\"path\":\"/deps/%s.js\",\"content\":%s}",
                    namespace, escapeJson(content));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fileManagerUrl))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                LOG.warnf("File write failed for %s.js: HTTP %d", namespace, response.statusCode());
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
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://" + containerIp + "/api/context/refresh"))
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();
            httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            LOG.warnf("Failed to notify container refresh at %s: %s", containerIp, e.getMessage());
        }
    }

    /**
     * Escapes a string for use as a JSON string value.
     */
    private String escapeJson(String value) {
        if (value == null) return "null";
        StringBuilder sb = new StringBuilder("\"");
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        sb.append("\"");
        return sb.toString();
    }
}
