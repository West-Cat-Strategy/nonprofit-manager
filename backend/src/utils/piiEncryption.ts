/**
 * PII (Personally Identifiable Information) Encryption Utility
 * 
 * Provides AES-256-GCM encryption/decryption for sensitive data fields.
 * Used to encrypt data at rest in the database.
 * 
 * Fields typically encrypted:
 * - SSN (Social Security Number)
 * - DOB (Date of Birth)
 * - Bank Account Numbers
 * - Phone Numbers
 * - Emergency Contact Information
 */

import * as crypto from 'crypto';
import { logger } from '../config/logger';

// Algorithm: AES-256-GCM (Galois/Counter Mode provides authenticated encryption)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Initialization Vector length in bytes
const AUTH_TAG_LENGTH = 16; // Authentication tag length in bytes
const SALT_LENGTH = 16; // Salt for key derivation

/**
 * Get encryption key from environment
 * Key should be 64 hex characters (256 bits) from ENCRYPTION_KEY env var
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  if (keyHex.length !== 64) {
    throw new Error(`ENCRYPTION_KEY must be 64 hex characters (256 bits). Current length: ${keyHex.length}`);
  }
  
  try {
    return Buffer.from(keyHex, 'hex');
  } catch (error) {
    throw new Error('ENCRYPTION_KEY must be valid hexadecimal');
  }
}

/**
 * Encrypt sensitive data
 * 
 * Returns format: "salt:iv:encryptedData:authTag" (all base64 encoded)
 * The salt allows for key derivation variations, and the auth tag ensures integrity.
 * 
 * @param plaintext - The sensitive data to encrypt
 * @returns Encrypted string in format suitable for database storage
 */
export function encryptPII(plaintext: string | null | undefined): string | null {
  if (!plaintext) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    
    // Generate random IV (different for each encryption)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return: IV:encryptedData:authTag (all hex)
    // Format: iv|encryptedData|authTag
    const result = [iv.toString('hex'), encrypted, authTag.toString('hex')].join('|');
    
    return result;
  } catch (error) {
    logger.error('Failed to encrypt PII', { error });
    throw error;
  }
}

/**
 * Decrypt sensitive data
 * 
 * Decrypts data in format: "iv:encryptedData:authTag"
 * Verifies authentication tag to ensure data integrity.
 * 
 * @param encrypted - The encrypted string from database
 * @returns Decrypted plaintext or null if decryption fails
 */
export function decryptPII(encrypted: string | null | undefined): string | null {
  if (!encrypted) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    
    // Parse format: iv|encryptedData|authTag
    const parts = encrypted.split('|');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }
    
    const [ivHex, encryptedHex, authTagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Failed to decrypt PII', { error });
    throw error;
  }
}

/**
 * Check if a string is in encrypted format
 * 
 * Encrypted format is: hex|hex|hex (three hex-encoded parts separated by pipes)
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  
  const parts = value.split('|');
  if (parts.length !== 3) {
    return false;
  }
  
  // All parts should be valid hex
  return parts.every(part => /^[0-9a-f]+$/i.test(part));
}

/**
 * Mask sensitive field for display (doesn't use encryption key)
 * 
 * Examples:
 * - SSN "123-45-6789" → "***-**-6789"
 * - Email "john@example.com" → "j***@example.com"
 * - Phone "+1-555-123-4567" → "+1-555-****"
 */
export function maskSensitiveField(value: string | null | undefined, type: 'ssn' | 'email' | 'phone' | 'partial' = 'partial'): string | null {
  if (!value) {
    return null;
  }

  switch (type) {
    case 'ssn':
      return value.length >= 4 ? value.slice(-4).padStart(value.length, '*') : '***';
    case 'email': {
      const [local, domain] = value.split('@');
      if (!domain) return '***';
      return local.charAt(0) + '*'.repeat(Math.max(0, local.length - 2)) + '@' + domain;
    }
    case 'phone':
      return value.length >= 4 ? '*'.repeat(value.length - 4) + value.slice(-4) : '***';
    case 'partial':
    default:
      // Show only 25% of the string
      const visibleLength = Math.ceil(value.length / 4);
      return '*'.repeat(value.length - visibleLength) + value.slice(-visibleLength);
  }
}

export default {
  encryptPII,
  decryptPII,
  isEncrypted,
  maskSensitiveField,
};
