import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '@config/database';
import { logger } from '@config/logger';
import { PASSWORD } from '@config/constants';

const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY_HOURS = 1;
const COMPOSITE_TOKEN_DELIMITER = '.';
const UUID_LIKE_REGEX = /^[0-9a-fA-F-]{36}$/;
const TOKEN_SECRET_REGEX = /^[0-9a-fA-F]{64}$/;

interface ActiveTokenRow {
  id: string;
  owner_id: string;
  token_hash: string;
}

export interface PasswordResetCoreConfig {
  tokenTable: string;
  ownerColumn: string;
  userTable: string;
  logContextKey: string;
}

interface PasswordResetMessages {
  insertFailure: string;
  invalidToken: string;
  resetSucceeded: string;
  resetFailed: string;
}

const parseCompositeToken = (token: string): { tokenId: string; secret: string } | null => {
  if (!token.includes(COMPOSITE_TOKEN_DELIMITER)) {
    return null;
  }

  const parts = token.split(COMPOSITE_TOKEN_DELIMITER);
  if (parts.length !== 2) {
    return null;
  }

  const [tokenId, secret] = parts;
  if (!tokenId || !secret) {
    return null;
  }

  if (!UUID_LIKE_REGEX.test(tokenId) || !TOKEN_SECRET_REGEX.test(secret)) {
    return null;
  }

  return { tokenId, secret };
};

const logContext = (config: PasswordResetCoreConfig, ownerId: string): Record<string, string> => ({
  [config.logContextKey]: ownerId,
});

const selectActiveTokenColumns = (config: PasswordResetCoreConfig): string =>
  `SELECT id, ${config.ownerColumn} AS owner_id, token_hash FROM ${config.tokenTable}`;

const findMatchingLegacyToken = async (
  token: string,
  config: PasswordResetCoreConfig
): Promise<ActiveTokenRow | null> => {
  const result = await pool.query<ActiveTokenRow>(
    `${selectActiveTokenColumns(config)}
     WHERE expires_at > NOW() AND used_at IS NULL
     ORDER BY created_at DESC`
  );

  for (const row of result.rows) {
    const match = await bcrypt.compare(token, row.token_hash);
    if (match) {
      return row;
    }
  }

  return null;
};

const resolveTokenMatch = async (
  token: string,
  config: PasswordResetCoreConfig
): Promise<ActiveTokenRow | null> => {
  if (token.includes(COMPOSITE_TOKEN_DELIMITER)) {
    const parsed = parseCompositeToken(token);
    if (!parsed) {
      return null;
    }

    const result = await pool.query<ActiveTokenRow>(
      `${selectActiveTokenColumns(config)}
       WHERE id = $1
         AND expires_at > NOW()
         AND used_at IS NULL
       LIMIT 1`,
      [parsed.tokenId]
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const match = await bcrypt.compare(parsed.secret, row.token_hash);
    return match ? row : null;
  }

  return findMatchingLegacyToken(token, config);
};

export async function createPasswordResetToken(
  ownerId: string,
  config: PasswordResetCoreConfig,
  messages: Pick<PasswordResetMessages, 'insertFailure'>
): Promise<string | null> {
  await pool.query(`DELETE FROM ${config.tokenTable} WHERE ${config.ownerColumn} = $1`, [ownerId]);

  const tokenSecret = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
  const tokenHash = await bcrypt.hash(tokenSecret, PASSWORD.BCRYPT_SALT_ROUNDS);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  const insertResult = await pool.query<{ id: string }>(
    `INSERT INTO ${config.tokenTable} (${config.ownerColumn}, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [ownerId, tokenHash, expiresAt]
  );

  const tokenId = insertResult.rows[0]?.id;
  if (!tokenId) {
    logger.error(messages.insertFailure, logContext(config, ownerId));
    return null;
  }

  return `${tokenId}.${tokenSecret}`;
}

export async function validatePasswordResetToken(
  token: string,
  config: PasswordResetCoreConfig
): Promise<string | null> {
  const match = await resolveTokenMatch(token, config);
  return match?.owner_id ?? null;
}

export async function performPasswordReset(
  token: string,
  newPassword: string,
  config: PasswordResetCoreConfig,
  messages: Omit<PasswordResetMessages, 'insertFailure'>
): Promise<boolean> {
  const matchedToken = await resolveTokenMatch(token, config);
  if (!matchedToken) {
    logger.warn(messages.invalidToken);
    return false;
  }

  const passwordHash = await bcrypt.hash(newPassword, PASSWORD.BCRYPT_SALT_ROUNDS);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE ${config.userTable} SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, matchedToken.owner_id]
    );

    await client.query(`UPDATE ${config.tokenTable} SET used_at = NOW() WHERE id = $1`, [
      matchedToken.id,
    ]);

    await client.query(
      `DELETE FROM ${config.tokenTable} WHERE ${config.ownerColumn} = $1 AND id != $2`,
      [matchedToken.owner_id, matchedToken.id]
    );

    await client.query('COMMIT');
    logger.info(messages.resetSucceeded, logContext(config, matchedToken.owner_id));
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(messages.resetFailed, {
      error,
      ...logContext(config, matchedToken.owner_id),
    });
    return false;
  } finally {
    client.release();
  }
}
