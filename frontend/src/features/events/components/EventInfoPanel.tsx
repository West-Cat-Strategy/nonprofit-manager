import type { Event } from '../../../types/event';
import { formatDateTime } from '../../../utils/format';

interface EventInfoPanelProps {
  event: Event;
}

const formatEventDateTime = (date: string): string => {
  const parsedDate = new Date(date);
  const weekday = parsedDate.toLocaleDateString('en-US', { weekday: 'long' });
  return `${weekday}, ${formatDateTime(date)}`;
};

export default function EventInfoPanel({ event }: EventInfoPanelProps) {
  const capacityPercentage = event.capacity ? ((event.registered_count || 0) / event.capacity) * 100 : 0;

  return (
    <div className="space-y-6 rounded-lg bg-app-surface p-6 shadow-md">
      {event.description && (
        <div>
          <h3 className="mb-2 text-lg font-semibold">Description</h3>
          <p className="whitespace-pre-wrap text-app-text-muted">{event.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-lg font-semibold">Start Date & Time</h3>
          <p className="text-app-text-muted">{formatEventDateTime(event.start_date)}</p>
        </div>
        <div>
          <h3 className="mb-2 text-lg font-semibold">End Date & Time</h3>
          <p className="text-app-text-muted">{formatEventDateTime(event.end_date)}</p>
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
        </div>
      )}

      <div>
        <h3 className="mb-2 text-lg font-semibold">Location</h3>
        {event.location_name ? (
          <div className="text-app-text-muted">
            <p className="font-medium">{event.location_name}</p>
            {event.address_line1 && <p>{event.address_line1}</p>}
            {event.address_line2 && <p>{event.address_line2}</p>}
            {(event.city || event.state_province || event.postal_code) && (
              <p>
                {event.city && `${event.city}, `}
                {event.state_province && `${event.state_province} `}
                {event.postal_code}
              </p>
            )}
            {event.country && <p>{event.country}</p>}
          </div>
        ) : (
          <p className="text-app-text-muted">Location to be determined</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <h3 className="mb-2 text-lg font-semibold">Capacity</h3>
          {event.capacity ? (
            <div>
              <p className="text-2xl font-bold">{event.capacity}</p>
              <div className="mt-2 h-2 rounded-full bg-app-surface-muted">
                <div
                  className={`h-2 rounded-full ${
                    capacityPercentage >= 100
                      ? 'bg-red-600'
                      : capacityPercentage >= 80
                        ? 'bg-orange-500'
                        : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-app-text-muted">{Math.round(capacityPercentage)}% full</p>
            </div>
          ) : (
            <p className="text-app-text-muted">Unlimited</p>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-lg font-semibold">Registered</h3>
          <p className="text-2xl font-bold text-app-accent">{event.registered_count || 0}</p>
        </div>

        <div>
          <h3 className="mb-2 text-lg font-semibold">Attended</h3>
          <p className="text-2xl font-bold text-green-600">{event.attended_count || 0}</p>
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
