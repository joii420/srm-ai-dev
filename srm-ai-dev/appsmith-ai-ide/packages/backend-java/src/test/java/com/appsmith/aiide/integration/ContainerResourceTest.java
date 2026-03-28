package com.appsmith.aiide.integration;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.*;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ContainerResourceTest {

    private String adminToken;
    private String devToken;

    @BeforeEach
    void setup() {
        adminToken = TestHelper.loginAndGetToken("admin");
        devToken = TestHelper.loginAndGetToken("container-dev");
    }

    @Test
    @Order(1)
    void listActive_asAdmin_returns200() {
        given()
                .header("Authorization", "Bearer " + adminToken)
                .when()
                .get("/api/containers")
                .then()
                .statusCode(200)
                .body("containers", notNullValue());
    }

    @Test
    @Order(2)
    void listActive_asDeveloper_returns403() {
        given()
                .header("Authorization", "Bearer " + devToken)
                .when()
                .get("/api/containers")
                .then()
                .statusCode(403);
    }

    @Test
    @Order(3)
    void forceCheckin_notFound_returns404() {
        given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType("application/json")
                .when()
                .post("/api/containers/" + UUID.randomUUID() + "/force-checkin")
                .then()
                .statusCode(404);
    }

    @Test
    @Order(4)
    void forceDestroy_notFound_returns404() {
        given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType("application/json")
                .when()
                .post("/api/containers/" + UUID.randomUUID() + "/force-destroy")
                .then()
                .statusCode(404);
    }

    @Test
    @Order(5)
    void forceCheckin_asDeveloper_returns403() {
        given()
                .header("Authorization", "Bearer " + devToken)
                .contentType("application/json")
                .when()
                .post("/api/containers/" + UUID.randomUUID() + "/force-checkin")
                .then()
                .statusCode(403);
    }
}
