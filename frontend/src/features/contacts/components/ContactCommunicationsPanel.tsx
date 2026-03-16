import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../../contexts/useToast';
import type {
  ContactCommunication,
  ContactCommunicationChannel,
  ContactCommunicationDeliveryStatus,
  ContactCommunicationSourceType,
} from '../../../types/contact';
import { formatDateTime } from '../../../utils/format';
import { casesApiClient } from '../../cases/api/casesApiClient';
import { contactsApiClient } from '../api/contactsApiClient';

interface ContactCommunicationsPanelProps {
  contactId: string;
}

type FilterValue<T extends string> = T | 'all';

const channelOptions: Array<{ value: FilterValue<ContactCommunicationChannel>; label: string }> = [
  { value: 'all', label: 'All channels' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
];

const sourceOptions: Array<{ value: FilterValue<ContactCommunicationSourceType>; label: string }> = [
  { value: 'all', label: 'All sources' },
  { value: 'appointment_reminder', label: 'Appointment reminders' },
  { value: 'event_reminder', label: 'Event reminders' },
];

const statusOptions: Array<{ value: FilterValue<ContactCommunicationDeliveryStatus>; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'skipped', label: 'Skipped' },
];

const channelTone: Record<ContactCommunicationChannel, string> = {
  email: 'bg-[var(--loop-blue)] text-black',
  sms: 'bg-[var(--loop-green)] text-black',
};

const deliveryTone: Record<ContactCommunicationDeliveryStatus, string> = {
  sent: 'bg-app-accent-soft text-app-accent-text',
  failed: 'bg-app-accent-soft text-app-accent-text',
  skipped: 'bg-app-surface-muted text-app-text-muted',
};

const channelLabel: Record<ContactCommunicationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
};

const sourceLabel: Record<ContactCommunicationSourceType, string> = {
  appointment_reminder: 'Appointment reminder',
  event_reminder: 'Event reminder',
};

const triggerLabel: Record<ContactCommunication['trigger_type'], string> = {
  manual: 'Manual',
  automated: 'Automated',
};

const filterValue = <T extends string>(value: FilterValue<T>): T | undefined =>
  value === 'all' ? undefined : value;

