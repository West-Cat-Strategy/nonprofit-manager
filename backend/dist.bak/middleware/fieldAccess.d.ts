/**
 * Field-Level Access Control Middleware
 * Filters and masks sensitive fields based on user role and permissions
 */
import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
/**
 * Middleware factory for filtering response data based on field access rules
 *
 * @param resource - The resource type (accounts, contacts, donations, etc.)
 */
export declare function filterFieldAccess(resource: string): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to check if user can write to specific fields
 *
 * @param resource - The resource type
 * @param fields - Fields being written to
 */
export declare function checkFieldWriteAccess(resource: string, fields: string[]): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response>;
/**
 * Middleware to check resource-level permission
 *
 * @param permissionName - The permission to check (e.g., 'accounts.read')
 */
export declare function requirePermission(permissionName: string): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response>;
/**
 * Log access to sensitive field
 */
export declare function logSensitiveFieldAccess(userId: string, resourceType: string, resourceId: string, fieldName: string, accessType: 'read' | 'write' | 'decrypt', req: Request): Promise<void>;
/**
 * Clear field access cache (for when permissions are updated)
 */
export declare function clearFieldAccessCache(userId?: string): void;
declare const _default: {
    filterFieldAccess: typeof filterFieldAccess;
    checkFieldWriteAccess: typeof checkFieldWriteAccess;
    requirePermission: typeof requirePermission;
    logSensitiveFieldAccess: typeof logSensitiveFieldAccess;
    clearFieldAccessCache: typeof clearFieldAccessCache;
};
export default _default;
//# sourceMappingURL=fieldAccess.d.ts.map