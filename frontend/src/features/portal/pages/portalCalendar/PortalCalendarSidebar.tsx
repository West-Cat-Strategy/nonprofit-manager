import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { entryKindLabel } from './adapters';
import type { PortalCalendarController } from './usePortalCalendarController';
import {
  getPortalEventDateRange,
  getPortalEventOccurrenceLabel,
  getPortalEventRegistrationLabel,
} from '../../utils/eventDisplay';

type Props = {
  controller: PortalCalendarController;
};

export default function PortalCalendarSidebar({ controller }: Props) {
  const selectedEvent = controller.selectedEvent;
  const selectedSlot = controller.selectedSlot;
  const selectedAppointment = controller.selectedAppointment;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-app-border bg-app-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-app-text">
              {controller.selectedDate
                ? format(controller.selectedDate, 'EEEE, MMMM d')
                : 'Selected day'}
            </h2>
            <p className="text-sm text-app-text-muted">
              {controller.selectedDateEntries.length} item
              {controller.selectedDateEntries.length === 1 ? '' : 's'} on this date
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <Link
              to="/portal/events"
              className="rounded border border-app-input-border px-3 py-1.5 text-app-text"
            >
              Events list
            </Link>
            <Link
              to="/portal/appointments"
              className="rounded border border-app-input-border px-3 py-1.5 text-app-text"
            >
              Appointments
            </Link>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {controller.selectedDateEntries.length === 0 ? (
            <p className="text-sm text-app-text-muted">Nothing scheduled for this day.</p>
          ) : (
            controller.selectedDateEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => controller.handleSelectEntry(entry)}
                className={`w-full rounded-lg border px-3 py-2 text-left ${
                  controller.selectedEntryId === entry.id
                    ? 'border-app-accent bg-app-accent-soft/30'
                    : 'border-app-border bg-app-surface-muted'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-app-text">{entry.title}</div>
                    <div className="text-xs text-app-text-muted">
                      {format(parseISO(entry.start), 'p')}
                      {entry.end ? ` - ${format(parseISO(entry.end), 'p')}` : ''}
                      {entry.location ? ` • ${entry.location}` : ''}
                    </div>
                  </div>
                  <span className="rounded-full bg-app-surface px-2 py-0.5 text-[11px] text-app-text-muted">
                    {entryKindLabel[entry.metadata.kind]}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-app-border bg-app-surface p-4">
        {controller.selectedEntry ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                {entryKindLabel[controller.selectedEntry.metadata.kind]}
              </div>
              <h2 className="mt-1 text-xl font-semibold text-app-text">
                {controller.selectedEntry.title}
              </h2>
              <div className="mt-2 text-sm text-app-text-muted">
                {format(parseISO(controller.selectedEntry.start), 'PPP p')}
                {controller.selectedEntry.end
                  ? ` - ${format(parseISO(controller.selectedEntry.end), 'p')}`
                  : ''}
              </div>
              {controller.selectedEntry.location && (
                <div className="mt-1 text-sm text-app-text-muted">
                  {controller.selectedEntry.location}
                </div>
              )}
            </div>

            {selectedEvent && (
              <>
                {selectedEvent.description && (
                  <p className="text-sm text-app-text-muted">
                    {selectedEvent.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {getPortalEventOccurrenceLabel(selectedEvent) && (
                    <span className="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                      {getPortalEventOccurrenceLabel(selectedEvent)}
                    </span>
                  )}
                  {getPortalEventRegistrationLabel(selectedEvent.registration_status) && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        selectedEvent.registration_status === 'confirmed'
                          ? 'bg-app-accent-soft text-app-accent-text'
                          : selectedEvent.registration_status === 'waitlisted'
                            ? 'bg-yellow-100 text-yellow-900'
                            : 'bg-app-surface-muted text-app-text-muted'
                      }`}
                    >
                      {getPortalEventRegistrationLabel(selectedEvent.registration_status)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-app-text-muted">
                  {getPortalEventDateRange(selectedEvent)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.registration_id ? (
                    <button
                      type="button"
                      onClick={() => void controller.handleCancelEvent(selectedEvent.id)}
                      disabled={
                        controller.savingEntryId === controller.selectedEntry.id ||
                        selectedEvent.checked_in === true
                      }
                      className="rounded-md border border-app-input-border px-3 py-2 text-sm text-app-text disabled:opacity-60"
                    >
                      {controller.savingEntryId === controller.selectedEntry.id
                        ? 'Saving...'
                        : selectedEvent.registration_status === 'waitlisted'
                          ? 'Cancel waitlist'
                          : 'Cancel registration'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void controller.handleRegisterEvent(selectedEvent.id)}
                      disabled={controller.savingEntryId === controller.selectedEntry.id}
                      className="rounded-md bg-app-accent px-3 py-2 text-sm text-[var(--app-accent-foreground)] disabled:opacity-60"
                    >
                      {controller.savingEntryId === controller.selectedEntry.id
                        ? 'Saving...'
                        : 'Register'}
                    </button>
                  )}
                </div>
              </>
            )}

            {selectedSlot && (
              <>
                {selectedSlot.details && (
                  <p className="text-sm text-app-text-muted">
                    {selectedSlot.details}
                  </p>
                )}
                <p className="text-sm text-app-text-muted">
                  {selectedSlot.available_count} slot
                  {selectedSlot.available_count === 1 ? '' : 's'} available
                </p>
                <button
                  type="button"
                  onClick={() => void controller.handleBookSlot(selectedSlot.id)}
                  disabled={
                    controller.savingEntryId === controller.selectedEntry.id ||
                    selectedSlot.status !== 'open' ||
                    selectedSlot.available_count <= 0
                  }
                  className="rounded-md bg-app-accent px-3 py-2 text-sm text-[var(--app-accent-foreground)] disabled:opacity-60"
                >
                  {controller.savingEntryId === controller.selectedEntry.id
                    ? 'Saving...'
                    : 'Book slot'}
                </button>
              </>
            )}

            {selectedAppointment && (
              <>
                {selectedAppointment.description && (
                  <p className="text-sm text-app-text-muted">
                    {selectedAppointment.description}
                  </p>
                )}
                <p className="text-sm text-app-text-muted">
                  Status: {selectedAppointment.status}
                  {selectedAppointment.request_type
                    ? ` • ${selectedAppointment.request_type.replace('_', ' ')}`
                    : ''}
                </p>
                <button
                  type="button"
                  onClick={() => void controller.handleCancelAppointment(selectedAppointment.id)}
                  disabled={
                    controller.savingEntryId === controller.selectedEntry.id ||
                    selectedAppointment.status === 'cancelled' ||
                    selectedAppointment.status === 'completed'
                  }
                  className="rounded-md border border-app-input-border px-3 py-2 text-sm text-app-text disabled:opacity-60"
                >
                  {controller.savingEntryId === controller.selectedEntry.id
                    ? 'Saving...'
                    : 'Cancel appointment'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="text-sm text-app-text-muted">
            Select an event, appointment, or open slot to view details and actions.
          </div>
        )}
      </section>

      <section className="rounded-lg border border-app-border bg-app-surface p-4">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-app-text">Request Appointment</h2>
          <p className="text-sm text-app-text-muted">
            Submit a manual request when none of the open slots work for you.
          </p>
        </div>

        <form className="space-y-3" onSubmit={(event) => void controller.handleRequestSubmit(event)}>
          <div className="space-y-1">
            <label
              htmlFor="portal-appointment-title"
              className="text-sm font-medium text-app-text"
            >
              Appointment title
            </label>
            <input
              id="portal-appointment-title"
              type="text"
              required
              value={controller.requestForm.title}
              onChange={(event) =>
                controller.setRequestForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Appointment title"
              className="w-full rounded-md border border-app-input-border px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="portal-appointment-description"
              className="text-sm font-medium text-app-text"
            >
              Details
            </label>
            <textarea
              id="portal-appointment-description"
              value={controller.requestForm.description}
              onChange={(event) =>
                controller.setRequestForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Optional details"
              rows={3}
              className="w-full rounded-md border border-app-input-border px-3 py-2"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="portal-appointment-start"
                className="text-sm font-medium text-app-text"
              >
                Preferred start
              </label>
              <input
                id="portal-appointment-start"
                type="datetime-local"
                value={controller.requestForm.start_time}
                onChange={(event) =>
                  controller.setRequestForm((current) => ({
                    ...current,
                    start_time: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-app-input-border px-3 py-2"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="portal-appointment-end"
                className="text-sm font-medium text-app-text"
              >
                Preferred end
              </label>
              <input
                id="portal-appointment-end"
                type="datetime-local"
                value={controller.requestForm.end_time}
                onChange={(event) =>
                  controller.setRequestForm((current) => ({
                    ...current,
                    end_time: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-app-input-border px-3 py-2"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label
              htmlFor="portal-appointment-location"
              className="text-sm font-medium text-app-text"
            >
              Location
            </label>
            <input
              id="portal-appointment-location"
              type="text"
              value={controller.requestForm.location}
              onChange={(event) =>
                controller.setRequestForm((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
              placeholder="Optional location"
              className="w-full rounded-md border border-app-input-border px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={controller.submittingRequest}
            className="rounded-md bg-app-accent px-3 py-2 text-sm text-[var(--app-accent-foreground)] disabled:opacity-60"
          >
            {controller.submittingRequest ? 'Submitting...' : 'Submit request'}
          </button>
        </form>
      </section>
    </div>
  );
}
