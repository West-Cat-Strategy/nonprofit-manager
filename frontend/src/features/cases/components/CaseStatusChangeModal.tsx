import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import type { CaseStatus } from '../../../types/case';
import type { OutcomeDefinition } from '../../../types/outcomes';

interface CaseStatusChangeModalProps {
  open: boolean;
  loading: boolean;
  caseStatuses: CaseStatus[];
  newStatusId: string;
  notes: string;
  outcomeDefinitionIds: string[];
  outcomeVisibility: boolean;
  requiresOutcome: boolean;
  outcomeDefinitions: OutcomeDefinition[];
  onNewStatusIdChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onOutcomeDefinitionIdsChange: (value: string[]) => void;
  onOutcomeVisibilityChange: (value: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function CaseStatusChangeModal({
  open,
  loading,
  caseStatuses,
  newStatusId,
  notes,
  outcomeDefinitionIds,
  outcomeVisibility,
  requiresOutcome,
  outcomeDefinitions,
  onNewStatusIdChange,
  onNotesChange,
  onOutcomeDefinitionIdsChange,
  onOutcomeVisibilityChange,
  onCancel,
  onSubmit,
}: CaseStatusChangeModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <BrutalCard color="white" className="mx-4 w-full max-w-md p-6">
        <h3 id="status-modal-title" className="mb-4 text-lg font-black uppercase text-black">
          Change Case Status
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-black uppercase text-black/70">New Status</label>
            <select
              value={newStatusId}
              onChange={(event) => onNewStatusIdChange(event.target.value)}
              className="w-full border-2 border-black bg-app-surface px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-black"
              aria-label="Select new status"
            >
              <option value="">Select new status...</option>
              {caseStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-black uppercase text-black/70">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={3}
              placeholder="Reason for status change..."
              className="w-full border-2 border-black bg-app-surface px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          {requiresOutcome && (
            <div className="space-y-3 border-2 border-black bg-app-surface-muted p-3">
              <div>
                <div className="mb-2 text-sm font-black uppercase text-black/70">Outcomes</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {outcomeDefinitions.map((definition) => {
                    const checked = outcomeDefinitionIds.includes(definition.id);
                    return (
                      <label
                        key={definition.id}
                        className="flex items-start gap-2 border-2 border-black bg-app-surface px-3 py-2 text-sm font-semibold text-black"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            onOutcomeDefinitionIdsChange(
                              event.target.checked
                                ? [...outcomeDefinitionIds, definition.id]
                                : outcomeDefinitionIds.filter((id) => id !== definition.id)
                            )
                          }
                          className="mt-0.5"
                        />
                        <span>{definition.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-black/70">
                <input
                  type="checkbox"
                  checked={outcomeVisibility}
                  onChange={(event) => onOutcomeVisibilityChange(event.target.checked)}
                  className="h-4 w-4 border-2 border-black accent-black"
                />
                Visible to client
              </label>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <BrutalButton onClick={onCancel} variant="secondary">
              Cancel
            </BrutalButton>
            <BrutalButton
              onClick={onSubmit}
              disabled={!newStatusId || !notes.trim() || (requiresOutcome && outcomeDefinitionIds.length === 0) || loading}
              variant="primary"
            >
              {loading ? 'Updating...' : 'Update Status'}
            </BrutalButton>
          </div>
        </div>
      </BrutalCard>
    </div>
  );
}
