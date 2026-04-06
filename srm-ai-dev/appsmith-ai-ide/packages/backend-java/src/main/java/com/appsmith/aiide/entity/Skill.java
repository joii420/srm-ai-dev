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
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
@Entity
@Table(name = "skills")
public class Skill extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(length = 100, unique = true, nullable = false)
    public String name;

    @Column(columnDefinition = "TEXT")
    public String description;

    @Column(length = 10)
    public String icon = "\u26A1";

    @Column(length = 50)
    public String category;

    @Column(nullable = false, columnDefinition = "TEXT")
    public String prompt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    public String keywords;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    public String tags;

    public Boolean enabled = true;

    @Column(length = 20)
    public String version = "v1.0";

    @Column(name = "call_count")
    public Integer callCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    public User createdBy;

    @OneToMany(mappedBy = "skill", cascade = CascadeType.ALL, orphanRemoval = true)
    public List<SkillField> fields;

    @OneToMany(mappedBy = "skill", cascade = CascadeType.ALL, orphanRemoval = true)
    public List<SkillVersion> versions;

    @CreationTimestamp
    @Column(name = "created_at")
    public OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    public OffsetDateTime updatedAt;
}
