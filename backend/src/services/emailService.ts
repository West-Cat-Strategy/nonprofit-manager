/**
 * Email Service
 * Sends transactional emails (password resets, invitations) via SMTP.
 * Reads SMTP credentials from the email_settings table.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import pool from '@config/database';
import { logger } from '@config/logger';
import { decrypt } from '@utils/encryption';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailSettingsRow {
  id: string;
  smtp_host: string | null;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string | null;
  smtp_pass_encrypted: string | null;
  smtp_from_address: string | null;
  smtp_from_name: string | null;
  imap_host: string | null;
  imap_port: number;
  imap_secure: boolean;
  imap_user: string | null;
  imap_pass_encrypted: string | null;
  is_configured: boolean;
  last_tested_at: Date | null;
  last_test_success: boolean | null;
  created_at: Date;
  updated_at: Date;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromAddress: string;
  fromName: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch SMTP settings from the database and decrypt the password.
 * Returns null when email is not yet configured.
 */
async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const result = await pool.query<EmailSettingsRow>(
    'SELECT * FROM email_settings WHERE is_configured = true ORDER BY created_at LIMIT 1'
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  if (!row.smtp_host || !row.smtp_user || !row.smtp_pass_encrypted || !row.smtp_from_address) {
    return null;
  }

  let smtpPass: string;
  try {
    smtpPass = decrypt(row.smtp_pass_encrypted);
  } catch {
    logger.error('Failed to decrypt SMTP password');
    return null;
  }

  return {
    host: row.smtp_host,
    port: row.smtp_port,
    secure: row.smtp_secure,
    user: row.smtp_user,
    pass: smtpPass,
    fromAddress: row.smtp_from_address,
    fromName: row.smtp_from_name || 'Nonprofit Manager',
  };
}

/**
 * Build a nodemailer transporter from the current SMTP settings.
 */
async function createTransporter(): Promise<Transporter | null> {
  const config = await getSmtpConfig();
  if (!config) return null;

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a single email via the configured SMTP transport.
 */
export async function sendMail(options: SendMailOptions): Promise<boolean> {
  const config = await getSmtpConfig();
  if (!config) {
    logger.warn('Email not sent — SMTP is not configured');
    return false;
  }

  const transporter = await createTransporter();
  if (!transporter) return false;

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromAddress}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    logger.info(`Email sent to ${options.to} — subject: ${options.subject}`);
    return true;
  } catch (error) {
    logger.error('Failed to send email', { error, to: options.to });
    return false;
  }
}

/**
 * Test the SMTP connection with the current settings. Returns true on success.
 */
export async function testSmtpConnection(): Promise<{ success: boolean; error?: string }> {
  const transporter = await createTransporter();
  if (!transporter) {
    return { success: false, error: 'SMTP is not configured' };
  }

  try {
    await transporter.verify();
    // Update last_tested_at in the DB
    await pool.query(
      `UPDATE email_settings SET last_tested_at = NOW(), last_test_success = true, updated_at = NOW()
       WHERE is_configured = true`
    );
    return { success: true };
  } catch (err: unknown) {
    await pool.query(
      `UPDATE email_settings SET last_tested_at = NOW(), last_test_success = false, updated_at = NOW()
       WHERE is_configured = true`
    );
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Pre-built email templates
// ---------------------------------------------------------------------------

/**
 * Send a password-reset email containing a tokenised link.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  firstName: string
): Promise<boolean> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

  return sendMail({
    to,
    subject: 'Reset Your Password — Nonprofit Manager',
    text: [
      `Hi ${firstName},`,
      '',
      'We received a request to reset your password. Click the link below to choose a new password:',
      '',
      resetUrl,
      '',
      'This link will expire in 1 hour.',
      '',
      'If you did not request a password reset, you can safely ignore this email.',
      '',
      '— Nonprofit Manager',
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#0f172a">Reset Your Password</h2>
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your password. Click the button below to choose a new password:</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 32px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
            Reset Password
          </a>
        </p>
        <p style="font-size:13px;color:#64748b">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Send an invitation email containing a tokenised link.
 */
export async function sendInvitationEmail(
  to: string,
  inviteToken: string,
  inviterName: string,
  role: string,
  personalMessage?: string | null
): Promise<boolean> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const acceptUrl = `${frontendUrl}/accept-invitation/${inviteToken}`;

  const messageBlock = personalMessage
    ? `\n${inviterName} says: "${personalMessage}"\n`
    : '';

  return sendMail({
    to,
    subject: `You're Invited to Nonprofit Manager`,
    text: [
      `Hi,`,
      '',
      `${inviterName} has invited you to join Nonprofit Manager as a${role === 'admin' ? 'n' : ''} ${role}.`,
      messageBlock,
      'Click the link below to create your account:',
      '',
      acceptUrl,
      '',
      'This link will expire in 7 days.',
      '',
      '— Nonprofit Manager',
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#0f172a">You're Invited!</h2>
        <p>${inviterName} has invited you to join <strong>Nonprofit Manager</strong> as a${role === 'admin' ? 'n' : ''} <strong>${role}</strong>.</p>
        ${personalMessage ? `<blockquote style="border-left:3px solid #e2e8f0;padding-left:12px;color:#475569;margin:16px 0">${personalMessage}</blockquote>` : ''}
        <p style="text-align:center;margin:32px 0">
          <a href="${acceptUrl}"
             style="display:inline-block;padding:12px 32px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
            Accept Invitation
          </a>
        </p>
        <p style="font-size:13px;color:#64748b">This link will expire in 7 days.</p>
      </div>
    `,
  });
}
