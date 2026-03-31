package com.appsmith.aiide.service;

import com.appsmith.aiide.config.AppConfig;
import com.appsmith.aiide.http.IHttpService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Client for the external edit-lock API (script-engine/editLock).
 * Provides checkout/checkin lock control and state query.
 * <p>
 * If aiide.edit-lock-api-url is not configured (empty), all methods
 * degrade gracefully: checkOut returns true, checkIn is a no-op,
 * queryState returns null.
 */
@ApplicationScoped
public class EditLockService {

    private static final Logger LOG = Logger.getLogger(EditLockService.class);

    @Inject
    AppConfig appConfig;

    @Inject
    IHttpService httpService;

    /**
     * Whether the external edit-lock API is configured.
     */
    public boolean isEnabled() {
        String url = appConfig.getEditLockApiUrl();
        return url != null && !url.isBlank();
    }

    /**
     * Query the current edit-lock state for a program.
     *
     * @param code program name (page.name)
     * @param acct login account (user.username)
     * @return parsed response map, or null if not configured / call fails
     */
    public Map<String, Object> queryState(String code, String acct) {
        if (!isEnabled()) {
            return null;
        }

        String baseUrl = appConfig.getEditLockApiUrl().replaceAll("/+$", "");
        String url = baseUrl + "/editLock/state?acct="
                + URLEncoder.encode(acct, StandardCharsets.UTF_8)
                + "&code=" + URLEncoder.encode(code, StandardCharsets.UTF_8);

        try {
            LOG.infof("[EditLock] >>> GET %s", url);

            IHttpService.Response response = httpService.getWithStatus(url);
            LOG.infof("[EditLock] <<< queryState status=%d response=%s", response.statusCode, response.body);

            if (response.statusCode == 200) {
                return parseResponse(response.body);
            }
            LOG.warnf("[EditLock] queryState returned non-200 status: %d", response.statusCode);
            return null;
        } catch (Exception e) {
            LOG.errorf(e, "[EditLock] queryState failed: GET %s", url);
            return null;
        }
    }

    /**
     * Call the external checkOut API to acquire the edit lock.
     *
     * @param code program name (page.name)
     * @param acct login account (user.username)
     * @return true if canEdit=true (checkout succeeded), false otherwise
     */
    public boolean checkOut(String code, String acct) {
        if (!isEnabled()) {
            return true; // not configured, allow by default
        }

        String baseUrl = appConfig.getEditLockApiUrl().replaceAll("/+$", "");
        String url = baseUrl + "/editLock/checkOut";
        String body = String.format("{\"code\":\"%s\",\"acct\":\"%s\"}", escapeJson(code), escapeJson(acct));

        try {
            LOG.infof("[EditLock] >>> POST %s body=%s", url, body);

            IHttpService.Response response = httpService.postJsonWithStatus(url, body);
            LOG.infof("[EditLock] <<< checkOut status=%d response=%s", response.statusCode, response.body);

            if (response.statusCode == 200) {
                Map<String, Object> parsed = parseResponse(response.body);
                if (parsed != null) {
                    Object data = parsed.get("data");
                    if (data instanceof Map<?, ?> dataMap) {
                        Object canEdit = dataMap.get("canEdit");
                        return Boolean.TRUE.equals(canEdit);
                    }
                }
            }
            LOG.warnf("[EditLock] checkOut returned non-200 status: %d", response.statusCode);
            return false;
        } catch (Exception e) {
            LOG.errorf(e, "[EditLock] checkOut failed: POST %s body=%s", url, body);
            return false;
        }
    }

    /**
     * Call the external checkIn API to release the edit lock.
     *
     * @param code program name (page.name)
     * @param acct login account (user.username)
     */
    public void checkIn(String code, String acct) {
        if (!isEnabled()) {
            return;
        }

        String baseUrl = appConfig.getEditLockApiUrl().replaceAll("/+$", "");
        String url = baseUrl + "/editLock/checkIn";
        String body = String.format("{\"code\":\"%s\",\"acct\":\"%s\"}", escapeJson(code), escapeJson(acct));

        try {
            LOG.infof("[EditLock] >>> POST %s body=%s", url, body);

            IHttpService.Response response = httpService.postJsonWithStatus(url, body);
            LOG.infof("[EditLock] <<< checkIn status=%d response=%s", response.statusCode, response.body);
        } catch (Exception e) {
            LOG.errorf(e, "[EditLock] checkIn failed: POST %s body=%s", url, body);
        }
    }

