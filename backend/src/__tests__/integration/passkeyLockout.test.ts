import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';
import { toBase64Url } from '../../utils/base64url';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

jest.mock('@simplewebauthn/server', () => ({
  __esModule: true,
  generateAuthenticationOptions: jest.fn(),
  generateRegistrationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
}));

describe('Passkey lockout behavior', () => {
  const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const testPassword = 'StrongPassword123!';
  const emailPrefix = 'passkey-lockout-';
  const createdEmails: string[] = [];
  const previousLockoutFlag = process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST;

  const mockGenerateAuthenticationOptions =
    generateAuthenticationOptions as jest.MockedFunction<typeof generateAuthenticationOptions>;
  const mockVerifyAuthenticationResponse =
    verifyAuthenticationResponse as jest.MockedFunction<typeof verifyAuthenticationResponse>;
  const mockGenerateRegistrationOptions =
    generateRegistrationOptions as jest.MockedFunction<typeof generateRegistrationOptions>;
  const mockVerifyRegistrationResponse =
    verifyRegistrationResponse as jest.MockedFunction<typeof verifyRegistrationResponse>;

  const createTestUserWithPasskey = async () => {
    const email = `${emailPrefix}${unique()}@example.com`;
    const passwordHash = await bcrypt.hash(testPassword, 10);

    const userResult = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING id`,
      [email, passwordHash, 'Passkey', 'User']
    );

    const userId = userResult.rows[0].id;
    const credentialId = `cred-${unique()}`;
    const publicKey = toBase64Url(Buffer.from(`public-key-${unique()}`));

    await pool.query(
      `INSERT INTO user_webauthn_credentials
         (user_id, credential_id, public_key, counter, transports, device_type, backed_up, name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, credentialId, publicKey, 0, ['internal'], 'singleDevice', true, 'Primary passkey']
    );

    createdEmails.push(email);

    return { email, userId, credentialId };
  };

  const lockPasswordLogin = async (email: string) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app)
        .post('/api/v2/auth/login')
        .send({
          email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    }
  };

  beforeEach(() => {
    process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST = 'true';
    jest.clearAllMocks();
    mockGenerateAuthenticationOptions.mockResolvedValue({
      challenge: 'passkey-challenge',
      allowCredentials: [],
    } as never);
    mockGenerateRegistrationOptions.mockResolvedValue({} as never);
    mockVerifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    } as never);
    mockVerifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: null,
    } as never);
  });

  afterAll(async () => {
    process.env.ENABLE_ACCOUNT_LOCKOUT_IN_TEST = previousLockoutFlag;

    if (createdEmails.length === 0) {
      return;
    }

    const users = await pool.query<{ id: string }>(
      `SELECT id
       FROM users
       WHERE email LIKE $1`,
      [`${emailPrefix}%`]
    );
    const userIds = users.rows.map((row) => row.id);

    if (userIds.length === 0) {
      return;
    }

    await pool.query('DELETE FROM user_webauthn_challenges WHERE user_id = ANY($1::uuid[])', [userIds]);
    await pool.query('DELETE FROM user_webauthn_credentials WHERE user_id = ANY($1::uuid[])', [userIds]);
    await pool.query('DELETE FROM user_roles WHERE user_id = ANY($1::uuid[])', [userIds]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
  });

  it('allows passkey sign-in to bypass a password lockout and clear it on success', async () => {
    const { email, credentialId } = await createTestUserWithPasskey();

    await lockPasswordLogin(email);

    const lockedPasswordLogin = await request(app)
      .post('/api/v2/auth/login')
      .send({
        email,
        password: testPassword,
      })
      .expect(423);

    const initialLockedUntil = lockedPasswordLogin.body.lockedUntil;
    expect(initialLockedUntil).toBeTruthy();

    const optionsResponse = await request(app)
      .post('/api/v2/auth/passkeys/login/options')
      .send({
        email,
      })
      .expect(200);

    expect(optionsResponse.body.challengeId).toBeTruthy();
    expect(optionsResponse.body.options.challenge).toBe('passkey-challenge');

    const verifyResponse = await request(app)
      .post('/api/v2/auth/passkeys/login/verify')
      .send({
        email,
        challengeId: optionsResponse.body.challengeId,
        credential: { id: credentialId },
      })
      .expect(200);

    expect(verifyResponse.body.token).toBeTruthy();

    const postPasskeyPasswordLogin = await request(app)
      .post('/api/v2/auth/login')
      .send({
        email,
        password: testPassword,
      })
      .expect(200);

    expect(postPasskeyPasswordLogin.body.token).toBeTruthy();
  });

  it('does not extend the password lockout when passkey verification fails', async () => {
    const { email, credentialId } = await createTestUserWithPasskey();

    await lockPasswordLogin(email);

    const lockedPasswordLogin = await request(app)
      .post('/api/v2/auth/login')
      .send({
        email,
        password: testPassword,
      })
      .expect(423);

    const initialLockedUntil = lockedPasswordLogin.body.lockedUntil;
    expect(initialLockedUntil).toBeTruthy();

    const optionsResponse = await request(app)
      .post('/api/v2/auth/passkeys/login/options')
      .send({
        email,
      })
      .expect(200);

    mockVerifyAuthenticationResponse.mockResolvedValueOnce({
      verified: false,
      authenticationInfo: undefined,
    } as never);

    await request(app)
      .post('/api/v2/auth/passkeys/login/verify')
      .send({
        email,
        challengeId: optionsResponse.body.challengeId,
        credential: { id: credentialId },
      })
      .expect(401);

    const passwordLoginAfterPasskeyFailure = await request(app)
      .post('/api/v2/auth/login')
      .send({
        email,
        password: testPassword,
      })
      .expect(423);

    expect(passwordLoginAfterPasskeyFailure.body.lockedUntil).toBe(initialLockedUntil);
  });
});
