package com.appsmith.aiide.http;

import io.vertx.ext.web.RoutingContext;

/**
 * 请求IP工具类
 */
public class RequestIpUtils {

    private static final String[] IP_HEADERS = {
        "X-Forwarded-For",
        "X-Real-IP",
        "Proxy-Client-IP",
        "WL-Proxy-Client-IP",
        "HTTP_X_FORWARDED_FOR",
        "HTTP_X_FORWARDED",
        "HTTP_X_CLUSTER_CLIENT_IP",
        "HTTP_CLIENT_IP",
        "HTTP_FORWARDED_FOR",
        "HTTP_FORWARDED",
        "HTTP_VIA",
        "REMOTE_ADDR"
    };

    private static final String UNKNOWN = "unknown";
    private static final String LOCALHOST_IPV4 = "127.0.0.1";
    private static final String LOCALHOST_IPV6 = "0:0:0:0:0:0:0:1";

    private RequestIpUtils() {}

    /**
     * 获取客户端真实IP
     */
    public static String getClientIp(RoutingContext context) {
        // 优先从请求头获取（处理反向代理场景）
        for (String header : IP_HEADERS) {
            String ip = context.request().getHeader(header);
            if (isValidIp(ip)) {
                // X-Forwarded-For 可能包含多个IP，取第一个
                return extractFirstIp(ip);
            }
        }

        // 回退到远程地址
        String remoteIp = context.request().remoteAddress() != null
            ? context.request().remoteAddress().hostAddress()
            : null;

        if (LOCALHOST_IPV6.equals(remoteIp)) {
            return LOCALHOST_IPV4;
        }

        return remoteIp != null ? remoteIp : UNKNOWN;
    }

    /**
     * 判断是否为内网IP
     */
    public static boolean isInternalIp(String ip) {
        if (ip == null || ip.isEmpty()) return false;
        if (LOCALHOST_IPV4.equals(ip) || LOCALHOST_IPV6.equals(ip)) return true;

        String[] parts = ip.split("\\.");
        if (parts.length != 4) return false;

        try {
            int a = Integer.parseInt(parts[0]);
            int b = Integer.parseInt(parts[1]);
            // 10.0.0.0/8
            if (a == 10) return true;
            // 172.16.0.0/12
            if (a == 172 && b >= 16 && b <= 31) return true;
            // 192.168.0.0/16
            if (a == 192 && b == 168) return true;
        } catch (NumberFormatException e) {
            return false;
        }
        return false;
    }

    private static boolean isValidIp(String ip) {
        return ip != null && !ip.isEmpty() && !UNKNOWN.equalsIgnoreCase(ip);
    }

    private static String extractFirstIp(String ip) {
        if (ip.contains(",")) {
            return ip.split(",")[0].trim();
        }
        return ip.trim();
    }
}