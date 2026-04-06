package com.appsmith.aiide.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_clear_records")
public class ChatClearRecord extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "page_id", nullable = false)
    public UUID pageId;

    @Column(name = "user_id", nullable = false)
    public UUID userId;

    @CreationTimestamp
    @Column(name = "cleared_at")
    public OffsetDateTime clearedAt;

    /**
     * Get the most recent clear time for a user on a page.
     * Returns null if never cleared.
     */
    public static OffsetDateTime getLastClearedAt(UUID pageId, UUID userId) {
        ChatClearRecord record = find(
                "pageId = ?1 AND userId = ?2 ORDER BY clearedAt DESC", pageId, userId)
                .firstResult();
        return record != null ? record.clearedAt : null;
    }
}
