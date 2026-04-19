import pool from '@config/database';
import { logger } from '@config/logger';
import { sendMail } from '@services/emailService';
import { getEmailSettings } from '@services/emailSettingsService';
import { sendSms } from '@services/twilioSmsService';
import { getTwilioSettings } from '@services/twilioSettingsService';
import {
  buildReminderBaseMessage,
  buildReminderEmailSubject,
  createChannelSummary,
  resolveEmailRecipient,
  resolveSmsRecipient,
} from './helpers';
import { getReminderContext } from './query';
import type {
  AppointmentReminderSendSummary,
} from '../appointmentReminderService';

interface SendReminderOptions {
  sendEmail?: boolean;
  sendSms?: boolean;
  customMessage?: string;
}

interface SendReminderContext {
  triggerType: 'manual' | 'automated';
  sentBy?: string | null;
  jobId?: string | null;
}

type RecordDeliveryArgs = {
  appointmentId: string;
  jobId?: string | null;
  channel: 'email' | 'sms';
  triggerType: 'manual' | 'automated';
  recipient: string;
  deliveryStatus: 'sent' | 'failed' | 'skipped';
  errorMessage?: string | null;
  messagePreview: string;
  sentBy?: string | null;
};

const recordDelivery = async (args: RecordDeliveryArgs): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO appointment_reminder_deliveries (
         appointment_id,
         job_id,
         channel,
         trigger_type,
         recipient,
         delivery_status,
         error_message,
         message_preview,
         sent_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        args.appointmentId,
        args.jobId || null,
        args.channel,
        args.triggerType,
        args.recipient,
        args.deliveryStatus,
        args.errorMessage || null,
        args.messagePreview.slice(0, 255),
        args.sentBy ?? null,
      ]
    );
  } catch (error) {
    logger.warn('Failed to record appointment reminder delivery', {
      appointmentId: args.appointmentId,
      channel: args.channel,
      deliveryStatus: args.deliveryStatus,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export async function sendAppointmentReminders(
  appointmentId: string,
  options: SendReminderOptions,
  context: SendReminderContext
): Promise<AppointmentReminderSendSummary> {
  const appointment = await getReminderContext(appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (appointment.status !== 'confirmed' || appointment.start_time <= new Date()) {
    throw new Error('Appointment is not eligible for reminders');
  }

  const sendEmailRequested = options.sendEmail ?? true;
  const sendSmsRequested = options.sendSms ?? true;
  if (!sendEmailRequested && !sendSmsRequested) {
    throw new Error('At least one reminder channel must be enabled');
  }

  const [emailSettings, twilioSettings] = await Promise.all([
    sendEmailRequested ? getEmailSettings() : Promise.resolve(null),
    sendSmsRequested ? getTwilioSettings() : Promise.resolve(null),
  ]);

  const emailEnabled = Boolean(sendEmailRequested && emailSettings?.isConfigured);
  const smsEnabled = Boolean(sendSmsRequested && twilioSettings?.isConfigured);
  const warnings: string[] = [];
  if (sendEmailRequested && !emailEnabled) {
    warnings.push('Email reminders were requested, but SMTP is not configured.');
  }
  if (sendSmsRequested && !smsEnabled) {
    warnings.push('SMS reminders were requested, but Twilio is not configured.');
  }

  const emailSummary = createChannelSummary(sendEmailRequested, emailEnabled);
  const smsSummary = createChannelSummary(sendSmsRequested, smsEnabled);

  const baseMessage = buildReminderBaseMessage(appointment);
  const customMessage = options.customMessage?.trim();
  const fullMessage = customMessage ? `${baseMessage} ${customMessage}` : baseMessage;
  const smsMessage = fullMessage.length > 320 ? `${fullMessage.slice(0, 317)}...` : fullMessage;
  const triggerType = context.triggerType;
  const sentBy = context.sentBy ?? null;
  const jobId = context.jobId ?? null;

  if (sendEmailRequested) {
    emailSummary.attempted += 1;
    const recipientEmail = resolveEmailRecipient(appointment);

    if (!emailEnabled) {
      emailSummary.skipped += 1;
      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'email',
        triggerType,
        recipient: recipientEmail || appointment.contact_name || 'unknown',
        deliveryStatus: 'skipped',
        errorMessage: 'SMTP not configured',
        messagePreview: fullMessage,
        sentBy,
      });
    } else if (!recipientEmail) {
      emailSummary.skipped += 1;
      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'email',
        triggerType,
        recipient: appointment.contact_name || 'unknown',
        deliveryStatus: 'skipped',
        errorMessage: 'Missing recipient email',
        messagePreview: fullMessage,
        sentBy,
      });
    } else if (appointment.do_not_email) {
      emailSummary.skipped += 1;
      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'email',
        triggerType,
        recipient: recipientEmail,
        deliveryStatus: 'skipped',
        errorMessage: 'Contact opted out of email',
        messagePreview: fullMessage,
        sentBy,
      });
    } else {
      const greetingName = appointment.contact_name || 'there';
      const sent = await sendMail({
        to: recipientEmail,
        subject: buildReminderEmailSubject(appointment),
        text: [
          `Hi ${greetingName},`,
          '',
          fullMessage,
          '',
          'Please contact us if you need to reschedule.',
        ].join('\n'),
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h2 style="color:#0f172a">Appointment Reminder</h2>
            <p>Hi ${greetingName},</p>
            <p>${fullMessage}</p>
            <p>Please contact us if you need to reschedule.</p>
          </div>
        `,
      });

      if (sent) {
        emailSummary.sent += 1;
      } else {
        emailSummary.failed += 1;
      }

      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'email',
        triggerType,
        recipient: recipientEmail,
        deliveryStatus: sent ? 'sent' : 'failed',
        errorMessage: sent ? null : 'Email send failed',
        messagePreview: fullMessage,
        sentBy,
      });
    }
  }

  if (sendSmsRequested) {
    smsSummary.attempted += 1;
    const recipientPhone = resolveSmsRecipient(appointment);

    if (!smsEnabled) {
      smsSummary.skipped += 1;
      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'sms',
        triggerType,
        recipient: recipientPhone || appointment.contact_name || 'unknown',
        deliveryStatus: 'skipped',
        errorMessage: 'Twilio not configured',
        messagePreview: smsMessage,
        sentBy,
      });
    } else if (!recipientPhone) {
      smsSummary.skipped += 1;
      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'sms',
        triggerType,
        recipient: appointment.contact_name || 'unknown',
        deliveryStatus: 'skipped',
        errorMessage: 'Missing recipient phone number',
        messagePreview: smsMessage,
        sentBy,
      });
    } else if (appointment.do_not_text) {
      smsSummary.skipped += 1;
      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'sms',
        triggerType,
        recipient: recipientPhone,
        deliveryStatus: 'skipped',
        errorMessage: 'Contact opted out of text messaging',
        messagePreview: smsMessage,
        sentBy,
      });
    } else {
      const smsResult = await sendSms({
        to: recipientPhone,
        body: smsMessage,
      });

      if (smsResult.success) {
        smsSummary.sent += 1;
      } else {
        smsSummary.failed += 1;
      }

      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'sms',
        triggerType,
        recipient: smsResult.normalizedTo || recipientPhone,
        deliveryStatus: smsResult.success ? 'sent' : 'failed',
        errorMessage: smsResult.success ? null : smsResult.error || 'SMS send failed',
        messagePreview: smsMessage,
        sentBy,
      });
    }
  }

  return {
    appointmentId,
    appointmentStart: appointment.start_time,
    email: emailSummary,
    sms: smsSummary,
    warnings,
  };
}
