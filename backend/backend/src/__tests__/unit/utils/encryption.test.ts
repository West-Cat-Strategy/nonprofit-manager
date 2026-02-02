import {
  encrypt,
  decrypt,
  isEncrypted,
  hashData,
  maskData,
  maskEmail,
  maskPhone,
  generateEncryptionKey,
  rotateEncryption,
} from '../../../utils/encryption';

// Mock logger
jest.mock('../../../config/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Encryption Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'sensitive data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'test data';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Different IVs mean different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);

      // But both decrypt to same plaintext
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      expect(encrypt('')).toBe('');
      expect(decrypt('')).toBe('');
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Hello 世界 🌍 Здравствуй مرحبا';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(decrypted.length).toBe(10000);
    });

    it('should produce base64 encoded output', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);

      // Check if valid base64
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      expect(base64Regex.test(encrypted)).toBe(true);
    });

    it('should throw error for invalid encrypted data', () => {
      expect(() => decrypt('invalid-base64!!!')).toThrow('Failed to decrypt data');
    });

    it('should throw error for truncated data', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      const truncated = encrypted.substring(0, 10);

      expect(() => decrypt(truncated)).toThrow('Failed to decrypt data');
    });

    it('should work with custom encryption key', () => {
      process.env.ENCRYPTION_KEY = 'my-secret-passphrase-for-testing';

      const plaintext = 'custom key data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should work with hex encryption key', () => {
      // 64 character hex string (32 bytes)
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);

      const plaintext = 'hex key data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should work with base64 encryption key', () => {
      // 44 character base64 string (32 bytes)
      process.env.ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');

      const plaintext = 'base64 key data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted data', () => {
      const plaintext = 'test data';
      const encrypted = encrypt(plaintext);

      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext', () => {
      expect(isEncrypted('plain text')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isEncrypted(null as any)).toBe(false);
      expect(isEncrypted(undefined as any)).toBe(false);
      expect(isEncrypted(123 as any)).toBe(false);
    });

    it('should return false for invalid base64', () => {
      expect(isEncrypted('not-valid-base64!!!')).toBe(false);
    });

    it('should return false for short base64 strings', () => {
      // Valid base64 but too short to be encrypted data
      expect(isEncrypted('dGVzdA==')).toBe(false);
    });

    it('should return false for base64 with incorrect padding', () => {
      const validBase64 = Buffer.from('test').toString('base64');
      const invalidPadding = validBase64.substring(0, validBase64.length - 1);

      expect(isEncrypted(invalidPadding)).toBe(false);
    });
  });

  describe('hashData', () => {
    it('should produce consistent hashes for same input', () => {
      const data = 'test data';
      const hash1 = hashData(data);
      const hash2 = hashData(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashData('data1');
      const hash2 = hashData('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64-character hex string (SHA-256)', () => {
      const hash = hashData('test');

      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should handle empty strings', () => {
      const hash = hashData('');

      expect(hash).toBe('');
    });

    it('should handle special characters', () => {
      const data = '!@#$%^&*()';
      const hash = hashData(data);

      expect(hash.length).toBe(64);
    });

    it('should handle unicode characters', () => {
      const data = '世界 🌍';
      const hash = hashData(data);

      expect(hash.length).toBe(64);
    });

    it('should be one-way (irreversible)', () => {
      const data = 'sensitive';
      const hash = hashData(data);

      // Hash should not contain original data
      expect(hash.toLowerCase()).not.toContain('sensitive');
    });
  });

  describe('maskData', () => {
    it('should mask data showing last 4 characters by default', () => {
      const data = '1234567890';
      const masked = maskData(data);

      expect(masked).toMatch(/^\*+7890$/);
      expect(masked.endsWith('7890')).toBe(true);
    });

    it('should mask data with custom visible characters', () => {
      const data = '1234567890';
      const masked = maskData(data, 6);

      expect(masked).toMatch(/^\*+567890$/);
      expect(masked.endsWith('567890')).toBe(true);
    });

    it('should mask data with custom mask character', () => {
      const data = '1234567890';
      const masked = maskData(data, 4, '#');

      expect(masked).toMatch(/^#+7890$/);
    });

    it('should handle short data', () => {
      const data = '123';
      const masked = maskData(data);

      expect(masked).toBe('****');
    });

    it('should handle empty string', () => {
      const masked = maskData('');

      expect(masked).toBe('****');
    });

    it('should limit mask length to 10 characters', () => {
      const data = 'a'.repeat(50) + '1234';
      const masked = maskData(data);

      const maskPart = masked.substring(0, masked.length - 4);
      expect(maskPart.length).toBeLessThanOrEqual(10);
    });
  });

  describe('maskEmail', () => {
    it('should mask email local part', () => {
      const email = 'john.doe@example.com';
      const masked = maskEmail(email);

      expect(masked).toMatch(/^j\*+@example\.com$/);
      expect(masked).toContain('@example.com');
    });

    it('should handle short email local parts', () => {
      const email = 'a@example.com';
      const masked = maskEmail(email);

      expect(masked).toBe('a@example.com');
    });

    it('should handle empty or invalid emails', () => {
      expect(maskEmail('')).toBe('****@****.***');
      expect(maskEmail('notanemail')).toBe('****@****.***');
    });

    it('should limit masking to 5 asterisks', () => {
      const email = 'verylongemailaddress@example.com';
      const masked = maskEmail(email);

      const [local] = masked.split('@');
      const asterisks = local.match(/\*/g);

      expect(asterisks).not.toBeNull();
      expect(asterisks!.length).toBeLessThanOrEqual(5);
    });

    it('should preserve domain completely', () => {
      const email = 'user@subdomain.example.com';
      const masked = maskEmail(email);

      expect(masked).toContain('@subdomain.example.com');
    });
  });

  describe('maskPhone', () => {
    it('should mask phone number showing last 4 digits', () => {
      const phone = '555-123-4567';
      const masked = maskPhone(phone);

      expect(masked).toBe('***-***-4567');
    });

    it('should handle phone without formatting', () => {
      const phone = '5551234567';
      const masked = maskPhone(phone);

      expect(masked).toBe('***-***-4567');
    });

    it('should handle phone with country code', () => {
      const phone = '+1-555-123-4567';
      const masked = maskPhone(phone);

      expect(masked).toBe('***-***-4567');
    });

    it('should handle short phone numbers', () => {
      const phone = '123';
      const masked = maskPhone(phone);

      expect(masked).toBe('***-***-****');
    });

    it('should handle empty phone', () => {
      const masked = maskPhone('');

      expect(masked).toBe('***-***-****');
    });

    it('should extract only digits', () => {
      const phone = '(555) 123-4567 ext. 890';
      const masked = maskPhone(phone);

      expect(masked).toBe('***-***-7890');
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey();

      expect(key.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(key)).toBe(true);
    });

    it('should generate different keys each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });

    it('should generate keys that work for encryption', () => {
      const key = generateEncryptionKey();
      process.env.ENCRYPTION_KEY = key;

      const plaintext = 'test data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('rotateEncryption', () => {
    it('should rotate encryption from old key to new key', () => {
      const oldKey = generateEncryptionKey();
      const newKey = generateEncryptionKey();

      // Encrypt with old key
      process.env.ENCRYPTION_KEY = oldKey;
      const plaintext = 'sensitive data';
      const encryptedWithOld = encrypt(plaintext);

      // Rotate to new key
      const encryptedWithNew = rotateEncryption(encryptedWithOld, oldKey, newKey);

      // Verify can decrypt with new key
      process.env.ENCRYPTION_KEY = newKey;
      const decrypted = decrypt(encryptedWithNew);

      expect(decrypted).toBe(plaintext);
    });

    it('should not be able to decrypt rotated data with old key', () => {
      const oldKey = generateEncryptionKey();
      const newKey = generateEncryptionKey();

      process.env.ENCRYPTION_KEY = oldKey;
      const plaintext = 'data';
      const encryptedWithOld = encrypt(plaintext);

      const encryptedWithNew = rotateEncryption(encryptedWithOld, oldKey, newKey);

      // Should fail to decrypt with old key
      process.env.ENCRYPTION_KEY = oldKey;
      expect(() => decrypt(encryptedWithNew)).toThrow();
    });

    it('should restore original environment key after rotation', () => {
      const originalKey = 'original-key';
      const oldKey = generateEncryptionKey();
      const newKey = generateEncryptionKey();

      process.env.ENCRYPTION_KEY = originalKey;

      // Create data with old key temporarily
      const tempOriginal = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = oldKey;
      const encrypted = encrypt('test');
      process.env.ENCRYPTION_KEY = tempOriginal;

      rotateEncryption(encrypted, oldKey, newKey);

      expect(process.env.ENCRYPTION_KEY).toBe(originalKey);
    });

    it('should handle missing original key', () => {
      delete process.env.ENCRYPTION_KEY;

      const oldKey = generateEncryptionKey();
      const newKey = generateEncryptionKey();

      process.env.ENCRYPTION_KEY = oldKey;
      const encrypted = encrypt('test');
      delete process.env.ENCRYPTION_KEY;

      rotateEncryption(encrypted, oldKey, newKey);

      expect(process.env.ENCRYPTION_KEY).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw error when ENCRYPTION_KEY missing in production', () => {
      delete process.env.ENCRYPTION_KEY;
      process.env.NODE_ENV = 'production';

      // Need to reload module to apply new env
      jest.resetModules();

      expect(() => {
        const { encrypt: prodEncrypt } = require('../../../utils/encryption');
        prodEncrypt('test');
      }).toThrow();
    });

    it('should handle tampered ciphertext', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);

      // Tamper with the encrypted data
      const buffer = Buffer.from(encrypted, 'base64');
      buffer[buffer.length - 1] = buffer[buffer.length - 1] ^ 0xFF;
      const tampered = buffer.toString('base64');

      expect(() => decrypt(tampered)).toThrow('Failed to decrypt data');
    });

    it('should handle corrupted auth tag', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);

      // Corrupt the auth tag (bytes 16-31)
      const buffer = Buffer.from(encrypted, 'base64');
      buffer[20] = buffer[20] ^ 0xFF;
      const corrupted = buffer.toString('base64');

      expect(() => decrypt(corrupted)).toThrow('Failed to decrypt data');
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined gracefully', () => {
      expect(encrypt(null as any)).toBeNull();
      expect(encrypt(undefined as any)).toBeUndefined();
      expect(decrypt(null as any)).toBeNull();
      expect(decrypt(undefined as any)).toBeUndefined();
    });

    it('should handle very long strings', () => {
      const longString = 'x'.repeat(100000);
      const encrypted = encrypt(longString);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(longString);
    });

    it('should handle strings with only whitespace', () => {
      const whitespace = '   \n\t\r   ';
      const encrypted = encrypt(whitespace);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(whitespace);
    });

    it('should handle binary-like strings', () => {
      const binary = String.fromCharCode(0, 1, 2, 3, 255);
      const encrypted = encrypt(binary);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(binary);
    });
  });
});
