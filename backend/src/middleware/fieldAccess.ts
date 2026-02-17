/**
 * Field-Level Access Control Middleware
 * Filters and masks sensitive fields based on user role and permissions
 */

import { Request, Response, NextFunction } from 'express';
import pool from '@config/database';
import { logger } from '@config/logger';
import { maskData, maskEmail, maskPhone, decrypt, isEncrypted } from '@utils/encryption';
import { errorPayload, serverError, unauthorized } from '@utils/responseHelpers';

// Extended request type with user info
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Field access rule from database
interface FieldAccessRule {
  field_name: string;
  can_read: boolean;
  can_write: boolean;
  mask_on_read: boolean;
  mask_type: string | null;
}

// Cache for field access rules (5 minute TTL)
const fieldAccessCache = new Map<string, { rules: FieldAccessRule[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_DENY_ON_NO_RULES = process.env.FIELD_ACCESS_DEFAULT_DENY !== 'false';

/**
 * Get field access rules for a user and resource
 */
async function getFieldAccessRules(userId: string, resource: string): Promise<FieldAccessRule[]> {
  const cacheKey = `${userId}:${resource}`;
  const cached = fieldAccessCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.rules;
  }

  try {
    const query = `
      SELECT DISTINCT ON (far.field_name)
        far.field_name,
        far.can_read,
        far.can_write,
        far.mask_on_read,
        far.mask_type
      FROM field_access_rules far
      INNER JOIN roles r ON far.role_id = r.id
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND far.resource = $2
      ORDER BY far.field_name, r.priority DESC
    `;

    const result = await pool.query(query, [userId, resource]);
    const rules = result.rows as FieldAccessRule[];

    fieldAccessCache.set(cacheKey, { rules, timestamp: Date.now() });
    return rules;
  } catch (error) {
    logger.error('Error fetching field access rules', { error, userId, resource });
    return [];
  }
}

/**
 * Check if user has permission to perform an action on a resource
 */
async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        INNER JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND p.name = $2
      ) as has_permission
    `;

    const result = await pool.query(query, [userId, permissionName]);
    return result.rows[0]?.has_permission || false;
  } catch (error) {
    logger.error('Error checking permission', { error, userId, permissionName });
    return false;
  }
}

/**
 * Apply mask to a field value based on mask type
 */
function applyMask(value: unknown, maskType: string | null): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  const strValue = String(value);

  switch (maskType) {
    case 'email':
      return maskEmail(strValue);
    case 'phone':
      return maskPhone(strValue);
    case 'partial':
      return maskData(strValue, 4);
    case 'ssn':
      return maskData(strValue, 4, '*');
    case 'full':
      return '********';
    default:
      return maskData(strValue, 4);
  }
}

/**
 * Filter and mask fields in a single record
 */
function filterRecord(
  record: Record<string, unknown>,
  rules: FieldAccessRule[],
  isAdmin: boolean
): Record<string, unknown> {
  if (isAdmin) {
    // Admins see everything
    return record;
  }

  if (rules.length === 0 && DEFAULT_DENY_ON_NO_RULES) {
    return {};
  }

  const rulesMap = new Map(rules.map((r) => [r.field_name, r]));
  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    const rule = rulesMap.get(key);

    if (!rule) {
      // No specific rule for this field - include it as-is
      filtered[key] = value;
    } else if (rule.can_read) {
      if (rule.mask_on_read && value !== null && value !== undefined) {
        // Apply masking
        filtered[key] = applyMask(value, rule.mask_type);
      } else {
        // Decrypt if encrypted
        if (typeof value === 'string' && isEncrypted(value)) {
          try {
            filtered[key] = decrypt(value);
          } catch {
            filtered[key] = value;
          }
        } else {
          filtered[key] = value;
        }
      }
    }
    // If can_read is false, field is excluded from response
  }

  return filtered;
}

/**
 * Middleware factory for filtering response data based on field access rules
 *
 * @param resource - The resource type (accounts, contacts, donations, etc.)
 */
export function filterFieldAccess(resource: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to filter data
    res.json = function (data: unknown): Response {
      (async () => {
        try {
          const userId = req.user?.id;
          const isAdmin = req.user?.role === 'admin';

          // If no user or admin, return data as-is
          if (!userId || isAdmin) {
            return originalJson(data);
          }

          const rules = await getFieldAccessRules(userId, resource);
          if (rules.length === 0 && DEFAULT_DENY_ON_NO_RULES) {
            logger.warn('No field access rules found; default deny applied', { userId, resource });
          }

          // Filter the data
          let filtered: unknown;

          if (Array.isArray(data)) {
            // Array of records
            filtered = data.map((record) =>
              filterRecord(record as Record<string, unknown>, rules, isAdmin)
            );
          } else if (data && typeof data === 'object') {
            const objData = data as Record<string, unknown>;

            // Check if it's a paginated response
            if ('data' in objData && Array.isArray(objData.data)) {
              filtered = {
                ...objData,
                data: (objData.data as Record<string, unknown>[]).map((record) =>
                  filterRecord(record, rules, isAdmin)
                ),
              };
            } else {
              // Single record
              filtered = filterRecord(objData, rules, isAdmin);
            }
          } else {
            filtered = data;
          }

          return originalJson(filtered);
        } catch (error) {
          logger.error('Error filtering field access', { error, resource });
          return originalJson(data);
        }
      })();

      return res;
    };

    next();
  };
}

/**
 * Middleware to check if user can write to specific fields
 *
 * @param resource - The resource type
 * @param fields - Fields being written to
 */
export function checkFieldWriteAccess(resource: string, fields: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      // Admins can write anything
      if (isAdmin) {
        return next();
      }

      if (!userId) {
        return unauthorized(res, 'Unauthorized');
      }

      const rules = await getFieldAccessRules(userId, resource);
      const rulesMap = new Map(rules.map((r) => [r.field_name, r]));

      // Check each field being written
      const deniedFields: string[] = [];
      for (const field of fields) {
        const rule = rulesMap.get(field);
        if (rule && !rule.can_write) {
          deniedFields.push(field);
        }
      }

      if (deniedFields.length > 0) {
        logger.warn('Field write access denied', {
          userId,
          resource,
          deniedFields,
        });
        return res.status(403).json(
          errorPayload(
            res,
            'Forbidden',
            { message: `You do not have permission to modify: ${deniedFields.join(', ')}` },
            'forbidden'
          )
        );
      }

      next();
    } catch (error) {
      logger.error('Error checking field write access', { error, resource });
      return serverError(res, 'Internal server error');
    }
  };
}

/**
 * Middleware to check resource-level permission
 *
 * @param permissionName - The permission to check (e.g., 'accounts.read')
 */
export function requirePermission(permissionName: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      // Admins have all permissions
      if (isAdmin) {
        return next();
      }

      if (!userId) {
        return unauthorized(res, 'Unauthorized');
      }

      const permitted = await hasPermission(userId, permissionName);

      if (!permitted) {
        logger.warn('Permission denied', { userId, permissionName });
        return res.status(403).json(
          errorPayload(
            res,
            'Forbidden',
            { message: 'You do not have permission to perform this action' },
            'forbidden'
          )
        );
      }

      next();
    } catch (error) {
      logger.error('Error checking permission', { error, permissionName });
      return serverError(res, 'Internal server error');
    }
  };
}

/**
 * Log access to sensitive field
 */
export async function logSensitiveFieldAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  fieldName: string,
  accessType: 'read' | 'write' | 'decrypt',
  req: Request
): Promise<void> {
  try {
    const query = `
      INSERT INTO sensitive_field_access_log
      (user_id, resource_type, resource_id, field_name, access_type, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await pool.query(query, [
      userId,
      resourceType,
      resourceId,
      fieldName,
      accessType,
      req.ip,
      req.get('user-agent') || null,
    ]);
  } catch (error) {
    logger.error('Error logging sensitive field access', { error });
  }
}

/**
 * Clear field access cache (for when permissions are updated)
 */
export function clearFieldAccessCache(userId?: string): void {
  if (userId) {
    // Clear cache for specific user
    for (const key of fieldAccessCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        fieldAccessCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    fieldAccessCache.clear();
  }
}

export default {
  filterFieldAccess,
  checkFieldWriteAccess,
  requirePermission,
  logSensitiveFieldAccess,
  clearFieldAccessCache,
};
