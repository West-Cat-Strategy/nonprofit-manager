import { Response, NextFunction } from 'express';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
  WebAuthnCredential,
} from '@simplewebauthn/server';
import pool from '@config/database';
import { getWebAuthnConfig } from '@config/webauthn';
import { AuthRequest } from '@middleware/auth';
import { TIME } from '@config/constants';
import { fromBase64Url, toBase64Url } from '@utils/base64url';
import { trackLoginAttempt } from '@middleware/accountLockout';
import { badRequest, notFoundMessage, unauthorized } from '@utils/responseHelpers';
import { setAuthCookie } from '@utils/cookieHelper';
import { buildAuthTokenResponse, generateAuthSessionCsrfToken } from '@utils/authResponse';
import { normalizeRoleSlug } from '@utils/roleSlug';
import {
  issueAppSessionToken,
  PENDING_REGISTRATION_TOKEN_ISSUER,
  type PendingRegistrationTokenPayload,
  verifyTokenWithOptionalIssuer,
} from '@utils/sessionTokens';
import * as pendingRegistrationRepository from '@modules/admin/repositories/pendingRegistrationRepository';

const CHALLENGE_TTL_MS = TIME.FIVE_MINUTES;

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture?: string | null;
  mfa_totp_enabled?: boolean;
  is_active?: boolean;
  auth_revision?: number;
}

interface CredentialRow {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string[] | null;
  device_type: string | null;
  backed_up: boolean | null;
  name: string | null;
  created_at: Date;
  last_used_at: Date | null;
}

interface ChallengeRow {
  id: string;
  user_id: string | null;
  challenge: string;
  type: string;
  expires_at: Date;
}

const issueAuthTokens = (
  user: { id: string; email: string; role: string; auth_revision?: number },
  organizationId?: string | null
) => {
  const normalizedRole = normalizeRoleSlug(user.role) ?? user.role;
  return issueAppSessionToken({
    id: user.id,
    email: user.email,
    role: normalizedRole,
    organizationId,
    authRevision: user.auth_revision ?? 0,
  });
};

const getDefaultOrganizationId = async (): Promise<string | null> => {
  const result = await pool.query(
    `SELECT id
     FROM accounts
     WHERE account_type = 'organization'
       AND COALESCE(is_active, true) = true
     ORDER BY created_at ASC
     LIMIT 1`
  );
  return result.rows[0]?.id || null;
};

const readPendingRegistrationFromToken = async (
  registrationToken: string
): Promise<pendingRegistrationRepository.PendingRegistrationRow | null> => {
  try {
    const payload = verifyTokenWithOptionalIssuer<PendingRegistrationTokenPayload>(
      registrationToken,
      PENDING_REGISTRATION_TOKEN_ISSUER
    );
    const pendingRegistrationId =
      typeof payload.pendingRegistrationId === 'string' ? payload.pendingRegistrationId : null;
    if (!pendingRegistrationId) {
      return null;
    }

    return pendingRegistrationRepository.getPendingRegistrationById(pendingRegistrationId, false);
  } catch {
    return null;
  }
};

