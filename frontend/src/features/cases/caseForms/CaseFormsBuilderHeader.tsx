import type { CaseFormAssignmentStatus } from '../../../types/caseForms';

interface CaseFormsBuilderHeaderProps {
  assignmentStatus: CaseFormAssignmentStatus;
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export function CaseFormsBuilderHeader({
  assignmentStatus,
  autosaveStatus,
}: CaseFormsBuilderHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-lg font-black uppercase">Builder</h3>
        <p className="text-sm text-black/70">
          Edit the case-owned form copy without mutating the original default.
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <span className="rounded border-2 border-black px-3 py-1 text-xs font-black uppercase">
          {assignmentStatus.replace('_', ' ')}
        </span>
        <span className="rounded border-2 border-black bg-app-surface px-3 py-1 text-xs font-black uppercase">
          {autosaveStatus === 'saving'
            ? 'Autosaving'
            : autosaveStatus === 'saved'
              ? 'Saved'
              : autosaveStatus === 'error'
                ? 'Autosave Error'
                : 'Ready'}
        </span>
      </div>
    </div>
  );
}
