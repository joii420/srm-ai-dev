package com.appsmith.aiide.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_chat_msg_page_user", columnList = "page_id, user_id, created_at")
})
public class ChatMessage extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "page_id", nullable = false)
    public UUID pageId;

    @Column(name = "user_id", nullable = false)
    public UUID userId;

    @Column(length = 20, nullable = false)
    public String role; // "user" | "assistant" | "system"

    @Column(columnDefinition = "TEXT", nullable = false)
    public String content;

    @CreationTimestamp
    @Column(name = "created_at")
    public OffsetDateTime createdAt;

    /**
     * Query messages for a page by a specific user, after a given time, ordered by time DESC.
     */
    public static List<ChatMessage> findByPageAndUser(UUID pageId, UUID userId,
                                                       OffsetDateTime after, int limit) {
        return find("pageId = ?1 AND userId = ?2 AND createdAt > ?3 ORDER BY createdAt DESC",
                pageId, userId, after)
                .page(0, limit)
                .list();
    }

    /**
     * Query messages for a page by a specific user, before a given time (for pagination).
     */
    public static List<ChatMessage> findByPageAndUserBefore(UUID pageId, UUID userId,
                                                             OffsetDateTime after,
                                                             OffsetDateTime before, int limit) {
        return find("pageId = ?1 AND userId = ?2 AND createdAt > ?3 AND createdAt < ?4 ORDER BY createdAt DESC",
                pageId, userId, after, before)
                .page(0, limit)
                .list();
    }

    /**
     * Query all messages for a page (admin view), ordered by time DESC.
     */
    public static List<ChatMessage> findByPage(UUID pageId, int limit) {
        return find("pageId = ?1 ORDER BY createdAt DESC", pageId)
                .page(0, limit)
                .list();
    }

    /**
     * Query all messages for a page before a given time (admin pagination).
     */
    public static List<ChatMessage> findByPageBefore(UUID pageId, OffsetDateTime before, int limit) {
        return find("pageId = ?1 AND createdAt < ?2 ORDER BY createdAt DESC", pageId, before)
                .page(0, limit)
                .list();
    }

    /**
     * Query recent messages for AI context injection (user's messages only).
     */
    public static List<ChatMessage> findRecentForContext(UUID pageId, UUID userId,
                                                         OffsetDateTime after, int limit) {
        return find("pageId = ?1 AND userId = ?2 AND createdAt > ?3 AND role != 'system' ORDER BY createdAt DESC",
                pageId, userId, after)
                .page(0, limit)
                .list();
    }
}
