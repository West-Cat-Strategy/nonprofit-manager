/**
 * User Management Routes
 * Admin-only routes for managing users
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  getRoles,
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get available roles
router.get('/roles', getRoles);

// List all users
router.get('/', listUsers);

// Get a single user
router.get('/:id', [param('id').isUUID().withMessage('Invalid user ID'), validateRequest], getUser);

// Create a new user
router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('role').optional().isIn(['admin', 'manager', 'user', 'readonly']).withMessage('Invalid role'),
    validateRequest,
  ],
  createUser
);

// Update a user
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('role').optional().isIn(['admin', 'manager', 'user', 'readonly']).withMessage('Invalid role'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validateRequest,
  ],
  updateUser
);

// Reset user password
router.put(
  '/:id/password',
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    validateRequest,
  ],
  resetUserPassword
);

// Delete (deactivate) a user
router.delete('/:id', [param('id').isUUID().withMessage('Invalid user ID'), validateRequest], deleteUser);

export default router;
