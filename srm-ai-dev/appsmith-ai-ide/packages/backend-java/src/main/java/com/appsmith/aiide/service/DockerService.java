package com.appsmith.aiide.service;

import com.appsmith.aiide.entity.SystemConfig;
import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.ExecCreateCmdResponse;
import com.github.dockerjava.api.command.InspectContainerResponse;
import com.github.dockerjava.api.exception.NotFoundException;
import com.github.dockerjava.api.model.*;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.core.command.ExecStartResultCallback;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.io.ByteArrayOutputStream;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Manages Docker containers for Appsmith AI-IDE workspaces.
 * Uses the docker-java client to create, inspect, and destroy containers.
 * Resource limits (memory, CPU) are read from SystemConfig at runtime.
 */
@ApplicationScoped
public class DockerService {

    private static final Logger LOG = Logger.getLogger(DockerService.class);

    private DockerClient dockerClient;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @PostConstruct
    void init() {
        DefaultDockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder().build();
        ApacheDockerHttpClient httpClientDocker = new ApacheDockerHttpClient.Builder()
                .dockerHost(config.getDockerHost())
                .sslConfig(config.getSSLConfig())
                .maxConnections(100)
                .connectionTimeout(Duration.ofSeconds(30))
                .responseTimeout(Duration.ofSeconds(45))
                .build();
        this.dockerClient = DockerClientImpl.getInstance(config, httpClientDocker);
        LOG.info("DockerClient initialized");
    }

    /**
     * Configuration record for container creation.
     */
    public record ContainerConfig(
            String imageName,
            long memoryLimit,
            double cpuLimit,
            List<String> env,
            Map<String, String> tmpfsMounts,
            List<Integer> exposePorts
    ) {
    }

    /**
     * Creates and starts a container with the given configuration.
     *
     * @param config container configuration
     * @return the container ID
     */
    public String createContainer(ContainerConfig config) {
        LOG.infof("Creating container with image=%s", config.imageName());

        ExposedPort[] exposed = config.exposePorts().stream()
                .map(ExposedPort::tcp)
                .toArray(ExposedPort[]::new);

        Ports portBindings = new Ports();
        for (int port : config.exposePorts()) {
            portBindings.bind(ExposedPort.tcp(port), Ports.Binding.empty());
        }

        HostConfig hostConfig = HostConfig.newHostConfig()
                .withMemory(config.memoryLimit())
                .withNanoCPUs((long) (config.cpuLimit() * 1_000_000_000L))
                .withPortBindings(portBindings)
                .withTmpFs(config.tmpfsMounts());

        // Print equivalent docker run command for debugging
        StringBuilder cmd = new StringBuilder("docker run -d");
        cmd.append(String.format(" --memory=%dm", config.memoryLimit() / 1_048_576L));
        cmd.append(String.format(" --cpus=%.1f", config.cpuLimit()));
        for (int port : config.exposePorts()) {
            cmd.append(String.format(" -p %d", port));
        }
        for (String env : config.env()) {
            cmd.append(String.format(" -e \"%s\"", env));
        }
        config.tmpfsMounts().forEach((mount, opts) ->
                cmd.append(String.format(" --tmpfs %s:%s", mount, opts)));
        cmd.append(" ").append(config.imageName());
        LOG.infof("Equivalent docker command:\n%s", cmd);

        CreateContainerResponse response = dockerClient.createContainerCmd(config.imageName())
                .withExposedPorts(exposed)
                .withHostConfig(hostConfig)
                .withEnv(config.env())
                .exec();

        String containerId = response.getId();
        LOG.infof("Container created: %s, starting...", containerId);

        dockerClient.startContainerCmd(containerId).exec();
        LOG.infof("Container started: %s", containerId);

        return containerId;
    }

    /**
     * Stops and removes a container.
     *
     * @param containerId the container to destroy
     */
    public void destroyContainer(String containerId) {
        LOG.infof("Destroying container: %s", containerId);
        try {
            dockerClient.stopContainerCmd(containerId).withTimeout(10).exec();
        } catch (NotFoundException e) {
            LOG.warnf("Container %s not found during stop, may already be stopped", containerId);
        } catch (Exception e) {
            LOG.warnf("Error stopping container %s: %s", containerId, e.getMessage());
        }
        try {
            dockerClient.removeContainerCmd(containerId).withForce(true).exec();
            LOG.infof("Container removed: %s", containerId);
        } catch (NotFoundException e) {
            LOG.warnf("Container %s not found during removal", containerId);
        }
    }

