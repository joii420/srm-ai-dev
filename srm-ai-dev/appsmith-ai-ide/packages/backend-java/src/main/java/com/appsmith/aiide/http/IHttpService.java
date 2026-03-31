package com.appsmith.aiide.http;

import java.io.IOException;
import java.util.Map;

/**
 * HTTP service interface.
 * Two implementations:
 * - HttpUtil: based on java.net.HttpURLConnection
 * - HttpClientUtil: based on java.net.http.HttpClient
 *
 * Switch via config: aiide.http-service-type=httputil | httpclient
 */
public interface IHttpService {

    // ------------------------------------------------------------------ Response

    /**
     * Wraps HTTP response with status code and body.
     */
    class Response {
        public final int statusCode;
        public final String body;

        public Response(int statusCode, String body) {
            this.statusCode = statusCode;
            this.body = body;
        }

        public boolean isSuccess() {
            return statusCode >= 200 && statusCode < 300;
        }

        @Override
        public String toString() {
            return "Response{statusCode=" + statusCode + ", body=" + body + "}";
        }
    }

    // ------------------------------------------------------------------ GET

    String get(String url) throws IOException;

    String get(String url, Map<String, String> headers) throws IOException;

    Response getWithStatus(String url) throws IOException;

    Response getWithStatus(String url, Map<String, String> headers) throws IOException;

    // ------------------------------------------------------------------ POST

    String post(String url, String body) throws IOException;

    String post(String url, String body, Map<String, String> headers) throws IOException;

    String postJson(String url, String json) throws IOException;

    String postJson(String url, String json, Map<String, String> extraHeaders) throws IOException;

    // ------------------------------------------------------------------ POST with status

    Response postJsonWithStatus(String url, String json) throws IOException;

    Response postJsonWithStatus(String url, String json, Map<String, String> extraHeaders) throws IOException;

    // ------------------------------------------------------------------ PUT

    String put(String url, String body, Map<String, String> headers) throws IOException;

    // ------------------------------------------------------------------ DELETE

    String delete(String url, Map<String, String> headers) throws IOException;
}
