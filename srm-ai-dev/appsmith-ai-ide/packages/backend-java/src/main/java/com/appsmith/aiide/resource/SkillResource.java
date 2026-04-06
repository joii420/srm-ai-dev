package com.appsmith.aiide.resource;

import com.appsmith.aiide.dto.SkillDto;
import com.appsmith.aiide.entity.Skill;
import com.appsmith.aiide.entity.SkillField;
import com.appsmith.aiide.entity.SkillVersion;
import com.appsmith.aiide.filter.AdminOnly;
import com.appsmith.aiide.filter.RequestContext;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Path("/api/ide/skills")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class SkillResource {

    private static final Logger LOG = Logger.getLogger(SkillResource.class);

    /**
     * Per-session dedup tracker for skill usage: key = skillId:sessionId
     */
    private static final Set<String> USAGE_DEDUP = ConcurrentHashMap.newKeySet();

    @Inject
    RequestContext requestContext;

    /**
     * List skills with fields, sorted by callCount desc. Optional ?enabled filter.
     */
    @GET
    public Response listSkills(@QueryParam("enabled") Boolean enabled) {
        List<Skill> skills;
        if (enabled != null) {
            skills = Skill.list("enabled = ?1 order by callCount desc", enabled);
        } else {
            skills = Skill.list("order by callCount desc");
        }

        List<SkillDto> dtos = skills.stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        return Response.ok(dtos).build();
    }

    /**
     * Create a new skill with nested fields (admin only).
     */
    @POST
    @AdminOnly
    @Transactional
    public Response createSkill(SkillDto dto) {
        var skill = new Skill();
        skill.name = dto.name;
        skill.description = dto.description;
        skill.icon = dto.icon;
        skill.category = dto.category;
        skill.prompt = dto.prompt;
        skill.keywords = toJsonString(dto.keywords);
        skill.tags = toJsonString(dto.tags);
        skill.enabled = dto.enabled != null ? dto.enabled : true;
        skill.version = dto.version != null ? dto.version : "v1.0";
        skill.callCount = 0;

        // Handle nested fields
        if (dto.fields != null) {
            skill.fields = dto.fields.stream().map(f -> {
                var field = new SkillField();
                field.skill = skill;
                field.fieldId = f.fieldId;
                field.label = f.label;
                field.type = f.type;
                field.required = f.required;
                field.placeholder = f.placeholder;
                field.options = f.options;
                field.token = f.token;
                field.sortOrder = f.sortOrder;
                return field;
            }).collect(Collectors.toList());
        } else {
            skill.fields = new ArrayList<>();
        }

        skill.persist();
        LOG.infof("Skill created: %s by %s", skill.name, requestContext.getUsername());

        return Response.status(Response.Status.CREATED).entity(toDto(skill)).build();
    }

    /**
     * Update a skill (admin only).
     */
    @PUT
    @Path("/{id}")
    @AdminOnly
    @Transactional
    public Response updateSkill(@PathParam("id") UUID id, SkillDto dto) {
        Skill skill = Skill.findById(id);
        if (skill == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found", "message", "Skill not found"))
                    .build();
        }

        if (dto.name != null) skill.name = dto.name;
        if (dto.description != null) skill.description = dto.description;
        if (dto.icon != null) skill.icon = dto.icon;
        if (dto.category != null) skill.category = dto.category;
        if (dto.prompt != null) skill.prompt = dto.prompt;
        if (dto.keywords != null) skill.keywords = toJsonString(dto.keywords);
        if (dto.tags != null) skill.tags = toJsonString(dto.tags);
        if (dto.enabled != null) skill.enabled = dto.enabled;
        if (dto.version != null) skill.version = dto.version;

        // Update fields if provided
        if (dto.fields != null) {
            skill.fields.clear();
            dto.fields.forEach(f -> {
                var field = new SkillField();
                field.skill = skill;
                field.fieldId = f.fieldId;
                field.label = f.label;
                field.type = f.type;
                field.required = f.required;
                field.placeholder = f.placeholder;
                field.options = f.options;
                field.token = f.token;
                field.sortOrder = f.sortOrder;
                skill.fields.add(field);
            });
        }

        LOG.infof("Skill updated: %s by %s", skill.name, requestContext.getUsername());
        return Response.ok(toDto(skill)).build();
    }

    /**
     * Delete a skill (admin only).
     */
    @DELETE
    @Path("/{id}")
    @AdminOnly
    @Transactional
    public Response deleteSkill(@PathParam("id") UUID id) {
        Skill skill = Skill.findById(id);
        if (skill == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found", "message", "Skill not found"))
                    .build();
        }

        String name = skill.name;
        skill.delete();
        LOG.infof("Skill deleted: %s by %s", name, requestContext.getUsername());
        return Response.noContent().build();
    }

    /**
     * Increment callCount with per-session dedup.
     */
    @POST
    @Path("/{id}/use")
    @Transactional
    public Response useSkill(@PathParam("id") UUID id, Map<String, String> body) {
        String sessionId = body != null ? body.get("sessionId") : null;
        if (sessionId == null || sessionId.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Bad Request", "message", "sessionId is required"))
                    .build();
        }

        Skill skill = Skill.findById(id);
        if (skill == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found", "message", "Skill not found"))
                    .build();
        }

        // Per-session dedup
        String dedupKey = id + ":" + sessionId;
        if (!USAGE_DEDUP.add(dedupKey)) {
            return Response.ok(Map.of(
                    "success", true,
                    "deduplicated", true,
                    "callCount", skill.callCount
            )).build();
        }

        skill.callCount = (skill.callCount != null ? skill.callCount : 0) + 1;

        return Response.ok(Map.of(
                "success", true,
                "deduplicated", false,
                "callCount", skill.callCount
        )).build();
    }

    /**
     * List versions for a skill.
     */
    @GET
    @Path("/{id}/versions")
    public Response listVersions(@PathParam("id") UUID id) {
        Skill skill = Skill.findById(id);
        if (skill == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found", "message", "Skill not found"))
                    .build();
        }

        List<SkillVersion> versions = SkillVersion.list("skill.id = ?1 order by createdAt desc", id);
        var dtos = versions.stream().map(v -> Map.of(
                "id", v.id.toString(),
                "version", v.version,
                "createdAt", v.createdAt.toString()
        )).collect(Collectors.toList());

        return Response.ok(dtos).build();
    }

    /**
     * Create a version snapshot (admin only).
     */
    @POST
    @Path("/{id}/versions")
    @AdminOnly
    @Transactional
    public Response createVersion(@PathParam("id") UUID id, Map<String, Object> body) {
        Skill skill = Skill.findById(id);
        if (skill == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found", "message", "Skill not found"))
                    .build();
        }

        var version = new SkillVersion();
        version.skill = skill;
        version.version = body.get("version") != null ? body.get("version").toString() : "1.0.0";
        version.promptSnapshot = skill.prompt != null ? skill.prompt : "";

        // Snapshot current fields as JSON
        var fieldsSnapshot = skill.fields != null ? skill.fields.stream().map(f -> Map.of(
                "fieldId", (Object) f.fieldId,
                "label", (Object) (f.label != null ? f.label : ""),
                "type", (Object) (f.type != null ? f.type : ""),
                "required", (Object) (f.required != null ? f.required : false),
                "token", (Object) (f.token != null ? f.token : ""),
                "sortOrder", (Object) (f.sortOrder != null ? f.sortOrder : 0)
        )).collect(Collectors.toList()) : List.of();
        version.fieldsSnapshot = fieldsSnapshot;

        version.persist();
        LOG.infof("Version %s created for skill %s by %s", version.version, skill.name, requestContext.getUsername());

        return Response.status(Response.Status.CREATED).entity(Map.of(
                "id", version.id.toString(),
                "version", version.version,
                "createdAt", version.createdAt.toString()
        )).build();
    }

    /**
     * Rollback a skill to a specific version (admin only).
     */
    @POST
    @Path("/{id}/rollback")
    @AdminOnly
    @Transactional
    public Response rollback(@PathParam("id") UUID id, Map<String, String> body) {
        String versionId = body != null ? body.get("versionId") : null;
        if (versionId == null || versionId.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Bad Request", "message", "versionId is required"))
                    .build();
        }

        Skill skill = Skill.findById(id);
        if (skill == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found", "message", "Skill not found"))
                    .build();
        }

        SkillVersion version = SkillVersion.findById(UUID.fromString(versionId));
        if (version == null || !version.skill.id.equals(id)) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Not Found", "message", "Version not found for this skill"))
                    .build();
        }

        // Restore prompt from snapshot
        if (version.promptSnapshot != null) {
            skill.prompt = version.promptSnapshot;
        }

        LOG.infof("Skill %s rolled back to version %s by %s", skill.name, version.version, requestContext.getUsername());
        return Response.ok(Map.of(
                "success", true,
                "restoredVersion", version.version
        )).build();
    }

    // --- Private helpers ---

    /** Parse JSON string back to array for API response */
    private static Object parseJsonArray(String json) {
        if (json == null || json.isBlank()) return java.util.List.of();
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, java.util.List.class);
        } catch (Exception e) {
            return java.util.List.of();
        }
    }

    /** Convert Object (ArrayList from JSON) to JSON string for JSONB column */
    private static String toJsonString(Object val) {
        if (val == null) return null;
        if (val instanceof String s) return s;
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(val);
        } catch (Exception e) {
            return val.toString();
        }
    }

    private SkillDto toDto(Skill skill) {
        var dto = new SkillDto();
        dto.id = skill.id.toString();
        dto.name = skill.name;
        dto.description = skill.description;
        dto.icon = skill.icon;
        dto.category = skill.category;
        dto.prompt = skill.prompt;
        dto.keywords = parseJsonArray(skill.keywords);
        dto.tags = parseJsonArray(skill.tags);
        dto.callCount = skill.callCount;
        dto.enabled = skill.enabled;
        dto.version = skill.version;
        dto.createdAt = skill.createdAt;
        dto.updatedAt = skill.updatedAt;

        if (skill.fields != null) {
            dto.fields = skill.fields.stream().map(f -> {
                var fieldDto = new SkillDto.SkillFieldDto();
                fieldDto.id = f.id != null ? f.id.toString() : null;
                fieldDto.fieldId = f.fieldId;
                fieldDto.label = f.label;
                fieldDto.type = f.type;
                fieldDto.required = f.required;
                fieldDto.placeholder = f.placeholder;
                fieldDto.options = f.options;
                fieldDto.token = f.token;
                fieldDto.sortOrder = f.sortOrder;
                return fieldDto;
            }).collect(Collectors.toList());
        }

        return dto;
    }
}