    // --- Private helpers ---

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }

    /**
     * Simple JSON parser — parses the external API response into a nested Map.
     * Handles: {"code":"0","msg":"success","success":true,"data":{...}}
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> parseResponse(String json) {
        try {
            // Use a simple recursive descent approach for the known response shape
            return (Map<String, Object>) parseValue(json.trim(), new int[]{0});
        } catch (Exception e) {
            LOG.warnf("Failed to parse edit-lock response: %s", e.getMessage());
            return null;
        }
    }

    private Object parseValue(String json, int[] pos) {
        skipWhitespace(json, pos);
        if (pos[0] >= json.length()) return null;

        char c = json.charAt(pos[0]);
        if (c == '{') return parseObject(json, pos);
        if (c == '[') return parseArray(json, pos);
        if (c == '"') return parseString(json, pos);
        if (c == 't' || c == 'f') return parseBoolean(json, pos);
        if (c == 'n') {
            pos[0] += 4;
            return null;
        }
        return parseNumber(json, pos);
    }

    private Map<String, Object> parseObject(String json, int[] pos) {
        var map = new java.util.LinkedHashMap<String, Object>();
        pos[0]++; // skip '{'
        skipWhitespace(json, pos);
        if (pos[0] < json.length() && json.charAt(pos[0]) == '}') {
            pos[0]++;
            return map;
        }

        while (pos[0] < json.length()) {
            skipWhitespace(json, pos);
            String key = parseString(json, pos);
            skipWhitespace(json, pos);
            pos[0]++; // skip ':'
            Object value = parseValue(json, pos);
            map.put(key, value);
            skipWhitespace(json, pos);
            if (pos[0] < json.length() && json.charAt(pos[0]) == ',') {
                pos[0]++;
            } else break;
        }
        if (pos[0] < json.length() && json.charAt(pos[0]) == '}') pos[0]++;
        return map;
    }

    private java.util.List<Object> parseArray(String json, int[] pos) {
        var list = new java.util.ArrayList<Object>();
        pos[0]++; // skip '['
        skipWhitespace(json, pos);
        if (pos[0] < json.length() && json.charAt(pos[0]) == ']') {
            pos[0]++;
            return list;
        }

        while (pos[0] < json.length()) {
            list.add(parseValue(json, pos));
            skipWhitespace(json, pos);
            if (pos[0] < json.length() && json.charAt(pos[0]) == ',') {
                pos[0]++;
            } else break;
        }
        if (pos[0] < json.length() && json.charAt(pos[0]) == ']') pos[0]++;
        return list;
    }

    private String parseString(String json, int[] pos) {
        pos[0]++; // skip opening '"'
        StringBuilder sb = new StringBuilder();
        while (pos[0] < json.length()) {
            char c = json.charAt(pos[0]);
            if (c == '\\') {
                pos[0]++;
                if (pos[0] < json.length()) {
                    char esc = json.charAt(pos[0]);
                    switch (esc) {
                        case '"', '\\', '/' -> sb.append(esc);
                        case 'n' -> sb.append('\n');
                        case 't' -> sb.append('\t');
                        case 'r' -> sb.append('\r');
                        default -> {
                            sb.append('\\');
                            sb.append(esc);
                        }
                    }
                }
            } else if (c == '"') {
                pos[0]++;
                return sb.toString();
            } else {
                sb.append(c);
            }
            pos[0]++;
        }
        return sb.toString();
    }

    private Boolean parseBoolean(String json, int[] pos) {
        if (json.startsWith("true", pos[0])) {
            pos[0] += 4;
            return true;
        }
        if (json.startsWith("false", pos[0])) {
            pos[0] += 5;
            return false;
        }
        return false;
    }

    private Object parseNumber(String json, int[] pos) {
        int start = pos[0];
        while (pos[0] < json.length()) {
            char c = json.charAt(pos[0]);
            if (c == ',' || c == '}' || c == ']' || Character.isWhitespace(c)) break;
            pos[0]++;
        }
        String num = json.substring(start, pos[0]);
        if (num.contains(".")) return Double.parseDouble(num);
        return Long.parseLong(num);
    }

    private void skipWhitespace(String json, int[] pos) {
        while (pos[0] < json.length() && Character.isWhitespace(json.charAt(pos[0]))) pos[0]++;
    }
}
