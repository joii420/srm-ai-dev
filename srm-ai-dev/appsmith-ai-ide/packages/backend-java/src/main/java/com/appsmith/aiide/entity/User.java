package com.appsmith.aiide.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
@Entity
@Table(name = "users")
public class User extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "external_user_id", length = 200, unique = true, nullable = false)
    public String externalUserId;

    @Column(length = 100, nullable = false)
    public String username;

    @Column(name = "display_name", length = 100)
    public String displayName;

    @Column(length = 20)
    public String role = "developer";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "active_skills", columnDefinition = "jsonb")
    public Object activeSkills;

    @CreationTimestamp
    @Column(name = "created_at")
    public OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    public OffsetDateTime updatedAt;

    public static User findByExternalUserId(String externalUserId) {
        return find("externalUserId", externalUserId).firstResult();
    }

    public static User findByUsername(String username) {
        return find("username", username).firstResult();
    }
}
