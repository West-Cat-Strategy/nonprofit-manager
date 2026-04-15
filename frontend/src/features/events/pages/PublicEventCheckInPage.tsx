import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { eventsApiClient } from '../api/eventsApiClient';
import type { PublicEventCheckInInfo, PublicEventCheckInResult } from '../../../types/event';
import { PrimaryButton, PublicPageShell, SectionCard } from '../../../components/ui';
import { parseApiError } from '../../../utils/apiError';

interface CheckInFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  pin: string;
}

const initialFormState: CheckInFormState = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  pin: '',
};

const formatDateRange = (startDate: string, endDate: string): string =>
  `${new Date(startDate).toLocaleString()} - ${new Date(endDate).toLocaleString()}`;

const getOccurrenceLabel = (eventInfo: PublicEventCheckInInfo): string | null => {
  if (eventInfo.occurrence_label && eventInfo.occurrence_label.trim().length > 0) {
    return eventInfo.occurrence_label.trim();
  }

  if (eventInfo.occurrence_index != null && eventInfo.occurrence_count != null) {
    return `Occurrence ${eventInfo.occurrence_index} of ${eventInfo.occurrence_count}`;
  }

  if (eventInfo.occurrence_index != null) {
    return `Occurrence ${eventInfo.occurrence_index}`;
  }

  return eventInfo.occurrence_id ? 'Single occurrence' : null;
};

export default function PublicEventCheckInPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eventInfo, setEventInfo] = useState<PublicEventCheckInInfo | null>(null);
  const [formState, setFormState] = useState<CheckInFormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicEventCheckInResult | null>(null);
  const requestedOccurrenceId = searchParams.get('occurrence_id') || undefined;

  useEffect(() => {
    const loadInfo = async () => {
      if (!id) {
        setError('Invalid event check-in URL.');
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const info = await eventsApiClient.getPublicCheckInInfo(id, requestedOccurrenceId);
        setEventInfo(info);
      } catch (requestError) {
        const parsed = parseApiError(requestError, 'Event check-in is unavailable.');
        setError(parsed.message);
      } finally {
        setLoading(false);
      }
    };

    void loadInfo();
  }, [id, requestedOccurrenceId]);

  const checkInDisabledReason = useMemo(() => {
    if (!eventInfo) return null;
    if (!eventInfo.checkin_open) {
      return eventInfo.occurrence_id
        ? 'Check-in is currently closed for this occurrence.'
        : 'Check-in is currently closed for this event.';
    }
    return null;
  }, [eventInfo]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !eventInfo) return;

    const hasIdentity = formState.email.trim().length > 0 || formState.phone.trim().length > 0;
    if (!hasIdentity) {
      setError('Enter email or phone so staff can identify your registration.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        occurrence_id: requestedOccurrenceId,
        first_name: formState.first_name.trim(),
        last_name: formState.last_name.trim(),
        email: formState.email.trim() || undefined,
        phone: formState.phone.trim() || undefined,
        pin: formState.pin.trim(),
      };
      const response = await eventsApiClient.submitPublicCheckIn(id, payload);
      setResult(response);
      if (response.status === 'checked_in') {
        setFormState(initialFormState);
      }
    } catch (requestError) {
      const parsed = parseApiError(requestError, 'Unable to complete check-in.');
      if (parsed.code === 'INVALID_PIN') {
        setError('PIN is invalid. Ask event staff for the current check-in PIN.');
      } else {
        setError(parsed.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PublicPageShell
        badge="Event check-in"
        title="Check in to your event"
        description="Confirm your attendance with the event details and staff-issued PIN."
      >
        <SectionCard>
          <div className="text-sm text-app-text-muted">Loading event check-in...</div>
        </SectionCard>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell
      badge="Event check-in"
      title={eventInfo?.event_name || 'Check in to your event'}
      description="Confirm your attendance with attendee details and the current staff-issued PIN."
    >
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SectionCard title="Event details" subtitle="Review the event timing before you sign in.">
          {eventInfo ? (
            <div className="space-y-3 text-sm text-app-text-muted">
              {eventInfo.series_name ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                    Series
                  </p>
                  <p className="mt-1 text-sm text-app-text">{eventInfo.series_name}</p>
                </div>
              ) : null}
              {getOccurrenceLabel(eventInfo) ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                    Occurrence
                  </p>
                  <p className="mt-1 text-sm text-app-text">{getOccurrenceLabel(eventInfo)}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                  Date and time
                </p>
                <p className="mt-1 text-sm text-app-text">
                  {formatDateRange(
                    eventInfo.occurrence_start_date || eventInfo.start_date,
                    eventInfo.occurrence_end_date || eventInfo.end_date
                  )}
                </p>
              </div>
              {eventInfo.location_name ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                    Location
                  </p>
                  <p className="mt-1 text-sm text-app-text">{eventInfo.location_name}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
                  Check-in window
                </p>
                <p className="mt-1 text-sm text-app-text">
                  Opens {eventInfo.checkin_window_before_minutes} minutes before start and closes{' '}
                  {eventInfo.checkin_window_after_minutes} minutes after end.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-app-text-muted">
              Event details are unavailable for this link.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Attendee sign-in"
          subtitle="Enter attendee details and the staff PIN to check in."
        >
          {checkInDisabledReason ? (
            <div className="mb-4 rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-muted p-3 text-sm text-app-text-muted">
              {checkInDisabledReason}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent-soft p-3 text-sm text-app-accent-text">
              {error}
            </div>
          ) : null}

          {result ? (
            <div className="mb-4 rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent-soft p-3 text-sm text-app-accent-text">
              {result.status === 'already_checked_in'
                ? 'This attendee is already checked in.'
                : 'Check-in complete. Welcome!'}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-app-text-label">First name</span>
                <input
                  type="text"
                  required
                  value={formState.first_name}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, first_name: event.target.value }))
                  }
                  className="w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-surface px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-app-text-label">Last name</span>
                <input
                  type="text"
                  required
                  value={formState.last_name}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, last_name: event.target.value }))
                  }
                  className="w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-surface px-3 py-2"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-app-text-label">Email</span>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-surface px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-app-text-label">Phone</span>
                <input
                  type="tel"
                  value={formState.phone}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, phone: event.target.value }))
                  }
                  className="w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-surface px-3 py-2"
                />
              </label>
            </div>

            <label className="text-sm">
              <span className="mb-1 block font-medium text-app-text-label">Staff PIN</span>
              <input
                type="password"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                value={formState.pin}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, pin: event.target.value }))
                }
                className="w-full rounded-[var(--ui-radius-sm)] border border-app-input-border bg-app-surface px-3 py-2"
              />
            </label>

            <PrimaryButton
              type="submit"
              disabled={submitting || Boolean(checkInDisabledReason)}
              className="w-full justify-center"
            >
              {submitting ? 'Checking in...' : 'Complete check-in'}
            </PrimaryButton>
          </form>
        </SectionCard>
      </div>
    </PublicPageShell>
  );
}
