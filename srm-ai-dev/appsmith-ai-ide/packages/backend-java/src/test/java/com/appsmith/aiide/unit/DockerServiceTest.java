package com.appsmith.aiide.unit;

import com.appsmith.aiide.service.DockerService;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for DockerService helper methods (no Docker daemon required).
 */
class DockerServiceTest {

    @Test
    void parseMemory_withGigabytes() throws Exception {
        DockerService service = new DockerService();
        long result = invokeParseMemory(service, "1g");
        assertEquals(1_073_741_824L, result);
    }

    @Test
    void parseMemory_withMegabytes() throws Exception {
        DockerService service = new DockerService();
        long result = invokeParseMemory(service, "512m");
        assertEquals(536_870_912L, result);
    }

    @Test
    void parseMemory_withQuotedValue() throws Exception {
        DockerService service = new DockerService();
        long result = invokeParseMemory(service, "\"1g\"");
        assertEquals(1_073_741_824L, result);
    }

    @Test
    void parseMemory_rawBytes() throws Exception {
        DockerService service = new DockerService();
        long result = invokeParseMemory(service, "1048576");
        assertEquals(1_048_576L, result);
    }

    @Test
    void parseMemory_withSpaces() throws Exception {
        DockerService service = new DockerService();
        long result = invokeParseMemory(service, "  2g  ");
        assertEquals(2_147_483_648L, result);
    }

    @Test
    void parseMemory_fractionalGigabytes() throws Exception {
        DockerService service = new DockerService();
        long result = invokeParseMemory(service, "0.5g");
        assertEquals(536_870_912L, result);
    }

    /**
     * Reflectively invoke the private parseMemory method.
     */
    private long invokeParseMemory(DockerService service, String value) throws Exception {
        Method method = DockerService.class.getDeclaredMethod("parseMemory", String.class);
        method.setAccessible(true);
        return (long) method.invoke(service, value);
    }
}
