package com.appsmith.aiide.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
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
@Table(name = "system_configs")
public class SystemConfig extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "\"key\"", length = 100, unique = true, nullable = false)
    public String key;

    /** Display name shown in config UI, e.g. "APPSMITH会话" */
    @Column(length = 100)
    public String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    public Object value;

    @Column(columnDefinition = "TEXT")
    public String description;

    /** Input type: "input" or "dropdown", default "input" */
    @Column(length = 20)
    public String type = "input";

    /** Dropdown options as JSON array: [{"text":"Option1","value":"v1"}, ...] */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    public Object datasource;

    /** Sort order for config page display */
    @Column(name = "sort_order")
    public Integer sortOrder = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    public User updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    public OffsetDateTime updatedAt;

    public static SystemConfig findByKey(String key) {
        return find("key", key).firstResult();
    }
}
