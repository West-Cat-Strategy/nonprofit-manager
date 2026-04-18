import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  staffEventsPrimaryActionClassName,
  staffEventsSecondaryActionClassName,
} from '../components/StaffEventsPageShell';
import {
  buildEventDetailHref,
  entryKindLabel,
  formatEventType,
  getOccurrenceDateRange,
  type StaffCalendarEntry,
} from '../scheduling/staffCalendarEntries';
import { createEventEditTarget } from '../navigation/eventRouteTargets';
import type { PortalAdminAppointmentInboxItem, PortalAppointmentSlot } from '../../adminOps/contracts';
import type { EventOccurrence } from '../../../types/event';

interface StaffEventsWorkspaceDetailsPanelProps {
  selectedEntry: StaffCalendarEntry | null;
  selectedOccurrence: EventOccurrence | null;
  selectedAppointment: PortalAdminAppointmentInboxItem | null;
  selectedSlot: PortalAppointmentSlot | null;
  selectedOccurrenceLabel: string | null;
  canUseEventActions: boolean;
  savingEntryId: string | null;
  workspaceTarget: string | null;
  onConfirmAppointment: (appointmentId: string) => Promise<void>;
  onCheckInAppointment: (appointment: PortalAdminAppointmentInboxItem) => Promise<void>;
  onCancelAppointment: (appointment: PortalAdminAppointmentInboxItem) => Promise<void>;
  onToggleSlotStatus: (slot: PortalAppointmentSlot) => Promise<void>;
  onManageSlots: () => void;
}

