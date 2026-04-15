import { useEffect, useMemo, useState } from 'react';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import PortalListToolbar from '../../../components/portal/PortalListToolbar';
import { useToast } from '../../../contexts/useToast';
import { formatApiErrorMessage } from '../../../utils/apiError';
import { portalV2ApiClient } from '../api/portalApiClient';
import usePortalEventsList from '../client/usePortalEventsList';
import type { PortalEvent } from '../types/contracts';
import {
  canShowPortalEventQrPass,
  getPortalEventConfirmationLabel,
  getPortalEventDateRange,
  getPortalEventOccurrenceLabel,
  getPortalEventRegistrationLabel,
} from '../utils/eventDisplay';

export default function PortalEventsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'start_date' | 'name' | 'created_at'>('start_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [passEvent, setPassEvent] = useState<PortalEvent | null>(null);
  const [passQrDataUrl, setPassQrDataUrl] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const {
    items: events,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
  } = usePortalEventsList({
    search: searchTerm,
    sort: sortField,
    order: sortOrder,
  });

  useEffect(() => {
    let cancelled = false;

    const generateQr = async () => {
      if (!passEvent?.check_in_token) {
        setPassQrDataUrl(null);
        return;
      }

      try {
        const { toDataURL } = await import('qrcode');
        const dataUrl = await toDataURL(passEvent.check_in_token, {
          width: 320,
          margin: 1,
        });
        if (!cancelled) {
          setPassQrDataUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setPassQrDataUrl(null);
        }
      }
    };

    void generateQr();
    return () => {
      cancelled = true;
    };
  }, [passEvent]);

  const checkedInLabel = useMemo(() => {
    if (!passEvent?.checked_in || !passEvent.check_in_time) return null;
    return new Date(passEvent.check_in_time).toLocaleString();
  }, [passEvent]);

  const passOccurrenceLabel = passEvent ? getPortalEventOccurrenceLabel(passEvent) : null;
  const passRegistrationLabel = passEvent
    ? getPortalEventRegistrationLabel(passEvent.registration_status)
    : null;
  const passConfirmationLabel = passEvent
    ? getPortalEventConfirmationLabel(passEvent.confirmation_email_status)
    : null;

  const handleRegister = async (eventId: string) => {
    setSavingEventId(eventId);
    try {
      await portalV2ApiClient.registerEvent(eventId);
      showSuccess('Registered for event.');
      await refresh();
    } catch (registerError) {
      showError(formatApiErrorMessage(registerError, 'Could not register for this event.'));
    } finally {
      setSavingEventId(null);
    }
  };

  const handleCancel = async (eventId: string) => {
    setSavingEventId(eventId);
    try {
      await portalV2ApiClient.cancelEventRegistration(eventId);
      showSuccess('Registration canceled.');
      await refresh();
    } catch (cancelError) {
      showError(formatApiErrorMessage(cancelError, 'Could not cancel registration.'));
    } finally {
      setSavingEventId(null);
    }
  };

  const downloadPass = () => {
    if (!passQrDataUrl || !passEvent) return;
    const anchor = document.createElement('a');
    anchor.href = passQrDataUrl;
    anchor.download = `event-pass-${passEvent.id}.png`;
    anchor.click();
  };

  return (
    <PortalPageShell
      title="Events"
      description="Browse upcoming opportunities, manage registrations, and present your QR pass at check-in."
    >
      <PortalListToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search events by name, type, location, or status"
        sortValue={sortField}
        onSortChange={setSortField}
        sortOptions={[
          { value: 'start_date', label: 'Start date' },
          { value: 'name', label: 'Name' },
          { value: 'created_at', label: 'Added date' },
        ]}
        orderValue={sortOrder}
        onOrderChange={setSortOrder}
        showingCount={events.length}
        totalCount={total}
      />

      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && events.length === 0}
        loadingLabel="Loading events..."
        emptyTitle={searchTerm ? 'No matching events.' : 'No events available right now.'}
        emptyDescription={
          searchTerm
            ? 'Try a different search term.'
            : 'Staff will publish upcoming opportunities here.'
        }
        onRetry={refresh}
      />

      {!loading && !error && events.length > 0 && (
        <ul className="space-y-3">
          {events.map((event) => {
            const hasRegistration = Boolean(event.registration_id);
            const isCheckedIn = Boolean(event.checked_in);
            const checkedInTime = event.check_in_time
              ? new Date(event.check_in_time).toLocaleString()
              : null;
            const occurrenceLabel = getPortalEventOccurrenceLabel(event);
            const registrationLabel = getPortalEventRegistrationLabel(event.registration_status);
            const confirmationLabel = getPortalEventConfirmationLabel(
              event.confirmation_email_status
            );

            return (
              <li key={event.id}>
                <PortalListCard
                  title={event.name}
                  subtitle={getPortalEventDateRange(event)}
                  meta={event.location_name || 'Location provided by staff'}
                  badges={
                    <>
                      {event.event_type && (
                        <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                          {event.event_type}
                        </span>
                      )}
                      {occurrenceLabel && (
                        <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                          {occurrenceLabel}
                        </span>
                      )}
                      {registrationLabel && (
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            event.registration_status === 'confirmed'
                              ? 'bg-app-accent-soft text-app-accent-text'
                              : event.registration_status === 'waitlisted'
                                ? 'bg-yellow-100 text-yellow-900'
                                : 'bg-app-surface-muted text-app-text-muted'
                          }`}
                        >
                          {registrationLabel}
                        </span>
                      )}
                      {confirmationLabel && (
                        <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                          {confirmationLabel}
                        </span>
                      )}
                      {hasRegistration && !registrationLabel && (
                        <span className="rounded bg-app-accent-soft px-2 py-0.5 text-xs text-app-accent-text">
                          Registered
                        </span>
                      )}
                      {isCheckedIn && (
                        <span className="rounded bg-app-accent-soft px-2 py-0.5 text-xs text-app-accent-text">
                          Checked In
                        </span>
                      )}
                    </>
                  }
                  actions={
                    hasRegistration ? (
                      <div className="flex gap-2">
                        {canShowPortalEventQrPass(event) && (
                          <button
                            type="button"
                            onClick={() => setPassEvent(event)}
                            className="rounded border border-app-input-border px-3 py-1 text-xs"
                          >
                            QR Pass
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleCancel(event.id)}
                          disabled={savingEventId === event.id || isCheckedIn}
                          className="rounded border border-app-input-border px-3 py-1 text-xs disabled:opacity-60"
                        >
                          {savingEventId === event.id
                            ? 'Saving...'
                            : event.registration_status === 'waitlisted'
                              ? 'Cancel waitlist'
                              : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleRegister(event.id)}
                        disabled={savingEventId === event.id}
                        className="rounded bg-app-accent px-3 py-1 text-xs text-[var(--app-accent-foreground)] disabled:opacity-60"
                      >
                        {savingEventId === event.id ? 'Saving...' : 'Register'}
                      </button>
                    )
                  }
                >
                  {event.description && (
                    <p className="text-sm text-app-text-muted">{event.description}</p>
                  )}
                  {isCheckedIn && checkedInTime && (
                    <p className="mt-2 text-xs text-app-text-muted">
                      Checked in at {checkedInTime}
                    </p>
                  )}
                </PortalListCard>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !error && hasMore && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="rounded-md border border-app-input-border px-4 py-2 text-sm font-medium text-app-text disabled:opacity-60"
          >
            {loadingMore ? 'Loading more...' : 'Load more events'}
          </button>
        </div>
      )}

      {passEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center app-popup-backdrop p-4">
          <div className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-app-text">Event QR Pass</h2>
                <p className="text-xs text-app-text-muted">{passEvent.name}</p>
                {passOccurrenceLabel && (
                  <p className="mt-1 text-xs text-app-text-muted">{passOccurrenceLabel}</p>
                )}
                {passRegistrationLabel && (
                  <p className="mt-1 text-xs text-app-text-muted">{passRegistrationLabel}</p>
                )}
                {passConfirmationLabel && (
                  <p className="mt-1 text-xs text-app-text-muted">{passConfirmationLabel}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPassEvent(null)}
                className="rounded border border-app-input-border px-2 py-1 text-xs"
              >
                Close
              </button>
            </div>

            <div className="rounded-md border border-app-border bg-white p-3">
              {passQrDataUrl ? (
                <img
                  src={passQrDataUrl}
                  alt="Event check-in QR pass"
                  className="mx-auto h-64 w-64"
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-xs text-app-text-muted">
                  Generating QR pass...
                </div>
              )}
            </div>

            <div className="mt-3 space-y-1 text-xs text-app-text-muted">
              <p>{getPortalEventDateRange(passEvent)}</p>
              {passEvent.location_name && <p>{passEvent.location_name}</p>}
              {checkedInLabel && <p>Checked in at {checkedInLabel}</p>}
              {passEvent.registration_status === 'waitlisted' && (
                <p>This registration is waitlisted, so QR check-in is not available yet.</p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={downloadPass}
                disabled={!passQrDataUrl}
                className="rounded bg-app-accent px-3 py-2 text-xs text-[var(--app-accent-foreground)] disabled:opacity-60"
              >
                Download PNG
              </button>
              {passEvent.check_in_token && (
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard?.writeText(passEvent.check_in_token || '')
                  }
                  className="rounded border border-app-input-border px-3 py-2 text-xs"
                >
                  Copy Token
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </PortalPageShell>
  );
}
