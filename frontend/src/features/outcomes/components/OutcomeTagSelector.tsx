import type { OutcomeDefinition } from '../../../types/outcomes';

interface OutcomeTagSelectorProps {
  outcomeDefinitions: OutcomeDefinition[];
  selectedOutcomeDefinitionIds: string[];
  onToggle: (outcomeDefinitionId: string) => void;
  label?: string;
  helperText?: string;
  emptyMessage?: string;
}

export default function OutcomeTagSelector({
  outcomeDefinitions,
  selectedOutcomeDefinitionIds,
  onToggle,
  label = 'Discussed Outcomes',
  helperText = 'Select the outcomes discussed during this interaction.',
  emptyMessage = 'No active outcome definitions available.',
}: OutcomeTagSelectorProps) {
  if (outcomeDefinitions.length === 0) {
    return <p className="text-xs text-app-text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-app-text-label mb-1">{label}</label>
        <p className="text-xs text-app-text-muted">{helperText}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {outcomeDefinitions.map((definition) => {
          const checked = selectedOutcomeDefinitionIds.includes(definition.id);
          return (
            <label
              key={definition.id}
              className="inline-flex cursor-pointer items-start gap-2 rounded border border-app-input-border px-2 py-1 text-xs"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(definition.id)}
                className="mt-0.5 rounded border-app-input-border"
              />
              <span>
                <span className="block text-app-text">{definition.name}</span>
                <span className="block text-app-text-muted">{definition.key}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