    /**
     * Execute a command inside a running container (like `docker exec`).
     *
     * @param containerId the container to exec in
     * @param cmd         the command and arguments
     * @return the combined stdout + stderr output
     */
    /**
     * Result of a docker exec command, including exit code and both streams.
     */
    public record ExecResult(int exitCode, String stdout, String stderr) {
        public String combined() {
            return (stdout + "\n" + stderr).trim();
        }
    }

    /**
     * Execute a command inside a running container (like `docker exec`).
     * Returns combined stdout + stderr. Throws on non-zero exit code.
     */
    public String execInContainer(String containerId, String... cmd) {
        ExecResult result = execInContainerFull(containerId, cmd);
        if (result.exitCode() != 0) {
            throw new RuntimeException("docker exec failed (exit=" + result.exitCode() + "): " + result.combined());
        }
        return result.combined();
    }

    /**
     * Execute a command inside a running container and return full result
     * including exit code, stdout, and stderr (does NOT throw on non-zero exit).
     */
    public ExecResult execInContainerFull(String containerId, String... cmd) {
        LOG.infof("docker exec %s %s", containerId.substring(0, 12), String.join(" ", cmd));
        try {
            ExecCreateCmdResponse exec = dockerClient.execCreateCmd(containerId)
                    .withAttachStdout(true)
                    .withAttachStderr(true)
                    .withCmd(cmd)
                    .exec();

            ByteArrayOutputStream stdout = new ByteArrayOutputStream();
            ByteArrayOutputStream stderr = new ByteArrayOutputStream();

            dockerClient.execStartCmd(exec.getId())
                    .exec(new ExecStartResultCallback(stdout, stderr))
                    .awaitCompletion(120, java.util.concurrent.TimeUnit.SECONDS);

            // Get exit code
            int exitCode = dockerClient.inspectExecCmd(exec.getId()).exec().getExitCodeLong().intValue();

            String out = stdout.toString();
            String err = stderr.toString();

            LOG.infof("docker exec exit=%d stdout=[%s] stderr=[%s]", exitCode,
                    out.length() > 200 ? out.substring(0, 200) + "..." : out,
                    err.length() > 200 ? err.substring(0, 200) + "..." : err);

            return new ExecResult(exitCode, out, err);
        } catch (Exception e) {
            throw new RuntimeException("docker exec failed in " + containerId + ": " + e.getMessage(), e);
        }
    }

    /**
     * Returns the status of a container: "running", "stopped", or "not_found".
     */
    public String getContainerStatus(String containerId) {
        try {
            InspectContainerResponse info = dockerClient.inspectContainerCmd(containerId).exec();
            InspectContainerResponse.ContainerState state = info.getState();
            if (state != null && Boolean.TRUE.equals(state.getRunning())) {
                return "running";
            }
            return "stopped";
        } catch (NotFoundException e) {
            return "not_found";
        }
    }

    /**
     * Checks container health by calling GET http://{containerIp}/api/health.
     *
     * @param containerId the container to check
     * @return true if the health endpoint returns HTTP 200
     */
    public boolean healthCheck(String containerId) {
        try {
            String aiProxyAddr = getContainerEndpoints(containerId).aiProxy();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://" + aiProxyAddr + "/api/health"))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            LOG.debugf("Health check failed for container %s: %s", containerId, e.getMessage());
            return false;
        }
    }

    /**
     * Container endpoint holder: host addresses for AI Proxy (3000) and File Manager (3001).
     */
    public record ContainerEndpoints(String aiProxy, String fileManager) {
    }

