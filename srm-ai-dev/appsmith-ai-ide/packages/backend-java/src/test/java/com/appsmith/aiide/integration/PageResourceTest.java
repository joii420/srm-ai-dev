package com.appsmith.aiide.integration;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.*;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PageResourceTest {

    private String devToken;

    @BeforeEach
    void setup() {
        devToken = TestHelper.loginAndGetToken("page-test-user");
    }

    @Test
    @Order(1)
    void listPages_returnsPageList() {
        given()
                .header("Authorization", "Bearer " + devToken)
                .when()
                .get("/api/pages")
                .then()
                .statusCode(200)
                .body("pages", notNullValue())
                .body("pages.size()", greaterThan(0))
                .body("pages[0].pageId", notNullValue())
                .body("pages[0].pageName", notNullValue())
                .body("pages[0].status", notNullValue());
    }

    @Test
    @Order(2)
    void listPages_freePageHasCorrectStatus() {
        given()
                .header("Authorization", "Bearer " + devToken)
                .when()
                .get("/api/pages")
                .then()
                .statusCode(200)
                .body("pages[0].status", equalTo("free"));
    }

    @Test
    @Order(3)
    void listPages_noToken_returns401() {
        given()
                .when()
                .get("/api/pages")
                .then()
                .statusCode(401);
    }

    @Test
    @Order(4)
    void listPages_containsGitlabRepoUrl() {
        given()
                .header("Authorization", "Bearer " + devToken)
                .when()
                .get("/api/pages")
                .then()
                .statusCode(200)
                .body("pages[0].gitlabRepoUrl", notNullValue())
                .body("pages[0].gitlabRepoUrl", containsString(".git"));
    }

    @Test
    @Order(5)
    void getTree_returnsMockTree() {
        given()
                .header("Authorization", "Bearer " + devToken)
                .when()
                .get("/api/pages/page-001/tree")
                .then()
                .statusCode(200)
                .body("tree", notNullValue())
                .body("tree.size()", greaterThan(0));
    }

    @Test
    @Order(6)
    void getFile_missingPath_returns400() {
        given()
                .header("Authorization", "Bearer " + devToken)
                .when()
                .get("/api/pages/page-001/files")
                .then()
                .statusCode(400);
    }

    @Test
    @Order(7)
    void getFile_withPath_returns200() {
        given()
                .header("Authorization", "Bearer " + devToken)
                .queryParam("path", "README.md")
                .when()
                .get("/api/pages/page-001/files")
                .then()
                .statusCode(200)
                .body("content", notNullValue());
    }

    @Test
    @Order(8)
    void checkin_noActiveCheckout_returns404() {
        given()
                .header("Authorization", "Bearer " + devToken)
                .contentType("application/json")
                .body("{\"commitMessage\": \"test commit\"}")
                .when()
                .post("/api/pages/page-001/checkin")
                .then()
                .statusCode(404);
    }
}
