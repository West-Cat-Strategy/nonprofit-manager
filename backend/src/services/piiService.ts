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

import { Pool } from 'pg';
import { encryptPII, decryptPII, maskSensitiveField } from '../utils/piiEncryption';
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

type FieldAccessLevel = 'full' | 'masked' | 'none';
type MaskingPattern = 'email' | 'ssn' | 'phone' | 'partial';

interface FieldAccessRule {
  accessLevel: FieldAccessLevel;
  maskingPattern: MaskingPattern;
}

// Map of tables and fields that should be encrypted
const ENCRYPTED_PII_FIELDS: Record<string, string[]> = {
  contacts: ['phone', 'mobile_phone', 'birth_date'],
  accounts: ['phone'],
  volunteers: ['emergency_contact_phone'],
};

const FIELD_ACCESS_CACHE_TTL_MS = 5 * 60 * 1000;

interface FieldAccessCacheEntry {
  expiresAt: number;
  rules: Map<string, FieldAccessRule>;
}

export class PIIService {
  private readonly fieldAccessRuleCache = new Map<string, FieldAccessCacheEntry>();

  constructor(private pool: Pool) { }

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
    const rules = await this.getFieldAccessRules(tableName, userRole);

    for (const field of fieldsToEncrypt) {
      const encryptedKey = `${field}_encrypted`;

      if (encryptedKey in data && data[encryptedKey]) {
        const rule = rules.get(field);
        const accessLevel: FieldAccessLevel = rule?.accessLevel || 'masked';

        if (accessLevel === 'full') {
          // User can see full PII - decrypt it
          const plaintext = decryptPII(data[encryptedKey]);
          decrypted[field] = plaintext;
          delete decrypted[encryptedKey];
        } else if (accessLevel === 'masked') {
          // User can see masked version
          const plaintext = decryptPII(data[encryptedKey]);
          const maskingPattern: MaskingPattern = rule?.maskingPattern || 'partial';
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
   * Load field-level access rules for a table + role, with short-lived caching
   */
  public async getFieldAccessRules(
    tableName: string,
    userRole?: string
  ): Promise<Map<string, FieldAccessRule>> {
    if (!userRole) {
      return new Map();
    }

    const cacheKey = `${tableName}:${userRole}`;
    const cached = this.fieldAccessRuleCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.rules;
    }

    try {
      const result = await this.pool.query(
        `SELECT
           r.field_name,
           r.access_level,
           r.masking_pattern
         FROM pii_field_access_rules r
         JOIN roles role_table ON role_table.id = r.role_id
         WHERE r.table_name = $1
           AND role_table.name = $2`,
        [tableName, userRole]
      );

      const rules = new Map<string, FieldAccessRule>();
      for (const row of result.rows) {
        const accessLevel = row.access_level as FieldAccessLevel | undefined;
        const maskingPattern = row.masking_pattern as MaskingPattern | undefined;
        if (!row.field_name || !accessLevel || !['full', 'masked', 'none'].includes(accessLevel)) {
          continue;
        }
        rules.set(row.field_name as string, {
          accessLevel,
          maskingPattern:
            maskingPattern && ['email', 'ssn', 'phone', 'partial'].includes(maskingPattern)
              ? maskingPattern
              : 'partial',
        });
      }

      this.fieldAccessRuleCache.set(cacheKey, {
        rules,
        expiresAt: Date.now() + FIELD_ACCESS_CACHE_TTL_MS,
      });
      return rules;
    } catch (error) {
      logger.error('Failed to load field access rules', { tableName, userRole, error });
      return new Map();
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
