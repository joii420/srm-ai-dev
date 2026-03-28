package com.appsmith.aiide.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
@Entity
@Table(name = "checkouts")
public class Checkout extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "page_id", length = 200, nullable = false)
    public String pageId;

    @Column(name = "page_name", length = 200, nullable = false)
    public String pageName;

    @Column(name = "gitlab_repo_url", nullable = false, columnDefinition = "TEXT")
    public String gitlabRepoUrl;

    @Column(name = "git_branch", length = 200)
    public String gitBranch = "dev";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    public User user;

    @Column(name = "container_id", length = 100)
    public String containerId;

    @Column(name = "session_id", length = 100)
    public String sessionId;

    @Column(length = 20)
    public String status = "active";

    @Column(name = "checked_out_at")
    public OffsetDateTime checkedOutAt;

    @Column(name = "checked_in_at")
    public OffsetDateTime checkedInAt;

    @Column(name = "commit_hash", length = 40)
    public String commitHash;

    public static List<Checkout> findByPageIdAndStatus(String pageId, String status) {
        return list("pageId = ?1 and status = ?2", pageId, status);
    }

    public static List<Checkout> findByUserIdAndStatus(UUID userId, String status) {
        return list("user.id = ?1 and status = ?2", userId, status);
    }

    public static Checkout findActiveByPageId(String pageId) {
        return find("SELECT c FROM Checkout c LEFT JOIN FETCH c.user WHERE c.pageId = ?1 AND c.status = 'active'", pageId).firstResult();
    }

    public static Checkout findActiveByUserId(UUID userId) {
        return find("SELECT c FROM Checkout c LEFT JOIN FETCH c.user WHERE c.user.id = ?1 AND c.status = 'active'", userId).firstResult();
    }
}
