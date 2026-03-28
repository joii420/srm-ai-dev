package com.appsmith.aiide.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
@Entity
@Table(name = "skill_fields")
public class SkillField extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    public Skill skill;

    @Column(name = "field_id", length = 50, nullable = false)
    public String fieldId;

    @Column(length = 100, nullable = false)
    public String label;

    @Column(length = 20, nullable = false)
    public String type;

    public Boolean required = false;

    @Column(columnDefinition = "TEXT")
    public String placeholder;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    public Object options;

    @Column(length = 100, nullable = false)
    public String token;

    @Column(name = "sort_order")
    public Integer sortOrder = 0;
}