    /**
     * Resolve container endpoints (host:port for each internal service).
     * On Windows: uses localhost + mapped host ports.
     * On Linux: uses container bridge IP + internal ports.
     */
    public ContainerEndpoints getContainerEndpoints(String containerId) {
        for (int attempt = 0; attempt < 10; attempt++) {
            ContainerEndpoints endpoints = inspectEndpoints(containerId);
            if (endpoints != null) {
                return endpoints;
            }
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Interrupted while waiting for container endpoints", e);
            }
        }
        throw new RuntimeException("Unable to determine endpoints for container: " + containerId);
    }

    /**
     * Convenience: get the AI Proxy address (port 3000).
     */
    public String getContainerIp(String containerId) {
        return getContainerEndpoints(containerId).aiProxy();
    }

    private ContainerEndpoints inspectEndpoints(String containerId) {
        InspectContainerResponse info = dockerClient.inspectContainerCmd(containerId).exec();
        var networkSettings = info.getNetworkSettings();

        boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");

        if (isWindows) {
            if (networkSettings != null && networkSettings.getPorts() != null) {
                Map<ExposedPort, Ports.Binding[]> bindings = networkSettings.getPorts().getBindings();
                if (bindings == null) return null;

                String aiProxyHost = null;
                String fileManagerHost = null;

                for (Map.Entry<ExposedPort, Ports.Binding[]> entry : bindings.entrySet()) {
                    int containerPort = entry.getKey().getPort();
                    Ports.Binding[] bindingArr = entry.getValue();
                    if (bindingArr != null && bindingArr.length > 0) {
                        String hostPort = bindingArr[0].getHostPortSpec();
                        if (hostPort != null && !hostPort.isEmpty()) {
                            if (containerPort == 3000) {
                                aiProxyHost = "localhost:" + hostPort;
                            } else if (containerPort == 3001) {
                                fileManagerHost = "localhost:" + hostPort;
                            }
                        }
                    }
                }

                if (aiProxyHost != null && fileManagerHost != null) {
                    LOG.infof("Container endpoints (Windows): AI Proxy=%s, File Manager=%s", aiProxyHost, fileManagerHost);
                    return new ContainerEndpoints(aiProxyHost, fileManagerHost);
                }
            }
        } else {
            // Linux: use container bridge IP + internal ports
            if (networkSettings != null && networkSettings.getNetworks() != null) {
                String ip = null;
                ContainerNetwork bridge = networkSettings.getNetworks().get("bridge");
                if (bridge != null && bridge.getIpAddress() != null && !bridge.getIpAddress().isEmpty()) {
                    ip = bridge.getIpAddress();
                } else {
                    for (ContainerNetwork network : networkSettings.getNetworks().values()) {
                        if (network.getIpAddress() != null && !network.getIpAddress().isEmpty()) {
                            ip = network.getIpAddress();
                            break;
                        }
                    }
                }
                if (ip != null) {
                    LOG.infof("Container endpoints (Linux): IP=%s", ip);
                    return new ContainerEndpoints(ip + ":3000", ip + ":3001");
                }
            }
        }

        return null;
    }

    /**
     * Reads container resource limits from SystemConfig at runtime.
     * Falls back to sensible defaults if not configured.
     */
    public ContainerLimits readLimitsFromSystemConfig() {
        long memory = 1_073_741_824L; // 1GB default
        double cpu = 1.0;

        SystemConfig memConfig = SystemConfig.findByKey("container.memoryLimit");
        if (memConfig != null && memConfig.value != null) {
            Object memVal = memConfig.value instanceof Map<?, ?> m ? m.get("value") : memConfig.value;
            if (memVal instanceof String s) {
                memory = parseMemory(s);
            } else if (memVal instanceof Number n) {
                memory = n.longValue();
            }
        }

        SystemConfig cpuConfig = SystemConfig.findByKey("container.cpuLimit");
        if (cpuConfig != null && cpuConfig.value != null) {
            Object cpuVal = cpuConfig.value instanceof Map<?, ?> m ? m.get("value") : cpuConfig.value;
            if (cpuVal instanceof String s) {
                cpu = Double.parseDouble(s.replace("\"", ""));
            } else if (cpuVal instanceof Number n) {
                cpu = n.doubleValue();
            }
        }

        return new ContainerLimits(memory, cpu);
    }

    public record ContainerLimits(long memoryBytes, double cpuLimit) {
    }

    private long parseMemory(String value) {
        value = value.trim().replace("\"", "").toLowerCase();
        if (value.endsWith("g")) {
            return (long) (Double.parseDouble(value.substring(0, value.length() - 1)) * 1_073_741_824L);
        } else if (value.endsWith("m")) {
            return (long) (Double.parseDouble(value.substring(0, value.length() - 1)) * 1_048_576L);
        }
        return Long.parseLong(value);
    }
}
