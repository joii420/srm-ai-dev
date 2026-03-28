package com.appsmith.aiide.config;

/**
 * Immutable record representing decoded JWT claims.
 */
public record JwtClaims(String sub, String role, String username) {
}