export default function StaffEventsWorkspaceDetailsPanel({
  selectedEntry,
  selectedOccurrence,
  selectedAppointment,
  selectedSlot,
  selectedOccurrenceLabel,
  canUseEventActions,
  savingEntryId,
  workspaceTarget,
  onConfirmAppointment,
  onCheckInAppointment,
  onCancelAppointment,
  onToggleSlotStatus,
  onManageSlots,
}: StaffEventsWorkspaceDetailsPanelProps) {
  return (
    <section className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
      {selectedEntry ? (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
              {entryKindLabel[selectedEntry.metadata.kind]}
            </div>
            <h3 className="mt-1 text-xl font-semibold text-app-text">{selectedEntry.title}</h3>
            <div className="mt-2 text-sm text-app-text-muted">
              {format(parseISO(selectedEntry.start), 'PPP p')}
              {selectedEntry.end ? ` - ${format(parseISO(selectedEntry.end), 'p')}` : ''}
            </div>
            {selectedEntry.location ? (
              <div className="mt-1 text-sm text-app-text-muted">{selectedEntry.location}</div>
            ) : null}
          </div>

          {selectedOccurrence ? (
            <>
              {selectedOccurrence.description ? (
                <p className="text-sm text-app-text-muted">{selectedOccurrence.description}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-app-surface-muted px-2 py-1 text-xs text-app-text-muted">
                  {selectedOccurrence.status}
                </span>
                <span className="rounded-full bg-app-accent-soft px-2 py-1 text-xs text-app-accent-text">
                  {formatEventType(selectedOccurrence.event_type)}
                </span>
                <span className="rounded-full border border-app-border bg-app-surface px-2 py-1 text-xs text-app-text-muted">
                  {selectedOccurrence.is_public ? 'Public' : 'Private'}
                </span>
                {selectedOccurrence.waitlist_enabled ? (
                  <span className="rounded-full border border-app-border bg-app-surface px-2 py-1 text-xs text-app-text-muted">
                    Waitlist enabled
                  </span>
                ) : null}
                {selectedOccurrenceLabel ? (
                  <span className="rounded-full bg-app-surface-muted px-2 py-1 text-xs text-app-text-muted">
                    {selectedOccurrenceLabel}
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-app-border bg-app-surface-muted/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
                    Registration
                  </p>
                  <p className="mt-2 text-xl font-semibold text-app-text">
                    {selectedOccurrence.registered_count}
                    {selectedOccurrence.capacity ? ` / ${selectedOccurrence.capacity}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-app-text-muted">
                    {selectedOccurrence.capacity ? 'Registered vs capacity' : 'No capacity limit set'}
                  </p>
                </div>

                <div className="rounded-lg border border-app-border bg-app-surface-muted/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
                    Attendance
                  </p>
                  <p className="mt-2 text-xl font-semibold text-app-text">
                    {selectedOccurrence.attended_count}
                  </p>
                  <p className="mt-1 text-xs text-app-text-muted">Checked in so far</p>
                </div>
              </div>

              <div className="rounded-lg border border-app-border bg-app-surface-muted/60 p-3 text-sm text-app-text-muted">
                {getOccurrenceDateRange(selectedOccurrence)}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  to={buildEventDetailHref(selectedOccurrence, { returnTo: workspaceTarget })}
                  className={staffEventsPrimaryActionClassName}
                >
                  View details
                </Link>
                <Link
                  to={createEventEditTarget(selectedOccurrence.event_id, {
                    occurrenceId: selectedOccurrence.occurrence_id,
                    returnTo: workspaceTarget,
                  })}
                  className={staffEventsSecondaryActionClassName}
                >
                  Edit event
                </Link>
                {canUseEventActions ? (
                  <Link
                    to={`/events/check-in?eventId=${selectedOccurrence.event_id}`}
                    className={staffEventsSecondaryActionClassName}
                  >
                    Check-in
                  </Link>
                ) : null}
                <Link
                  to={buildEventDetailHref(selectedOccurrence, {
                    tab: 'registrations',
                    returnTo: workspaceTarget,
                  })}
                  className={staffEventsSecondaryActionClassName}
                >
                  Open registrations
                </Link>
              </div>
            </>
          ) : null}

          {selectedAppointment ? (
            <>
              {selectedAppointment.description ? (
                <p className="text-sm text-app-text-muted">{selectedAppointment.description}</p>
              ) : null}
              <p className="text-sm text-app-text-muted">
                Status: {selectedAppointment.status}
                {selectedAppointment.request_type
                  ? ` • ${selectedAppointment.request_type.replace('_', ' ')}`
                  : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedAppointment.status === 'requested' ? (
                  <button
                    type="button"
                    onClick={() => void onConfirmAppointment(selectedAppointment.id)}
                    disabled={savingEntryId === `appointment:${selectedAppointment.id}`}
                    className={staffEventsPrimaryActionClassName}
                  >
                    {savingEntryId === `appointment:${selectedAppointment.id}` ? 'Saving...' : 'Confirm'}
                  </button>
                ) : null}
                {selectedAppointment.status === 'confirmed' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void onCheckInAppointment(selectedAppointment)}
                      disabled={savingEntryId === `appointment:${selectedAppointment.id}`}
                      className={staffEventsSecondaryActionClassName}
                    >
                      {selectedAppointment.case_id ? 'Resolve in case' : 'Check in'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onCancelAppointment(selectedAppointment)}
                      disabled={savingEntryId === `appointment:${selectedAppointment.id}`}
                      className={staffEventsSecondaryActionClassName}
                    >
                      {selectedAppointment.case_id ? 'Open case' : 'Cancel'}
                    </button>
                  </>
                ) : null}
              </div>
            </>
          ) : null}

          {selectedSlot ? (
            <>
              <p className="text-sm text-app-text-muted">
                Status: {selectedSlot.status}
                {selectedSlot.capacity ? ` • Capacity ${selectedSlot.capacity}` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void onToggleSlotStatus(selectedSlot)}
                  disabled={savingEntryId === `slot:${selectedSlot.id}` || selectedSlot.status === 'cancelled'}
                  className={staffEventsSecondaryActionClassName}
                >
                  {savingEntryId === `slot:${selectedSlot.id}`
                    ? 'Saving...'
                    : selectedSlot.status === 'open'
                      ? 'Close slot'
                      : 'Reopen slot'}
                </button>
                <button
                  type="button"
                  onClick={onManageSlots}
                  className={staffEventsSecondaryActionClassName}
                >
                  Manage slots
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-app-text">Selected item</h3>
          <p className="text-sm text-app-text-muted">
            Pick an occurrence or appointment from the calendar to see quick actions and context here.
          </p>
        </div>
      )}
    </section>
  );
}
