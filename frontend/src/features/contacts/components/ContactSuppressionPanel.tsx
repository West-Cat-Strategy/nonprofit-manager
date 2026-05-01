import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useToast } from '../../../contexts/useToast';
import type {
  ContactSuppressionChannel,
  ContactSuppressionEvidence,
  ContactSuppressionReason,
} from '../../../types/contact';
import { contactsApiClient } from '../api/contactsApiClient';

interface ContactSuppressionPanelProps {
  contactId: string;
}

const reasonLabels: Record<string, string> = {
  staff_dnc: 'Staff DNC',
  client_request: 'Client request',
  caregiver_request: 'Caregiver request',
  legal_hold: 'Legal hold',
  mailchimp_unsubscribe: 'Mailchimp unsubscribe',
  mailchimp_cleaned: 'Mailchimp cleaned',
  no_solicitations: 'No solicitations',
  invalid_contact: 'Invalid contact',
  other: 'Other',
};

const channelOptions: Array<{ value: ContactSuppressionChannel; label: string }> = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'sms', label: 'SMS' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'mail', label: 'Mail' },
  { value: 'all', label: 'All channels' },
];

const staffReasons: Array<{ value: ContactSuppressionReason; label: string }> = [
  { value: 'staff_dnc', label: 'Staff DNC' },
  { value: 'client_request', label: 'Client request' },
  { value: 'caregiver_request', label: 'Caregiver request' },
  { value: 'legal_hold', label: 'Legal hold' },
  { value: 'no_solicitations', label: 'No solicitations' },
  { value: 'invalid_contact', label: 'Invalid contact' },
  { value: 'other', label: 'Other' },
];

const formatReason = (reason: string): string =>
  reasonLabels[reason] ?? reason.replace(/_/g, ' ');

const formatChannel = (channel: string): string =>
  channelOptions.find((option) => option.value === channel)?.label ?? channel;

const formatEvidence = (evidence: ContactSuppressionEvidence['evidence']): string | null => {
  if (!evidence) {
    return null;
  }
  if (typeof evidence === 'string') {
    return evidence;
  }
  if (typeof evidence.note === 'string') {
    return evidence.note;
  }
  if (typeof evidence.type === 'string') {
    return `Provider event: ${evidence.type}`;
  }
  return null;
};

export default function ContactSuppressionPanel({ contactId }: ContactSuppressionPanelProps) {
  const { showError, showSuccess } = useToast();
  const [items, setItems] = useState<ContactSuppressionEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [channel, setChannel] = useState<ContactSuppressionChannel>('email');
  const [reason, setReason] = useState<ContactSuppressionReason>('staff_dnc');
  const [evidence, setEvidence] = useState('');

  const loadSuppressions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await contactsApiClient.listSuppressions(contactId);
      setItems(result.items);
    } catch (error) {
      console.error('Failed to load contact suppressions', error);
      showError('Failed to load suppression evidence');
    } finally {
      setLoading(false);
    }
  }, [contactId, showError]);

  useEffect(() => {
    void loadSuppressions();
  }, [loadSuppressions]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!evidence.trim()) {
      showError('Suppression evidence is required');
      return;
    }
    setSubmitting(true);
    try {
      const created = await contactsApiClient.createSuppression(contactId, {
        channel,
        reason,
        source: 'staff',
        evidence: evidence.trim(),
      });
      setItems((current) => [created, ...current]);
      setEvidence('');
      setChannel('email');
      showSuccess('Suppression evidence recorded');
    } catch (error) {
      console.error('Failed to record contact suppression', error);
      showError('Failed to record suppression evidence');
    } finally {
      setSubmitting(false);
    }
  };

  const activeItems = items.filter((item) => item.is_active);

  return (
    <section className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_var(--shadow-color)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-black uppercase text-black">Suppression governance</h3>
          <p className="text-xs font-bold text-black/60">
            Channel and reason evidence for do-not-contact decisions.
          </p>
        </div>
        <span className="w-fit border-2 border-black bg-[var(--loop-yellow)] px-2 py-1 text-xs font-black uppercase text-black">
          {activeItems.length} active
        </span>
      </div>

      <form className="mt-4 grid gap-3 md:grid-cols-[150px_170px_1fr_auto]" onSubmit={handleSubmit}>
        <label className="text-xs font-black uppercase text-black/70">
          Channel
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value as ContactSuppressionChannel)}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold text-black"
          >
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-black uppercase text-black/70">
          Reason
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value as ContactSuppressionReason)}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold text-black"
          >
            {staffReasons.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-black uppercase text-black/70">
          Evidence
          <input
            value={evidence}
            onChange={(event) => setEvidence(event.target.value)}
            className="mt-1 w-full border-2 border-black bg-white px-3 py-2 text-sm font-bold text-black"
            placeholder="Example: client requested no campaign emails"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="self-end border-2 border-black bg-black px-4 py-2 text-sm font-black uppercase text-white shadow-[2px_2px_0px_var(--shadow-color)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Record
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm font-bold text-black/60">Loading suppression evidence...</p>
        ) : items.length === 0 ? (
          <p className="text-sm font-bold text-black/60">No suppression evidence is on file.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="border-2 border-black bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-black">{formatReason(item.reason)}</span>
                <span className="border border-black bg-white px-2 py-0.5 text-xs font-black uppercase text-black">
                  {formatChannel(item.channel)}
                </span>
                <span className="border border-black bg-white px-2 py-0.5 text-xs font-black uppercase text-black">
                  {item.is_active ? 'Active' : 'Resolved'}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-black/70">
                {item.source_label || item.source}
                {item.provider_event_type ? ` · ${item.provider_event_type}` : ''}
              </p>
              {formatEvidence(item.evidence) ? (
                <p className="mt-2 text-sm font-bold text-black">{formatEvidence(item.evidence)}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
