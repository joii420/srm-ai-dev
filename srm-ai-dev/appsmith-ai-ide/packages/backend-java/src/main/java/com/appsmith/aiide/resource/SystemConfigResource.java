package com.appsmith.aiide.resource;

import com.appsmith.aiide.config.AppConfig;
import com.appsmith.aiide.dto.SshKeyRequest;
import com.appsmith.aiide.dto.SystemConfigDto;
import com.appsmith.aiide.entity.SystemConfig;
import com.appsmith.aiide.filter.AdminOnly;
import com.appsmith.aiide.filter.RequestContext;
import com.appsmith.aiide.service.SystemConfigService;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Path("/api/ide/system-config")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@AdminOnly
public class SystemConfigResource {

    private static final Logger LOG = Logger.getLogger(SystemConfigResource.class);

    @Inject
    AppConfig appConfig;

    @Inject
    RequestContext requestContext;

    @Inject
    SystemConfigService systemConfigService;

    /** Managed config keys shown in the UI */
    private static final List<String> MANAGED_KEYS = List.of(
            SystemConfigService.APPSMITH_SESSION,
            SystemConfigService.GITLAB_API_BASE_URL,
            SystemConfigService.GITLAB_REPO_PREFIX,
            SystemConfigService.GIT_TOKEN
    );

    /**
     * List managed system configs (admin only).
     */
    @GET
    public Response listAll() {
        List<SystemConfig> configs = SystemConfig.listAll();
        var dtos = configs.stream()
                .filter(c -> MANAGED_KEYS.contains(c.key))
                .map(this::toDto)
                .collect(Collectors.toList());

        return Response.ok(dtos).build();
    }

    /**
     * Update a config entry by key (admin only). Upserts if key does not exist.
     */
    @PUT
    @Transactional
    public Response updateConfig(SystemConfigDto dto) {
        if (dto.key == null || dto.key.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Bad Request", "message", "key is required"))
                    .build();
        }

        SystemConfig config = SystemConfig.findByKey(dto.key);
        if (config == null) {
            config = new SystemConfig();
            config.key = dto.key;
        }
        // JSONB column requires valid JSON. Wrap plain strings as JSON string: xxx → "xxx"
        config.value = wrapAsJsonString(dto.value);
        if (dto.name != null) config.name = dto.name;
        if (dto.description != null) config.description = dto.description;
        if (dto.type != null) config.type = dto.type;
        if (dto.datasource != null) config.datasource = dto.datasource;
        config.persist();

        // Refresh cache so new value takes effect immediately
        systemConfigService.refreshCache(dto.key);

        LOG.infof("System config '%s' updated by %s", dto.key, requestContext.getUsername());
        return Response.ok(Map.of("success", true, "key", dto.key)).build();
    }

    /**
     * Refresh config cache (admin only).
     */
    @POST
    @Path("/refresh-cache")
    public Response refreshCache() {
        systemConfigService.refreshCache();
        return Response.ok(Map.of("success", true, "message", "Cache refreshed")).build();
    }

    /**
     * Store an encrypted SSH key (admin only).
     */
    @PUT
    @Path("/ssh-key")
    @Transactional
    public Response storeSshKey(@Valid SshKeyRequest request) {
        try {
            String encrypted = encryptSshKey(request.privateKey);

            SystemConfig config = SystemConfig.findByKey("ssh-private-key");
            if (config == null) {
                config = new SystemConfig();
                config.key = "ssh-private-key";
            }
            config.value = Map.of(
                    "encrypted", encrypted,
                    "gitlabDomain", request.gitlabDomain
            );
            config.description = "Encrypted SSH private key for GitLab access";
            config.persist();

            LOG.infof("SSH key stored by %s for domain %s", requestContext.getUsername(), request.gitlabDomain);
            return Response.ok(Map.of("success", true, "gitlabDomain", request.gitlabDomain)).build();
        } catch (Exception e) {
            LOG.errorf(e, "Failed to store SSH key");
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "Internal Server Error", "message", "Failed to encrypt and store SSH key"))
                    .build();
        }
    }

    /**
     * Test SSH connection (admin only).
     */
    @POST
    @Path("/ssh-test")
    public Response testSshConnection(Map<String, String> body) {
        String host = body != null ? body.get("host") : null;
        if (host == null || host.isBlank()) {
            SystemConfig config = SystemConfig.findByKey("ssh-private-key");
            if (config != null && config.value instanceof Map<?, ?> valueMap) {
                Object domain = valueMap.get("gitlabDomain");
                host = domain != null ? domain.toString() : null;
            }
        }

        if (host == null || host.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Bad Request", "message", "host is required"))
                    .build();
        }

        int port = 22;
        if (body != null && body.containsKey("port")) {
            try { port = Integer.parseInt(body.get("port")); } catch (NumberFormatException ignored) {}
        }

        try (var socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), 5000);
            return Response.ok(Map.of("success", true, "host", host, "port", port, "message", "SSH connection successful")).build();
        } catch (Exception e) {
            return Response.ok(Map.of("success", false, "host", host, "port", port, "message", "SSH connection failed: " + e.getMessage())).build();
        }
    }

    // --- Private helpers ---

    private SystemConfigDto toDto(SystemConfig c) {
        var dto = new SystemConfigDto();
        dto.key = c.key;
        dto.name = c.name;
        dto.value = unwrapJsonString(c.value);
        dto.description = c.description;
        dto.type = c.type != null ? c.type : "input";
        dto.datasource = c.datasource;
        return dto;
    }

    private Object unwrapJsonString(Object val) {
        return com.appsmith.aiide.util.JsonUtil.unwrapJsonString(val);
    }

    /** Wrap plain string as JSON string for JSONB column: xxx → "xxx" */
    private Object wrapAsJsonString(Object val) {
        if (val == null) return "\"\"";
        if (val instanceof String s) {
            if (s.startsWith("\"") || s.startsWith("{") || s.startsWith("[")) {
                return s;
            }
            return com.appsmith.aiide.util.JsonUtil.wrapJsonString(s);
        }
        return val;
    }

    private String encryptSshKey(String plainText) throws Exception {
        String secret = appConfig.getSshKeyEncryptSecret();
        byte[] keyBytes = Arrays.copyOf(secret.getBytes(StandardCharsets.UTF_8), 16);
        SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");
        Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, keySpec);
        byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(encrypted);
    }
}
