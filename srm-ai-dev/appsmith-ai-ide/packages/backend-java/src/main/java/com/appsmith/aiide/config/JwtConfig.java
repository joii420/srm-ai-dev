package com.appsmith.aiide.config;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Instant;

/**
 * HMAC-SHA256 JWT configuration for token generation and verification.
 * Uses com.auth0:java-jwt instead of SmallRye JWT (which requires RSA key pairs).
 */
@ApplicationScoped
public class JwtConfig {

    private static final String ISSUER = "ai-ide";

    @ConfigProperty(name = "aiide.jwt-secret")
    String jwtSecret;

    @ConfigProperty(name = "aiide.auth.jwt-expires-in", defaultValue = "28800")
    long jwtExpiresInSeconds;

    /**
     * Generate a signed JWT token with the given claims.
     *
     * @param userId   the subject (user ID)
     * @param role     the user's role (e.g. "admin", "user")
     * @param username the user's display name
     * @return a signed JWT string
     */
    public String generateToken(String userId, String role, String username) {
        Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(jwtExpiresInSeconds);

        return JWT.create()
                .withIssuer(ISSUER)
                .withSubject(userId)
                .withClaim("role", role)
                .withClaim("username", username)
                .withIssuedAt(now)
                .withExpiresAt(expiry)
                .sign(algorithm);
    }

    /**
     * Verify a JWT token and extract its claims.
     *
     * @param token the raw JWT string (without "Bearer " prefix)
     * @return decoded claims
     * @throws JWTVerificationException if the token is invalid, expired, or tampered with
     */
    public JwtClaims verifyToken(String token) throws JWTVerificationException {
        Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
        JWTVerifier verifier = JWT.require(algorithm)
                .withIssuer(ISSUER)
                .build();

        DecodedJWT decoded = verifier.verify(token);

        return new JwtClaims(
                decoded.getSubject(),
                decoded.getClaim("role").asString(),
                decoded.getClaim("username").asString()
        );
    }

    /**
     * Generate a renewed token with the same claims but a fresh expiry.
     * Used for sliding-window renewal when a user has an active checkout.
     */
    public String renewToken(JwtClaims claims) {
        return generateToken(claims.sub(), claims.role(), claims.username());
    }
}
