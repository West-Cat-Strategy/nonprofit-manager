import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '@config/logger';
import { getJwtSecret } from '@config/jwt';
import { AuthRequest } from '@middleware/auth';
import { JWT, PASSWORD } from '@config/constants';
import { syncUserRole } from '@services/domains/integration';
import { conflict, forbidden } from '@utils/responseHelpers';
import { setAuthCookie } from '@utils/cookieHelper';
import { buildAuthTokenResponse } from '@utils/authResponse';
import { sendSuccess } from '@modules/shared/http/envelope';
import { getRegistrationMode } from '@services/registrationSettingsService';
import { createPendingRegistration } from '@services/pendingRegistrationService';
import {
  countAdminUsers,
  countAllUsers,
  createAuthUser,
  createInitialAdminUser,
  createOrganizationAccount,
  findUserIdByEmail,
  getDefaultOrganizationId,
  RegisterRequest,
  SetupRequest,
} from '../lib/authQueries';
import { mapAuthUser } from '../lib/authResponseMappers';
export { forgotPassword, validateResetToken, resetPassword } from './passwordResetController';
export { getRegistrationStatus } from './registrationSettingsController';

export const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const bypassRegistrationPolicyInTests =
      process.env.NODE_ENV === 'test' &&
      process.env.BYPASS_REGISTRATION_POLICY_IN_TEST === 'true';
    const registrationMode = await getRegistrationMode();
    if (!bypassRegistrationPolicyInTests && registrationMode === 'disabled') {
      return forbidden(res, 'Registration is currently disabled');
    }

    const { email, password, firstName, lastName } = req.body as RegisterRequest;

    if (!bypassRegistrationPolicyInTests && registrationMode === 'approval_required') {
      try {
        await createPendingRegistration({
          email,
          password,
          firstName,
          lastName,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('already pending')) {
          return conflict(res, err.message);
        }
        if (err instanceof Error && err.message.includes('already exists')) {
          return conflict(res, err.message);
        }
        throw err;
      }

      return sendSuccess(
        res,
        {
          message:
            'Your registration request has been submitted and is awaiting admin approval. You will receive an email once your account is approved.',
          pendingApproval: true,
        },
        202
      );
    }

    const existingUserId = await findUserIdByEmail(email);
    if (existingUserId) {
      return conflict(res, 'User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS);

    const user = await createAuthUser({
      email,
      passwordHash: hashedPassword,
      firstName,
      lastName,
      role: 'user',
    });
    await syncUserRole(user.id, user.role);

    const organizationId = await getDefaultOrganizationId();
    const jwtSecret = getJwtSecret();
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        ...(organizationId ? { organizationId } : {}),
      },
      jwtSecret,
      { expiresIn: JWT.ACCESS_TOKEN_EXPIRY }
    );

    logger.info(`User registered: ${user.email}`);
    setAuthCookie(res, token);

    return sendSuccess(
      res,
      {
        ...buildAuthTokenResponse(token),
        organizationId,
        user: mapAuthUser(user, { includeLegacyUserId: true }),
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

export const checkSetupStatus = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const adminCount = await countAdminUsers();
    const userCount = await countAllUsers();

    return sendSuccess(res, {
      setupRequired: adminCount === 0,
      userCount,
    });
  } catch (error) {
    logger.error('Error checking setup status', error);
    next(error);
  }
};

export const setupFirstUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const adminCount = await countAdminUsers();

    if (adminCount > 0) {
      return forbidden(res, 'Setup has already been completed. An admin user already exists.');
    }

    const {
      email,
      password,
      firstName,
      lastName,
      organizationName,
    }: SetupRequest = req.body;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await createInitialAdminUser({
      email,
      passwordHash,
      firstName,
      lastName,
    });

    const trimmedOrgName = organizationName?.trim();
    const defaultOrgName = process.env.ORG_DEFAULT_NAME || 'Default Organization';
    const orgName = trimmedOrgName && trimmedOrgName.length > 0 ? trimmedOrgName : defaultOrgName;
    const organizationId = await createOrganizationAccount(orgName, user.id);

    const jwtSecret = getJwtSecret();
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        ...(organizationId ? { organizationId } : {}),
      },
      jwtSecret,
      { expiresIn: JWT.ACCESS_TOKEN_EXPIRY }
    );

    logger.info(`First admin user created: ${email}`);
    setAuthCookie(res, token);

    return sendSuccess(
      res,
      {
        message: 'Setup completed successfully',
        ...buildAuthTokenResponse(token),
        organizationId,
        user: mapAuthUser(user, { includeLegacyUserId: true }),
      },
      201
    );
  } catch (error) {
    logger.error('Error during first-time setup', error);
    next(error);
  }
};
