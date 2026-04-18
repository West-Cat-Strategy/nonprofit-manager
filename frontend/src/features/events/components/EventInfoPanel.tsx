import type { Event, EventOccurrence } from '../../../types/event';
import { formatDateTime } from '../../../utils/format';
import { getEventOccurrenceLabel, getOccurrenceDateRange } from '../utils/occurrences';

interface EventInfoPanelProps {
  event: Event;
  occurrences?: EventOccurrence[];
  selectedOccurrence?: EventOccurrence | null;
}

const formatEventDateTime = (date: string): string => {
  const parsedDate = new Date(date);
  const weekday = parsedDate.toLocaleDateString('en-US', { weekday: 'long' });
  return `${weekday}, ${formatDateTime(date)}`;
};

export default function EventInfoPanel({ event, occurrences = [], selectedOccurrence }: EventInfoPanelProps) {
  const hasOccurrenceContext = Boolean(
    selectedOccurrence &&
      (event.is_recurring || occurrences.length > 1 || (event.occurrence_count ?? 0) > 1)
  );
  const overviewOccurrence = hasOccurrenceContext ? selectedOccurrence : null;
  const displayedStart = overviewOccurrence?.start_date ?? event.start_date;
  const displayedEnd = overviewOccurrence?.end_date ?? event.end_date;
  const displayedCapacity = overviewOccurrence?.capacity ?? event.capacity;
  const displayedRegistered = overviewOccurrence?.registered_count ?? (event.registered_count || 0);
  const displayedAttended = overviewOccurrence?.attended_count ?? (event.attended_count || 0);
  const locationName = overviewOccurrence?.location_name ?? event.location_name;
  const addressLine1 = overviewOccurrence?.address_line1 ?? event.address_line1;
  const addressLine2 = overviewOccurrence?.address_line2 ?? event.address_line2;
  const city = overviewOccurrence?.city ?? event.city;
  const stateProvince = overviewOccurrence?.state_province ?? event.state_province;
  const postalCode = overviewOccurrence?.postal_code ?? event.postal_code;
  const country = overviewOccurrence?.country ?? event.country;
  const capacityPercentage = displayedCapacity ? (displayedRegistered / displayedCapacity) * 100 : 0;
  const nextOccurrence = selectedOccurrence ?? occurrences[0] ?? null;

  return (
    <div className="space-y-6 rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
      {event.is_recurring && occurrences.length > 0 && (
        <div className="rounded-xl border border-app-border bg-app-surface-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Series Overview</h3>
              <p className="mt-1 text-sm text-app-text-muted">
                {occurrences.length} planned occurrence{occurrences.length === 1 ? '' : 's'} in this series.
              </p>
            </div>
            <span className="rounded-full bg-app-accent-soft px-3 py-1 text-xs font-semibold text-app-accent-text">
              {event.occurrence_count ?? occurrences.length} occurrence
              {(event.occurrence_count ?? occurrences.length) === 1 ? '' : 's'}
            </span>
          </div>

          {nextOccurrence && (
            <div className="mt-3 rounded-md border border-app-border bg-app-surface p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
                Selected occurrence
              </p>
              <p className="mt-1 font-medium text-app-text">
                {getEventOccurrenceLabel(nextOccurrence)}
              </p>
              <p className="mt-1 text-sm text-app-text-muted">
                {getOccurrenceDateRange(nextOccurrence)}
              </p>
            </div>
          )}
        </div>
      )}

      {event.description && (
        <div>
          <h3 className="mb-2 text-lg font-semibold">Description</h3>
          <p className="whitespace-pre-wrap text-app-text-muted">{event.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-app-border bg-app-surface-muted/60 p-4">
          <h3 className="mb-2 text-lg font-semibold">
            {overviewOccurrence ? 'Selected Start' : 'Start Date & Time'}
          </h3>
          <p className="text-app-text-muted">{formatEventDateTime(displayedStart)}</p>
        </div>
        <div className="rounded-lg border border-app-border bg-app-surface-muted/60 p-4">
          <h3 className="mb-2 text-lg font-semibold">
            {overviewOccurrence ? 'Selected End' : 'End Date & Time'}
          </h3>
          <p className="text-app-text-muted">{formatEventDateTime(displayedEnd)}</p>
        </div>
      </div>

      {event.is_recurring && (
        <div>
          <h3 className="mb-2 text-lg font-semibold">Recurrence</h3>
          <p className="capitalize text-app-text-muted">
            Every {event.recurrence_interval || 1} {event.recurrence_pattern || 'week'}
            {(event.recurrence_interval || 1) > 1 ? 's' : ''}
          </p>
          {event.recurrence_end_date && (
            <p className="text-app-text-muted">Ends: {formatEventDateTime(event.recurrence_end_date)}</p>
          )}
          {nextOccurrence && (
            <p className="mt-1 text-app-text-muted">
              Next occurrence: {getEventOccurrenceLabel(nextOccurrence)}
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-app-border bg-app-surface-muted/60 p-4">
        <h3 className="mb-2 text-lg font-semibold">Location</h3>
        {locationName ? (
          <div className="text-app-text-muted">
            <p className="font-medium">{locationName}</p>
            {addressLine1 && <p>{addressLine1}</p>}
            {addressLine2 && <p>{addressLine2}</p>}
            {(city || stateProvince || postalCode) && (
              <p>
                {city && `${city}, `}
                {stateProvince && `${stateProvince} `}
                {postalCode}
              </p>
            )}
            {country && <p>{country}</p>}
          </div>
        ) : (
          <p className="text-app-text-muted">Location to be determined</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-app-border bg-app-surface-muted/60 p-4">
          <h3 className="mb-2 text-lg font-semibold">Capacity</h3>
          {displayedCapacity ? (
            <div>
              <p className="text-2xl font-bold">{displayedCapacity}</p>
              <div className="mt-2 h-2 rounded-full bg-app-surface-muted">
                <div
                  className={`h-2 rounded-full ${
                    capacityPercentage >= 100
                      ? 'bg-app-accent'
                      : capacityPercentage >= 80
                        ? 'bg-app-accent'
                        : 'bg-app-accent'
                  }`}
                  style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-app-text-muted">
                {Math.round(capacityPercentage)}% full
                {overviewOccurrence ? ' for the selected occurrence' : ''}
              </p>
            </div>
          ) : (
            <p className="text-app-text-muted">Unlimited</p>
          )}
        </div>

        <div className="rounded-lg border border-app-border bg-app-surface-muted/60 p-4">
          <h3 className="mb-2 text-lg font-semibold">Registered</h3>
          <p className="text-2xl font-bold text-app-accent">{displayedRegistered}</p>
          <p className="mt-1 text-sm text-app-text-muted">
            {overviewOccurrence ? 'For the selected occurrence' : 'Across this event'}
          </p>
        </div>

        <div className="rounded-lg border border-app-border bg-app-surface-muted/60 p-4">
          <h3 className="mb-2 text-lg font-semibold">Attended</h3>
          <p className="text-2xl font-bold text-app-accent">{displayedAttended}</p>
          <p className="mt-1 text-sm text-app-text-muted">
            {overviewOccurrence ? 'Checked in for the selected occurrence' : 'Checked in so far'}
          </p>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="mb-2 text-lg font-semibold">Metadata</h3>
        <div className="grid grid-cols-1 gap-4 text-sm text-app-text-muted md:grid-cols-2">
          <div>
            <span className="font-medium">Visibility:</span> {event.is_public ? 'Public' : 'Private'}
          </div>
          <div>
            <span className="font-medium">Recurring:</span> {event.is_recurring ? 'Yes' : 'No'}
          </div>
          <div>
            <span className="font-medium">Created:</span> {new Date(event.created_at).toLocaleDateString()}
          </div>
          <div>
            <span className="font-medium">Last Updated:</span> {new Date(event.updated_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
