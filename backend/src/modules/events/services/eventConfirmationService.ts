import QRCode from 'qrcode';
import { Pool } from 'pg';
import {
  EventConfirmationEmailResult,
  RegistrationStatus,
  type ConfirmationEmailStatus,
} from '@app-types/event';
import { logger } from '@config/logger';
import { sendMail } from '@services/emailService';
import { getEmailSettings } from '@services/emailSettingsService';
import { escapeHtml } from '@services/site-generator/escapeHtml';
import { createEventHttpError } from '../eventHttpErrors';

interface RegistrationConfirmationRow {
  registration_id: string;
  event_id: string;
  occurrence_id: string;
  registration_status: RegistrationStatus;
  check_in_token: string;
  event_name: string;
  description: string | null;
  start_date: Date;
  end_date: Date;
  location_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  occurrence_name: string;
  occurrence_index: number;
  occurrence_count: number;
  contact_name: string;
  contact_email: string | null;
  do_not_email: boolean;
}

const CONFIRMABLE_STATUSES = new Set<RegistrationStatus>([
  RegistrationStatus.REGISTERED,
  RegistrationStatus.CONFIRMED,
]);

const formatDateTime = (value: Date): string =>
  new Date(value).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const buildLocation = (row: RegistrationConfirmationRow): string | null => {
  const parts = [
    row.location_name,
    row.address_line1,
    row.address_line2,
    row.city,
    row.state_province,
    row.postal_code,
    row.country,
  ]
    .map((value) => value?.trim() || '')
    .filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : null;
};

const buildOccurrenceLabel = (row: RegistrationConfirmationRow): string | null => {
  if (row.occurrence_count <= 1) {
    return null;
  }

  const customName = row.occurrence_name?.trim();
  if (customName && customName !== row.event_name) {
    return customName;
  }

  return `Occurrence ${row.occurrence_index}`;
};

export class EventConfirmationService {
  constructor(private readonly pool: Pool) {}

  private async getRegistrationRow(registrationId: string): Promise<RegistrationConfirmationRow | null> {
    const result = await this.pool.query<RegistrationConfirmationRow>(
      `SELECT
         er.id as registration_id,
         er.event_id,
         er.occurrence_id,
         er.registration_status,
         er.check_in_token,
         e.name as event_name,
         e.description,
         eo.start_date,
         eo.end_date,
         eo.location_name,
         eo.address_line1,
         eo.address_line2,
         eo.city,
         eo.state_province,
         eo.postal_code,
         eo.country,
         eo.event_name as occurrence_name,
         eo.sequence_index + 1 as occurrence_index,
         COALESCE(occurrence_counts.occurrence_count, 0)::int as occurrence_count,
         TRIM(CONCAT(c.first_name, ' ', c.last_name)) as contact_name,
         c.email as contact_email,
         COALESCE(c.do_not_email, false) as do_not_email
       FROM event_registrations er
       INNER JOIN events e ON e.id = er.event_id
       INNER JOIN event_occurrences eo ON eo.id = er.occurrence_id
       INNER JOIN contacts c ON c.id = er.contact_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int as occurrence_count
         FROM event_occurrences eo_count
         WHERE eo_count.event_id = e.id
       ) occurrence_counts ON true
       WHERE er.id = $1
       LIMIT 1`,
      [registrationId]
    );

    return result.rows[0] ?? null;
  }

