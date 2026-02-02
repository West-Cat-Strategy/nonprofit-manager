/**
 * Express Type Extensions
 * Extends Express Request type to include user from authentication
 */

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        firstName?: string;
        lastName?: string;
        createdAt?: string;
        updatedAt?: string;
      };
    }
  }
}

export {};
