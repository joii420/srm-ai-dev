package com.appsmith.aiide.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
@Entity
@Table(name = "pages")
public class Page extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(length = 200, unique = true, nullable = false)
    public String name;

    @Column(columnDefinition = "TEXT")
    public String description;

    @Column(length = 20, nullable = false)
    public String type = "appsmith";

    @Column(name = "gitlab_repo_url", nullable = false, columnDefinition = "TEXT")
    public String gitlabRepoUrl;

    @Column(name = "git_branch", length = 200)
    public String gitBranch = "dev";

    @Column(name = "appsmith_page_id", columnDefinition = "TEXT")
    public String appsmithPageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    public User createdBy;

    @CreationTimestamp
    @Column(name = "created_at")
    public OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    public OffsetDateTime updatedAt;

    public static Page findByName(String name) {
        return find("name", name).firstResult();
    }

    public static List<Page> listAllOrdered() {
        return list("ORDER BY createdAt DESC");
    }
}
