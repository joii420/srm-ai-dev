package com.appsmith.aiide.filter;

import com.appsmith.aiide.config.JwtClaims;
import com.appsmith.aiide.config.JwtConfig;
import com.auth0.jwt.exceptions.JWTVerificationException;
import io.vertx.ext.web.RoutingContext;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

import java.util.Map;
import java.util.Set;

/**
 * Global authentication filter that validates JWT Bearer tokens on all requests
 * except explicitly skipped paths (login, health).
 * <p>
 * On success, populates the request-scoped {@link RequestContext} with user claims
 * and stores them as a request property ("user") for downstream access.
 */
@Provider
@Priority(Priorities.AUTHENTICATION)
public class AuthFilter implements ContainerRequestFilter {

    private static final Logger LOG = Logger.getLogger(AuthFilter.class);

    /**
     * Paths that do not require authentication.
     */
    private static final Set<String> SKIP_PATHS = Set.of(
            "/api/auth/login",
            "/api/health",
            "/q/health",
            "/q/health/ready",
            "/q/health/live"
    );

    @Inject
    JwtConfig jwtConfig;
    @Inject
    RoutingContext routingContext;
    @Inject
    RequestContext requestContext;

    @Override
    public void filter(ContainerRequestContext ctx) {
        String path = ctx.getUriInfo().getPath();
        // Normalize: ensure leading slash
        if (!path.startsWith("/")) {
            path = "/" + path;
        }

        // Skip authentication for public endpoints
        if (SKIP_PATHS.contains(path)) {
            return;
        }

        // Extract Authorization header
        String authHeader = ctx.getHeaderString("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            abort(ctx, Response.Status.UNAUTHORIZED, "Missing or invalid Authorization header");
            return;
        }

        String token = authHeader.substring("Bearer ".length()).trim();
        if (token.isEmpty()) {
            abort(ctx, Response.Status.UNAUTHORIZED, "Empty token");
            return;
        }

        try {
            JwtClaims claims = jwtConfig.verifyToken(token);

            // Populate CDI request-scoped context
            requestContext.setFromClaims(claims);

            // Also set as request property for non-CDI access
            ctx.setProperty("user", claims);
            ctx.setProperty("userId", claims.sub());
            ctx.setProperty("role", claims.role());
            ctx.setProperty("username", claims.username());
            routingContext.put("user", claims.username());

        } catch (JWTVerificationException e) {
            LOG.debugf("JWT verification failed: %s", e.getMessage());
            abort(ctx, Response.Status.UNAUTHORIZED, "Invalid or expired token");
        }
    }

    private void abort(ContainerRequestContext ctx, Response.Status status, String message) {
        ctx.abortWith(
                Response.status(status)
                        .entity(Map.of("error", status.getReasonPhrase(), "message", message))
                        .build()
        );
    }
}
