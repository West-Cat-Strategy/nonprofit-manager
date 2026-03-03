interface CaseListFilterChip {
  key: string;
  label: string;
}

interface CaseListFiltersBarProps {
  chips: CaseListFilterChip[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

export default function CaseListFiltersBar({
  chips,
  onRemove,
  onClearAll,
}: CaseListFiltersBarProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-black uppercase text-black/70">Active filters</span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemove(chip.key)}
          className="inline-flex items-center gap-2 border-2 border-black bg-[var(--loop-yellow)] px-2 py-1 text-xs font-black uppercase"
          aria-label={`Remove filter ${chip.label}`}
          title="Remove filter"
        >
          <span>{chip.label}</span>
          <span aria-hidden="true">×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-black uppercase text-black/70 underline"
      >
        Clear all
      </button>
    </div>
  );
}
