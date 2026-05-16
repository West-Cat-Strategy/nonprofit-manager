import type { CaseFormAuthoringDiagnostic } from './caseFormsPanelUtils';

interface CaseFormsBuilderDiagnosticsProps {
  diagnostics: CaseFormAuthoringDiagnostic[];
}

export function CaseFormsBuilderDiagnostics({ diagnostics }: CaseFormsBuilderDiagnosticsProps) {
  return (
    <div className="rounded border-2 border-black bg-app-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-black uppercase">Authoring diagnostics</h4>
          <p className="text-xs font-bold text-black/70">
            {diagnostics.length === 0
              ? 'No authoring warnings found.'
              : `${diagnostics.length} warning${diagnostics.length === 1 ? '' : 's'} found before save.`}
          </p>
        </div>
        <span className="rounded border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase">
          {diagnostics.length === 0 ? 'Clear' : 'Review'}
        </span>
      </div>
      {diagnostics.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm font-bold text-black/80">
          {diagnostics.map((diagnostic) => (
            <li key={diagnostic.id} className="rounded border-2 border-black bg-white px-3 py-2">
              {diagnostic.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
