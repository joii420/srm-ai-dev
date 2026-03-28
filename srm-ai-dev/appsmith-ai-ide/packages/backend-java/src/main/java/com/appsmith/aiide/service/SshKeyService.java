package com.appsmith.aiide.service;

import com.appsmith.aiide.config.AppConfig;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Encrypts and decrypts SSH private keys using AES-256-GCM.
 * The encryption key is derived from the configured secret via SHA-256.
 *
 * Wire format (Base64-encoded): [12-byte IV][16-byte authTag][ciphertext]
 */
@ApplicationScoped
public class SshKeyService {

    private static final Logger LOG = Logger.getLogger(SshKeyService.class);

    private static final String AES_ALGORITHM = "AES";
    private static final String AES_GCM_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int GCM_TAG_LENGTH_BYTES = GCM_TAG_LENGTH_BITS / 8;

    @Inject
    AppConfig appConfig;

    /**
     * Encrypts plain text using AES-256-GCM.
     *
     * @param plainText the text to encrypt
     * @return Base64-encoded string: [IV][authTag][ciphertext]
     */
    public String encrypt(String plainText) {
        try {
            SecretKeySpec keySpec = deriveKey();
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(AES_GCM_TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));

            byte[] cipherTextWithTag = cipher.doFinal(plainText.getBytes(java.nio.charset.StandardCharsets.UTF_8));

            // Java GCM appends the auth tag at the end of ciphertext.
            // We reorder to: [IV][authTag][ciphertext] for wire format compatibility.
            int cipherTextLength = cipherTextWithTag.length - GCM_TAG_LENGTH_BYTES;
            byte[] cipherText = new byte[cipherTextLength];
            byte[] authTag = new byte[GCM_TAG_LENGTH_BYTES];
            System.arraycopy(cipherTextWithTag, 0, cipherText, 0, cipherTextLength);
            System.arraycopy(cipherTextWithTag, cipherTextLength, authTag, 0, GCM_TAG_LENGTH_BYTES);

            ByteBuffer output = ByteBuffer.allocate(GCM_IV_LENGTH + GCM_TAG_LENGTH_BYTES + cipherTextLength);
            output.put(iv);
            output.put(authTag);
            output.put(cipherText);

            return Base64.getEncoder().encodeToString(output.array());
        } catch (Exception e) {
            LOG.error("Encryption failed", e);
            throw new RuntimeException("Failed to encrypt SSH key", e);
        }
    }

    /**
     * Decrypts cipher text produced by {@link #encrypt(String)}.
     *
     * @param cipherTextBase64 Base64-encoded string: [IV][authTag][ciphertext]
     * @return the original plain text
     */
    public String decrypt(String cipherTextBase64) {
        try {
            byte[] decoded = Base64.getDecoder().decode(cipherTextBase64);

            ByteBuffer buffer = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] authTag = new byte[GCM_TAG_LENGTH_BYTES];
            byte[] cipherText = new byte[decoded.length - GCM_IV_LENGTH - GCM_TAG_LENGTH_BYTES];

            buffer.get(iv);
            buffer.get(authTag);
            buffer.get(cipherText);

            // Reassemble to Java GCM format: [ciphertext][authTag]
            byte[] cipherTextWithTag = new byte[cipherText.length + GCM_TAG_LENGTH_BYTES];
            System.arraycopy(cipherText, 0, cipherTextWithTag, 0, cipherText.length);
            System.arraycopy(authTag, 0, cipherTextWithTag, cipherText.length, GCM_TAG_LENGTH_BYTES);

            SecretKeySpec keySpec = deriveKey();
            Cipher cipher = Cipher.getInstance(AES_GCM_TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));

            byte[] plainBytes = cipher.doFinal(cipherTextWithTag);
            return new String(plainBytes, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            LOG.error("Decryption failed", e);
            throw new RuntimeException("Failed to decrypt SSH key", e);
        }
    }

    private SecretKeySpec deriveKey() throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] keyBytes = digest.digest(
                appConfig.getSshKeyEncryptSecret().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return new SecretKeySpec(keyBytes, AES_ALGORITHM);
    }
}