export const listPasskeys = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const result = await pool.query<CredentialRow>(
      `SELECT id, name, created_at, last_used_at
       FROM user_webauthn_credentials
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user!.id]
    );
    return res.json({
      passkeys: result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        createdAt: r.created_at,
        lastUsedAt: r.last_used_at,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const deletePasskey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM user_webauthn_credentials WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.id]
    );
    if (result.rows.length === 0) {
      return notFoundMessage(res, 'Passkey not found');
    }
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const registrationOptions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { rpID, rpName } = getWebAuthnConfig();

    const userResult = await pool.query<UserRow>(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (userResult.rows.length === 0) {
      return notFoundMessage(res, 'User not found');
    }
    const user = userResult.rows[0];

    const creds = await pool.query<{ credential_id: string }>(
      'SELECT credential_id FROM user_webauthn_credentials WHERE user_id = $1',
      [user.id]
    );

    const options = await generateRegistrationOptions({
      rpID,
      rpName,
      userID: Buffer.from(user.id),
      userName: user.email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      excludeCredentials: creds.rows.map((r) => ({
        id: r.credential_id,
      })),
    });

    const challengeInsert = await pool.query<ChallengeRow>(
      `INSERT INTO user_webauthn_challenges (user_id, challenge, type, expires_at)
       VALUES ($1, $2, 'registration', NOW() + ($3 * INTERVAL '1 millisecond'))
       RETURNING id, challenge`,
      [user.id, options.challenge, CHALLENGE_TTL_MS]
    );

    return res.json({ challengeId: challengeInsert.rows[0].id, options });
  } catch (error) {
    next(error);
  }
};

export const registrationVerify = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { origins, rpID } = getWebAuthnConfig();
    const { challengeId, credential, name }: { challengeId: string; credential: RegistrationResponseJSON; name?: string } =
      req.body;

    const challengeResult = await pool.query<ChallengeRow>(
      `SELECT id, user_id, challenge, type, expires_at
       FROM user_webauthn_challenges
       WHERE id = $1`,
      [challengeId]
    );
    if (challengeResult.rows.length === 0) {
      return badRequest(res, 'Invalid or expired challenge');
    }

    const challenge = challengeResult.rows[0];
    if (challenge.type !== 'registration' || challenge.user_id !== req.user!.id) {
      return badRequest(res, 'Invalid or expired challenge');
    }
    if (new Date() > new Date(challenge.expires_at)) {
      await pool.query('DELETE FROM user_webauthn_challenges WHERE id = $1', [challengeId]);
      return badRequest(res, 'Invalid or expired challenge');
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return badRequest(res, 'Passkey registration failed');
    }

    const info = verification.registrationInfo;
    const credentialId = info.credential.id;
    const publicKey = toBase64Url(info.credential.publicKey);
    const transports = credential.response.transports || null;

    const inserted = await pool.query<CredentialRow>(
      `INSERT INTO user_webauthn_credentials
         (user_id, credential_id, public_key, counter, transports, device_type, backed_up, name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, created_at, last_used_at`,
      [
        req.user!.id,
        credentialId,
        publicKey,
        info.credential.counter,
        transports,
        info.credentialDeviceType || null,
        typeof info.credentialBackedUp === 'boolean' ? info.credentialBackedUp : null,
        name || null,
      ]
    );

    await pool.query('DELETE FROM user_webauthn_challenges WHERE id = $1', [challengeId]);

    return res.status(201).json({
      passkey: {
        id: inserted.rows[0].id,
        name: inserted.rows[0].name,
        createdAt: inserted.rows[0].created_at,
        lastUsedAt: inserted.rows[0].last_used_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const pendingRegistrationOptions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { rpID, rpName } = getWebAuthnConfig();
    const { registrationToken, email }: { registrationToken: string; email: string } = req.body;

    const pending = await readPendingRegistrationFromToken(registrationToken);
    if (!pending || pending.status !== 'pending') {
      return badRequest(res, 'Invalid or expired registration token');
    }
    if (pending.email.toLowerCase() !== email.trim().toLowerCase()) {
      return badRequest(res, 'Registration token does not match this email address');
    }

    const stagedCredentials =
      await pendingRegistrationRepository.listPendingRegistrationCredentials(pending.id);

    const options = await generateRegistrationOptions({
      rpID,
      rpName,
      userID: Buffer.from(pending.id),
      userName: pending.email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      excludeCredentials: stagedCredentials.map((credential) => ({
        id: credential.credential_id,
      })),
    });

    const challenge =
      await pendingRegistrationRepository.insertPendingRegistrationChallenge({
        pendingRegistrationId: pending.id,
        challenge: options.challenge,
        type: 'registration',
        expiresInMs: CHALLENGE_TTL_MS,
      });

    return res.json({ challengeId: challenge.id, options });
  } catch (error) {
    next(error);
  }
};

export const pendingRegistrationVerify = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { origins, rpID } = getWebAuthnConfig();
    const {
      registrationToken,
      challengeId,
      credential,
      name,
    }: {
      registrationToken: string;
      challengeId: string;
      credential: RegistrationResponseJSON;
      name?: string | null;
    } = req.body;

    const pending = await readPendingRegistrationFromToken(registrationToken);
    if (!pending || pending.status !== 'pending') {
      return badRequest(res, 'Invalid or expired registration token');
    }

    const challenge = await pendingRegistrationRepository.getPendingRegistrationChallengeById(
      challengeId
    );
    if (!challenge) {
      return badRequest(res, 'Invalid or expired challenge');
    }
    if (challenge.type !== 'registration' || challenge.pending_registration_id !== pending.id) {
      return badRequest(res, 'Invalid or expired challenge');
    }
    if (new Date() > new Date(challenge.expires_at)) {
      await pendingRegistrationRepository.deletePendingRegistrationChallenge(challengeId);
      return badRequest(res, 'Invalid or expired challenge');
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return badRequest(res, 'Passkey registration failed');
    }

    const info = verification.registrationInfo;
    const credentialId = info.credential.id;
    if (
      (await pendingRegistrationRepository.pendingCredentialExists(credentialId)) ||
      (await pendingRegistrationRepository.userCredentialExists(credentialId))
    ) {
      return badRequest(res, 'This passkey is already registered');
    }

    await pendingRegistrationRepository.insertPendingRegistrationCredential({
      pendingRegistrationId: pending.id,
      credentialId,
      publicKey: toBase64Url(info.credential.publicKey),
      counter: info.credential.counter,
      transports: credential.response.transports || null,
      deviceType: info.credentialDeviceType || null,
      backedUp:
        typeof info.credentialBackedUp === 'boolean' ? info.credentialBackedUp : null,
      name: name || null,
    });
    await pendingRegistrationRepository.deletePendingRegistrationChallenge(challengeId);

    return res.status(201).json({
      message: 'Passkey staged successfully',
      hasStagedPasskeys: true,
    });
  } catch (error) {
    next(error);
  }
};

export const loginOptions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { rpID } = getWebAuthnConfig();
    const { email }: { email: string } = req.body;

    const userResult = await pool.query<UserRow>(
      `SELECT id, email, first_name, last_name, role,
              COALESCE(is_active, true) AS is_active,
              COALESCE(auth_revision, 0) AS auth_revision
       FROM users
       WHERE email = $1`,
      [email]
    );
    if (userResult.rows.length === 0) {
      return notFoundMessage(res, 'No passkeys registered for this user');
    }
    const user = userResult.rows[0];
    if (user.is_active === false) {
      return notFoundMessage(res, 'No passkeys registered for this user');
    }

    const credResult = await pool.query<Pick<CredentialRow, 'credential_id' | 'transports'>>(
      'SELECT credential_id, transports FROM user_webauthn_credentials WHERE user_id = $1',
      [user.id]
    );
    if (credResult.rows.length === 0) {
      return notFoundMessage(res, 'No passkeys registered for this user');
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credResult.rows.map((c) => ({
        id: c.credential_id,
        transports: (c.transports || undefined) as WebAuthnCredential['transports'],
      })),
      userVerification: 'preferred',
    });

    const challengeInsert = await pool.query<ChallengeRow>(
      `INSERT INTO user_webauthn_challenges (user_id, challenge, type, expires_at)
       VALUES ($1, $2, 'authentication', NOW() + ($3 * INTERVAL '1 millisecond'))
       RETURNING id`,
      [user.id, options.challenge, CHALLENGE_TTL_MS]
    );

    return res.json({ challengeId: challengeInsert.rows[0].id, options });
  } catch (error) {
    next(error);
  }
};

export const loginVerify = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const { origins, rpID } = getWebAuthnConfig();

    const { email, challengeId, credential }: { email: string; challengeId: string; credential: AuthenticationResponseJSON } =
      req.body;

    const challengeResult = await pool.query<ChallengeRow>(
      `SELECT id, user_id, challenge, type, expires_at
       FROM user_webauthn_challenges
       WHERE id = $1`,
      [challengeId]
    );
    if (challengeResult.rows.length === 0) {
      return badRequest(res, 'Invalid or expired challenge');
    }

    const challenge = challengeResult.rows[0];
    if (challenge.type !== 'authentication') {
      return badRequest(res, 'Invalid or expired challenge');
    }
    if (new Date() > new Date(challenge.expires_at)) {
      await pool.query('DELETE FROM user_webauthn_challenges WHERE id = $1', [challengeId]);
      return badRequest(res, 'Invalid or expired challenge');
    }

    const userResult = await pool.query<UserRow>(
      `SELECT id, email, first_name, last_name, role, profile_picture,
              COALESCE(is_active, true) AS is_active,
              COALESCE(auth_revision, 0) AS auth_revision
       FROM users
       WHERE id = $1`,
      [challenge.user_id]
    );
    if (userResult.rows.length === 0) {
      return unauthorized(res, 'Invalid credentials');
    }
    const user = userResult.rows[0];
    if (user.is_active === false) {
      return unauthorized(res, 'Invalid credentials');
    }
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return unauthorized(res, 'Invalid credentials');
    }

    const credentialId = credential.id;
    const credResult = await pool.query<CredentialRow>(
      `SELECT *
       FROM user_webauthn_credentials
       WHERE user_id = $1 AND credential_id = $2`,
      [user.id, credentialId]
    );
    if (credResult.rows.length === 0) {
      return unauthorized(res, 'Invalid credentials');
    }

    const dbCred = credResult.rows[0];

    const expectedCredential: WebAuthnCredential = {
      id: dbCred.credential_id,
      publicKey: Uint8Array.from(fromBase64Url(dbCred.public_key)),
      counter: dbCred.counter,
      transports: (dbCred.transports || undefined) as WebAuthnCredential['transports'],
    };

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      credential: expectedCredential,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.authenticationInfo) {
      return unauthorized(res, 'Invalid credentials');
    }

    await pool.query(
      `UPDATE user_webauthn_credentials
       SET counter = $1,
           last_used_at = NOW()
       WHERE id = $2`,
      [verification.authenticationInfo.newCounter, dbCred.id]
    );
    await pool.query('DELETE FROM user_webauthn_challenges WHERE id = $1', [challengeId]);

    await trackLoginAttempt(email, true, user.id, clientIp);

    const organizationId = await getDefaultOrganizationId();
    const token = issueAuthTokens(user, organizationId);
    setAuthCookie(res, token);
    const csrfToken = generateAuthSessionCsrfToken(req, res, token);
    return res.json({
      ...buildAuthTokenResponse(token),
      csrfToken,
      organizationId,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: normalizeRoleSlug(user.role) ?? user.role,
        profilePicture: user.profile_picture || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
