/**
 * PII Service
 * 
 * Handles encryption/decryption of personally identifiable information fields.
 * Provides methods for:
 * - Encrypting on write operations
 * - Decrypting on read operations
 * - Auditing PII access
 * - Applying field-level access control
 */

import { Pool, QueryResult } from 'pg';
import { encryptPII, decryptPII, maskSensitiveField, isEncrypted } from '../utils/piiEncryption';
import { logger } from '../config/logger';

export interface PIIField {
  tableName: string;
  fieldName: string;
  value: string | null;
}

export interface PIIAccessAudit {
  table_name: string;
  record_id: string;
  field_name: string;
  accessed_by: string;
  access_type: 'read' | 'write' | 'decrypt';
  reason?: string;
  ip_address?: string;
  user_agent?: string;
}

// Map of tables and fields that should be encrypted
const ENCRYPTED_PII_FIELDS: Record<string, string[]> = {
  contacts: ['phone', 'mobile_phone', 'birth_date'],
  accounts: ['phone'],
  volunteers: ['emergency_contact_phone'],
};

export class PIIService {
  constructor(private pool: Pool) {}

  /**
   * Encrypt PII fields in an object before saving to database
   * @param tableName - Name of the table
   * @param data - Data object with potential PII fields
   * @returns Object with plaintext fields replaced by encrypted_<field> keys
   */
  encryptForStorage(tableName: string, data: Record<string, any>): Record<string, any> {
    const fieldsToEncrypt = ENCRYPTED_PII_FIELDS[tableName] || [];
    const encrypted = { ...data };

    for (const field of fieldsToEncrypt) {
      if (field in data && data[field]) {
        const encryptedValue = encryptPII(data[field]);
        encrypted[`${field}_encrypted`] = encryptedValue;

        // Optionally leave plaintext for backwards compatibility during migration
        // Set to null after migration period
        if (data[field]) {
          encrypted[field] = null; // Clear plaintext after encryption
        }
      }
    }

    return encrypted;
  }

  /**
   * Decrypt PII fields from database results
   * @param tableName - Name of the table
   * @param data - Row data from database
   * @param userRole - User's role for field-level access control
   * @returns Object with decrypted or masked PII fields
   */
  async decryptFromStorage(
    tableName: string,
    data: Record<string, any>,
    userRole?: string
  ): Promise<Record<string, any>> {
    const fieldsToEncrypt = ENCRYPTED_PII_FIELDS[tableName] || [];
    const decrypted = { ...data };

    for (const field of fieldsToEncrypt) {
      const encryptedKey = `${field}_encrypted`;

      if (encryptedKey in data && data[encryptedKey]) {
        // Check field-level access control
        const accessLevel = await this.getFieldAccessLevel(tableName, field, userRole);

        if (accessLevel === 'full') {
          // User can see full PII - decrypt it
          const plaintext = decryptPII(data[encryptedKey]);
          decrypted[field] = plaintext;
          delete decrypted[encryptedKey];
        } else if (accessLevel === 'masked') {
          // User can see masked version
          const plaintext = decryptPII(data[encryptedKey]);
          const maskingPattern = await this.getMaskingPattern(tableName, field, userRole);
          const masked = maskSensitiveField(plaintext || '', maskingPattern);
          decrypted[field] = masked;
          delete decrypted[encryptedKey];
        } else {
          // accessLevel === 'none' - don't return the field
          delete decrypted[field];
          delete decrypted[encryptedKey];
        }
      }
    }

    return decrypted;
  }

  /**
   * Get access level for a field based on user role
   * @returns 'full', 'masked', or 'none'
   */
  private async getFieldAccessLevel(
    tableName: string,
    fieldName: string,
    userRole?: string
  ): Promise<'full' | 'masked' | 'none'> {
    if (!userRole) {
      return 'none'; // Default to no access if role not specified
    }

    try {
      const result = await this.pool.query(
        `SELECT access_level FROM pii_field_access_rules
         WHERE table_name = $1 AND field_name = $2 
         AND role_id = (SELECT id FROM roles WHERE name = $3)
         LIMIT 1`,
        [tableName, fieldName, userRole]
      );

      if (result.rows.length > 0) {
        return result.rows[0].access_level;
      }

      return 'masked'; // Default to masked access
    } catch (error) {
      logger.error('Failed to get field access level', { tableName, fieldName, userRole, error });
      return 'none'; // Fail secure
    }
  }

