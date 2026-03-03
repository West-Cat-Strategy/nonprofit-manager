export interface CaseDetailTab<T extends string = string> {
  key: T;
  label: string;
  count?: number;
}

interface CaseDetailTabsProps<T extends string = string> {
  tabs: CaseDetailTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}

export default function CaseDetailTabs<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
}: CaseDetailTabsProps<T>) {
  return (
    <div className="border-b-2 border-black dark:border-white">
      <nav className="flex gap-0" role="tablist" aria-label="Case details tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              className={`px-4 py-3 font-black uppercase text-sm border-b-4 transition-colors ${
                isActive
                  ? 'border-black dark:border-white text-black dark:text-white bg-[var(--loop-yellow)]'
                  : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-app-surface-muted dark:hover:bg-app-text'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-black text-white dark:bg-app-surface dark:text-black rounded-none">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
