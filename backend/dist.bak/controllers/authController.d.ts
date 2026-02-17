import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const register: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const login: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getCurrentUser: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * GET /api/auth/setup-status
 * Check if initial setup is required (no users exist)
 */
export declare const checkSetupStatus: (_req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * POST /api/auth/setup
 * Create the first admin user (only works if no users exist)
 */
export declare const setupFirstUser: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * GET /api/auth/preferences
 * Get user preferences
 */
export declare const getPreferences: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * PUT /api/auth/preferences
 * Update user preferences (merge with existing)
 */
export declare const updatePreferences: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * PATCH /api/auth/preferences/:key
 * Update a specific preference key
 */
export declare const updatePreferenceKey: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * GET /api/auth/profile
 * Get full user profile including extended fields
 */
export declare const getProfile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * PUT /api/auth/profile
 * Update user profile
 */
export declare const updateProfile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * PUT /api/auth/password
 * Change user password
 */
export declare const changePassword: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=authController.d.ts.map