export default function ContactCommunicationsPanel({ contactId }: ContactCommunicationsPanelProps) {
  const { showError, showSuccess } = useToast();
  const [communications, setCommunications] = useState<ContactCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [channel, setChannel] = useState<FilterValue<ContactCommunicationChannel>>('all');
  const [sourceType, setSourceType] = useState<FilterValue<ContactCommunicationSourceType>>('all');
  const [deliveryStatus, setDeliveryStatus] = useState<FilterValue<ContactCommunicationDeliveryStatus>>('all');

  const query = useMemo(
    () => ({
      channel: filterValue(channel),
      source_type: filterValue(sourceType),
      delivery_status: filterValue(deliveryStatus),
      limit: 100,
    }),
    [channel, deliveryStatus, sourceType]
  );

  const loadCommunications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await contactsApiClient.listCommunications(contactId, query);
      setCommunications(result.items || []);
    } catch (loadError) {
      console.error('Failed to load contact communications', loadError);
      setError('Failed to load communication history.');
    } finally {
      setLoading(false);
    }
  }, [contactId, query]);

  useEffect(() => {
    void loadCommunications();
  }, [loadCommunications]);

  const handleResend = async (item: ContactCommunication) => {
    if (item.action.type !== 'send_appointment_reminder' || !item.action.appointment_id) {
      return;
    }

    try {
      setSendingId(item.id);
      await casesApiClient.sendCaseAppointmentReminder(item.action.appointment_id, {
        sendEmail: item.channel === 'email',
        sendSms: item.channel === 'sms',
      });
      showSuccess('Reminder sent');
      await loadCommunications();
    } catch (sendError) {
      console.error('Failed to resend appointment reminder', sendError);
      showError('Failed to send reminder');
    } finally {
      setSendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Loading communications">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-lg border border-app-border bg-app-surface-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-bold text-black/70">
          Channel
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value as FilterValue<ContactCommunicationChannel>)}
            className="mt-1 w-full border-2 border-black px-3 py-2 text-sm font-bold"
          >
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-bold text-black/70">
          Source
          <select
            value={sourceType}
            onChange={(event) =>
              setSourceType(event.target.value as FilterValue<ContactCommunicationSourceType>)
            }
            className="mt-1 w-full border-2 border-black px-3 py-2 text-sm font-bold"
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-bold text-black/70">
          Status
          <select
            value={deliveryStatus}
            onChange={(event) =>
              setDeliveryStatus(event.target.value as FilterValue<ContactCommunicationDeliveryStatus>)
            }
            className="mt-1 w-full border-2 border-black px-3 py-2 text-sm font-bold"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="flex flex-col gap-3 border-2 border-black bg-app-accent-soft p-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-bold text-app-accent-text">{error}</p>
          <button
            type="button"
            onClick={() => void loadCommunications()}
            className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-white"
          >
            Retry
          </button>
        </div>
      )}

      {!error && communications.length === 0 && (
        <div className="border-2 border-dashed border-black/30 bg-white px-6 py-10 text-center">
          <p className="text-sm font-black uppercase text-black/60">No communications yet</p>
          <p className="mt-2 text-sm font-bold text-black/70">
            Logged appointment and event reminder deliveries will appear here.
          </p>
        </div>
      )}

      {!error && communications.length > 0 && (
        <div className="space-y-3">
          {communications.map((item) => (
            <div
              key={item.id}
              className="border-2 border-black bg-white p-4 shadow-[2px_2px_0px_var(--shadow-color)]"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-black uppercase ${channelTone[item.channel]}`}>
                      {channelLabel[item.channel]}
                    </span>
                    <span className="rounded-full bg-[var(--loop-yellow)] px-2 py-1 text-xs font-black uppercase text-black">
                      {sourceLabel[item.source_type]}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-xs font-black uppercase ${deliveryTone[item.delivery_status]}`}>
                      {item.delivery_status}
                    </span>
                    <span className="text-xs font-black uppercase text-black/60">
                      {triggerLabel[item.trigger_type]}
                    </span>
                  </div>

                  <div>
                    <p className="text-base font-black text-black">{item.source_label}</p>
                    {item.source_subtitle && (
                      <p className="mt-1 text-sm font-bold text-black/70">{item.source_subtitle}</p>
                    )}
                  </div>

                  <div className="grid gap-2 text-sm font-bold text-black/70 md:grid-cols-2">
                    <p>Recipient: {item.recipient}</p>
                    <p>Sent: {formatDateTime(item.sent_at)}</p>
                  </div>

                  {item.message_preview && (
                    <p className="border-l-4 border-black pl-3 text-sm font-bold text-black/75">
                      {item.message_preview}
                    </p>
                  )}

                  {item.error_message && (
                    <p className="text-sm font-bold text-app-accent-text">
                      Delivery note: {item.error_message}
                    </p>
                  )}

                  {item.action.type === 'none' && item.action.disabled_reason && (
                    <p className="text-xs font-bold uppercase text-black/50">
                      {item.action.disabled_reason}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.action.type === 'send_appointment_reminder' && item.action.appointment_id && (
                    <button
                      type="button"
                      onClick={() => void handleResend(item)}
                      disabled={sendingId === item.id}
                      className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-[var(--loop-green)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendingId === item.id ? 'Sending...' : item.action.label}
                    </button>
                  )}

                  {item.action.type === 'open_event' && item.action.event_id && (
                    <Link
                      to={`/events/${item.action.event_id}`}
                      className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-white hover:bg-[var(--loop-yellow)]"
                    >
                      {item.action.label}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
