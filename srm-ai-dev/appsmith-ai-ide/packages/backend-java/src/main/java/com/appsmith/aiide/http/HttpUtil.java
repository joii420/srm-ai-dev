package com.appsmith.aiide.http;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * IHttpService implementation based on java.net.HttpURLConnection.
 */
public class HttpUtil implements IHttpService {

    private static final int CONNECT_TIMEOUT = 10_000;
    private static final int READ_TIMEOUT = 10_000;

    // ------------------------------------------------------------------ GET

    @Override
    public String get(String url) throws IOException {
        return get(url, null);
    }

    @Override
    public String get(String url, Map<String, String> headers) throws IOException {
        HttpURLConnection conn = openConnection(url, "GET", headers);
        try {
            return readResponse(conn);
        } finally {
            conn.disconnect();
        }
    }

    @Override
    public Response getWithStatus(String url) throws IOException {
        return getWithStatus(url, null);
    }

    @Override
    public Response getWithStatus(String url, Map<String, String> headers) throws IOException {
        HttpURLConnection conn = openConnection(url, "GET", headers);
        try {
            int status = conn.getResponseCode();
            String body = readBody(conn, status);
            return new Response(status, body);
        } finally {
            conn.disconnect();
        }
    }

    // ------------------------------------------------------------------ POST

    @Override
    public String post(String url, String body) throws IOException {
        return post(url, body, null);
    }

    @Override
    public String post(String url, String body, Map<String, String> headers) throws IOException {
        HttpURLConnection conn = openConnection(url, "POST", headers);
        try {
            if (body != null && !body.isEmpty()) {
                conn.setDoOutput(true);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.getBytes(StandardCharsets.UTF_8));
                }
            }
            return readResponse(conn);
        } finally {
            conn.disconnect();
        }
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

        HttpURLConnection conn = openConnection(url, "POST", headers);
        try {
            if (json != null && !json.isEmpty()) {
                conn.setDoOutput(true);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(json.getBytes(StandardCharsets.UTF_8));
                }
            }
            int status = conn.getResponseCode();
            String body = readBody(conn, status);
            return new Response(status, body);
        } finally {
            conn.disconnect();
        }
    }

    // ------------------------------------------------------------------ PUT

    @Override
    public String put(String url, String body, Map<String, String> headers) throws IOException {
        HttpURLConnection conn = openConnection(url, "PUT", headers);
        try {
            if (body != null && !body.isEmpty()) {
                conn.setDoOutput(true);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.getBytes(StandardCharsets.UTF_8));
                }
            }
            return readResponse(conn);
        } finally {
            conn.disconnect();
        }
    }

    // ------------------------------------------------------------------ DELETE

    @Override
    public String delete(String url, Map<String, String> headers) throws IOException {
        HttpURLConnection conn = openConnection(url, "DELETE", headers);
        try {
            return readResponse(conn);
        } finally {
            conn.disconnect();
        }
    }

    // ------------------------------------------------------------------ Private helpers

    private static HttpURLConnection openConnection(String url, String method, Map<String, String> headers)
            throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(CONNECT_TIMEOUT);
        conn.setReadTimeout(READ_TIMEOUT);
        // Disable keep-alive to avoid "Unexpected end of file" when server closes idle connections
        conn.setRequestProperty("Connection", "close");
        // Only set Content-Type for methods that carry a body (POST/PUT), not for GET/DELETE
        if ("POST".equals(method) || "PUT".equals(method)) {
            conn.setRequestProperty("Content-Type", "application/json;charset=UTF-8");
        }

        if (headers != null) {
            for (Map.Entry<String, String> e : headers.entrySet()) {
                conn.setRequestProperty(e.getKey(), e.getValue());
            }
        }
        return conn;
    }

    private static String readResponse(HttpURLConnection conn) throws IOException {
        int status = conn.getResponseCode();
        return readBody(conn, status);
    }

    private static String readBody(HttpURLConnection conn, int status) throws IOException {
        InputStream is = (status >= 200 && status < 300)
                ? conn.getInputStream()
                : conn.getErrorStream();

        if (is == null) return "";

        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            return sb.toString();
        }
    }
}
