package com.appsmith.aiide.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
@Entity
@Table(name = "dependencies")
public class Dependency extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(length = 50, unique = true, nullable = false)
    public String namespace;

    @Column(nullable = false, columnDefinition = "TEXT")
    public String url;

    @Column(length = 50)
    public String version;

    @Column(columnDefinition = "TEXT")
    public String description;

    @Column(name = "last_loaded")
    public OffsetDateTime lastLoaded;

    @CreationTimestamp
    @Column(name = "created_at")
    public OffsetDateTime createdAt;

    public static Dependency findByNamespace(String namespace) {
        return find("namespace", namespace).firstResult();
    }
}
