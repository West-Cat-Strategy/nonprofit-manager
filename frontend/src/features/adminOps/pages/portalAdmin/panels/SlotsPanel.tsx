import {
  AdminActionGroup,
  AdminFilterToolbar,
  AdminStatusPill,
  AdminWorkspaceSection,
  adminControlClassName,
  adminPrimaryButtonClassName,
  adminSubtleButtonClassName,
} from '../../../components/AdminWorkspacePrimitives';
import LoadFailureNotice from './LoadFailureNotice';
import type { PortalPanelProps } from '../panelTypes';

export default function SlotsPanel({
  portalSlotFilters,
  onPortalSlotFilterChange,
  portalSlotsLoading,
  portalSlotsError,
  portalSlotsLoadingMore,
  portalSlotsHasMore,
  portalSlots,
  portalSlotSaving,
  portalSlotForm,
  onPortalSlotFormChange,
  onCreatePortalSlot,
  onRefreshPortalSlots,
  onLoadMorePortalSlots,
  onUpdatePortalSlotStatus,
  onDeletePortalSlot,
}: PortalPanelProps) {
  return (
    <AdminWorkspaceSection
      title="Appointment Slots"
      description="Publish, close, and remove slots for client portal booking."
    >
      <AdminFilterToolbar>
        <select
          aria-label="Filter appointment slots by status"
          value={portalSlotFilters.status}
          onChange={(event) => onPortalSlotFilterChange('status', event.target.value)}
          className={adminControlClassName}
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="text"
          aria-label="Filter appointment slots by case ID"
          value={portalSlotFilters.caseId}
          onChange={(event) => onPortalSlotFilterChange('caseId', event.target.value)}
          placeholder="Case ID"
          className={adminControlClassName}
        />
        <input
          type="text"
          aria-label="Filter appointment slots by pointperson user ID"
          value={portalSlotFilters.pointpersonUserId}
          onChange={(event) => onPortalSlotFilterChange('pointpersonUserId', event.target.value)}
          placeholder="Pointperson user ID"
          className={adminControlClassName}
        />
        <input
          type="datetime-local"
          aria-label="Appointment slots from date"
          value={portalSlotFilters.from}
          onChange={(event) => onPortalSlotFilterChange('from', event.target.value)}
          className={adminControlClassName}
        />
        <input
          type="datetime-local"
          aria-label="Appointment slots to date"
          value={portalSlotFilters.to}
          onChange={(event) => onPortalSlotFilterChange('to', event.target.value)}
          className={adminControlClassName}
        />
        <button type="button" onClick={onRefreshPortalSlots} className={adminSubtleButtonClassName}>
          Refresh Slots
        </button>
      </AdminFilterToolbar>
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        <input
          type="text"
          aria-label="Slot pointperson user ID"
          placeholder="Pointperson user ID"
          value={portalSlotForm.pointperson_user_id}
          onChange={(event) => onPortalSlotFormChange('pointperson_user_id', event.target.value)}
          className={adminControlClassName}
        />
        <input
          type="text"
          aria-label="Slot case ID"
          placeholder="Case ID (optional)"
          value={portalSlotForm.case_id}
          onChange={(event) => onPortalSlotFormChange('case_id', event.target.value)}
          className={adminControlClassName}
        />
        <input
          type="text"
          aria-label="Slot title"
          placeholder="Title"
          value={portalSlotForm.title}
          onChange={(event) => onPortalSlotFormChange('title', event.target.value)}
          className={adminControlClassName}
        />
        <input
          type="text"
          aria-label="Slot location"
          placeholder="Location"
          value={portalSlotForm.location}
          onChange={(event) => onPortalSlotFormChange('location', event.target.value)}
          className={adminControlClassName}
        />
        <input
          type="datetime-local"
          aria-label="Slot start time"
          value={portalSlotForm.start_time}
          onChange={(event) => onPortalSlotFormChange('start_time', event.target.value)}
          className={adminControlClassName}
        />
        <input
          type="datetime-local"
          aria-label="Slot end time"
          value={portalSlotForm.end_time}
          onChange={(event) => onPortalSlotFormChange('end_time', event.target.value)}
          className={adminControlClassName}
        />
        <input
          type="number"
          aria-label="Slot capacity"
          min={1}
          max={200}
          value={portalSlotForm.capacity}
          onChange={(event) => onPortalSlotFormChange('capacity', Number(event.target.value))}
          className={adminControlClassName}
        />
        <textarea
          aria-label="Slot details"
          placeholder="Details"
          value={portalSlotForm.details}
          onChange={(event) => onPortalSlotFormChange('details', event.target.value)}
          rows={2}
          className={adminControlClassName}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={onCreatePortalSlot}
          disabled={portalSlotSaving}
          className={adminPrimaryButtonClassName}
        >
          {portalSlotSaving ? 'Saving...' : 'Create Slot'}
        </button>
      </div>

      {portalSlotsError ? (
        <LoadFailureNotice
          title={portalSlots.length ? 'Partial load' : 'Load failed'}
          message={portalSlotsError}
        />
      ) : null}

      {portalSlotsLoading && portalSlots.length === 0 ? (
        <p className="text-sm text-app-text-muted">Loading slots...</p>
      ) : portalSlots.length === 0 && !portalSlotsError ? (
        <p className="text-sm text-app-text-muted">No slots configured.</p>
      ) : portalSlots.length > 0 ? (
        <div className="space-y-2">
          {portalSlots.map((slot) => (
            <div key={slot.id} className="min-w-0 rounded-lg border border-app-border p-3">
              <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="break-words text-sm font-medium text-app-text">
                    {slot.title || 'Appointment slot'}
                  </div>
                  <div className="break-words text-xs text-app-text-muted">
                    {new Date(slot.start_time).toLocaleString()} -{' '}
                    {new Date(slot.end_time).toLocaleString()}
                  </div>
                  <div className="break-words text-xs text-app-text-subtle">
                    {slot.case_number ? `${slot.case_number} • ` : ''}
                    {slot.booked_count}/{slot.capacity} booked
                  </div>
                  <div className="mt-2">
                    <AdminStatusPill tone={slot.status === 'open' ? 'success' : 'neutral'}>
                      {slot.status}
                    </AdminStatusPill>
                  </div>
                </div>
                <AdminActionGroup>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePortalSlotStatus(slot.id, slot.status === 'open' ? 'closed' : 'open')
                    }
                    className={adminSubtleButtonClassName}
                  >
                    {slot.status === 'open' ? 'Close' : 'Open'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePortalSlot(slot.id)}
                    className={adminSubtleButtonClassName}
                  >
                    Delete
                  </button>
                </AdminActionGroup>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {portalSlotsHasMore && (
        <div>
          <button
            type="button"
            onClick={onLoadMorePortalSlots}
            disabled={portalSlotsLoadingMore}
            className={adminSubtleButtonClassName}
          >
            {portalSlotsLoadingMore ? 'Loading...' : 'Load More Slots'}
          </button>
        </div>
      )}
    </AdminWorkspaceSection>
  );
}
