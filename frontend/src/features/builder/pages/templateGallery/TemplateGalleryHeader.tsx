import type { TemplateGalleryTab } from './options';

type TemplateGalleryHeaderProps = {
  activeTab: TemplateGalleryTab;
  myTemplatesTotal: number;
  onOpenCreateSite: () => void;
  onOpenNewTemplate: () => void;
  onTabChange: (tab: TemplateGalleryTab) => void;
  starterTemplatesCount: number;
};

export default function TemplateGalleryHeader({
  activeTab,
  myTemplatesTotal,
  onOpenCreateSite,
  onOpenNewTemplate,
  onTabChange,
  starterTemplatesCount,
}: TemplateGalleryHeaderProps) {
  return (
    <>
      <div className="border-b border-app-border bg-app-surface">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-app-text">Website Builder</h1>
              <p className="mt-1 text-sm text-app-text-muted">
                Create and manage your nonprofit&apos;s website
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onOpenCreateSite}
                className="inline-flex items-center rounded-lg border border-app-border bg-app-surface px-4 py-2 text-app-text transition-colors hover:bg-app-surface-muted"
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7h18M7 3v4m10-4v4M5 11h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2zm7 2v6m3-3H9"
                  />
                </svg>
                New Site
              </button>
              <button
                type="button"
                onClick={onOpenNewTemplate}
                className="inline-flex items-center rounded-lg bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover"
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Website
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-app-border bg-app-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              type="button"
              onClick={() => onTabChange('starter-templates')}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'starter-templates'
                  ? 'border-app-accent text-app-accent'
                  : 'border-transparent text-app-text-muted hover:border-app-input-border hover:text-app-text-muted'
              }`}
            >
              Starter Templates
              <span className="ml-2 rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                {starterTemplatesCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('my-templates')}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'my-templates'
                  ? 'border-app-accent text-app-accent'
                  : 'border-transparent text-app-text-muted hover:border-app-input-border hover:text-app-text-muted'
              }`}
            >
              My Templates
              <span className="ml-2 rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                {myTemplatesTotal}
              </span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
