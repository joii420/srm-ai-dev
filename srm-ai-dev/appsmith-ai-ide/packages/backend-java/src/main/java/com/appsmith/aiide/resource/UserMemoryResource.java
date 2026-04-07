package com.appsmith.aiide.resource;

import com.appsmith.aiide.entity.UserMemory;
import com.appsmith.aiide.filter.RequestContext;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.util.Map;
import java.util.UUID;

@Path("/api/ide/user-memory")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class UserMemoryResource {

    private static final Logger LOG = Logger.getLogger(UserMemoryResource.class);

    private static final String DEFAULT_MEMORY = """
            {
              "meta": {"version": "1.0.0"},
              "preferences": {"reply_language": "中文", "reply_detail_level": "detailed", "code_example_style": "always_include", "format_preference": "markdown"},
              "code_style": {"paradigm": "", "naming_convention": "", "comment_language": "中文", "comment_density": "key_logic_only", "test_style": "", "custom": {}},
              "background": {"role": "", "experience_level": "", "primary_languages": [], "domains": []},
              "interaction_habits": {"prefers_step_by_step": true, "prefers_alternatives": false, "dislikes": [], "custom": {}},
              "toolchain": {"package_manager": "", "preferred_frameworks": [], "custom": {}}
            }
            """;

    @Inject
    RequestContext requestContext;

    /**
     * Get current user's memory. Returns default template if not exists.
     */
    @GET
    public Response getUserMemory() {
        UUID userId = UUID.fromString(requestContext.getUserId());
        UserMemory um = UserMemory.findByUserId(userId);

        if (um == null) {
            return Response.ok(Map.of("memoryJson", DEFAULT_MEMORY.trim(), "isDefault", true)).build();
        }

        return Response.ok(Map.of("memoryJson", um.memoryJson, "isDefault", false)).build();
    }

    /**
     * Update current user's memory.
     * Called by container AI service after detecting user preference changes.
     */
    @PUT
    @Transactional
    public Response updateUserMemory(Map<String, String> body) {
        String memoryJson = body.get("memoryJson");
        if (memoryJson == null || memoryJson.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "memoryJson is required"))
                    .build();
        }

        UUID userId = UUID.fromString(requestContext.getUserId());
        UserMemory um = UserMemory.findByUserId(userId);

        if (um == null) {
            um = new UserMemory();
            um.userId = userId;
            um.memoryJson = memoryJson;
            um.version = 1;
            um.persist();
            LOG.infof("User memory created for user %s", userId);
        } else {
            um.memoryJson = memoryJson;
            um.version = um.version + 1;
            LOG.infof("User memory updated for user %s (v%d)", userId, um.version);
        }

        return Response.ok(Map.of("success", true, "version", um.version)).build();
    }
}
