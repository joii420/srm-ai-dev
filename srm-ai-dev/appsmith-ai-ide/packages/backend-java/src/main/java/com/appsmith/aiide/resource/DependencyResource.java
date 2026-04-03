package com.appsmith.aiide.resource;

import com.appsmith.aiide.dto.DependencyDto;
import com.appsmith.aiide.entity.Dependency;
import com.appsmith.aiide.filter.AdminOnly;
import com.appsmith.aiide.filter.RequestContext;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Path("/api/ide/deps")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class DependencyResource {

    private static final Logger LOG = Logger.getLogger(DependencyResource.class);

    @Inject
    RequestContext requestContext;

    @Inject
    com.appsmith.aiide.service.DepsLoader depsLoader;

    /**
     * List all dependencies.
     */
    @GET
    public Response listAll() {
        List<Dependency> deps = Dependency.listAll();
        List<DependencyDto> dtos = deps.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    /**
     * Create a dependency (admin only). Namespace and url are required.
     */
    @POST
    @AdminOnly
    @Transactional
    public Response create(DependencyDto dto) {
        if (dto.namespace == null || dto.namespace.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Bad Request", "message", "namespace is required"))
                    .build();
        }
        if (dto.url == null || dto.url.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Bad Request", "message", "url is required"))
                    .build();
        }

        // Check uniqueness
        Dependency existing = Dependency.findByNamespace(dto.namespace);
        if (existing != null) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("error", "Conflict", "message", "Dependency with namespace '" + dto.namespace + "' already exists"))
                    .build();
        }

        var dep = new Dependency();
        dep.namespace = dto.namespace;
        dep.url = dto.url;
        dep.version = dto.version;
        dep.description = dto.description;
        dep.persist();

        LOG.infof("Dependency created: %s by %s", dep.namespace, requestContext.getUsername());
        return Response.status(Response.Status.CREATED).entity(toDto(dep)).build();
    }

    /**
     * Update a dependency (admin only).
     */
    @PUT
    @Path("/{id}")
    @AdminOnly
    @Transactional
    public Response update(@PathParam("id") UUID id, DependencyDto dto) {
        Dependency dep = Dependency.findById(id);
        if (dep == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found", "message", "Dependency not found"))
                    .build();
        }

        if (dto.namespace != null) dep.namespace = dto.namespace;
        if (dto.url != null) dep.url = dto.url;
        if (dto.version != null) dep.version = dto.version;
        if (dto.description != null) dep.description = dto.description;

        LOG.infof("Dependency updated: %s by %s", dep.namespace, requestContext.getUsername());
        return Response.ok(toDto(dep)).build();
    }

    /**
     * Delete a dependency (admin only).
     */
    @DELETE
    @Path("/{id}")
    @AdminOnly
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        Dependency dep = Dependency.findById(id);
        if (dep == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found", "message", "Dependency not found"))
                    .build();
        }

        String namespace = dep.namespace;
        dep.delete();
        LOG.infof("Dependency deleted: %s by %s", namespace, requestContext.getUsername());
        return Response.noContent().build();
    }

    /**
     * Refresh a single dependency via DepsLoader.
     */
    @POST
    @Path("/{id}/refresh")
    @Transactional
    public Response refreshSingle(@PathParam("id") UUID id) {
        Dependency dep = Dependency.findById(id);
        if (dep == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found", "message", "Dependency not found"))
                    .build();
        }

        depsLoader.refreshDep(dep.id);
        LOG.infof("Dependency refreshed: %s by %s", dep.namespace, requestContext.getUsername());
        return Response.ok(Map.of("success", true, "namespace", dep.namespace)).build();
    }

    /**
     * Refresh all dependencies via DepsLoader.
     */
    @POST
    @Path("/batch/refresh")
    public Response refreshAll() {
        depsLoader.refreshAllDeps();
        long count = Dependency.count();
        LOG.infof("All dependencies refreshed (%d) by %s", count, requestContext.getUsername());
        return Response.ok(Map.of("success", true, "count", count)).build();
    }

    // --- Private helpers ---

    private DependencyDto toDto(Dependency dep) {
        var dto = new DependencyDto();
        dto.id = dep.id.toString();
        dto.namespace = dep.namespace;
        dto.url = dep.url;
        dto.version = dep.version;
        dto.description = dep.description;
        dto.lastLoaded = dep.lastLoaded;
        dto.createdAt = dep.createdAt;
        return dto;
    }
}
