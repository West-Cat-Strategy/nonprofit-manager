"use strict";
/**
 * Encryption Utility Module
 * Provides AES-256-GCM encryption for sensitive field data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MASKED_FIELDS = exports.ENCRYPTED_FIELDS = void 0;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.isEncrypted = isEncrypted;
exports.hashData = hashData;
exports.maskData = maskData;
exports.maskEmail = maskEmail;
exports.maskPhone = maskPhone;
exports.generateEncryptionKey = generateEncryptionKey;
exports.rotateEncryption = rotateEncryption;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../config/logger");
// Configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
/**
 * Get encryption key from environment variable
 * Falls back to a derived key for development only
 */
function getEncryptionKey() {
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey) {
        // If key is provided as hex string
        if (envKey.length === 64) {
            return Buffer.from(envKey, 'hex');
        }
        // If key is base64 encoded
        if (envKey.length === 44) {
            return Buffer.from(envKey, 'base64');
        }
        // Derive key from passphrase
        return crypto_1.default.scryptSync(envKey, 'nonprofit-manager-salt', KEY_LENGTH);
    }
    // Development fallback - NOT FOR PRODUCTION
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger_1.logger.warn('Using development encryption key - DO NOT USE IN PRODUCTION');
        return crypto_1.default.scryptSync('dev-encryption-key', 'dev-salt', KEY_LENGTH);
    }
    throw new Error('ENCRYPTION_KEY environment variable is required in production');
}
/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns a base64-encoded string containing: IV + AuthTag + Ciphertext
 *
 * @param plaintext - The text to encrypt
 * @returns Encrypted string in format: base64(iv + authTag + ciphertext)
 */
function encrypt(plaintext) {
    if (!plaintext) {
        return plaintext;
    }
    try {
        const key = getEncryptionKey();
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(plaintext, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();
        // Combine: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
        const combined = Buffer.concat([iv, authTag, encrypted]);
        return combined.toString('base64');
    }
    catch (error) {
        logger_1.logger.error('Encryption error', { error: error.message });
        throw new Error('Failed to encrypt data');
    }
}
/**
 * Decrypt a base64-encoded encrypted string
 *
 * @param encryptedData - The encrypted string in format: base64(iv + authTag + ciphertext)
 * @returns Decrypted plaintext string
 */
function decrypt(encryptedData) {
    if (!encryptedData) {
        return encryptedData;
    }
    try {
        const key = getEncryptionKey();
        const combined = Buffer.from(encryptedData, 'base64');
        // Extract: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
        const iv = combined.subarray(0, IV_LENGTH);
        const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    }
    catch (error) {
        logger_1.logger.error('Decryption error', { error: error.message });
        throw new Error('Failed to decrypt data');
    }
}
/**
 * Check if a string appears to be encrypted (base64 encoded with correct length)
 *
 * @param data - String to check
 * @returns True if data appears to be encrypted
 */
function isEncrypted(data) {
    if (!data || typeof data !== 'string') {
        return false;
    }
    try {
        // Check if it's valid base64
        const decoded = Buffer.from(data, 'base64');
        const reencoded = decoded.toString('base64');
        if (reencoded !== data) {
            return false;
        }
        // Minimum length: IV (16) + AuthTag (16) + at least 1 byte ciphertext
        return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1;
    }
    catch {
        return false;
    }
}
/**
 * Hash sensitive data for logging/searching (one-way)
 *
 * @param data - Data to hash
 * @returns SHA-256 hash as hex string
 */
function hashData(data) {
    if (!data) {
        return data;
    }
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
}
/**
 * Mask sensitive data for display (e.g., "***-**-1234" for SSN)
 *
 * @param data - Data to mask
 * @param visibleChars - Number of characters to show at the end
 * @param maskChar - Character to use for masking
 * @returns Masked string
 */
function maskData(data, visibleChars = 4, maskChar = '*') {
    if (!data || data.length <= visibleChars) {
        return maskChar.repeat(4);
    }
    const visible = data.slice(-visibleChars);
    const masked = maskChar.repeat(Math.min(data.length - visibleChars, 10));
    return masked + visible;
}
/**
 * Mask email address for display (e.g., "j***@example.com")
 *
 * @param email - Email address to mask
 * @returns Masked email
 */
function maskEmail(email) {
    if (!email || !email.includes('@')) {
        return '****@****.***';
    }
    const [local, domain] = email.split('@');
    const maskedLocal = local.charAt(0) + '*'.repeat(Math.min(local.length - 1, 5));
    return `${maskedLocal}@${domain}`;
}
/**
 * Mask phone number for display (e.g., "***-***-1234")
 *
 * @param phone - Phone number to mask
 * @returns Masked phone number
 */
function maskPhone(phone) {
    if (!phone) {
        return '***-***-****';
    }
    // Extract last 4 digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) {
        return '***-***-****';
    }
    const lastFour = digits.slice(-4);
    return `***-***-${lastFour}`;
}
/**
 * Generate a new encryption key (for key rotation)
 *
 * @returns New 256-bit key as hex string
 */
function generateEncryptionKey() {
    return crypto_1.default.randomBytes(KEY_LENGTH).toString('hex');
}
/**
 * Rotate encryption - decrypt with old key, encrypt with new key
 *
 * @param encryptedData - Data encrypted with old key
 * @param oldKey - Previous encryption key
 * @param newKey - New encryption key
 * @returns Data encrypted with new key
 */
function rotateEncryption(encryptedData, oldKey, newKey) {
    // Temporarily override the key for decryption
    const originalKey = process.env.ENCRYPTION_KEY;
    try {
        process.env.ENCRYPTION_KEY = oldKey;
        const decrypted = decrypt(encryptedData);
        process.env.ENCRYPTION_KEY = newKey;
        const reencrypted = encrypt(decrypted);
        return reencrypted;
    }
    finally {
        // Restore original key
        if (originalKey !== undefined) {
            process.env.ENCRYPTION_KEY = originalKey;
        }
        else {
            delete process.env.ENCRYPTION_KEY;
        }
    }
}
// Define which fields should be encrypted per entity type
exports.ENCRYPTED_FIELDS = {
    accounts: ['tax_id'],
    contacts: ['birth_date'],
    donations: ['transaction_id'],
    users: [], // Password is already hashed
    volunteers: [],
};
// Define which fields should be masked in responses based on role
exports.MASKED_FIELDS = {
    // Fields masked for users with 'user' role
    user: {
        accounts: ['tax_id'],
        contacts: ['phone', 'mobile_phone', 'email'],
        donations: ['transaction_id', 'check_number'],
    },
    // Staff can see more but still mask some fields
    staff: {
        accounts: ['tax_id'],
        donations: ['transaction_id'],
    },
    // Managers can see most fields
    manager: {
        accounts: [],
        donations: [],
    },
    // Admins can see everything
    admin: {},
};
exports.default = {
    encrypt,
    decrypt,
    isEncrypted,
    hashData,
    maskData,
    maskEmail,
    maskPhone,
    generateEncryptionKey,
    rotateEncryption,
    ENCRYPTED_FIELDS: exports.ENCRYPTED_FIELDS,
    MASKED_FIELDS: exports.MASKED_FIELDS,
};
//# sourceMappingURL=encryption.js.map