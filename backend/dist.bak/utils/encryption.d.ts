/**
 * Encryption Utility Module
 * Provides AES-256-GCM encryption for sensitive field data
 */
/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns a base64-encoded string containing: IV + AuthTag + Ciphertext
 *
 * @param plaintext - The text to encrypt
 * @returns Encrypted string in format: base64(iv + authTag + ciphertext)
 */
export declare function encrypt(plaintext: string): string;
/**
 * Decrypt a base64-encoded encrypted string
 *
 * @param encryptedData - The encrypted string in format: base64(iv + authTag + ciphertext)
 * @returns Decrypted plaintext string
 */
export declare function decrypt(encryptedData: string): string;
/**
 * Check if a string appears to be encrypted (base64 encoded with correct length)
 *
 * @param data - String to check
 * @returns True if data appears to be encrypted
 */
export declare function isEncrypted(data: string): boolean;
/**
 * Hash sensitive data for logging/searching (one-way)
 *
 * @param data - Data to hash
 * @returns SHA-256 hash as hex string
 */
export declare function hashData(data: string): string;
/**
 * Mask sensitive data for display (e.g., "***-**-1234" for SSN)
 *
 * @param data - Data to mask
 * @param visibleChars - Number of characters to show at the end
 * @param maskChar - Character to use for masking
 * @returns Masked string
 */
export declare function maskData(data: string, visibleChars?: number, maskChar?: string): string;
/**
 * Mask email address for display (e.g., "j***@example.com")
 *
 * @param email - Email address to mask
 * @returns Masked email
 */
export declare function maskEmail(email: string): string;
/**
 * Mask phone number for display (e.g., "***-***-1234")
 *
 * @param phone - Phone number to mask
 * @returns Masked phone number
 */
export declare function maskPhone(phone: string): string;
/**
 * Generate a new encryption key (for key rotation)
 *
 * @returns New 256-bit key as hex string
 */
export declare function generateEncryptionKey(): string;
/**
 * Rotate encryption - decrypt with old key, encrypt with new key
 *
 * @param encryptedData - Data encrypted with old key
 * @param oldKey - Previous encryption key
 * @param newKey - New encryption key
 * @returns Data encrypted with new key
 */
export declare function rotateEncryption(encryptedData: string, oldKey: string, newKey: string): string;
export declare const ENCRYPTED_FIELDS: Record<string, string[]>;
export declare const MASKED_FIELDS: Record<string, Record<string, string[]>>;
declare const _default: {
    encrypt: typeof encrypt;
    decrypt: typeof decrypt;
    isEncrypted: typeof isEncrypted;
    hashData: typeof hashData;
    maskData: typeof maskData;
    maskEmail: typeof maskEmail;
    maskPhone: typeof maskPhone;
    generateEncryptionKey: typeof generateEncryptionKey;
    rotateEncryption: typeof rotateEncryption;
    ENCRYPTED_FIELDS: Record<string, string[]>;
    MASKED_FIELDS: Record<string, Record<string, string[]>>;
};
export default _default;
//# sourceMappingURL=encryption.d.ts.map