  private async finalizeDelivery(
    row: RegistrationConfirmationRow,
    sentBy: string | null,
    status: ConfirmationEmailStatus,
    message: string,
    sentAt: Date | null,
    qrCodeUrl: string | null
  ): Promise<EventConfirmationEmailResult> {
    const errorMessage = status === 'failed' || status === 'skipped' ? message : null;

    await this.pool.query(
      `UPDATE event_registrations
       SET confirmation_email_status = $2,
           confirmation_email_sent_at = $3,
           confirmation_email_error = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [row.registration_id, status, sentAt, errorMessage]
    );

    await this.pool.query(
      `INSERT INTO event_confirmation_deliveries (
         registration_id,
         occurrence_id,
         recipient,
         delivery_status,
         error_message,
         message_preview,
         sent_by,
         sent_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, CURRENT_TIMESTAMP))`,
      [
        row.registration_id,
        row.occurrence_id,
        row.contact_email ?? row.contact_name ?? 'unknown',
        status === 'pending' ? 'skipped' : status,
        errorMessage,
        message.slice(0, 255),
        sentBy,
        sentAt,
      ]
    );

    return {
      registration_id: row.registration_id,
      event_id: row.event_id,
      occurrence_id: row.occurrence_id,
      status,
      message,
      sent_at: sentAt,
      qr_code_url: qrCodeUrl,
    };
  }

  async sendRegistrationConfirmationEmail(
    registrationId: string,
    sentBy: string | null = null
  ): Promise<EventConfirmationEmailResult> {
    const row = await this.getRegistrationRow(registrationId);
    if (!row) {
      throw createEventHttpError('REGISTRATION_NOT_FOUND', 404, 'Registration not found');
    }

    if (!CONFIRMABLE_STATUSES.has(row.registration_status)) {
      return this.finalizeDelivery(
        row,
        sentBy,
        'skipped',
        'Confirmation emails are only sent for registered or confirmed attendees.',
        null,
        null
      );
    }

    if (!row.contact_email) {
      return this.finalizeDelivery(
        row,
        sentBy,
        'skipped',
        'Contact does not have an email address.',
        null,
        null
      );
    }

    if (row.do_not_email) {
      return this.finalizeDelivery(
        row,
        sentBy,
        'skipped',
        'Contact has opted out of email.',
        null,
        null
      );
    }

    const emailSettings = await getEmailSettings();
    if (!emailSettings?.isConfigured) {
      return this.finalizeDelivery(
        row,
        sentBy,
        'skipped',
        'SMTP is not configured.',
        null,
        null
      );
    }

    let qrCodeUrl: string | null = null;

    try {
      const qrCodeBuffer = await QRCode.toBuffer(row.check_in_token, {
        margin: 1,
        width: 300,
        type: 'png',
      });
      qrCodeUrl = await QRCode.toDataURL(row.check_in_token, {
        margin: 1,
        width: 300,
      });

      const occurrenceLabel = buildOccurrenceLabel(row);
      const location = buildLocation(row);
      const greeting = row.contact_name?.trim() || 'there';
      const dateLabel = formatDateTime(row.start_date);
      const subject = occurrenceLabel
        ? `Your confirmation for ${row.event_name} (${occurrenceLabel})`
        : `Your confirmation for ${row.event_name}`;

      const textLines = [
        `Hi ${greeting},`,
        '',
        `You are confirmed for ${row.event_name}.`,
        occurrenceLabel ? `Occurrence: ${occurrenceLabel}` : null,
        `When: ${dateLabel}`,
        location ? `Where: ${location}` : null,
        '',
        'Present the attached QR code at check-in.',
      ]
        .filter(Boolean)
        .join('\n');

      const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
        <h2 style="margin:0 0 12px">Event Confirmation</h2>
        <p style="margin:0 0 12px">Hi ${escapeHtml(greeting)},</p>
        <p style="margin:0 0 12px">You are confirmed for <strong>${escapeHtml(row.event_name)}</strong>.</p>
        ${occurrenceLabel ? `<p style="margin:0 0 12px"><strong>Occurrence:</strong> ${escapeHtml(occurrenceLabel)}</p>` : ''}
        <p style="margin:0 0 12px"><strong>When:</strong> ${escapeHtml(dateLabel)}</p>
        ${location ? `<p style="margin:0 0 12px"><strong>Where:</strong> ${escapeHtml(location)}</p>` : ''}
        ${row.description ? `<p style="margin:0 0 16px">${escapeHtml(row.description)}</p>` : ''}
        <div style="margin:24px 0;padding:20px;border:1px solid #cbd5e1;border-radius:16px;text-align:center;background:#f8fafc">
          <img src="cid:event-checkin-qr" alt="Check-in QR code" width="220" height="220" style="display:block;margin:0 auto 12px" />
          <p style="margin:0;color:#475569">Present this QR code at check-in.</p>
        </div>
      </div>
    `;

      const emailSent = await sendMail({
        to: row.contact_email,
        subject,
        text: textLines,
        html,
        attachments: [
          {
            filename: `event-checkin-${row.registration_id}.png`,
            content: qrCodeBuffer,
            contentType: 'image/png',
            cid: 'event-checkin-qr',
          },
        ],
      });

      if (!emailSent) {
        return this.finalizeDelivery(
          row,
          sentBy,
          'failed',
          'Confirmation email could not be sent.',
          null,
          qrCodeUrl
        );
      }

      return this.finalizeDelivery(
        row,
        sentBy,
        'sent',
        'Confirmation email sent.',
        new Date(),
        qrCodeUrl
      );
    } catch (error) {
      logger.warn('Failed to deliver event confirmation email', {
        registrationId: row.registration_id,
        eventId: row.event_id,
        occurrenceId: row.occurrence_id,
        error: error instanceof Error ? error.message : String(error),
      });

      try {
        return await this.finalizeDelivery(
          row,
          sentBy,
          'failed',
          'Confirmation email could not be sent.',
          null,
          qrCodeUrl
        );
      } catch (finalizeError) {
        logger.warn('Failed to persist event confirmation delivery failure', {
          registrationId: row.registration_id,
          eventId: row.event_id,
          occurrenceId: row.occurrence_id,
          error: finalizeError instanceof Error ? finalizeError.message : String(finalizeError),
        });

        return {
          registration_id: row.registration_id,
          event_id: row.event_id,
          occurrence_id: row.occurrence_id,
          status: 'failed',
          message: 'Confirmation email could not be sent.',
          sent_at: null,
          qr_code_url: qrCodeUrl,
        };
      }
    }
  }
}
