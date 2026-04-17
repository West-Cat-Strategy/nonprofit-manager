import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { logger } from '@config/logger';
import { AuthRequest } from '@middleware/auth';
import { PASSWORD } from '@config/constants';
import { syncUserRole } from '@services/domains/integration';
import { seedDefaultOrganizationAccess, upsertUserOrganizationAccess } from '@services/accountAccessService';
import { conflict, forbidden } from '@utils/responseHelpers';
import { setAuthCookie } from '@utils/cookieHelper';
import { buildAuthTokenResponse, generateAuthSessionCsrfToken } from '@utils/authResponse';
import { sendSuccess } from '@modules/shared/http/envelope';
import { issueAppSessionToken, issuePendingRegistrationToken } from '@utils/sessionTokens';
import { getRegistrationMode } from '@modules/admin/usecases/registrationSettingsUseCase';
import { createPendingRegistration } from '@modules/admin/usecases/createPendingRegistrationUseCase';
import {
  countAdminUsers,
  getSetupUserCounts,
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
    const runStep = async <T>(step: string, operation: () => Promise<T>): Promise<T> => {
      try {
        return await operation();
      } catch (error) {
        const registerError = error as {
          code?: string;
          message?: string;
          stack?: string;
          errors?: unknown[];
        };
        logger.error('register.step_failed', {
          step,
          code: registerError.code,
          message: registerError.message,
          stack: registerError.stack,
          errors: registerError.errors,
        });
        throw error;
      }
    };

    const bypassRegistrationPolicyInTests =
      process.env.NODE_ENV === 'test' &&
      process.env.BYPASS_REGISTRATION_POLICY_IN_TEST === 'true';
    const { email, password, firstName, lastName } = req.body as RegisterRequest;

    if (!bypassRegistrationPolicyInTests) {
      const registrationMode = await runStep('getRegistrationMode', () => getRegistrationMode());
      if (registrationMode === 'disabled') {
        return forbidden(res, 'Registration is currently disabled');
      }

      if (registrationMode === 'approval_required') {
        try {
          const { pendingRegistration, passkeySetupAllowed } = await runStep(
            'createPendingRegistration',
            () =>
              createPendingRegistration({
                email,
                password,
                firstName,
                lastName,
              })
          );

          return sendSuccess(
            res,
            {
              message:
                'Your registration request has been submitted and is awaiting admin approval. You will receive an email once your account is approved.',
              pendingApproval: true,
              registrationToken: issuePendingRegistrationToken({
                pendingRegistrationId: pendingRegistration.id,
              }),
              passkeySetupAllowed,
              hasStagedPasskeys: Boolean(pendingRegistration.has_staged_passkeys),
            },
            202
          );
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes('already pending')) {
            return conflict(res, err.message);
          }
          if (err instanceof Error && err.message.includes('already exists')) {
            return conflict(res, err.message);
          }
          throw err;
        }
      }
    }

    const existingUserId = await runStep('findUserIdByEmail', () => findUserIdByEmail(email));
    if (existingUserId) {
      return conflict(res, 'User already exists');
    }

    const hashedPassword = await runStep('hashPassword', () => bcrypt.hash(password, PASSWORD.BCRYPT_SALT_ROUNDS));

    const user = await runStep('createAuthUser', () => createAuthUser({
      email,
      passwordHash: hashedPassword,
      firstName,
      lastName,
      role: 'staff',
    }));
    await runStep('syncUserRole', () => syncUserRole(user.id, user.role));
    const organizationId =
      (await runStep('seedDefaultOrganizationAccess', () =>
        seedDefaultOrganizationAccess(
          {
            userId: user.id,
            role: user.role,
            grantedBy: user.id,
          }
        ))) ??
      (await runStep('getDefaultOrganizationId', () => getDefaultOrganizationId()));
    const token = issueAppSessionToken({
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId,
      authRevision: 0,
    });

    logger.info(`User registered: ${user.email}`);
    setAuthCookie(res, token);
    const csrfToken = generateAuthSessionCsrfToken(req, res, token);

    return sendSuccess(
      res,
      {
        ...buildAuthTokenResponse(token),
        csrfToken,
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
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { adminCount, userCount } = await getSetupUserCounts();

    return sendSuccess(res, {
      setupRequired: adminCount === 0,
      userCount,
    });
  } catch (error) {
    logger.error('Error checking setup status', {
      error,
      correlationId: (req as AuthRequest & { correlationId?: string }).correlationId,
    });
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
    if (organizationId) {
      await upsertUserOrganizationAccess({
        userId: user.id,
        accountId: organizationId,
        accessLevel: 'admin',
        grantedBy: user.id,
      });
    }

    const token = issueAppSessionToken({
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId,
      authRevision: 0,
    });

    logger.info(`First admin user created: ${email}`);
    setAuthCookie(res, token);
    const csrfToken = generateAuthSessionCsrfToken(req, res, token);

    return sendSuccess(
      res,
      {
        message: 'Setup completed successfully',
        ...buildAuthTokenResponse(token),
        csrfToken,
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
