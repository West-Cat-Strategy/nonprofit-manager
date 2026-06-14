import { useRef, type KeyboardEvent } from 'react';

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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const moveToTab = (index: number) => {
    const nextTab = tabs[index];
    if (!nextTab) {
      return;
    }

    onTabChange(nextTab.key);
    window.setTimeout(() => {
      tabRefs.current[index]?.focus();
    }, 0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (tabs.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        moveToTab((index + 1) % tabs.length);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        moveToTab((index - 1 + tabs.length) % tabs.length);
        break;
      case 'Home':
        event.preventDefault();
        moveToTab(0);
        break;
      case 'End':
        event.preventDefault();
        moveToTab(tabs.length - 1);
        break;
    }
  };

  return (
    <div className="border-b-2 border-black dark:border-white">
      <nav className="flex gap-0" role="tablist" aria-label="Case details tabs">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`tab-${tab.key}`}
              onClick={() => onTabChange(tab.key)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
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
