package com.appsmith.aiide.integration;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthResourceTest {

    private static String token;

    @Test
    @Order(1)
    void login_devMode_success() {
        token = given()
                .contentType("application/json")
                .body("{\"username\": \"testuser\", \"password\": \"dev\"}")
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200)
                .body("token", notNullValue())
                .body("userInfo.username", equalTo("testuser"))
                .body("userInfo.role", equalTo("developer"))
                .extract()
                .path("token");
    }

    @Test
    @Order(2)
    void login_adminUser_getsAdminRole() {
        given()
                .contentType("application/json")
                .body("{\"username\": \"admin\", \"password\": \"dev\"}")
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200)
                .body("userInfo.role", equalTo("admin"));
    }

    @Test
    @Order(3)
    void login_wrongPassword_returns401() {
        given()
                .contentType("application/json")
                .body("{\"username\": \"testuser\", \"password\": \"wrong\"}")
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(401)
                .body("error", equalTo("Unauthorized"));
    }

    @Test
    @Order(4)
    void me_withValidToken_returnsUserInfo() {
        // Ensure token is set
        if (token == null) login_devMode_success();

        given()
                .header("Authorization", "Bearer " + token)
                .when()
                .get("/api/auth/me")
                .then()
                .statusCode(200)
                .body("username", equalTo("testuser"))
                .body("id", notNullValue());
    }

    @Test
    @Order(5)
    void me_noToken_returns401() {
        given()
                .when()
                .get("/api/auth/me")
                .then()
                .statusCode(401);
    }

    @Test
    @Order(6)
    void me_invalidToken_returns401() {
        given()
                .header("Authorization", "Bearer invalid.token.value")
                .when()
                .get("/api/auth/me")
                .then()
                .statusCode(401);
    }

    @Test
    @Order(7)
    void logout_returns200() {
        if (token == null) login_devMode_success();

        given()
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .when()
                .post("/api/auth/logout")
                .then()
                .statusCode(200)
                .body("success", equalTo(true));
    }

    @Test
    @Order(8)
    void login_duplicateUsername_upsertsUser() {
        // Login twice with the same username
        given()
                .contentType("application/json")
                .body("{\"username\": \"duplicate-user\", \"password\": \"dev\"}")
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200);

        given()
                .contentType("application/json")
                .body("{\"username\": \"duplicate-user\", \"password\": \"dev\"}")
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200)
                .body("userInfo.username", equalTo("duplicate-user"));
    }
}
