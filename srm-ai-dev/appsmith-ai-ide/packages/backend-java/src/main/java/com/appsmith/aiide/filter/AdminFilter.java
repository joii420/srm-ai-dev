package com.appsmith.aiide.filter;

import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;

import java.util.Map;

/**
 * Authorization filter that enforces admin-only access on endpoints
 * annotated with {@link AdminOnly}.
 *
 * Runs after {@link AuthFilter} (AUTHENTICATION priority) at AUTHORIZATION priority.
 */
@Provider
@AdminOnly
@Priority(Priorities.AUTHORIZATION)
public class AdminFilter implements ContainerRequestFilter {

    @Inject
    RequestContext requestContext;

    @Override
    public void filter(ContainerRequestContext ctx) {
        if (!requestContext.isAdmin()) {
            ctx.abortWith(
                    Response.status(Response.Status.FORBIDDEN)
                            .entity(Map.of(
                                    "error", "Forbidden",
                                    "message", "Admin access required"
                            ))
                            .build()
            );
        }
    }
}
