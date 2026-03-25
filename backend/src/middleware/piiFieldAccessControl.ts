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
 *   router.get('/contacts/:id', authenticate, piiFieldAccessControl(piiService, 'contacts'), controller.getContact);
 */
export function piiFieldAccessControl(piiService: PIIService, tableName?: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Store original res.json to intercept responses
    const originalJson = res.json.bind(res);

    // Determine table name if not provided
    const effectiveTableName = tableName || extractContextFromRequest(req).tableName;
    const userRole = req.user?.role;

    if (!effectiveTableName || !userRole) {
      return next(); 
    }

    try {
      // Pre-fetch field access rules for the current user's role
      // This is the only async part and happens BEFORE the controller
      const rules = await (piiService as any).getFieldAccessRules(effectiveTableName, userRole);
      
      res.json = function (data: any) {
        // Apply field-level access control to response data synchronously
        if (data && typeof data === 'object') {
          data = applyFieldAccessControlSync(data, rules);
        }

        return originalJson(data);
      };
    } catch (error) {
      logger.error('Error loading PII field access rules', { error, path: req.path });
      // In case of error, we proceed without rules - which will default to masked for sensitive fields
    }

    next();
  };
}

/**
 * Recursively apply field-level access control to data structure (Synchronous)
 */
function applyFieldAccessControlSync(
  data: any,
  rules: Map<string, any>
): any {
  if (Array.isArray(data)) {
    return data.map((item) => applyFieldAccessControlSync(item, rules));
  }

  if (data === null || typeof data !== 'object') {
    return data;
  }

  const controlled: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const rule = rules?.get(key);
    const accessLevel = rule?.accessLevel || (isSensitiveField(key) ? 'masked' : 'full');

    if (accessLevel === 'none') {
      continue; // Skip the field entirely
    }

    if (accessLevel === 'masked' && value !== null && value !== undefined) {
      const pattern = rule?.maskingPattern || 'partial';
      controlled[key] = maskFieldByType(key, value, pattern);
    } else {
      // Recursively process nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        controlled[key] = applyFieldAccessControlSync(value, rules);
      } else if (Array.isArray(value)) {
        controlled[key] = value.map((item) =>
          item && typeof item === 'object' 
            ? applyFieldAccessControlSync(item, rules) 
            : item
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
function maskFieldByType(fieldName: string, value: any, pattern: string = 'partial'): string {
  const lowerFieldName = fieldName.toLowerCase();
  const stringValue = value?.toString() || '';

  // Use the explicit pattern if provided and high confidence
  if (pattern === 'email' || (pattern === 'partial' && lowerFieldName.includes('email'))) {
    return maskEmail(stringValue);
  }
  if (pattern === 'phone' || (pattern === 'partial' && lowerFieldName.includes('phone'))) {
    return maskPhoneNumber(stringValue);
  }
  if (pattern === 'ssn' || (pattern === 'partial' && lowerFieldName.includes('ssn'))) {
    return '***-**-' + stringValue.slice(-4);
  }

  // Fallback to general patterns
  if (lowerFieldName.includes('birth') || lowerFieldName.includes('dob')) {
    return maskDateOfBirth(stringValue);
  }

  if (lowerFieldName.includes('card') || lowerFieldName.includes('credit')) {
    return '*'.repeat(Math.max(0, stringValue.length - 4)) + stringValue.slice(-4);
  }

  // Default masking
  return stringValue.charAt(0) + '*'.repeat(Math.max(0, stringValue.length - 1));
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
  const path = req.path || req.url || '';
  if (!path) return {};

  // Try to extract from route params and path
  const pathMatch = path.match(/\/(contacts|accounts|volunteers|donations)\/([a-f0-9-]+)/);

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
