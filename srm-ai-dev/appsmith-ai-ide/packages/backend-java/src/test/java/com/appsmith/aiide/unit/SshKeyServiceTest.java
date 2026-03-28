package com.appsmith.aiide.unit;

import com.appsmith.aiide.service.SshKeyService;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class SshKeyServiceTest {

    @Inject
    SshKeyService sshKeyService;

    @Test
    void encryptAndDecrypt_roundTrip() {
        String original = "-----BEGIN OPENSSH PRIVATE KEY-----\ntest-key-content\n-----END OPENSSH PRIVATE KEY-----";
        String encrypted = sshKeyService.encrypt(original);

        assertNotNull(encrypted);
        assertNotEquals(original, encrypted);

        String decrypted = sshKeyService.decrypt(encrypted);
        assertEquals(original, decrypted);
    }

    @Test
    void encrypt_differentCallsProduceDifferentCiphertext() {
        String plainText = "same-input";
        String encrypted1 = sshKeyService.encrypt(plainText);
        String encrypted2 = sshKeyService.encrypt(plainText);

        // AES-GCM uses random IV, so ciphertexts should differ
        assertNotEquals(encrypted1, encrypted2);

        // Both should decrypt to the same value
        assertEquals(plainText, sshKeyService.decrypt(encrypted1));
        assertEquals(plainText, sshKeyService.decrypt(encrypted2));
    }

    @Test
    void decrypt_invalidInput_throws() {
        assertThrows(RuntimeException.class, () ->
                sshKeyService.decrypt("dGhpcyBpcyBub3QgZW5jcnlwdGVk"));
    }

    @Test
    void encrypt_emptyString_works() {
        String encrypted = sshKeyService.encrypt("");
        String decrypted = sshKeyService.decrypt(encrypted);
        assertEquals("", decrypted);
    }

    @Test
    void encrypt_unicodeContent_works() {
        String unicode = "你好世界 🔑 SSH密钥测试";
        String encrypted = sshKeyService.encrypt(unicode);
        String decrypted = sshKeyService.decrypt(encrypted);
        assertEquals(unicode, decrypted);
    }
}
