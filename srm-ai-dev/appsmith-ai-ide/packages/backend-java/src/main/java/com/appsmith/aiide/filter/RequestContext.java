package com.appsmith.aiide.filter;

import com.appsmith.aiide.config.JwtClaims;
import jakarta.enterprise.context.RequestScoped;

/**
 * CDI request-scoped bean that holds the authenticated user's identity
 * for the duration of a single HTTP request.
 *
 * Populated by {@link AuthFilter} after JWT verification.
 * Inject this bean wherever you need the current user's info.
 */
@RequestScoped
public class RequestContext {

    private String userId;
    private String role;
    private String username;

    public void setFromClaims(JwtClaims claims) {
        this.userId = claims.sub();
        this.role = claims.role();
        this.username = claims.username();
    }

    public String getUserId() {
        return userId;
    }

    public String getRole() {
        return role;
    }

    public String getUsername() {
        return username;
    }

    public boolean isAdmin() {
        return "admin".equals(role);
    }

    /**
     * Convenience method to get the claims as a record.
     */
    public JwtClaims toClaims() {
        return new JwtClaims(userId, role, username);
    }
}
