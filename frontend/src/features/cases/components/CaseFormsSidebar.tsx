import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import type { CaseFormAssignment, CaseFormDefault } from '../../../types/caseForms';

interface CaseFormsSidebarProps {
  assignments: CaseFormAssignment[];
  creating: boolean;
  recommendedDefaults: CaseFormDefault[];
  selectedAssignmentId: string | null;
  onCreateBlankForm: () => void;
  onInstantiateDefault: (formDefault: CaseFormDefault) => void;
  onSelectAssignment: (assignmentId: string) => void;
}

export function CaseFormsSidebar({
  assignments,
  creating,
  recommendedDefaults,
  selectedAssignmentId,
  onCreateBlankForm,
  onInstantiateDefault,
  onSelectAssignment,
}: CaseFormsSidebarProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1.35fr]">
      <BrutalCard color="white" className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase">Recommended Defaults</h3>
            <p className="text-sm text-black/70">
              Start from the active defaults attached to this case’s selected types.
            </p>
          </div>
          <BrutalButton onClick={onCreateBlankForm} disabled={creating} size="sm">
            {creating ? 'Creating…' : '+ Blank Form'}
          </BrutalButton>
        </div>

        <div className="space-y-3">
          {recommendedDefaults.length === 0 && (
            <div className="rounded border-2 border-dashed border-black p-4 text-sm font-semibold text-black/65">
              No active case-type defaults are recommended for this case yet.
            </div>
          )}
          {recommendedDefaults.map((formDefault) => (
            <div key={formDefault.id} className="rounded border-2 border-black bg-[var(--loop-yellow)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase">{formDefault.title}</p>
                  {formDefault.description && (
                    <p className="mt-1 text-sm text-black/70">{formDefault.description}</p>
                  )}
                  <p className="mt-2 text-xs font-semibold uppercase text-black/60">
                    v{formDefault.version} • {formDefault.schema.sections.length} sections
                  </p>
                </div>
                <BrutalButton
                  size="sm"
                  variant="secondary"
                  onClick={() => onInstantiateDefault(formDefault)}
                >
                  Add to Case
                </BrutalButton>
              </div>
            </div>
          ))}
        </div>
      </BrutalCard>

      <BrutalCard color="white" className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase">Case Forms Queue</h3>
            <p className="text-sm text-black/70">
              Every instantiated form becomes an editable case-owned copy with its own draft and submission history.
            </p>
          </div>
          <span className="rounded border-2 border-black bg-[var(--loop-cyan)] px-3 py-1 text-xs font-black uppercase">
            {assignments.length} total
          </span>
        </div>

        <div className="space-y-3">
          {assignments.length === 0 && (
            <div className="rounded border-2 border-dashed border-black p-4 text-sm font-semibold text-black/65">
              No form assignments exist for this case yet. Add a recommended default or start a blank form.
            </div>
          )}
          {assignments.map((assignment) => (
            <button
              key={assignment.id}
              type="button"
              onClick={() => onSelectAssignment(assignment.id)}
              className={`w-full rounded border-2 p-4 text-left transition ${
                selectedAssignmentId === assignment.id
                  ? 'border-black bg-[var(--loop-green)]'
                  : 'border-black bg-white hover:bg-[var(--loop-yellow)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase">{assignment.title}</p>
                  {assignment.description && (
                    <p className="mt-1 text-sm text-black/70">{assignment.description}</p>
                  )}
                </div>
                <span className="rounded border border-black px-2 py-1 text-[11px] font-black uppercase">
                  {assignment.status.replace('_', ' ')}
                </span>
              </div>
            </button>
          ))}
        </div>
      </BrutalCard>
    </div>
  );
}
