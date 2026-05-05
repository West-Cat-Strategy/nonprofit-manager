import {
  AdminActionGroup,
  AdminFilterToolbar,
  AdminMetricGrid,
  AdminMetricTile,
  AdminStatusPill,
  AdminWorkspaceSection,
  adminControlClassName,
  adminPrimaryButtonClassName,
  adminSubtleButtonClassName,
} from '../../../components/AdminWorkspacePrimitives';
import LoadFailureNotice from './LoadFailureNotice';
import type { PortalPanelProps } from '../panelTypes';

const openCaseAppointments = (caseId: string) =>
  window.location.assign(`/cases/${caseId}?tab=appointments`);

const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

export default function AppointmentsPanel({
  portalAppointments,
  portalAppointmentsLoading,
  portalAppointmentsError,
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
  const visibleAppointmentCount = portalAppointments.length;
  const matchingAppointmentCount = portalAppointmentsPagination.total;
  const requestedAppointmentCount = portalAppointments.filter(
    (appointment) => appointment.status === 'requested'
  ).length;
  const caseLinkedAppointmentCount = portalAppointments.filter((appointment) =>
    Boolean(appointment.case_id)
  ).length;
  const pendingReminderCount = portalAppointments.reduce(
    (total, appointment) => total + (appointment.pending_reminder_jobs ?? 0),
    0
  );

  return (
    <AdminWorkspaceSection
      title="Appointment Inbox"
      description="Triage appointment status, mark check-ins, and manage reminder operations."
    >
      <AdminFilterToolbar>
        <select
          aria-label="Filter portal appointments by status"
          value={portalAppointmentFilters.status}
          onChange={(event) => onPortalAppointmentFilterChange('status', event.target.value)}
          className={adminControlClassName}
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
          onChange={(event) => onPortalAppointmentFilterChange('requestType', event.target.value)}
          className={adminControlClassName}
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
          className={adminControlClassName}
        />
        <input
          type="text"
          aria-label="Filter portal appointments by pointperson user ID"
          value={portalAppointmentFilters.pointpersonUserId}
          onChange={(event) =>
            onPortalAppointmentFilterChange('pointpersonUserId', event.target.value)
          }
          placeholder="Pointperson user ID"
          className={adminControlClassName}
        />
        <input
          type="datetime-local"
          aria-label="Portal appointments from date"
          value={portalAppointmentFilters.dateFrom}
          onChange={(event) => onPortalAppointmentFilterChange('dateFrom', event.target.value)}
          className={adminControlClassName}
        />
        <input
          type="datetime-local"
          aria-label="Portal appointments to date"
          value={portalAppointmentFilters.dateTo}
          onChange={(event) => onPortalAppointmentFilterChange('dateTo', event.target.value)}
          className={adminControlClassName}
        />
        <button
          type="button"
          onClick={onRefreshPortalAppointments}
          className={adminSubtleButtonClassName}
        >
          Refresh Inbox
        </button>
      </AdminFilterToolbar>

      <textarea
        aria-label="Custom portal appointment reminder message"
        value={portalReminderCustomMessage}
        onChange={(event) => onPortalReminderCustomMessageChange(event.target.value)}
        rows={2}
        placeholder="Optional custom reminder message used for manual sends."
        className={adminControlClassName}
      />

      {!portalAppointmentsLoading && (
        <AdminMetricGrid>
          <AdminMetricTile
            label="Matching"
            value={matchingAppointmentCount}
            helper={`Showing ${visibleAppointmentCount}`}
          />
          <AdminMetricTile
            label="Requested"
            value={requestedAppointmentCount}
            tone={requestedAppointmentCount ? 'warning' : 'neutral'}
          />
          <AdminMetricTile label="Case linked" value={caseLinkedAppointmentCount} />
          <AdminMetricTile
            label="Reminders"
            value={pendingReminderCount}
            helper="Pending jobs"
            tone={pendingReminderCount ? 'info' : 'neutral'}
          />
        </AdminMetricGrid>
      )}

      {portalAppointmentsError ? (
        <LoadFailureNotice
          title={portalAppointments.length ? 'Partial load' : 'Load failed'}
          message={portalAppointmentsError}
        />
      ) : null}
      {portalAppointmentsLoading ? (
        <p className="text-sm text-app-text-muted">Loading appointments...</p>
      ) : portalAppointments.length === 0 && !portalAppointmentsError ? (
        <p className="text-sm text-app-text-muted">No appointments match current filters.</p>
      ) : portalAppointments.length > 0 ? (
        <div className="space-y-3">
          {portalAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className={`min-w-0 rounded-lg border p-3 ${
                selectedPortalAppointmentId === appointment.id
                  ? 'border-app-accent'
                  : 'border-app-border'
              }`}
            >
              <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="break-words text-sm font-medium text-app-text">
                    {appointment.title}
                  </div>
                  <div className="break-words text-xs text-app-text-muted">
                    {new Date(appointment.start_time).toLocaleString()}
                    {appointment.location ? ` • ${appointment.location}` : ''}
                  </div>
                  <div className="mt-1 break-words text-xs text-app-text-subtle">
                    {appointment.request_type} • {appointment.status}
                    {appointment.pending_reminder_jobs
                      ? ` • pending reminders: ${appointment.pending_reminder_jobs}`
                      : ''}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <AdminStatusPill tone="neutral">
                      {appointment.case_id ? 'Resolve in case' : 'Direct inbox action'}
                    </AdminStatusPill>
                    {appointment.status === 'requested' && (
                      <AdminStatusPill tone="warning">Confirmation needed</AdminStatusPill>
                    )}
                    {appointment.pending_reminder_jobs ? (
                      <AdminStatusPill tone="info">
                        {pluralize(appointment.pending_reminder_jobs, 'reminder')} pending
                      </AdminStatusPill>
                    ) : null}
                  </div>
                </div>
                <div className="min-w-0 space-y-2">
                  <AdminActionGroup>
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
                      aria-label={
                        appointment.case_id
                          ? `Resolve appointment in case: ${appointment.title}`
                          : `Check in appointment: ${appointment.title}`
                      }
                      className={adminPrimaryButtonClassName}
                    >
                      {appointment.case_id ? 'Resolve in Case' : 'Check-In'}
                    </button>
                    {appointment.status !== 'confirmed' && (
                      <button
                        type="button"
                        disabled={portalAppointmentActionLoading}
                        onClick={() => onPortalAppointmentStatusChange(appointment.id, 'confirmed')}
                        className={adminSubtleButtonClassName}
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
                        aria-label={
                          appointment.case_id
                            ? `Resolve cancellation in case: ${appointment.title}`
                            : `Cancel appointment: ${appointment.title}`
                        }
                        className={adminSubtleButtonClassName}
                      >
                        {appointment.case_id ? 'Resolve in Case' : 'Cancel'}
                      </button>
                    )}
                  </AdminActionGroup>
                  <AdminActionGroup>
                    <button
                      type="button"
                      disabled={portalAppointmentActionLoading}
                      onClick={() => onPortalAppointmentReminderHistory(appointment.id)}
                      className={adminSubtleButtonClassName}
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
                      className={adminSubtleButtonClassName}
                    >
                      Send Reminder
                    </button>
                  </AdminActionGroup>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {portalAppointmentsPagination.total_pages > 1 && (
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-app-text-muted">
            Page {portalAppointmentsPagination.page} of {portalAppointmentsPagination.total_pages}
          </span>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled={portalAppointmentsPagination.page <= 1}
              onClick={() => onPortalAppointmentPageChange(portalAppointmentsPagination.page - 1)}
              className={adminSubtleButtonClassName}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={
                portalAppointmentsPagination.page >= portalAppointmentsPagination.total_pages
              }
              onClick={() => onPortalAppointmentPageChange(portalAppointmentsPagination.page + 1)}
              className={adminSubtleButtonClassName}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedPortalAppointmentId && (
        <div className="min-w-0 rounded-lg border border-app-border p-3">
          <h4 className="text-sm font-semibold text-app-text-heading">Reminder Details</h4>
          {portalAppointmentRemindersLoading ? (
            <p className="text-sm text-app-text-muted mt-2">Loading reminder details...</p>
          ) : !portalAppointmentReminders ? (
            <p className="text-sm text-app-text-muted mt-2">No reminder history loaded.</p>
          ) : (
            <div className="mt-3 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <h5 className="text-xs font-semibold text-app-text-muted uppercase">Jobs</h5>
                {portalAppointmentReminders.jobs.length === 0 ? (
                  <p className="text-sm text-app-text-muted mt-2">No reminder jobs.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {portalAppointmentReminders.jobs.map((job) => (
                      <li key={job.id} className="min-w-0 rounded border border-app-border p-2 text-xs">
                        <div className="break-words font-medium text-app-text">
                          {job.cadence_key} • {job.channel}
                        </div>
                        <div className="break-words text-app-text-muted">
                          {new Date(job.scheduled_for).toLocaleString()} • {job.status}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-semibold text-app-text-muted uppercase">Deliveries</h5>
                {portalAppointmentReminders.deliveries.length === 0 ? (
                  <p className="text-sm text-app-text-muted mt-2">No delivery history.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {portalAppointmentReminders.deliveries.map((delivery) => (
                      <li
                        key={delivery.id}
                        className="min-w-0 rounded border border-app-border p-2 text-xs"
                      >
                        <div className="break-words font-medium text-app-text">
                          {delivery.channel} • {delivery.delivery_status}
                        </div>
                        <div className="break-words text-app-text-muted">
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
    </AdminWorkspaceSection>
  );
}
