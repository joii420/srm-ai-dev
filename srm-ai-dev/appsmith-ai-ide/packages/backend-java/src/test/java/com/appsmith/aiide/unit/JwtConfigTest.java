package com.appsmith.aiide.unit;

import com.appsmith.aiide.config.JwtClaims;
import com.appsmith.aiide.config.JwtConfig;
import com.auth0.jwt.exceptions.JWTVerificationException;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class JwtConfigTest {

    @Inject
    JwtConfig jwtConfig;

    @Test
    void generateToken_returnsNonEmptyString() {
        String token = jwtConfig.generateToken("user-123", "developer", "alice");
        assertNotNull(token);
        assertFalse(token.isBlank());
    }

    @Test
    void verifyToken_returnsCorrectClaims() {
        String userId = UUID.randomUUID().toString();
        String token = jwtConfig.generateToken(userId, "admin", "bob");

        JwtClaims claims = jwtConfig.verifyToken(token);

        assertEquals(userId, claims.sub());
        assertEquals("admin", claims.role());
        assertEquals("bob", claims.username());
    }

    @Test
    void verifyToken_invalidToken_throws() {
        assertThrows(JWTVerificationException.class, () ->
                jwtConfig.verifyToken("invalid.token.here"));
    }

    @Test
    void verifyToken_tamperedToken_throws() {
        String token = jwtConfig.generateToken("user-1", "developer", "carol");
        String tampered = token.substring(0, token.length() - 3) + "xxx";

        assertThrows(JWTVerificationException.class, () ->
                jwtConfig.verifyToken(tampered));
    }

    @Test
    void renewToken_preservesClaims() {
        String userId = UUID.randomUUID().toString();
        JwtClaims original = new JwtClaims(userId, "admin", "dave");

        String renewed = jwtConfig.renewToken(original);
        JwtClaims parsed = jwtConfig.verifyToken(renewed);

        assertEquals(userId, parsed.sub());
        assertEquals("admin", parsed.role());
        assertEquals("dave", parsed.username());
    }
}