  /**
   * Get masking pattern for a field
   */
  private async getMaskingPattern(
    tableName: string,
    fieldName: string,
    userRole?: string
  ): Promise<'email' | 'ssn' | 'phone' | 'partial'> {
    if (!userRole) {
      return 'partial'; // Default pattern
    }

    try {
      const result = await this.pool.query(
        `SELECT masking_pattern FROM pii_field_access_rules
         WHERE table_name = $1 AND field_name = $2
         AND role_id = (SELECT id FROM roles WHERE name = $3)
         LIMIT 1`,
        [tableName, fieldName, userRole]
      );

      if (result.rows.length > 0 && result.rows[0].masking_pattern) {
        const pattern = result.rows[0].masking_pattern;
        if (['email', 'ssn', 'phone', 'partial'].includes(pattern)) {
          return pattern as 'email' | 'ssn' | 'phone' | 'partial';
        }
      }

      return 'partial'; // Default pattern
    } catch (error) {
      logger.error('Failed to get masking pattern', { tableName, fieldName, userRole, error });
      return 'partial'; // Default pattern
    }
  }

  /**
   * Audit PII access for compliance tracking
   */
  async auditPIIAccess(
    audit: PIIAccessAudit,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO pii_access_audit 
         (table_name, record_id, field_name, accessed_by, access_type, reason, ip_address, user_agent, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          audit.table_name,
          audit.record_id,
          audit.field_name,
          userId,
          audit.access_type,
          audit.reason,
          ipAddress,
          userAgent,
          userId,
        ]
      );
    } catch (error) {
      logger.error('Failed to audit PII access', { audit, error });
      // Don't throw - audit should not block main operation
    }
  }

  /**
   * Get PII access audit log for account
   */
  async getPIIAccessLog(
    tableName: string,
    recordId: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM pii_access_audit
         WHERE table_name = $1 AND record_id = $2
         ORDER BY accessed_at DESC
         LIMIT $3`,
        [tableName, recordId, limit]
      );
      return result.rows;
    } catch (error) {
      logger.error('Failed to get PII access log', { tableName, recordId, error });
      return [];
    }
  }

  /**
   * Batch encrypt PII fields in multiple records
   * Useful for migration scripts
   */
  async encryptBatch(
    tableName: string,
    fieldName: string,
    where?: string
  ): Promise<number> {
    if (!ENCRYPTED_PII_FIELDS[tableName]?.includes(fieldName)) {
      throw new Error(`Field ${fieldName} in table ${tableName} is not configured for encryption`);
    }

    try {
      const encryptedKey = `${fieldName}_encrypted`;
      const whereClause = where ? `WHERE ${where}` : `WHERE ${fieldName} IS NOT NULL AND ${encryptedKey} IS NULL`;

      // Get records to encrypt
      const selectResult = await this.pool.query(
        `SELECT id, ${fieldName} FROM ${tableName} ${whereClause}`
      );

      if (selectResult.rows.length === 0) {
        logger.info(`No records to encrypt for ${tableName}.${fieldName}`);
        return 0;
      }

      // Encrypt and update each record
      let encryptedCount = 0;
      for (const row of selectResult.rows) {
        const encryptedValue = encryptPII(row[fieldName]);
        await this.pool.query(
          `UPDATE ${tableName} SET ${encryptedKey} = $1, ${fieldName} = NULL WHERE id = $2`,
          [encryptedValue, row.id]
        );
        encryptedCount++;
      }

      logger.info(`Encrypted ${encryptedCount} records for ${tableName}.${fieldName}`);
      return encryptedCount;
    } catch (error) {
      logger.error('Failed to encrypt PII batch', { tableName, fieldName, error });
      throw error;
    }
  }

  /**
   * Get encryption status for a table
   */
  async getEncryptionStatus(tableName: string): Promise<{
    total: number;
    encrypted: number;
    pending: number;
    percentComplete: number;
  }> {
    try {
      const fieldsToEncrypt = ENCRYPTED_PII_FIELDS[tableName] || [];
      if (fieldsToEncrypt.length === 0) {
        return { total: 0, encrypted: 0, pending: 0, percentComplete: 100 };
      }

      // Check first encrypted field for status
      const field = fieldsToEncrypt[0];
      const encryptedKey = `${field}_encrypted`;

      const result = await this.pool.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN ${encryptedKey} IS NOT NULL THEN 1 END) as encrypted,
          COUNT(CASE WHEN ${encryptedKey} IS NULL AND ${field} IS NOT NULL THEN 1 END) as pending
         FROM ${tableName}`
      );

      const { total, encrypted, pending } = result.rows[0];
      const percentComplete = total > 0 ? Math.round((encrypted / total) * 100) : 100;

      return {
        total: parseInt(total),
        encrypted: parseInt(encrypted),
        pending: parseInt(pending),
        percentComplete,
      };
    } catch (error) {
      logger.error('Failed to get encryption status', { tableName, error });
      throw error;
    }
  }
}

export default PIIService;
