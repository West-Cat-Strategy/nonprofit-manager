import {
  encrypt,
  decrypt,
  isEncrypted,
  hashData,
  maskData,
  maskEmail,
  maskPhone,
  generateEncryptionKey,
} from '../../utils/encryption';

describe('Encryption Utility', () => {
  // Set test environment
  const originalEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt with special characters', () => {
      const plaintext = 'Test with émojis 🎉 and symbols @#$%^&*()';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt long strings', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'Same message';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(decrypt(encrypted2));
    });

    it('should return empty string for empty input', () => {
      expect(encrypt('')).toBe('');
      expect(decrypt('')).toBe('');
    });

    it('should handle null and undefined gracefully', () => {
      expect(encrypt(null as unknown as string)).toBe(null);
      expect(decrypt(null as unknown as string)).toBe(null);
      expect(encrypt(undefined as unknown as string)).toBe(undefined);
      expect(decrypt(undefined as unknown as string)).toBe(undefined);
    });

    it('should throw error on tampered ciphertext', () => {
      const encrypted = encrypt('Test message');
      const tampered = encrypted.slice(0, -5) + 'XXXXX';

      expect(() => decrypt(tampered)).toThrow('Failed to decrypt data');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted data', () => {
      const encrypted = encrypt('Test data');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(isEncrypted('Hello World')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isEncrypted(null as unknown as string)).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isEncrypted(123 as unknown as string)).toBe(false);
      expect(isEncrypted({} as unknown as string)).toBe(false);
    });

    it('should return false for short base64 strings', () => {
      expect(isEncrypted('SGVsbG8=')).toBe(false); // "Hello" in base64
    });
  });

  describe('hashData', () => {
    it('should hash data consistently', () => {
      const data = 'test@example.com';
      const hash1 = hashData(data);
      const hash2 = hashData(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = hashData('data1');
      const hash2 = hashData('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should return 64 character hex string', () => {
      const hash = hashData('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should handle empty string', () => {
      const hash = hashData('');
      expect(hash).toBe('');
    });
  });

  describe('maskData', () => {
    it('should mask data showing last 4 characters by default', () => {
      const masked = maskData('1234567890');
      expect(masked).toBe('******7890');
    });

    it('should allow custom visible characters', () => {
      const masked = maskData('1234567890', 6);
      expect(masked).toBe('****567890');
    });

    it('should allow custom mask character', () => {
      const masked = maskData('1234567890', 4, 'X');
      expect(masked).toBe('XXXXXX7890');
    });

    it('should handle short strings', () => {
      const masked = maskData('123', 4);
      expect(masked).toBe('****');
    });

    it('should handle empty string', () => {
      const masked = maskData('');
      expect(masked).toBe('****');
    });
  });

  describe('maskEmail', () => {
    it('should mask email address correctly', () => {
      const masked = maskEmail('john.doe@example.com');
      expect(masked).toBe('j*****@example.com');
    });

    it('should handle short local part', () => {
      const masked = maskEmail('a@example.com');
      expect(masked).toBe('a@example.com');
    });

    it('should handle invalid email', () => {
      const masked = maskEmail('notanemail');
      expect(masked).toBe('****@****.***');
    });

    it('should handle empty string', () => {
      const masked = maskEmail('');
      expect(masked).toBe('****@****.***');
    });
  });

  describe('maskPhone', () => {
    it('should mask phone number correctly', () => {
      const masked = maskPhone('555-123-4567');
      expect(masked).toBe('***-***-4567');
    });

    it('should handle phone with different formats', () => {
      expect(maskPhone('(555) 123-4567')).toBe('***-***-4567');
      expect(maskPhone('5551234567')).toBe('***-***-4567');
      expect(maskPhone('+1 555 123 4567')).toBe('***-***-4567');
    });

    it('should handle short phone number', () => {
      const masked = maskPhone('123');
      expect(masked).toBe('***-***-****');
    });

    it('should handle empty string', () => {
      const masked = maskPhone('');
      expect(masked).toBe('***-***-****');
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate 64 character hex key', () => {
      const key = generateEncryptionKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique keys each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });

    it('should generate keys that can be used for encryption', () => {
      const key = generateEncryptionKey();
      const originalKey = process.env.ENCRYPTION_KEY;

      try {
        process.env.ENCRYPTION_KEY = key;
        const plaintext = 'Test with generated key';
        const encrypted = encrypt(plaintext);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      } finally {
        if (originalKey !== undefined) {
          process.env.ENCRYPTION_KEY = originalKey;
        } else {
          delete process.env.ENCRYPTION_KEY;
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle Unicode characters', () => {
      const plaintext = '日本語テスト中文测试한국어테스트';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON strings', () => {
      const data = JSON.stringify({ name: 'Test', value: 123, nested: { array: [1, 2, 3] } });
      const encrypted = encrypt(data);
      const decrypted = decrypt(encrypted);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(data));
    });

    it('should handle whitespace-only strings', () => {
      const plaintext = '   \n\t   ';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });
});
