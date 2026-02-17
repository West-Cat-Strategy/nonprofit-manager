/**
 * User Management Controller
 * Handles CRUD operations for users (admin only)
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * GET /api/users
 * List all users (admin only)
 */
export declare const listUsers: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * GET /api/users/:id
 * Get a single user by ID (admin only)
 */
export declare const getUser: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * POST /api/users
 * Create a new user (admin only)
 */
export declare const createUser: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * PUT /api/users/:id
 * Update a user (admin only)
 */
export declare const updateUser: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * PUT /api/users/:id/password
 * Reset a user's password (admin only)
 */
export declare const resetUserPassword: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * DELETE /api/users/:id
 * Delete a user (admin only) - soft delete by deactivating
 */
export declare const deleteUser: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * GET /api/users/roles
 * Get available user roles
 */
export declare const getRoles: (req: AuthRequest, res: Response, _next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=userController.d.ts.map