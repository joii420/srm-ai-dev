package com.appsmith.aiide.resource;

import com.appsmith.aiide.config.AppConfig;
import com.appsmith.aiide.config.JwtConfig;
import com.appsmith.aiide.dto.ActiveCheckoutDto;
import com.appsmith.aiide.dto.LoginRequest;
import com.appsmith.aiide.dto.LoginResponse;
import com.appsmith.aiide.dto.UserInfoDto;
import com.appsmith.aiide.entity.Checkout;
import com.appsmith.aiide.entity.User;
import com.appsmith.aiide.filter.RequestContext;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@Path("/api/auth")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {

    private static final Logger LOG = Logger.getLogger(AuthResource.class);

    @Inject
    JwtConfig jwtConfig;

    @Inject
    AppConfig appConfig;

    @Inject
    RequestContext requestContext;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @POST
    @Path("/login")
    @Transactional
    public Response login(@Valid LoginRequest request) {
        String username = request.username;
        String password = request.password;

        // Determine role via external auth or dev mock
        String role;
        var externalUrl = appConfig.getExternalAuthApiUrl();
        if (externalUrl.isPresent() && !externalUrl.get().isBlank()) {
            role = authenticateExternal(externalUrl.get(), username, password);
            if (role == null) {
                return Response.status(Response.Status.UNAUTHORIZED)
                        .entity(Map.of("error", "Unauthorized", "message", "Invalid credentials"))
                        .build();
            }
        } else {
            // Dev mock: password "dev" accepts any username; username "admin" grants admin role
            if (!"dev".equals(password)) {
                return Response.status(Response.Status.UNAUTHORIZED)
                        .entity(Map.of("error", "Unauthorized", "message", "Invalid credentials (dev mode: password must be 'dev')"))
                        .build();
            }
            role = "admin".equals(username) ? "admin" : "developer";
        }

        // Upsert user
        User user = User.findByUsername(username);
        if (user == null) {
            user = new User();
            user.username = username;
            user.externalUserId = username;
            user.displayName = username;
            user.role = role;
            user.persist();
        } else {
            user.role = role;
        }

        // Check for active checkout
        ActiveCheckoutDto activeCheckout = buildActiveCheckout(user.id);

        // Generate JWT
        String token = jwtConfig.generateToken(user.id.toString(), user.role, user.username);

        // Build response
        var userInfo = new UserInfoDto();
        userInfo.id = user.id.toString();
        userInfo.username = user.username;
        userInfo.displayName = user.displayName;
        userInfo.role = user.role;
        userInfo.activeCheckout = activeCheckout;

        var loginResponse = new LoginResponse();
        loginResponse.token = token;
        loginResponse.userInfo = userInfo;

        LOG.infof("User '%s' logged in with role '%s'", username, role);
        return Response.ok(loginResponse).build();
    }

    @GET
    @Path("/me")
    public Response me() {
        String userId = requestContext.getUserId();
        if (userId == null) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(Map.of("error", "Unauthorized", "message", "Not authenticated"))
                    .build();
        }

        User user = User.findById(UUID.fromString(userId));
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found", "message", "User not found"))
                    .build();
        }

        ActiveCheckoutDto activeCheckout = buildActiveCheckout(user.id);

        var userInfo = new UserInfoDto();
        userInfo.id = user.id.toString();
        userInfo.username = user.username;
        userInfo.displayName = user.displayName;
        userInfo.role = user.role;
        userInfo.activeCheckout = activeCheckout;

        return Response.ok(userInfo).build();
    }

    @POST
    @Path("/logout")
    public Response logout() {
        LOG.infof("User '%s' logged out", requestContext.getUsername());
        return Response.ok(Map.of("success", true, "message", "Logged out successfully")).build();
    }

    // --- Private helpers ---

    private ActiveCheckoutDto buildActiveCheckout(UUID userId) {
        Checkout checkout = Checkout.findActiveByUserId(userId);
        if (checkout == null) {
            return null;
        }
        var dto = new ActiveCheckoutDto();
        dto.pageId = checkout.pageId;
        dto.pageName = checkout.pageName;
        dto.containerId = checkout.containerId;
        dto.sessionId = checkout.sessionId;
        return dto;
    }

    /**
     * Authenticate against external auth API. Returns the role on success, null on failure.
     */
    private String authenticateExternal(String apiUrl, String username, String password) {
        try {
            String body = """
                    {"username": "%s", "password": "%s"}
                    """.formatted(username, password);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                // Parse role from response; default to "developer" if not present
                String responseBody = response.body();
                if (responseBody.contains("\"admin\"")) {
                    return "admin";
                }
                return "developer";
            }
            LOG.warnf("External auth returned status %d for user '%s'", response.statusCode(), username);
            return null;
        } catch (Exception e) {
            LOG.errorf(e, "External auth call failed for user '%s'", username);
            return null;
        }
    }
}
