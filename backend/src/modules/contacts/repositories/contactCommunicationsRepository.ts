import pool from '@config/database';
import type {
  ContactCommunication,
  ContactCommunicationAction,
  ContactCommunicationChannel,
  ContactCommunicationDeliveryStatus,
  ContactCommunicationFilters,
  ContactCommunicationsResult,
  ContactCommunicationSourceType,
  ContactCommunicationTriggerType,
} from '@app-types/contact';
import type { ContactCommunicationsPort } from '../types/ports';

type QueryValue = string | number | string[] | undefined;

type ContactCommunicationRow = {
  id: string;
  channel: ContactCommunicationChannel;
  source_type: ContactCommunicationSourceType;
  delivery_status: ContactCommunicationDeliveryStatus;
  recipient: string;
  error_message: string | null;
  message_preview: string | null;
  trigger_type: ContactCommunicationTriggerType;
  sent_at: Date;
  appointment_id: string | null;
  case_id: string | null;
  event_id: string | null;
  registration_id: string | null;
  source_label: string;
  source_subtitle: string | null;
  can_send_appointment_reminder: boolean;
  total_count: number | string;
};

const buildAction = (row: ContactCommunicationRow): ContactCommunicationAction => {
  if (row.source_type === 'appointment_reminder') {
    if (row.appointment_id && row.can_send_appointment_reminder) {
      return {
        type: 'send_appointment_reminder',
        label: row.channel === 'sms' ? 'Send SMS reminder again' : 'Send email reminder again',
        appointment_id: row.appointment_id,
        case_id: row.case_id,
      };
    }

    return {
      type: 'none',
      label: 'No action available',
      appointment_id: row.appointment_id,
      case_id: row.case_id,
      disabled_reason: 'Appointment is not currently eligible for reminder sends.',
    };
  }

  if (row.event_id) {
    return {
      type: 'open_event',
      label: 'Open event',
      event_id: row.event_id,
    };
  }

  return {
    type: 'none',
    label: 'No action available',
  };
};

const mapRow = (row: ContactCommunicationRow): ContactCommunication => ({
  id: row.id,
  channel: row.channel,
  source_type: row.source_type,
  delivery_status: row.delivery_status,
  recipient: row.recipient,
  error_message: row.error_message,
  message_preview: row.message_preview,
  trigger_type: row.trigger_type,
  sent_at: row.sent_at,
  appointment_id: row.appointment_id,
  case_id: row.case_id,
  event_id: row.event_id,
  registration_id: row.registration_id,
  source_label: row.source_label,
  source_subtitle: row.source_subtitle,
  action: buildAction(row),
});

export class ContactCommunicationsRepository implements ContactCommunicationsPort {
  async list(
    contactId: string,
    filters: ContactCommunicationFilters = {}
  ): Promise<ContactCommunicationsResult> {
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 200);
    const values: QueryValue[] = [contactId];
    const conditions: string[] = [];
    let paramCounter = 2;

    if (filters.channel) {
      conditions.push(`communications.channel = $${paramCounter}`);
      values.push(filters.channel);
      paramCounter += 1;
    }

    if (filters.source_type) {
      conditions.push(`communications.source_type = $${paramCounter}`);
      values.push(filters.source_type);
      paramCounter += 1;
    }

    if (filters.delivery_status) {
      conditions.push(`communications.delivery_status = $${paramCounter}`);
      values.push(filters.delivery_status);
      paramCounter += 1;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query<ContactCommunicationRow>(
      `
        WITH appointment_communications AS (
          SELECT
            ard.id,
            ard.channel,
            'appointment_reminder'::varchar AS source_type,
            ard.delivery_status,
            ard.recipient,
            ard.error_message,
            ard.message_preview,
            ard.trigger_type,
            ard.sent_at,
            a.id AS appointment_id,
            a.case_id,
            NULL::uuid AS event_id,
            NULL::uuid AS registration_id,
            COALESCE(NULLIF(BTRIM(a.title), ''), 'Appointment reminder') AS source_label,
            NULLIF(
              CONCAT_WS(
                ' | ',
                TO_CHAR(a.start_time, 'YYYY-MM-DD HH24:MI'),
                c.case_number,
                a.location
              ),
              ''
            ) AS source_subtitle,
            (a.status = 'confirmed' AND a.start_time > NOW()) AS can_send_appointment_reminder
          FROM appointment_reminder_deliveries ard
          INNER JOIN appointments a ON a.id = ard.appointment_id
          LEFT JOIN cases c ON c.id = a.case_id
          WHERE a.contact_id = $1
        ),
        event_communications AS (
          SELECT
            erd.id,
            erd.channel,
            'event_reminder'::varchar AS source_type,
            erd.delivery_status,
            erd.recipient,
            erd.error_message,
            erd.message_preview,
            erd.trigger_type,
            erd.sent_at,
            NULL::uuid AS appointment_id,
            NULL::uuid AS case_id,
            e.id AS event_id,
            er.id AS registration_id,
            COALESCE(NULLIF(BTRIM(e.name), ''), 'Event reminder') AS source_label,
            NULLIF(
              CONCAT_WS(
                ' | ',
                TO_CHAR(e.start_date, 'YYYY-MM-DD HH24:MI'),
                e.location_name
              ),
              ''
            ) AS source_subtitle,
            FALSE AS can_send_appointment_reminder
          FROM event_reminder_deliveries erd
          INNER JOIN event_registrations er ON er.id = erd.registration_id
          INNER JOIN events e ON e.id = er.event_id
          WHERE er.contact_id = $1
        ),
        communications AS (
          SELECT * FROM appointment_communications
          UNION ALL
          SELECT * FROM event_communications
        ),
        filtered_communications AS (
          SELECT
            communications.*,
            COUNT(*) OVER()::int AS total_count
          FROM communications
          ${whereClause}
          ORDER BY communications.sent_at DESC
          LIMIT $${paramCounter}
        )
        SELECT *
        FROM filtered_communications
        ORDER BY sent_at DESC
      `,
      [...values, limit]
    );

    const rows = result.rows ?? [];
    return {
      items: rows.map(mapRow),
      total: rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0,
      filters: {
        channel: filters.channel,
        source_type: filters.source_type,
        delivery_status: filters.delivery_status,
        limit,
      },
    };
  }
}
