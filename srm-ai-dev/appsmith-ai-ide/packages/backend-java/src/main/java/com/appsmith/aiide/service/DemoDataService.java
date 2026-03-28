package com.appsmith.aiide.service;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.json.Json;
import jakarta.json.JsonArray;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;
import jakarta.json.JsonString;
import jakarta.json.JsonValue;
import org.jboss.logging.Logger;

import java.io.InputStream;
import java.util.*;

/**
 * Provides mock demo data loaded from classpath resource mock/demo.json.
 * Used when third-party APIs (GitLab, etc.) are not configured.
 */
@ApplicationScoped
public class DemoDataService {

    private static final Logger LOG = Logger.getLogger(DemoDataService.class);

    private JsonObject demoData;
    private boolean loaded = false;

    @PostConstruct
    void init() {
        try (InputStream is = Thread.currentThread().getContextClassLoader()
                .getResourceAsStream("mock/demo.json")) {
            if (is == null) {
                LOG.warn("mock/demo.json not found on classpath, demo data unavailable");
                return;
            }
            try (JsonReader reader = Json.createReader(is)) {
                demoData = reader.readObject();
                loaded = true;
                LOG.info("Demo data loaded from mock/demo.json");
            }
        } catch (Exception e) {
            LOG.error("Failed to load mock/demo.json", e);
        }
    }

    /**
     * @return true if demo data was successfully loaded
     */
    public boolean isLoaded() {
        return loaded;
    }

    /**
     * Returns the mock page list from demo data.
     *
     * @return list of page objects as maps, or empty list if not loaded
     */
    public List<Map<String, Object>> getPages() {
        if (!loaded || !demoData.containsKey("pages")) {
            return Collections.emptyList();
        }
        return jsonArrayToListOfMaps(demoData.getJsonArray("pages"));
    }

    /**
     * Returns the mock file tree for a given page.
     *
     * @param pageId the page identifier
     * @return file tree as a list of file/directory entries, or empty list
     */
    public List<Map<String, Object>> getFileTree(String pageId) {
        if (!loaded || !demoData.containsKey("fileTrees")) {
            return Collections.emptyList();
        }
        JsonObject fileTrees = demoData.getJsonObject("fileTrees");
        if (fileTrees.containsKey(pageId)) {
            return jsonArrayToListOfMaps(fileTrees.getJsonArray(pageId));
        }
        return Collections.emptyList();
    }

    /**
     * Returns mock file content for a given page and file path.
     *
     * @param pageId   the page identifier
     * @param filePath the file path within the project
     * @return the file content string, or null if not found
     */
    public String getFileContent(String pageId, String filePath) {
        if (!loaded || !demoData.containsKey("fileContents")) {
            return null;
        }
        JsonObject fileContents = demoData.getJsonObject("fileContents");
        String key = pageId + ":" + filePath;
        if (fileContents.containsKey(key)) {
            return fileContents.getString(key);
        }
        // Also try nested lookup: fileContents -> pageId -> filePath
        if (fileContents.containsKey(pageId)) {
            JsonValue val = fileContents.get(pageId);
            if (val.getValueType() == JsonValue.ValueType.OBJECT) {
                JsonObject pageFiles = val.asJsonObject();
                if (pageFiles.containsKey(filePath)) {
                    return pageFiles.getString(filePath);
                }
            }
        }
        return null;
    }

    private List<Map<String, Object>> jsonArrayToListOfMaps(JsonArray array) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (JsonValue value : array) {
            if (value.getValueType() == JsonValue.ValueType.OBJECT) {
                result.add(jsonObjectToMap(value.asJsonObject()));
            }
        }
        return result;
    }

    private Map<String, Object> jsonObjectToMap(JsonObject obj) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (String key : obj.keySet()) {
            JsonValue val = obj.get(key);
            map.put(key, jsonValueToObject(val));
        }
        return map;
    }

    private Object jsonValueToObject(JsonValue val) {
        return switch (val.getValueType()) {
            case STRING -> ((JsonString) val).getString();
            case NUMBER -> val.toString();
            case TRUE -> true;
            case FALSE -> false;
            case NULL -> null;
            case OBJECT -> jsonObjectToMap(val.asJsonObject());
            case ARRAY -> jsonArrayToListOfMaps(val.asJsonArray());
        };
    }
}
