package com.appsmith.aiide.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_memories")
public class UserMemory extends PanacheEntityBase {

    @Id
    @Column(name = "user_id")
    public UUID userId;

    /** User memory JSON — stores preferences, code style, background, etc. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "memory_json", nullable = false, columnDefinition = "jsonb")
    public String memoryJson;

    @Column(nullable = false)
    public Integer version = 1;

    @CreationTimestamp
    @Column(name = "created_at")
    public OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "last_updated")
    public OffsetDateTime lastUpdated;

    public static UserMemory findByUserId(UUID userId) {
        return find("userId", userId).firstResult();
    }
}
