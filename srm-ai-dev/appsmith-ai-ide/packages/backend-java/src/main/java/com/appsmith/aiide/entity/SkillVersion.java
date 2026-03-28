package com.appsmith.aiide.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
@Entity
@Table(name = "skill_versions")
public class SkillVersion extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    public Skill skill;

    @Column(length = 20, nullable = false)
    public String version;

    @Column(name = "prompt_snapshot", nullable = false, columnDefinition = "TEXT")
    public String promptSnapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "fields_snapshot", columnDefinition = "jsonb")
    public Object fieldsSnapshot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "modified_by")
    public User modifiedBy;

    @CreationTimestamp
    @Column(name = "created_at")
    public OffsetDateTime createdAt;
}
