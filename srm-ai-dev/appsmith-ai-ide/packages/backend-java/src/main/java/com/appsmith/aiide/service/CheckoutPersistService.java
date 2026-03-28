package com.appsmith.aiide.service;

import com.appsmith.aiide.entity.Checkout;
import com.appsmith.aiide.entity.User;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Separated into its own CDI bean so that @Transactional is properly intercepted.
 * (CDI does not intercept self-invocations within the same bean.)
 */
@ApplicationScoped
public class CheckoutPersistService {

    private static final Logger LOG = Logger.getLogger(CheckoutPersistService.class);

    @Transactional
    public void persistCheckoutRecord(String userId, String pageId, String pageName,
                                       String containerId, String sessionId,
                                       String gitlabRepoUrl, String branch) {
        LOG.infof("Persisting checkout: userId=%s, pageId=%s, containerId=%s", userId, pageId, containerId);

        User user = User.findById(UUID.fromString(userId));
        if (user == null) {
            LOG.errorf("User NOT FOUND for UUID=%s — checkout will have null user_id!", userId);
        } else {
            LOG.infof("User found: id=%s, username=%s", user.id, user.username);
        }

        Checkout checkout = new Checkout();
        checkout.pageId = pageId;
        checkout.pageName = pageName;
        checkout.user = user;
        checkout.containerId = containerId;
        checkout.sessionId = sessionId;
        checkout.gitlabRepoUrl = gitlabRepoUrl;
        checkout.gitBranch = branch;
        checkout.status = "active";
        checkout.checkedOutAt = OffsetDateTime.now();
        checkout.persist();

        LOG.infof("Checkout record persisted: id=%s, user_id=%s", checkout.id,
                user != null ? user.id : "NULL");
    }
}
