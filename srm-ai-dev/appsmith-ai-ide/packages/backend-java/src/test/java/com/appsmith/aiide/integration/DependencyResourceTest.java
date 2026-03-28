package com.appsmith.aiide.integration;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.*;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class DependencyResourceTest {

    private String adminToken;
    private String devToken;

    @BeforeEach
    void setup() {
        adminToken = TestHelper.loginAndGetToken("admin");
        devToken = TestHelper.loginAndGetToken("dep-dev");
    }

    @Test
    @Order(1)
    void listDeps_asAdmin_returns200() {
        given()
                .header("Authorization", "Bearer " + adminToken)
                .when()
                .get("/api/deps")
                .then()
                .statusCode(200);
    }

    @Test
    @Order(2)
    void createDep_asAdmin_returns200() {
        given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType("application/json")
                .body("""
                    {
                        "namespace": "test-lib",
                        "url": "https://example.com/test-lib.js",
                        "version": "1.0.0",
                        "description": "A test dependency"
                    }
                    """)
                .when()
                .post("/api/deps")
                .then()
                .statusCode(anyOf(equalTo(200), equalTo(201)));
    }

    @Test
    @Order(3)
    void createDep_asDeveloper_returns403() {
        given()
                .header("Authorization", "Bearer " + devToken)
                .contentType("application/json")
                .body("""
                    {
                        "namespace": "unauthorized-lib",
                        "url": "https://example.com/lib.js"
                    }
                    """)
                .when()
                .post("/api/deps")
                .then()
                .statusCode(403);
    }

    @Test
    @Order(4)
    void createDep_noAuth_returns401() {
        given()
                .contentType("application/json")
                .body("{\"namespace\": \"no-auth-lib\"}")
                .when()
                .post("/api/deps")
                .then()
                .statusCode(401);
    }
}
