package com.appsmith.aiide.http;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * IHttpService implementation based on java.net.http.HttpClient (Java 11+).
 */
public class HttpClientUtil implements IHttpService {

    private static final int CONNECT_TIMEOUT = 10;
    private static final int READ_TIMEOUT = 10;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(CONNECT_TIMEOUT))
            .build();

    // ------------------------------------------------------------------ GET

    @Override
    public String get(String url) throws IOException {
        return get(url, null);
    }

    @Override
    public String get(String url, Map<String, String> headers) throws IOException {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(READ_TIMEOUT))
                .header("Content-Type", "application/json;charset=UTF-8")
                .GET();
        applyHeaders(builder, headers);

        HttpResponse<String> response = send(builder.build());
        return response.body();
    }

    @Override
    public Response getWithStatus(String url) throws IOException {
        return getWithStatus(url, null);
    }

    @Override
    public Response getWithStatus(String url, Map<String, String> headers) throws IOException {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(READ_TIMEOUT))
                .header("Content-Type", "application/json;charset=UTF-8")
                .GET();
        applyHeaders(builder, headers);

        HttpResponse<String> response = send(builder.build());
        return new Response(response.statusCode(), response.body());
    }

    // ------------------------------------------------------------------ POST

    @Override
    public String post(String url, String body) throws IOException {
        return post(url, body, null);
    }

    @Override
    public String post(String url, String body, Map<String, String> headers) throws IOException {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(READ_TIMEOUT))
                .header("Content-Type", "application/json;charset=UTF-8");
        applyHeaders(builder, headers);

        if (body != null && !body.isEmpty()) {
            builder.POST(HttpRequest.BodyPublishers.ofString(body));
        } else {
            builder.POST(HttpRequest.BodyPublishers.noBody());
        }

        HttpResponse<String> response = send(builder.build());
        return response.body();
    }

    @Override
    public String postJson(String url, String json) throws IOException {
        return postJson(url, json, null);
    }

    @Override
    public String postJson(String url, String json, Map<String, String> extraHeaders) throws IOException {
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", "application/json;charset=UTF-8");
        headers.put("Accept", "application/json");
        if (extraHeaders != null) headers.putAll(extraHeaders);
        return post(url, json, headers);
    }

    // ------------------------------------------------------------------ POST with status

    @Override
    public Response postJsonWithStatus(String url, String json) throws IOException {
        return postJsonWithStatus(url, json, null);
    }

    @Override
    public Response postJsonWithStatus(String url, String json, Map<String, String> extraHeaders) throws IOException {
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", "application/json;charset=UTF-8");
        headers.put("Accept", "application/json");
        if (extraHeaders != null) headers.putAll(extraHeaders);

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(READ_TIMEOUT));
        applyHeaders(builder, headers);

        if (json != null && !json.isEmpty()) {
            builder.POST(HttpRequest.BodyPublishers.ofString(json));
        } else {
            builder.POST(HttpRequest.BodyPublishers.noBody());
        }

        HttpResponse<String> response = send(builder.build());
        return new Response(response.statusCode(), response.body());
    }

    @Override
    public Response postJsonWithStatus(String url, String json, Map<String, String> extraHeaders, int readTimeoutMs) throws IOException {
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", "application/json;charset=UTF-8");
        headers.put("Accept", "application/json");
        if (extraHeaders != null) headers.putAll(extraHeaders);

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofMillis(readTimeoutMs));
        applyHeaders(builder, headers);

        if (json != null && !json.isEmpty()) {
            builder.POST(HttpRequest.BodyPublishers.ofString(json));
        } else {
            builder.POST(HttpRequest.BodyPublishers.noBody());
        }

        HttpResponse<String> response = send(builder.build());
        return new Response(response.statusCode(), response.body());
    }

    // ------------------------------------------------------------------ PUT

    @Override
    public String put(String url, String body, Map<String, String> headers) throws IOException {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(READ_TIMEOUT))
                .header("Content-Type", "application/json;charset=UTF-8");
        applyHeaders(builder, headers);

        if (body != null && !body.isEmpty()) {
            builder.PUT(HttpRequest.BodyPublishers.ofString(body));
        } else {
            builder.PUT(HttpRequest.BodyPublishers.noBody());
        }

        HttpResponse<String> response = send(builder.build());
        return response.body();
    }

    // ------------------------------------------------------------------ PUT with status

    @Override
    public Response putWithStatus(String url, String body, Map<String, String> headers) throws IOException {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(READ_TIMEOUT))
                .header("Content-Type", "application/json;charset=UTF-8");
        applyHeaders(builder, headers);

        if (body != null && !body.isEmpty()) {
            builder.PUT(HttpRequest.BodyPublishers.ofString(body));
        } else {
            builder.PUT(HttpRequest.BodyPublishers.noBody());
        }

        HttpResponse<String> response = send(builder.build());
        return new Response(response.statusCode(), response.body());
    }

    // ------------------------------------------------------------------ DELETE

    @Override
    public String delete(String url, Map<String, String> headers) throws IOException {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(READ_TIMEOUT))
                .header("Content-Type", "application/json;charset=UTF-8")
                .DELETE();
        applyHeaders(builder, headers);

        HttpResponse<String> response = send(builder.build());
        return response.body();
    }

    @Override
    public Response deleteWithStatus(String url, Map<String, String> headers) throws IOException {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(READ_TIMEOUT))
                .header("Content-Type", "application/json;charset=UTF-8")
                .DELETE();
        applyHeaders(builder, headers);

        HttpResponse<String> response = send(builder.build());
        return new Response(response.statusCode(), response.body());
    }

    // ------------------------------------------------------------------ Private helpers

    private void applyHeaders(HttpRequest.Builder builder, Map<String, String> headers) {
        if (headers != null) {
            for (Map.Entry<String, String> e : headers.entrySet()) {
                builder.header(e.getKey(), e.getValue());
            }
        }
    }

    private HttpResponse<String> send(HttpRequest request) throws IOException {
        try {
            return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("HTTP request interrupted", e);
        }
    }
}
