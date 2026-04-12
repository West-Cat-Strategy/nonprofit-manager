<<<<<<< HEAD
import type { PortalPanelProps } from '../panelTypes';
=======
import type { PortalSectionProps } from '../../adminSettings/sections/PortalSection';

type PortalPanelProps = Omit<PortalSectionProps, 'visiblePanels'>;
>>>>>>> origin/main

const openCaseAppointments = (caseId: string) =>
  window.location.assign(`/cases/${caseId}?tab=appointments`);

export default function AppointmentsPanel({
  portalAppointments,
  portalAppointmentsLoading,
  portalAppointmentsPagination,
  portalAppointmentFilters,
  onPortalAppointmentFilterChange,
  onPortalAppointmentPageChange,
  onRefreshPortalAppointments,
  onPortalAppointmentStatusChange,
  onPortalAppointmentCheckIn,
  selectedPortalAppointmentId,
  portalAppointmentReminders,
  portalAppointmentRemindersLoading,
  portalAppointmentActionLoading,
  onPortalAppointmentReminderHistory,
  portalReminderCustomMessage,
  onPortalReminderCustomMessageChange,
  onPortalSendAppointmentReminder,
}: PortalPanelProps) {
  return (
    <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
        <h3 className="text-lg font-semibold text-app-text-heading">Appointment Inbox</h3>
        <p className="text-sm text-app-text-muted mt-1">
          Triage appointment status, mark check-ins, and manage reminder operations.
        </p>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          <select
            aria-label="Filter portal appointments by status"
            value={portalAppointmentFilters.status}
            onChange={(event) => onPortalAppointmentFilterChange('status', event.target.value)}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          >
            <option value="all">All statuses</option>
            <option value="requested">Requested</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            aria-label="Filter portal appointments by request type"
            value={portalAppointmentFilters.requestType}
            onChange={(event) =>
              onPortalAppointmentFilterChange('requestType', event.target.value)
            }
            className="px-3 py-2 border border-app-input-border rounded-lg"
          >
            <option value="all">All types</option>
            <option value="manual_request">Manual request</option>
            <option value="slot_booking">Slot booking</option>
          </select>
          <input
            type="text"
            aria-label="Filter portal appointments by case ID"
            value={portalAppointmentFilters.caseId}
            onChange={(event) => onPortalAppointmentFilterChange('caseId', event.target.value)}
            placeholder="Case ID"
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <input
            type="text"
            aria-label="Filter portal appointments by pointperson user ID"
            value={portalAppointmentFilters.pointpersonUserId}
            onChange={(event) =>
              onPortalAppointmentFilterChange('pointpersonUserId', event.target.value)
            }
            placeholder="Pointperson user ID"
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <input
            type="datetime-local"
            aria-label="Portal appointments from date"
            value={portalAppointmentFilters.dateFrom}
            onChange={(event) => onPortalAppointmentFilterChange('dateFrom', event.target.value)}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <input
            type="datetime-local"
            aria-label="Portal appointments to date"
            value={portalAppointmentFilters.dateTo}
            onChange={(event) => onPortalAppointmentFilterChange('dateTo', event.target.value)}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <button
            type="button"
            onClick={onRefreshPortalAppointments}
            className="px-4 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
          >
            Refresh Inbox
          </button>
        </div>

        <textarea
          aria-label="Custom portal appointment reminder message"
          value={portalReminderCustomMessage}
          onChange={(event) => onPortalReminderCustomMessageChange(event.target.value)}
          rows={2}
          placeholder="Optional custom reminder message used for manual sends."
          className="w-full px-3 py-2 border border-app-input-border rounded-lg"
        />

        {portalAppointmentsLoading ? (
          <p className="text-sm text-app-text-muted">Loading appointments...</p>
        ) : portalAppointments.length === 0 ? (
          <p className="text-sm text-app-text-muted">No appointments match current filters.</p>
        ) : (
          <div className="space-y-3">
            {portalAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className={`border rounded-lg p-3 ${
                  selectedPortalAppointmentId === appointment.id
                    ? 'border-app-accent'
                    : 'border-app-border'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-app-text">
                      {appointment.title}
                    </div>
                    <div className="text-xs text-app-text-muted">
                      {new Date(appointment.start_time).toLocaleString()}
                      {appointment.location ? ` • ${appointment.location}` : ''}
                    </div>
                    <div className="text-xs text-app-text-subtle mt-1">
                      {appointment.request_type} • {appointment.status}
                      {appointment.pending_reminder_jobs
                        ? ` • pending reminders: ${appointment.pending_reminder_jobs}`
                        : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={portalAppointmentActionLoading}
                      onClick={() => onPortalAppointmentReminderHistory(appointment.id)}
                      className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
                    >
                      Reminder History
                    </button>
                    <button
                      type="button"
                      disabled={portalAppointmentActionLoading}
                      onClick={() =>
                        onPortalSendAppointmentReminder(appointment.id, {
                          sendEmail: true,
                          sendSms: true,
                        })
                      }
                      className="px-3 py-1.5 text-xs bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
                    >
                      Send Reminder
                    </button>
                    <button
                      type="button"
                      disabled={
                        portalAppointmentActionLoading ||
                        appointment.status === 'completed' ||
                        appointment.status === 'cancelled'
                      }
                      onClick={() =>
                        appointment.case_id
                          ? openCaseAppointments(appointment.case_id)
                          : onPortalAppointmentCheckIn(appointment.id)
                      }
                      className="px-3 py-1.5 text-xs bg-app-accent-soft text-app-accent-text rounded-lg hover:bg-app-accent-soft disabled:opacity-50"
                    >
                      {appointment.case_id ? 'Resolve in Case' : 'Check-In'}
                    </button>
                    {appointment.status !== 'confirmed' && (
                      <button
                        type="button"
                        disabled={portalAppointmentActionLoading}
                        onClick={() =>
                          onPortalAppointmentStatusChange(appointment.id, 'confirmed')
                        }
                        className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
                      >
                        Confirm
                      </button>
                    )}
                    {appointment.status !== 'cancelled' && (
                      <button
                        type="button"
                        disabled={portalAppointmentActionLoading}
                        onClick={() =>
                          appointment.case_id
                            ? openCaseAppointments(appointment.case_id)
                            : onPortalAppointmentStatusChange(appointment.id, 'cancelled')
                        }
                        className="px-3 py-1.5 text-xs bg-app-accent-soft text-app-accent-text rounded-lg hover:bg-app-accent-soft disabled:opacity-50"
                      >
                        {appointment.case_id ? 'Resolve in Case' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {portalAppointmentsPagination.total_pages > 1 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-app-text-muted">
              Page {portalAppointmentsPagination.page} of {portalAppointmentsPagination.total_pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={portalAppointmentsPagination.page <= 1}
                onClick={() => onPortalAppointmentPageChange(portalAppointmentsPagination.page - 1)}
                className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={
                  portalAppointmentsPagination.page >= portalAppointmentsPagination.total_pages
                }
                onClick={() => onPortalAppointmentPageChange(portalAppointmentsPagination.page + 1)}
                className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {selectedPortalAppointmentId && (
          <div className="rounded-lg border border-app-border p-3">
            <h4 className="text-sm font-semibold text-app-text-heading">
              Reminder Details
            </h4>
            {portalAppointmentRemindersLoading ? (
              <p className="text-sm text-app-text-muted mt-2">Loading reminder details...</p>
            ) : !portalAppointmentReminders ? (
              <p className="text-sm text-app-text-muted mt-2">No reminder history loaded.</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-xs font-semibold text-app-text-muted uppercase">Jobs</h5>
                  {portalAppointmentReminders.jobs.length === 0 ? (
                    <p className="text-sm text-app-text-muted mt-2">No reminder jobs.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {portalAppointmentReminders.jobs.map((job) => (
                        <li key={job.id} className="text-xs border border-app-border rounded p-2">
                          <div className="font-medium text-app-text">
                            {job.cadence_key} • {job.channel}
                          </div>
                          <div className="text-app-text-muted">
                            {new Date(job.scheduled_for).toLocaleString()} • {job.status}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-app-text-muted uppercase">Deliveries</h5>
                  {portalAppointmentReminders.deliveries.length === 0 ? (
                    <p className="text-sm text-app-text-muted mt-2">No delivery history.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {portalAppointmentReminders.deliveries.map((delivery) => (
                        <li key={delivery.id} className="text-xs border border-app-border rounded p-2">
                          <div className="font-medium text-app-text">
                            {delivery.channel} • {delivery.delivery_status}
                          </div>
                          <div className="text-app-text-muted">
                            {new Date(delivery.sent_at).toLocaleString()} • {delivery.trigger_type}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
