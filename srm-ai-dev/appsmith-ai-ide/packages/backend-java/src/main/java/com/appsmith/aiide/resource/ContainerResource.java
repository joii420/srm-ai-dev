package com.appsmith.aiide.resource;

import com.appsmith.aiide.entity.Checkout;
import com.appsmith.aiide.filter.AdminOnly;
import com.appsmith.aiide.filter.RequestContext;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Path("/api/ide/containers")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@AdminOnly
public class ContainerResource {

    private static final Logger LOG = Logger.getLogger(ContainerResource.class);

    @Inject
    RequestContext requestContext;

    /**
     * List all active containers with checkout info (admin only).
     */
    @GET
    public Response listActive() {
        List<Checkout> activeCheckouts = Checkout.list("status = 'active' order by checkedOutAt desc");

        var containers = activeCheckouts.stream().map(co -> Map.of(
                "checkoutId", co.id.toString(),
                "pageId", co.pageId,
                "pageName", co.pageName != null ? co.pageName : "",
                "containerId", co.containerId != null ? co.containerId : "",
                "username", co.user != null ? co.user.username : "",
                "sessionId", co.sessionId != null ? co.sessionId : "",
                "checkedOutAt", co.checkedOutAt != null ? co.checkedOutAt.toString() : ""
        )).collect(Collectors.toList());

        return Response.ok(Map.of("containers", containers)).build();
    }

    /**
     * Force checkin a container (admin only).
     */
    @POST
    @Path("/{id}/force-checkin")
    @Transactional
    public Response forceCheckin(@PathParam("id") UUID id) {
        Checkout checkout = Checkout.findById(id);
        if (checkout == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found", "message", "Checkout not found"))
                    .build();
        }

        if (!"active".equals(checkout.status)) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("error", "Conflict", "message", "Checkout is not active"))
                    .build();
        }

        checkout.status = "force-checked-in";
        checkout.checkedInAt = OffsetDateTime.now();

        // TODO: Orchestrate actual checkin (commit, push, destroy container)

        LOG.warnf("Force checkin performed on checkout %s (page: %s) by admin %s",
                id, checkout.pageId, requestContext.getUsername());

        return Response.ok(Map.of("success", true, "checkoutId", id.toString())).build();
    }

    /**
     * Force destroy a container (admin only).
     */
    @POST
    @Path("/{id}/force-destroy")
    @Transactional
    public Response forceDestroy(@PathParam("id") UUID id) {
        Checkout checkout = Checkout.findById(id);
        if (checkout == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found", "message", "Checkout not found"))
                    .build();
        }

        if (!"active".equals(checkout.status)) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("error", "Conflict", "message", "Checkout is not active"))
                    .build();
        }

        checkout.status = "force-destroyed";
        checkout.checkedInAt = OffsetDateTime.now();

        // TODO: Destroy the actual container

        LOG.warnf("Force destroy performed on checkout %s (container: %s) by admin %s",
                id, checkout.containerId, requestContext.getUsername());

        return Response.ok(Map.of("success", true, "checkoutId", id.toString())).build();
    }
}
