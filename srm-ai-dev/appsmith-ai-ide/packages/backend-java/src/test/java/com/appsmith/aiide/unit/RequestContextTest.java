package com.appsmith.aiide.unit;

import com.appsmith.aiide.config.JwtClaims;
import com.appsmith.aiide.filter.RequestContext;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RequestContextTest {

    @Test
    void setFromClaims_populatesFields() {
        RequestContext ctx = new RequestContext();
        JwtClaims claims = new JwtClaims("user-123", "admin", "alice");

        ctx.setFromClaims(claims);

        assertEquals("user-123", ctx.getUserId());
        assertEquals("admin", ctx.getRole());
        assertEquals("alice", ctx.getUsername());
    }

    @Test
    void isAdmin_trueForAdminRole() {
        RequestContext ctx = new RequestContext();
        ctx.setFromClaims(new JwtClaims("u1", "admin", "admin-user"));
        assertTrue(ctx.isAdmin());
    }

    @Test
    void isAdmin_falseForDeveloperRole() {
        RequestContext ctx = new RequestContext();
        ctx.setFromClaims(new JwtClaims("u2", "developer", "dev-user"));
        assertFalse(ctx.isAdmin());
    }

    @Test
    void isAdmin_falseWhenNoClaimsSet() {
        RequestContext ctx = new RequestContext();
        assertFalse(ctx.isAdmin());
    }

    @Test
    void toClaims_roundTrip() {
        RequestContext ctx = new RequestContext();
        JwtClaims original = new JwtClaims("uid", "developer", "john");
        ctx.setFromClaims(original);

        JwtClaims result = ctx.toClaims();
        assertEquals("uid", result.sub());
        assertEquals("developer", result.role());
        assertEquals("john", result.username());
    }
}
