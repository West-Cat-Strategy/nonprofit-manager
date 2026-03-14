import type { PortalSectionProps } from '../../adminSettings/sections/PortalSection';

type PortalPanelProps = Omit<PortalSectionProps, 'visiblePanels'>;

export default function SlotsPanel({
  portalSlotFilters,
  onPortalSlotFilterChange,
  portalSlotsLoading,
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
    <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
        <h3 className="text-lg font-semibold text-app-text-heading">Appointment Slots</h3>
        <p className="text-sm text-app-text-muted mt-1">
          Publish, close, and remove slots for client portal booking.
        </p>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <select
            aria-label="Filter appointment slots by status"
            value={portalSlotFilters.status}
            onChange={(event) => onPortalSlotFilterChange('status', event.target.value)}
            className="px-3 py-2 border border-app-input-border rounded-lg"
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
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <input
            type="text"
            aria-label="Filter appointment slots by pointperson user ID"
            value={portalSlotFilters.pointpersonUserId}
            onChange={(event) =>
              onPortalSlotFilterChange('pointpersonUserId', event.target.value)
            }
            placeholder="Pointperson user ID"
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <input
            type="datetime-local"
            aria-label="Appointment slots from date"
            value={portalSlotFilters.from}
            onChange={(event) => onPortalSlotFilterChange('from', event.target.value)}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <input
            type="datetime-local"
            aria-label="Appointment slots to date"
            value={portalSlotFilters.to}
            onChange={(event) => onPortalSlotFilterChange('to', event.target.value)}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <button
            type="button"
            onClick={onRefreshPortalSlots}
            className="px-4 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
          >
            Refresh Slots
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            aria-label="Slot pointperson user ID"
            placeholder="Pointperson user ID"
            value={portalSlotForm.pointperson_user_id}
            onChange={(event) => onPortalSlotFormChange('pointperson_user_id', event.target.value)}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <input
            type="text"
            aria-label="Slot case ID"
            placeholder="Case ID (optional)"
            value={portalSlotForm.case_id}
            onChange={(event) => onPortalSlotFormChange('case_id', event.target.value)}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <input
            type="text"
            aria-label="Slot title"
            placeholder="Title"
            value={portalSlotForm.title}
            onChange={(event) => onPortalSlotFormChange('title', event.target.value)}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <input
            type="text"
            aria-label="Slot location"
            placeholder="Location"
            value={portalSlotForm.location}
            onChange={(event) => onPortalSlotFormChange('location', event.target.value)}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <input
            type="datetime-local"
            aria-label="Slot start time"
            value={portalSlotForm.start_time}
            onChange={(event) => onPortalSlotFormChange('start_time', event.target.value)}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <input
            type="datetime-local"
            aria-label="Slot end time"
            value={portalSlotForm.end_time}
            onChange={(event) => onPortalSlotFormChange('end_time', event.target.value)}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <input
            type="number"
            aria-label="Slot capacity"
            min={1}
            max={200}
            value={portalSlotForm.capacity}
            onChange={(event) => onPortalSlotFormChange('capacity', Number(event.target.value))}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
          <textarea
            aria-label="Slot details"
            placeholder="Details"
            value={portalSlotForm.details}
            onChange={(event) => onPortalSlotFormChange('details', event.target.value)}
            rows={2}
            className="px-3 py-2 border border-app-input-border rounded-lg"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCreatePortalSlot}
            disabled={portalSlotSaving}
            className="px-4 py-2 text-sm bg-app-accent text-white rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
          >
            {portalSlotSaving ? 'Saving...' : 'Create Slot'}
          </button>
        </div>

        {portalSlotsLoading && portalSlots.length === 0 ? (
          <p className="text-sm text-app-text-muted">Loading slots...</p>
        ) : portalSlots.length === 0 ? (
          <p className="text-sm text-app-text-muted">No slots configured.</p>
        ) : (
          <div className="space-y-2">
            {portalSlots.map((slot) => (
              <div key={slot.id} className="border border-app-border rounded-lg p-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-app-text">{slot.title || 'Appointment slot'}</div>
                    <div className="text-xs text-app-text-muted">
                      {new Date(slot.start_time).toLocaleString()} - {new Date(slot.end_time).toLocaleString()}
                    </div>
                    <div className="text-xs text-app-text-subtle">
                      {slot.case_number ? `${slot.case_number} • ` : ''}Status: {slot.status} • {slot.booked_count}/
                      {slot.capacity} booked
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdatePortalSlotStatus(
                          slot.id,
                          slot.status === 'open' ? 'closed' : 'open'
                        )
                      }
                      className="px-3 py-1.5 text-xs bg-app-surface-muted rounded-lg hover:bg-app-surface-muted"
                    >
                      {slot.status === 'open' ? 'Close' : 'Open'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePortalSlot(slot.id)}
                      className="px-3 py-1.5 text-xs bg-app-accent-soft text-app-accent-text rounded-lg hover:bg-app-accent-soft"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {portalSlotsHasMore && (
          <div>
            <button
              type="button"
              onClick={onLoadMorePortalSlots}
              disabled={portalSlotsLoadingMore}
              className="px-4 py-2 text-sm bg-app-surface-muted rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
            >
              {portalSlotsLoadingMore ? 'Loading...' : 'Load More Slots'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
