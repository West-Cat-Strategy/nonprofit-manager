import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { eventsApiClient } from '../api/eventsApiClient';
import type { PublicEventCheckInInfo, PublicEventCheckInResult } from '../../../types/event';
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

export default function PublicEventCheckInPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eventInfo, setEventInfo] = useState<PublicEventCheckInInfo | null>(null);
  const [formState, setFormState] = useState<CheckInFormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicEventCheckInResult | null>(null);

  useEffect(() => {
    const loadInfo = async () => {
      if (!id) {
        setError('Invalid event check-in URL.');
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const info = await eventsApiClient.getPublicCheckInInfo(id);
        setEventInfo(info);
      } catch (requestError) {
        const parsed = parseApiError(requestError, 'Event check-in is unavailable.');
        setError(parsed.message);
      } finally {
        setLoading(false);
      }
    };

    void loadInfo();
  }, [id]);

  const checkInDisabledReason = useMemo(() => {
    if (!eventInfo) return null;
    if (!eventInfo.checkin_open) return 'Check-in is currently closed for this event.';
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
      <main className="min-h-screen bg-app-bg p-6 text-app-text">
        <div className="mx-auto max-w-xl rounded-lg border border-app-border bg-app-surface p-6">
          Loading event check-in...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-app-bg p-6 text-app-text">
      <div className="mx-auto max-w-xl space-y-4">
        <section className="rounded-lg border border-app-border bg-app-surface p-6">
          <h1 className="text-2xl font-semibold text-app-text">Event Check-In</h1>
          {eventInfo ? (
            <div className="mt-2 space-y-1 text-sm text-app-text-muted">
              <p className="text-base font-medium text-app-text">{eventInfo.event_name}</p>
              <p>{formatDateRange(eventInfo.start_date, eventInfo.end_date)}</p>
              {eventInfo.location_name && <p>{eventInfo.location_name}</p>}
              <p>
                Check-in window: {eventInfo.checkin_window_before_minutes} min before start to{' '}
                {eventInfo.checkin_window_after_minutes} min after end
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-app-text-muted">Event details unavailable.</p>
          )}
        </section>

        <section className="rounded-lg border border-app-border bg-app-surface p-6">
          <h2 className="text-lg font-medium text-app-text">Sign In</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            Enter attendee details and staff-issued PIN.
          </p>

          {checkInDisabledReason && (
            <div className="mt-3 rounded-md border border-app-border bg-app-surface-muted p-3 text-sm text-app-text-muted">
              {checkInDisabledReason}
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-md bg-app-accent-soft p-3 text-sm text-app-accent-text">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-3 rounded-md bg-app-accent-soft p-3 text-sm text-app-accent-text">
              {result.status === 'already_checked_in'
                ? 'This attendee is already checked in.'
                : 'Check-in complete. Welcome!'}
            </div>
          )}

          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-app-text-muted">First name</span>
                <input
                  type="text"
                  required
                  value={formState.first_name}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, first_name: event.target.value }))
                  }
                  className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-app-text-muted">Last name</span>
                <input
                  type="text"
                  required
                  value={formState.last_name}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, last_name: event.target.value }))
                  }
                  className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-app-text-muted">Email (or phone)</span>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-app-text-muted">Phone (or email)</span>
                <input
                  type="tel"
                  value={formState.phone}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, phone: event.target.value }))
                  }
                  className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2"
                />
              </label>
            </div>

            <label className="text-sm">
              <span className="mb-1 block text-app-text-muted">Staff PIN</span>
              <input
                type="password"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                value={formState.pin}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, pin: event.target.value }))
                }
                className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || Boolean(checkInDisabledReason)}
              className="w-full rounded-md bg-app-accent px-4 py-2 text-white disabled:opacity-60"
            >
              {submitting ? 'Checking in...' : 'Check In'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
