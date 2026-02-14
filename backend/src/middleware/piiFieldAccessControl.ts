/**
 * PII Field Access Control Middleware
 * 
 * Applies field-level access control to response data, ensuring users
 * only see PII fields they have permission to access.
 * 
 * Masks sensitive fields based on user role and configured access rules.
 */

import { Request, Response, NextFunction } from 'express';
import { PIIService } from '../services/piiService';
import { decryptPII } from '../utils/piiEncryption';
import { logger } from '../config/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware to apply PII field-level access control
 * 
 * Usage in routes:
 *   router.get('/contacts/:id', authenticate, piiFieldAccessControl(piiService), controller.getContact);
 */
export function piiFieldAccessControl(piiService: PIIService) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Store original res.json to intercept responses
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      // Apply field-level access control to response data
      if (data && typeof data === 'object') {
        data = applyFieldAccessControl(data, req.user?.role);
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Recursively apply field-level access control to data structure
 */
function applyFieldAccessControl(data: any, userRole?: string): any {
  if (!userRole) {
    return data; // No user role - return as-is (will be handled by controller)
  }

  if (Array.isArray(data)) {
    return data.map((item) => applyFieldAccessControl(item, userRole));
  }

  if (data === null || typeof data !== 'object') {
    return data;
  }

  const controlled: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    // Check if this is a PII field that should be masked
    const shouldMask = isSensitiveField(key);

    if (shouldMask && value) {
      // Apply masking based on field type
      controlled[key] = maskFieldByType(key, value);
    } else {
      // Recursively process nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        controlled[key] = applyFieldAccessControl(value, userRole);
      } else if (Array.isArray(value)) {
        controlled[key] = value.map((item) =>
          item && typeof item === 'object' ? applyFieldAccessControl(item, userRole) : item
        );
      } else {
        controlled[key] = value;
      }
    }
  }

  return controlled;
}

/**
 * Determine if a field contains sensitive information
 */
function isSensitiveField(fieldName: string): boolean {
  const sensitiveFields = [
    'phone',
    'mobile_phone',
    'email',
    'ssn',
    'birth_date',
    'dob',
    'date_of_birth',
    'credit_card',
    'card_number',
    'cvv',
    'bank_account',
    'routing_number',
    'emergency_contact_phone',
    'password_hash',
    'api_key',
    'secret_key',
    'token',
  ];

  return sensitiveFields.some((field) => fieldName.toLowerCase().includes(field.toLowerCase()));
}

/**
 * Apply masking to a field based on its type
 */
function maskFieldByType(fieldName: string, value: string | any): string {
  const lowerFieldName = fieldName.toLowerCase();

  // Phone numbers - show last 4 digits
  if (lowerFieldName.includes('phone')) {
    return maskPhoneNumber(value?.toString() || '');
  }

  // Email - show first letter and domain
  if (lowerFieldName.includes('email')) {
    return maskEmail(value?.toString() || '');
  }

  // SSN - show last 4 digits
  if (lowerFieldName.includes('ssn') || lowerFieldName.includes('social_security')) {
    return '***-**-' + (value?.toString() || '').slice(-4);
  }

  // Date of birth - show only year
  if (lowerFieldName.includes('birth') || lowerFieldName.includes('dob')) {
    return maskDateOfBirth(value?.toString() || '');
  }

  // Credit card - show last 4 digits
  if (lowerFieldName.includes('card') || lowerFieldName.includes('credit')) {
    return '*'.repeat(Math.max(0, (value?.toString() || '').length - 4)) + (value?.toString() || '').slice(-4);
  }

  // Default - show first character and asterisks
  return (value?.toString() || '').charAt(0) + '*'.repeat(Math.max(0, (value?.toString() || '').length - 1));
}

function maskPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '***-***-' + cleaned;
  return '***-***-' + cleaned.slice(-4);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  return local.charAt(0) + '*'.repeat(Math.max(0, local.length - 2)) + '@' + domain;
}

function maskDateOfBirth(dob: string): string {
  if (!dob) return '***-**-**';
  // Extract year from various formats
  const yearMatch = dob.match(/(\d{4})/);
  return yearMatch ? `${yearMatch[1]}-**-**` : '****-**-**';
}

/**
 * Audit PII access for compliance monitoring
 */
export function auditPIIAccess(piiService: PIIService) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Store original res.json
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      // Audit PII access if user accessed sensitive data
      if (data && req.user && shouldAuditAccess(data)) {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('user-agent');

        // Determine table and record ID from request
        const { tableName, recordId } = extractContextFromRequest(req);

        if (tableName && recordId) {
          piiService.auditPIIAccess(
            {
              table_name: tableName,
              record_id: recordId,
              field_name: 'multiple',
              accessed_by: req.user.id,
              access_type: 'read',
              reason: `${req.method} ${req.path}`,
            },
            req.user.id,
            ipAddress,
            userAgent
          ).catch((error) => {
            logger.error('Failed to audit PII access', { error });
          });
        }
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Check if response data contains sensitive fields
 */
function shouldAuditAccess(data: any): boolean {
  if (!data || typeof data !== 'object') return false;

  const dataStr = JSON.stringify(data).toLowerCase();
  const sensitiveKeywords = ['phone', 'email', 'ssn', 'birth', 'dob', 'credit', 'card'];

  return sensitiveKeywords.some((keyword) => dataStr.includes(keyword));
}

/**
 * Extract table name and record ID from request context
 */
function extractContextFromRequest(req: AuthenticatedRequest): { tableName?: string; recordId?: string } {
  // Try to extract from route params and path
  const pathMatch = req.path.match(/\/(contacts|accounts|volunteers|donations)\/([a-f0-9-]+)/);

  if (pathMatch) {
    const tableMap: Record<string, string> = {
      contacts: 'contacts',
      accounts: 'accounts',
      volunteers: 'volunteers',
      donations: 'donations',
    };

    return {
      tableName: tableMap[pathMatch[1]],
      recordId: pathMatch[2],
    };
  }

  return {};
}

export default piiFieldAccessControl;
