package com.appsmith.aiide.integration;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.*;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SkillResourceTest {

    private String adminToken;
    private String devToken;

    @BeforeEach
    void setup() {
        adminToken = TestHelper.loginAndGetToken("admin");
        devToken = TestHelper.loginAndGetToken("skill-dev");
    }

    @Test
    @Order(1)
    void listSkills_returns200() {
        given()
                .header("Authorization", "Bearer " + devToken)
                .when()
                .get("/api/skills")
                .then()
                .statusCode(200);
    }

    @Test
    @Order(2)
    void createSkill_asAdmin_returns200() {
        given()
                .header("Authorization", "Bearer " + adminToken)
                .contentType("application/json")
                .body("""
                    {
                        "name": "test-skill",
                        "description": "A test skill",
                        "category": "general",
                        "prompt": "You are a helpful assistant"
                    }
                    """)
                .when()
                .post("/api/skills")
                .then()
                .statusCode(anyOf(equalTo(200), equalTo(201)));
    }

    @Test
    @Order(3)
    void createSkill_asDeveloper_returns403() {
        given()
                .header("Authorization", "Bearer " + devToken)
                .contentType("application/json")
                .body("""
                    {
                        "name": "unauthorized-skill",
                        "description": "Should not be created",
                        "prompt": "test"
                    }
                    """)
                .when()
                .post("/api/skills")
                .then()
                .statusCode(403);
    }

    @Test
    @Order(4)
    void createSkill_noAuth_returns401() {
        given()
                .contentType("application/json")
                .body("{\"name\": \"no-auth-skill\", \"prompt\": \"test\"}")
                .when()
                .post("/api/skills")
                .then()
                .statusCode(401);
    }
}
