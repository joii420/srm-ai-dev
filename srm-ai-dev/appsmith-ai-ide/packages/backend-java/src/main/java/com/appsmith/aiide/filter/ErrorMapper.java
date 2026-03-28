package com.appsmith.aiide.filter;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global exception mapper that translates Java exceptions into consistent
 * JSON error responses: {@code {"error": "...", "message": "..."}}.
 */
@Provider
public class ErrorMapper implements ExceptionMapper<Exception> {

    private static final Logger LOG = Logger.getLogger(ErrorMapper.class);

    @Override
    public Response toResponse(Exception exception) {
        if (exception instanceof ConstraintViolationException cve) {
            String details = cve.getConstraintViolations().stream()
                    .map(ConstraintViolation::getMessage)
                    .collect(Collectors.joining("; "));
            return buildResponse(Response.Status.BAD_REQUEST, "Validation Error", details);
        }

        if (exception instanceof NotFoundException nfe) {
            return buildResponse(Response.Status.NOT_FOUND, "Not Found",
                    nfe.getMessage() != null ? nfe.getMessage() : "Resource not found");
        }

        if (exception instanceof ForbiddenException fe) {
            return buildResponse(Response.Status.FORBIDDEN, "Forbidden",
                    fe.getMessage() != null ? fe.getMessage() : "Access denied");
        }

        if (exception instanceof WebApplicationException wae) {
            int status = wae.getResponse().getStatus();
            Response.Status rs = Response.Status.fromStatusCode(status);
            String reasonPhrase = rs != null ? rs.getReasonPhrase() : "Error";
            return buildResponse(status, reasonPhrase,
                    wae.getMessage() != null ? wae.getMessage() : reasonPhrase);
        }

        // Check for GitConflictException by class name to avoid hard dependency
        if ("GitConflictException".equals(exception.getClass().getSimpleName())) {
            return buildResponse(Response.Status.CONFLICT, "Conflict",
                    exception.getMessage() != null ? exception.getMessage() : "Git conflict detected");
        }

        LOG.error("Unhandled exception", exception);
        return buildResponse(Response.Status.INTERNAL_SERVER_ERROR,
                "Internal Server Error", "An unexpected error occurred");
    }

    private Response buildResponse(Response.Status status, String error, String message) {
        return Response.status(status)
                .entity(Map.of("error", error, "message", message))
                .build();
    }

    private Response buildResponse(int statusCode, String error, String message) {
        return Response.status(statusCode)
                .entity(Map.of("error", error, "message", message))
                .build();
    }
}
