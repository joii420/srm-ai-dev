package com.appsmith.aiide.util;

/**
 * Shared JSON utilities used across services and resources.
 */
public final class JsonUtil {

    private JsonUtil() {}

    /**
     * Escape a string for use as a JSON string value (without wrapping quotes).
     * Handles: \ " \n \r \t and control chars below 0x20.
     */
    public static String escapeJson(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }

    /**
     * Escape and wrap a string as a JSON string value (with wrapping quotes).
     * Suitable for embedding in a JSON body: e.g. {"content": wrapJsonString(value)}
     */
    public static String wrapJsonString(String s) {
        return "\"" + escapeJson(s) + "\"";
    }

    /**
     * Strip surrounding double quotes from a JSONB-stored string value.
     * Handles multiple layers: ""xxx"" → xxx
     */
    public static String unwrapJsonString(Object val) {
        if (val == null) return "";
        String s = val instanceof String str ? str : val.toString();
        while (s.length() >= 2 && s.startsWith("\"") && s.endsWith("\"")) {
            s = s.substring(1, s.length() - 1);
        }
        return s;
    }
}
