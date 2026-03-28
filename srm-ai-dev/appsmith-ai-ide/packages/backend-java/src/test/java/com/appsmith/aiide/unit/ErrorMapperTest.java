package com.appsmith.aiide.unit;

import com.appsmith.aiide.filter.ErrorMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ErrorMapperTest {

    private ErrorMapper errorMapper;

    @BeforeEach
    void setUp() {
        errorMapper = new ErrorMapper();
    }

    @Test
    void notFoundException_returns404() {
        Response response = errorMapper.toResponse(new NotFoundException("Page not found"));
        assertEquals(404, response.getStatus());

        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getEntity();
        assertEquals("Not Found", body.get("error"));
    }

    @Test
    void forbiddenException_returns403() {
        Response response = errorMapper.toResponse(new ForbiddenException("Access denied"));
        assertEquals(403, response.getStatus());

        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getEntity();
        assertEquals("Forbidden", body.get("error"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void constraintViolation_returns400() {
        ConstraintViolation<?> violation = mock(ConstraintViolation.class);
        when(violation.getMessage()).thenReturn("must not be blank");

        ConstraintViolationException ex = new ConstraintViolationException(Set.of(violation));

        Response response = errorMapper.toResponse(ex);
        assertEquals(400, response.getStatus());

        Map<String, String> body = (Map<String, String>) response.getEntity();
        assertEquals("Validation Error", body.get("error"));
        assertTrue(body.get("message").contains("must not be blank"));
    }

    @Test
    void unknownException_returns500() {
        Response response = errorMapper.toResponse(new RuntimeException("unexpected"));
        assertEquals(500, response.getStatus());

        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getEntity();
        assertEquals("Internal Server Error", body.get("error"));
    }
}
