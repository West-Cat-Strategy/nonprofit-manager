import { logger } from '@config/logger';
import { encrypt } from '@utils/encryption';
import * as emailRepo from '../repositories/emailSettingsRepository';

export interface EmailSettings {
  id: string;
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpFromAddress: string | null;
  smtpFromName: string | null;
  imapHost: string | null;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string | null;
  isConfigured: boolean;
  lastTestedAt: Date | null;
  lastTestSuccess: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateEmailSettingsDTO {
  smtpHost?: string | null;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string | null;
  smtpPass?: string;
  smtpFromAddress?: string | null;
  smtpFromName?: string | null;
  imapHost?: string | null;
  imapPort?: number;
  imapSecure?: boolean;
  imapUser?: string | null;
  imapPass?: string;
}

function mapRow(row: emailRepo.SettingsRow): EmailSettings {
  return {
    id: row.id,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpSecure: row.smtp_secure,
    smtpUser: row.smtp_user,
    smtpFromAddress: row.smtp_from_address,
    smtpFromName: row.smtp_from_name,
    imapHost: row.imap_host,
    imapPort: row.imap_port,
    imapSecure: row.imap_secure,
    imapUser: row.imap_user,
    isConfigured: row.is_configured,
    lastTestedAt: row.last_tested_at,
    lastTestSuccess: row.last_test_success,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getEmailSettings(): Promise<EmailSettings | null> {
  const row = await emailRepo.getEmailSettingsRow();
  return row ? mapRow(row) : null;
}

export async function hasStoredCredentials(): Promise<{ smtp: boolean; imap: boolean }> {
  const row = await emailRepo.getEncryptedCredentialsRow();
  if (!row) {
    return { smtp: false, imap: false };
  }
  return {
    smtp: Boolean(row.smtp_pass_encrypted),
    imap: Boolean(row.imap_pass_encrypted),
  };
}

export async function updateEmailSettings(
  data: UpdateEmailSettingsDTO,
  userId: string
): Promise<EmailSettings> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const addParam = (column: string, value: unknown): void => {
    setClauses.push(`${column} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  };

  if (data.smtpHost !== undefined) addParam('smtp_host', data.smtpHost);
  if (data.smtpPort !== undefined) addParam('smtp_port', data.smtpPort);
  if (data.smtpSecure !== undefined) addParam('smtp_secure', data.smtpSecure);
  if (data.smtpUser !== undefined) addParam('smtp_user', data.smtpUser);
  if (data.smtpPass !== undefined) {
    addParam('smtp_pass_encrypted', data.smtpPass.trim() ? encrypt(data.smtpPass) : null);
  }
  if (data.smtpFromAddress !== undefined) addParam('smtp_from_address', data.smtpFromAddress);
  if (data.smtpFromName !== undefined) addParam('smtp_from_name', data.smtpFromName);
  if (data.imapHost !== undefined) addParam('imap_host', data.imapHost);
  if (data.imapPort !== undefined) addParam('imap_port', data.imapPort);
  if (data.imapSecure !== undefined) addParam('imap_secure', data.imapSecure);
  if (data.imapUser !== undefined) addParam('imap_user', data.imapUser);
  if (data.imapPass !== undefined) {
    addParam('imap_pass_encrypted', data.imapPass.trim() ? encrypt(data.imapPass) : null);
  }

  const smtpHost = data.smtpHost;
  const smtpUser = data.smtpUser;
  const smtpFrom = data.smtpFromAddress;
  const smtpPass = data.smtpPass;

  if (
    smtpHost !== undefined || 
    smtpUser !== undefined || 
    smtpFrom !== undefined || 
    smtpPass !== undefined
  ) {
    const current = await emailRepo.getEmailSettingsRow();
    const effectiveHost = smtpHost !== undefined ? smtpHost : current?.smtp_host;
    const effectiveUser = smtpUser !== undefined ? smtpUser : current?.smtp_user;
    const effectiveFrom = smtpFrom !== undefined ? smtpFrom : current?.smtp_from_address;
    const effectivePass = smtpPass !== undefined ? Boolean(smtpPass.trim()) : Boolean(current?.smtp_pass_encrypted);

    const configured = Boolean(effectiveHost && effectiveUser && effectiveFrom && effectivePass);
    addParam('is_configured', configured);
  }

  addParam('modified_by', userId);
  addParam('updated_at', new Date());

  if (setClauses.length === 0) {
    const existingRow = await emailRepo.getEmailSettingsRow();
    if (!existingRow) throw new Error('Email settings not found');
    return mapRow(existingRow);
  }

  const updatedRow = await emailRepo.updateEmailSettingsRow(setClauses, values);
  if (!updatedRow) {
    throw new Error('Email settings not found');
  }

  logger.info('Email settings updated', { userId });
  return mapRow(updatedRow);
}
