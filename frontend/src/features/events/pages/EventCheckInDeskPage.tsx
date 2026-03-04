import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { eventsApiClient } from '../api/eventsApiClient';
import type { Event, EventWalkInCheckInDTO } from '../../../types/event';
import { formatApiErrorMessage } from '../../../utils/apiError';

const EventQrScanner = lazy(() => import('../components/EventQrScanner'));

interface WalkInFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
}

const initialWalkInForm: WalkInFormState = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  notes: '',
};

export default function EventCheckInDeskPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  const [scanToken, setScanToken] = useState('');
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [walkInForm, setWalkInForm] = useState<WalkInFormState>(initialWalkInForm);
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const [walkInResult, setWalkInResult] = useState<string | null>(null);
  const [walkInError, setWalkInError] = useState<string | null>(null);

  const selectedEvent = useMemo(
    () => events.find((event) => event.event_id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await eventsApiClient.listEventsAccumulated({
          sortBy: 'start_date',
          sortOrder: 'asc',
          limit: 100,
        });
        setEvents(response.data);
        if (response.data.length > 0) {
          setSelectedEventId(response.data[0].event_id);
        }
      } catch (error) {
        setScanError(formatApiErrorMessage(error, 'Unable to load events for check-in desk.'));
      } finally {
        setLoadingEvents(false);
      }
    };

    void loadEvents();
  }, []);

  const submitGlobalScan = async (rawToken: string) => {
    const token = rawToken.trim();
    if (!token) return;

    setScanSubmitting(true);
    setScanResult(null);
    setScanError(null);

    try {
      const registration = await eventsApiClient.scanCheckInGlobal(token);
      setScanResult(
        `Checked in ${registration.contact_name || 'attendee'} for ${registration.event_name || 'event'}.`
      );
      setScanToken('');
    } catch (error) {
      setScanError(formatApiErrorMessage(error, 'Failed to check in scanned token.'));
    } finally {
      setScanSubmitting(false);
    }
  };

  const submitWalkIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEventId) {
      setWalkInError('Select an event first.');
      return;
    }

    const hasIdentity = walkInForm.email.trim().length > 0 || walkInForm.phone.trim().length > 0;
    if (!hasIdentity) {
      setWalkInError('Provide email or phone so walk-ins can be matched correctly.');
      return;
    }

    setWalkInSubmitting(true);
    setWalkInResult(null);
    setWalkInError(null);

    try {
      const payload: EventWalkInCheckInDTO = {
        first_name: walkInForm.first_name.trim(),
        last_name: walkInForm.last_name.trim(),
        email: walkInForm.email.trim() || undefined,
        phone: walkInForm.phone.trim() || undefined,
        notes: walkInForm.notes.trim() || undefined,
      };
      const result = await eventsApiClient.walkInCheckIn(selectedEventId, payload);

      const outcome =
        result.status === 'already_checked_in'
          ? 'already checked in'
          : result.status === 'existing_checked_in'
            ? 'checked in (existing registration)'
            : 'registered and checked in';

      setWalkInResult(`Walk-in ${outcome}.`);
      setWalkInForm(initialWalkInForm);
    } catch (error) {
      setWalkInError(formatApiErrorMessage(error, 'Failed to process walk-in attendee.'));
    } finally {
      setWalkInSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">Event Check-In Desk</h1>
          <p className="text-sm text-app-text-muted">
            Scan attendee QR codes or add walk-ins for immediate registration and attendance.
          </p>
        </div>
        <Link
          to="/events"
          className="rounded border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text hover:bg-app-surface-muted"
        >
          Back to Events
        </Link>
      </div>

      <section className="rounded-lg border border-app-border bg-app-surface p-4">
        <h2 className="text-lg font-medium text-app-text">Global QR Scan</h2>
        <p className="mt-1 text-sm text-app-text-muted">
          Scan any attendee token. The server resolves the matching event and registration automatically.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={scanToken}
            onChange={(event) => setScanToken(event.target.value)}
            placeholder="Scan token"
            className="min-w-64 rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void submitGlobalScan(scanToken)}
            disabled={scanSubmitting || !scanToken.trim()}
            className="rounded-md bg-app-accent px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {scanSubmitting ? 'Checking In...' : 'Check In'}
          </button>
          <button
            type="button"
            onClick={() => setCameraScannerOpen((current) => !current)}
            className="rounded-md border border-app-input-border px-3 py-2 text-sm"
          >
            {cameraScannerOpen ? 'Close Camera' : 'Open Camera'}
          </button>
        </div>

        {cameraScannerOpen && (
          <div className="mt-3">
            <Suspense
              fallback={
                <div className="rounded-md border border-app-border bg-app-surface p-3 text-xs text-app-text-muted">
                  Initializing camera scanner...
                </div>
              }
            >
              <EventQrScanner
                enabled={cameraScannerOpen}
                disabled={scanSubmitting}
                onTokenScanned={(token) => {
                  setScanToken(token);
                  void submitGlobalScan(token);
                }}
              />
            </Suspense>
          </div>
        )}

        {scanResult && <p className="mt-3 text-sm text-app-accent">{scanResult}</p>}
        {scanError && <p className="mt-3 text-sm text-app-accent-text">{scanError}</p>}
      </section>

      <section className="rounded-lg border border-app-border bg-app-surface p-4">
        <h2 className="text-lg font-medium text-app-text">Walk-In Quick Add</h2>
        <p className="mt-1 text-sm text-app-text-muted">
          Add an attendee at the desk, register them, and mark attendance in one action.
        </p>

        <div className="mt-3">
          <label className="mb-1 block text-sm text-app-text-muted">Event</label>
          <select
            value={selectedEventId}
            onChange={(event) => setSelectedEventId(event.target.value)}
            disabled={loadingEvents}
            className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm"
          >
            {events.length === 0 && <option value="">No events available</option>}
            {events.map((event) => (
              <option key={event.event_id} value={event.event_id}>
                {event.event_name} ({new Date(event.start_date).toLocaleString()})
              </option>
            ))}
          </select>
          {selectedEvent && (
            <p className="mt-1 text-xs text-app-text-muted">
              {new Date(selectedEvent.start_date).toLocaleString()} -{' '}
              {new Date(selectedEvent.end_date).toLocaleString()}
            </p>
          )}
        </div>

        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitWalkIn}>
          <label className="text-sm">
            <span className="mb-1 block text-app-text-muted">First name</span>
            <input
              type="text"
              required
              value={walkInForm.first_name}
              onChange={(event) =>
                setWalkInForm((current) => ({ ...current, first_name: event.target.value }))
              }
              className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-app-text-muted">Last name</span>
            <input
              type="text"
              required
              value={walkInForm.last_name}
              onChange={(event) =>
                setWalkInForm((current) => ({ ...current, last_name: event.target.value }))
              }
              className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-app-text-muted">Email (or phone)</span>
            <input
              type="email"
              value={walkInForm.email}
              onChange={(event) =>
                setWalkInForm((current) => ({ ...current, email: event.target.value }))
              }
              className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-app-text-muted">Phone (or email)</span>
            <input
              type="tel"
              value={walkInForm.phone}
              onChange={(event) =>
                setWalkInForm((current) => ({ ...current, phone: event.target.value }))
              }
              className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-app-text-muted">Notes (optional)</span>
            <textarea
              value={walkInForm.notes}
              onChange={(event) =>
                setWalkInForm((current) => ({ ...current, notes: event.target.value }))
              }
              rows={2}
              className="w-full rounded-md border border-app-input-border bg-app-surface px-3 py-2"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={walkInSubmitting || !selectedEventId}
              className="rounded-md bg-app-accent px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {walkInSubmitting ? 'Processing...' : 'Register + Check In'}
            </button>
          </div>
        </form>

        {walkInResult && <p className="mt-3 text-sm text-app-accent">{walkInResult}</p>}
        {walkInError && <p className="mt-3 text-sm text-app-accent-text">{walkInError}</p>}
      </section>
    </div>
  );
}
