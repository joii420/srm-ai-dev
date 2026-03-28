package com.appsmith.aiide.integration;

import static io.restassured.RestAssured.given;

/**
 * Shared helper for integration tests.
 * Provides login utility to obtain JWT tokens.
 */
class TestHelper {

    static String loginAndGetToken(String username) {
        return given()
                .contentType("application/json")
                .body("{\"username\": \"" + username + "\", \"password\": \"dev\"}")
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200)
                .extract()
                .path("token");
    }
}
