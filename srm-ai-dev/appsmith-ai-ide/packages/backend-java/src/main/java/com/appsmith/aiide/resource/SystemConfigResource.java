package com.appsmith.aiide.resource;

import com.appsmith.aiide.config.AppConfig;
import com.appsmith.aiide.dto.SshKeyRequest;
import com.appsmith.aiide.dto.SystemConfigDto;
import com.appsmith.aiide.entity.SystemConfig;
import com.appsmith.aiide.filter.AdminOnly;
import com.appsmith.aiide.filter.RequestContext;
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

@Path("/api/system-config")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@AdminOnly
public class SystemConfigResource {

    private static final Logger LOG = Logger.getLogger(SystemConfigResource.class);

    @Inject
    AppConfig appConfig;

    @Inject
    RequestContext requestContext;

    /**
     * List all system configs (admin only).
     */
    @GET
    public Response listAll() {
        List<SystemConfig> configs = SystemConfig.listAll();
        var dtos = configs.stream().map(c -> {
            var dto = new SystemConfigDto();
            dto.key = c.key;
            dto.value = c.value;
            dto.description = c.description;
            return dto;
        }).collect(Collectors.toList());

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
        config.value = dto.value;
        if (dto.description != null) {
            config.description = dto.description;
        }
        config.persist();

        LOG.infof("System config '%s' updated by %s", dto.key, requestContext.getUsername());
        return Response.ok(Map.of("success", true, "key", dto.key)).build();
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

            // Store encrypted key in system config
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
     * Test SSH connection to a GitLab instance (admin only).
     */
    @POST
    @Path("/ssh-test")
    public Response testSshConnection(Map<String, String> body) {
        String host = body != null ? body.get("host") : null;
        if (host == null || host.isBlank()) {
            // Fallback: read from stored config
            SystemConfig config = SystemConfig.findByKey("ssh-private-key");
            if (config != null && config.value instanceof Map<?, ?> valueMap) {
                Object domain = valueMap.get("gitlabDomain");
                host = domain != null ? domain.toString() : null;
            }
        }

        if (host == null || host.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Bad Request", "message", "host is required (or store an SSH key first)"))
                    .build();
        }

        int port = 22;
        if (body != null && body.containsKey("port")) {
            try {
                port = Integer.parseInt(body.get("port"));
            } catch (NumberFormatException ignored) {
                // Keep default 22
            }
        }

        try (var socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), 5000);
            LOG.infof("SSH test successful: %s:%d by %s", host, port, requestContext.getUsername());
            return Response.ok(Map.of(
                    "success", true,
                    "host", host,
                    "port", port,
                    "message", "SSH connection successful"
            )).build();
        } catch (Exception e) {
            LOG.warnf("SSH test failed: %s:%d - %s", host, port, e.getMessage());
            return Response.ok(Map.of(
                    "success", false,
                    "host", host,
                    "port", port,
                    "message", "SSH connection failed: " + e.getMessage()
            )).build();
        }
    }

    // --- Private helpers ---

    private String encryptSshKey(String plainText) throws Exception {
        String secret = appConfig.getSshKeyEncryptSecret();
        // Pad or truncate to 16 bytes for AES-128
        byte[] keyBytes = Arrays.copyOf(
                secret.getBytes(StandardCharsets.UTF_8), 16);
        SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");

        Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, keySpec);
        byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(encrypted);
    }
}
