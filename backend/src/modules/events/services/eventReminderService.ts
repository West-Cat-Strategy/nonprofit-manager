import { Pool } from 'pg';
import { logger } from '@config/logger';
import {
  EventReminderSummary,
  SendEventRemindersContext,
  SendEventRemindersDTO,
} from '@app-types/event';
import { sendMail } from '@services/emailService';
import { getEmailSettings } from '@services/emailSettingsService';
import { sendSms } from '@services/twilioSmsService';
import { getTwilioSettings } from '@services/twilioSettingsService';
import {
  createChannelSummary,
  EventReminderEventRow,
  EventReminderRecipientRow,
  formatReminderDate,
} from './shared';
import { createEventHttpError } from '../eventHttpErrors';

export class EventReminderService {
  constructor(private readonly pool: Pool) {}

  private async recordReminderDelivery(args: {
    eventId: string;
    occurrenceId?: string | null;
    registrationId: string;
    channel: 'email' | 'sms';
    recipient: string;
    status: 'sent' | 'failed' | 'skipped';
    errorMessage?: string;
    messagePreview: string;
    sentBy: string | null;
    triggerType: 'manual' | 'automated';
    automationId?: string | null;
  }): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO event_reminder_deliveries (
          event_id,
          occurrence_id,
          registration_id,
          channel,
          recipient,
          delivery_status,
          error_message,
          message_preview,
          sent_by,
          trigger_type,
          automation_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          args.eventId,
          args.occurrenceId || null,
          args.registrationId,
          args.channel,
          args.recipient,
          args.status,
          args.errorMessage || null,
          args.messagePreview.slice(0, 255),
          args.sentBy,
          args.triggerType,
          args.automationId || null,
        ]
      );
    } catch (error) {
      logger.warn('Failed to record event reminder delivery', {
        eventId: args.eventId,
        occurrenceId: args.occurrenceId,
        registrationId: args.registrationId,
        channel: args.channel,
        status: args.status,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async sendEventReminders(
    eventId: string,
    reminderOptions: SendEventRemindersDTO,
    context: SendEventRemindersContext = {}
  ): Promise<EventReminderSummary> {
    const triggerType = context.triggerType ?? 'manual';
    const sentBy = context.sentBy ?? null;
    const automationId = context.automationId ?? null;
    const sendEmailChannel = reminderOptions.sendEmail ?? true;
    const sendSmsChannel = reminderOptions.sendSms ?? true;

    if (!sendEmailChannel && !sendSmsChannel) {
      throw createEventHttpError('VALIDATION_ERROR', 400, 'At least one reminder channel must be enabled');
    }

    const eventResult = await this.pool.query<EventReminderEventRow>(
      `SELECT
         e.id,
         e.name,
         COALESCE(eo.start_date, e.start_date) as start_date,
         COALESCE(eo.end_date, e.end_date) as end_date,
         COALESCE(eo.location_name, e.location_name) as location_name
       FROM events e
       LEFT JOIN event_occurrences eo
         ON eo.id = $2
        AND eo.event_id = e.id
       WHERE e.id = $1`,
      [eventId, reminderOptions.occurrence_id || null]
    );

    if (eventResult.rows.length === 0) {
      throw createEventHttpError('EVENT_NOT_FOUND', 404, 'Event not found');
    }

    const event = eventResult.rows[0];
    const registrationsResult = await this.pool.query<EventReminderRecipientRow>(
      `SELECT
         er.id as registration_id,
         TRIM(CONCAT(c.first_name, ' ', c.last_name)) as contact_name,
         c.email as contact_email,
         c.mobile_phone,
         c.phone,
         COALESCE(c.do_not_email, false) as do_not_email,
         COALESCE(c.do_not_text, false) as do_not_text
       FROM event_registrations er
       JOIN contacts c ON c.id = er.contact_id
       WHERE er.event_id = $1
         AND ($2::uuid IS NULL OR er.occurrence_id = $2)
         AND er.registration_status IN ('registered', 'confirmed')
       ORDER BY er.created_at ASC`,
      [eventId, reminderOptions.occurrence_id || null]
    );

    const recipients = registrationsResult.rows;

    const [emailSettings, twilioSettings] = await Promise.all([
      sendEmailChannel ? getEmailSettings() : Promise.resolve(null),
      sendSmsChannel ? getTwilioSettings() : Promise.resolve(null),
    ]);

    const emailEnabled = Boolean(sendEmailChannel && emailSettings?.isConfigured);
    const smsEnabled = Boolean(sendSmsChannel && twilioSettings?.isConfigured);

    const warnings: string[] = [];
    if (sendEmailChannel && !emailEnabled) {
      warnings.push('Email reminders were requested, but SMTP is not configured.');
    }
    if (sendSmsChannel && !smsEnabled) {
      warnings.push('SMS reminders were requested, but Twilio is not configured.');
    }

    const emailSummary = createChannelSummary(sendEmailChannel, emailEnabled);
    const smsSummary = createChannelSummary(sendSmsChannel, smsEnabled);

    const dateLabel = formatReminderDate(event.start_date);
    const locationLabel = event.location_name ? ` at ${event.location_name}` : '';
    const customMessage = reminderOptions.customMessage?.trim();

    const baseMessage = `Reminder: ${event.name} starts ${dateLabel}${locationLabel}.`;
    const emailSubject = `Reminder: ${event.name} on ${new Date(event.start_date).toLocaleDateString('en-US')}`;
    const smsMessageRaw = customMessage ? `${baseMessage} ${customMessage}` : baseMessage;
    const smsMessage =
      smsMessageRaw.length > 320 ? `${smsMessageRaw.slice(0, 317)}...` : smsMessageRaw;

    const eligibleRegistrations = recipients.filter((recipient) => {
      const emailEligible =
        sendEmailChannel &&
        emailEnabled &&
        !recipient.do_not_email &&
        Boolean(recipient.contact_email);
      const smsEligible =
        sendSmsChannel &&
        smsEnabled &&
        !recipient.do_not_text &&
        Boolean(recipient.mobile_phone || recipient.phone);
      return emailEligible || smsEligible;
    }).length;

    for (const recipient of recipients) {
      const fallbackRecipient =
        recipient.contact_email ||
        recipient.mobile_phone ||
        recipient.phone ||
        recipient.contact_name ||
        'unknown';

      if (sendEmailChannel) {
        emailSummary.attempted += 1;
        const recipientEmail = recipient.contact_email?.trim() || '';

        if (!emailEnabled) {
          emailSummary.skipped += 1;
          await this.recordReminderDelivery({
            eventId,
            occurrenceId: reminderOptions.occurrence_id || null,
            registrationId: recipient.registration_id,
            channel: 'email',
            recipient: recipientEmail || fallbackRecipient,
            status: 'skipped',
            errorMessage: 'SMTP not configured',
            messagePreview: baseMessage,
            sentBy,
            triggerType,
            automationId,
          });
        } else if (!recipientEmail) {
          emailSummary.skipped += 1;
          await this.recordReminderDelivery({
            eventId,
            occurrenceId: reminderOptions.occurrence_id || null,
            registrationId: recipient.registration_id,
            channel: 'email',
            recipient: fallbackRecipient,
            status: 'skipped',
            errorMessage: 'Missing email address',
            messagePreview: baseMessage,
            sentBy,
            triggerType,
            automationId,
          });
        } else if (recipient.do_not_email) {
          emailSummary.skipped += 1;
          await this.recordReminderDelivery({
            eventId,
            occurrenceId: reminderOptions.occurrence_id || null,
            registrationId: recipient.registration_id,
            channel: 'email',
            recipient: recipientEmail,
            status: 'skipped',
            errorMessage: 'Contact opted out of email',
            messagePreview: baseMessage,
            sentBy,
            triggerType,
            automationId,
          });
        } else {
          const greetingName = recipient.contact_name || 'there';
          const emailText = [
            `Hi ${greetingName},`,
            '',
            baseMessage,
            customMessage ? customMessage : '',
            '',
            'We look forward to seeing you.',
          ]
            .filter(Boolean)
            .join('\n');
          const emailHtml = `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#0f172a">Event Reminder</h2>
              <p>Hi ${greetingName},</p>
              <p>${baseMessage}</p>
              ${customMessage ? `<p>${customMessage}</p>` : ''}
              <p>We look forward to seeing you.</p>
            </div>
          `;

          const emailSent = await sendMail({
            to: recipientEmail,
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
          });

          if (emailSent) {
            emailSummary.sent += 1;
          } else {
            emailSummary.failed += 1;
          }

          await this.recordReminderDelivery({
            eventId,
            occurrenceId: reminderOptions.occurrence_id || null,
            registrationId: recipient.registration_id,
            channel: 'email',
            recipient: recipientEmail,
            status: emailSent ? 'sent' : 'failed',
            errorMessage: emailSent ? undefined : 'Email send failed',
            messagePreview: baseMessage,
            sentBy,
            triggerType,
            automationId,
          });
        }
      }

      if (sendSmsChannel) {
        smsSummary.attempted += 1;
        const phone = recipient.mobile_phone || recipient.phone || '';

        if (!smsEnabled) {
          smsSummary.skipped += 1;
          await this.recordReminderDelivery({
            eventId,
            occurrenceId: reminderOptions.occurrence_id || null,
            registrationId: recipient.registration_id,
            channel: 'sms',
            recipient: phone || fallbackRecipient,
            status: 'skipped',
            errorMessage: 'Twilio not configured',
            messagePreview: smsMessage,
            sentBy,
            triggerType,
            automationId,
          });
        } else if (!phone) {
          smsSummary.skipped += 1;
          await this.recordReminderDelivery({
            eventId,
            occurrenceId: reminderOptions.occurrence_id || null,
            registrationId: recipient.registration_id,
            channel: 'sms',
            recipient: fallbackRecipient,
            status: 'skipped',
            errorMessage: 'Missing phone number',
            messagePreview: smsMessage,
            sentBy,
            triggerType,
            automationId,
          });
        } else if (recipient.do_not_text) {
          smsSummary.skipped += 1;
          await this.recordReminderDelivery({
            eventId,
            occurrenceId: reminderOptions.occurrence_id || null,
            registrationId: recipient.registration_id,
            channel: 'sms',
            recipient: phone,
            status: 'skipped',
            errorMessage: 'Contact opted out of text messaging',
            messagePreview: smsMessage,
            sentBy,
            triggerType,
            automationId,
          });
        } else {
          const smsResult = await sendSms({
            to: phone,
            body: smsMessage,
          });

          if (smsResult.success) {
            smsSummary.sent += 1;
          } else {
            smsSummary.failed += 1;
          }

          await this.recordReminderDelivery({
            eventId,
            occurrenceId: reminderOptions.occurrence_id || null,
            registrationId: recipient.registration_id,
            channel: 'sms',
            recipient: smsResult.normalizedTo || phone,
            status: smsResult.success ? 'sent' : 'failed',
            errorMessage: smsResult.success ? undefined : smsResult.error,
            messagePreview: smsMessage,
            sentBy,
            triggerType,
            automationId,
          });
        }
      }
    }

    return {
      eventId,
      eventName: event.name,
      eventStartDate: event.start_date,
      totalRegistrations: recipients.length,
      eligibleRegistrations,
      email: emailSummary,
      sms: smsSummary,
      warnings,
    };
  }
}
