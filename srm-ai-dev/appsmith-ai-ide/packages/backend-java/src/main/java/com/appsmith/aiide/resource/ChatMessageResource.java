package com.appsmith.aiide.resource;

import com.appsmith.aiide.entity.ChatClearRecord;
import com.appsmith.aiide.entity.ChatMessage;
import com.appsmith.aiide.entity.User;
import com.appsmith.aiide.filter.RequestContext;
import com.appsmith.aiide.service.SystemConfigService;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Path("/api/ide/pages/{pageId}/chat-history")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ChatMessageResource {

    private static final Logger LOG = Logger.getLogger(ChatMessageResource.class);

    @Inject
    RequestContext requestContext;

    @Inject
    SystemConfigService systemConfigService;

    /**
     * Get chat history with pagination.
     * Normal users see only their own messages (after last clear).
     * Admin users see all messages.
     */
    @GET
    @Path("/history")
    public Response getHistory(@PathParam("pageId") String pageId,
                                @QueryParam("before") String beforeStr,
                                @QueryParam("limit") Integer limitParam) {
        UUID pageUuid = UUID.fromString(pageId);
        String userId = requestContext.getUserId();
        UUID userUuid = UUID.fromString(userId);
        boolean isAdmin = requestContext.isAdmin();

        int limit;
        try {
            String configLimit = systemConfigService.getValue(SystemConfigService.CHAT_HISTORY_PAGE_SIZE);
            limit = limitParam != null ? limitParam : Integer.parseInt(configLimit.isBlank() ? "10" : configLimit);
        } catch (Exception e) {
            limit = 10;
        }

        OffsetDateTime before = null;
        if (beforeStr != null && !beforeStr.isBlank()) {
            try {
                before = OffsetDateTime.parse(beforeStr);
            } catch (Exception e) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("error", "Invalid 'before' timestamp"))
                        .build();
            }
        }

        List<ChatMessage> messages;

        if (isAdmin) {
            // Admin sees all messages for this page
            messages = before != null
                    ? ChatMessage.findByPageBefore(pageUuid, before, limit)
                    : ChatMessage.findByPage(pageUuid, limit);
        } else {
            // Normal user: only own messages after last clear
            OffsetDateTime clearedAt = ChatClearRecord.getLastClearedAt(pageUuid, userUuid);
            OffsetDateTime after = clearedAt != null ? clearedAt
                    : OffsetDateTime.of(1970, 1, 1, 0, 0, 0, 0, java.time.ZoneOffset.UTC);

            messages = before != null
                    ? ChatMessage.findByPageAndUserBefore(pageUuid, userUuid, after, before, limit)
                    : ChatMessage.findByPageAndUser(pageUuid, userUuid, after, limit);
        }

        // Reverse to chronological order (queried DESC for pagination, return ASC)
        Collections.reverse(messages);

        // Build response with user info
        List<Map<String, Object>> result = new ArrayList<>();
        // Cache user lookups
        Map<UUID, User> userCache = new HashMap<>();

        for (ChatMessage msg : messages) {
            User sender = userCache.computeIfAbsent(msg.userId, uid -> User.findById(uid));
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", msg.id.toString());
            item.put("role", msg.role);
            item.put("content", msg.content);
            item.put("createdAt", msg.createdAt != null
                    ? msg.createdAt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME) : null);
            item.put("username", sender != null ? sender.username : "unknown");
            item.put("displayName", sender != null ? sender.displayName : "unknown");
            result.add(item);
        }

        boolean hasMore = messages.size() >= limit;

        return Response.ok(Map.of(
                "messages", result,
                "hasMore", hasMore
        )).build();
    }

    /**
     * Save messages from a chat round (user message + assistant reply).
     */
    @POST
    @Path("/messages")
    @Transactional
    public Response saveMessages(@PathParam("pageId") String pageId, List<Map<String, String>> body) {
        UUID pageUuid = UUID.fromString(pageId);
        String userId = requestContext.getUserId();
        UUID userUuid = UUID.fromString(userId);

        if (body == null || body.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "No messages to save"))
                    .build();
        }

        int saved = 0;
        for (Map<String, String> item : body) {
            String role = item.get("role");
            String content = item.get("content");
            if (role == null || content == null || content.isBlank()) continue;

            ChatMessage msg = new ChatMessage();
            msg.pageId = pageUuid;
            msg.userId = userUuid;
            msg.role = role;
            msg.content = content;
            msg.persist();
            saved++;
        }

        LOG.infof("Saved %d chat messages for page %s by user %s", saved, pageId, userId);
        return Response.ok(Map.of("success", true, "saved", saved)).build();
    }

    /**
     * Clear chat history for current user on a page.
     * Records the clear timestamp; messages are not deleted.
     */
    @POST
    @Path("/clear")
    @Transactional
    public Response clearHistory(@PathParam("pageId") String pageId) {
        UUID pageUuid = UUID.fromString(pageId);
        String userId = requestContext.getUserId();
        UUID userUuid = UUID.fromString(userId);

        ChatClearRecord record = new ChatClearRecord();
        record.pageId = pageUuid;
        record.userId = userUuid;
        record.persist();

        LOG.infof("Chat cleared for page %s by user %s at %s", pageId, userId, record.clearedAt);
        return Response.ok(Map.of("success", true)).build();
    }
}
