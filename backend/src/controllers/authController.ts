import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { logger } from '../config/logger';
import { AuthRequest } from '../middleware/auth';
import { trackLoginAttempt } from '../middleware/accountLockout';
import { JWT, PASSWORD } from '../config/constants';

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: Date;
}

/**
 * Get JWT secret from environment or throw error
 * Never use fallback secrets in production
 */
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_SECRET environment variable is not set');
    throw new Error('JWT_SECRET must be configured');
  }
  return secret;
};

export const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role = 'user' }: RegisterRequest = req.body;

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);

    // Create user
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email, hashedPassword, firstName, lastName, role]
    );

    const user = result.rows[0];

    // Generate JWT token for immediate login after registration
    const jwtSecret = getJwtSecret();
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: JWT.ACCESS_TOKEN_EXPIRY }
    );

    logger.info(`User registered: ${user.email}`);

    return res.status(201).json({
      token,
      user: {
        user_id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password }: LoginRequest = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    // Get user
    const result = await pool.query<UserRow>(
      'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Track failed attempt for non-existent user
      await trackLoginAttempt(email, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      // Track failed login attempt
      await trackLoginAttempt(email, false, user.id);
      logger.warn(`Failed login attempt for user: ${email}`, { ip: clientIp });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Track successful login
    await trackLoginAttempt(email, true, user.id);

    // Generate access token
    const jwtSecret = getJwtSecret();

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: JWT.ACCESS_TOKEN_EXPIRY }
    );

    // Generate refresh token (for future use)
    const refreshToken = jwt.sign(
      {
        id: user.id,
        type: 'refresh',
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    logger.info(`User logged in: ${user.email}`, { ip: clientIp });

    return res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const result = await pool.query<UserRow>(
      'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/setup-status
 * Check if initial setup is required (no users exist)
 */
export const checkSetupStatus = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Check if any admin users exist
    const adminResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    const adminCount = parseInt(adminResult.rows[0].count);

    // Also get total user count for reference
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(totalResult.rows[0].count);

    return res.json({
      setupRequired: adminCount === 0,
      userCount: userCount,
    });
  } catch (error) {
    logger.error('Error checking setup status', error);
    next(error);
  }
};

/**
 * POST /api/auth/setup
 * Create the first admin user (only works if no users exist)
 */
export const setupFirstUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if any admin users exist
    const countResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    const adminCount = parseInt(countResult.rows[0].count);

    if (adminCount > 0) {
      return res.status(403).json({
        error: 'Setup has already been completed. An admin user already exists.'
      });
    }

    const { email, password, firstName, lastName }: RegisterRequest = req.body;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create first user as admin
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email, passwordHash, firstName, lastName, 'admin']
    );

    const user = result.rows[0];

    // Generate access token
    const jwtSecret = getJwtSecret();
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: JWT.ACCESS_TOKEN_EXPIRY }
    );

    logger.info(`First admin user created: ${email}`);

    return res.status(201).json({
      message: 'Setup completed successfully',
      token,
      user: {
        user_id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Error during first-time setup', error);
    next(error);
  }
};
