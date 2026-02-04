import { Request, Response, NextFunction } from 'express';
/**
 * Track failed login attempts and lock accounts if threshold is exceeded
 */
export declare const trackLoginAttempt: (identifier: string, success: boolean, userId?: string, ipAddress?: string) => Promise<void>;
/**
 * Check if an account is locked
 */
export declare const isAccountLocked: (identifier: string) => Promise<boolean>;
/**
 * Get remaining lockout time in minutes
 */
export declare const getLockoutTimeRemaining: (identifier: string) => Promise<number>;
/**
 * Middleware to check account lockout status
 */
export declare const checkAccountLockout: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=accountLockout.d.ts.map