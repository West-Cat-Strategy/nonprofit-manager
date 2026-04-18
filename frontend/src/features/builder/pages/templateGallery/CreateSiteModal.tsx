import type { TemplateListItem } from '../../../../types/websiteBuilder';
import { templateCategoryOptions, type TemplateGalleryTab } from './options';

type CreateSiteModalProps = {
  createSiteError: string | null;
  isCreatingSite: boolean;
  isLoading: boolean;
  myTemplatesTotal: number;
  newSiteName: string;
  onClose: () => void;
  onCreateSite: () => void | Promise<void>;
  onNewSiteNameChange: (value: string) => void;
  onSelectTemplate: (template: TemplateListItem) => void;
  onSitePickerTabChange: (tab: TemplateGalleryTab) => void;
  open: boolean;
  selectedSiteTemplate: TemplateListItem | null;
  siteCreateDisabled: boolean;
  sitePickerTab: TemplateGalleryTab;
  sitePickerTemplates: TemplateListItem[];
  starterTemplatesCount: number;
};

export default function CreateSiteModal({
  createSiteError,
  isCreatingSite,
  isLoading,
  myTemplatesTotal,
  newSiteName,
  onClose,
  onCreateSite,
  onNewSiteNameChange,
  onSelectTemplate,
  onSitePickerTabChange,
  open,
  selectedSiteTemplate,
  siteCreateDisabled,
  sitePickerTab,
  sitePickerTemplates,
  starterTemplatesCount,
}: CreateSiteModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="app-popup-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-site-title"
        className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-lg bg-app-surface shadow-xl"
      >
        <div className="border-b border-app-border px-6 py-5">
          <h2 id="create-site-title" className="text-xl font-semibold text-app-text">
            Create and Publish Site
          </h2>
          <p className="mt-1 text-sm text-app-text-muted">
            Choose a source template, create the site, publish it live, and continue in the
            website workflow.
          </p>
        </div>

        <div className="max-h-[calc(85vh-10rem)] space-y-5 overflow-y-auto px-6 py-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-app-text">Site name</span>
            <input
              type="text"
              aria-label="Site name"
              value={newSiteName}
              onChange={(event) => onNewSiteNameChange(event.target.value)}
              placeholder="Community Support Hub"
              className="w-full rounded-lg border border-app-input-border px-4 py-3 focus:border-app-accent focus:ring-2 focus:ring-app-accent"
            />
          </label>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-app-text">Source template</h3>
                <p className="mt-1 text-sm text-app-text-muted">
                  Starter templates are copied first so your new site has its own editable
                  template.
                </p>
              </div>
              {selectedSiteTemplate ? (
                <span className="rounded-full bg-app-surface-muted px-3 py-1 text-xs font-medium text-app-text-muted">
                  Selected: {selectedSiteTemplate.name}
                </span>
              ) : null}
            </div>

            <nav className="mt-4 flex space-x-6 border-b border-app-border" aria-label="Template picker tabs">
              <button
                type="button"
                onClick={() => onSitePickerTabChange('starter-templates')}
                className={`border-b-2 pb-3 text-sm font-medium ${
                  sitePickerTab === 'starter-templates'
                    ? 'border-app-accent text-app-accent'
                    : 'border-transparent text-app-text-muted hover:border-app-input-border hover:text-app-text'
                }`}
              >
                Starter Templates
                <span className="ml-2 rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                  {starterTemplatesCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSitePickerTabChange('my-templates')}
                className={`border-b-2 pb-3 text-sm font-medium ${
                  sitePickerTab === 'my-templates'
                    ? 'border-app-accent text-app-accent'
                    : 'border-transparent text-app-text-muted hover:border-app-input-border hover:text-app-text'
                }`}
              >
                My Templates
                <span className="ml-2 rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                  {myTemplatesTotal}
                </span>
              </button>
            </nav>

            <div className="mt-4 min-h-56">
              {isLoading && sitePickerTemplates.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-app-accent"></div>
                </div>
              ) : sitePickerTemplates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-app-border p-6 text-center">
                  <h4 className="text-sm font-medium text-app-text">No templates available</h4>
                  <p className="mt-2 text-sm text-app-text-muted">
                    {sitePickerTab === 'starter-templates'
                      ? 'No starter templates are available right now.'
                      : 'Create or duplicate a template first, then come back to create a site from it.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {sitePickerTemplates.map((template) => {
                    const selected = selectedSiteTemplate?.id === template.id;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        aria-label={`Select template ${template.name}`}
                        aria-pressed={selected}
                        onClick={() => onSelectTemplate(template)}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          selected
                            ? 'border-app-accent bg-app-accent-soft'
                            : 'border-app-border bg-app-surface hover:border-app-accent hover:bg-app-surface-muted'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-app-text">{template.name}</div>
                            <div className="mt-1 line-clamp-2 text-sm text-app-text-muted">
                              {template.description || 'No description'}
                            </div>
                          </div>
                          {template.isSystemTemplate ? (
                            <span className="rounded-full bg-app-accent px-2 py-1 text-xs font-medium text-white">
                              Starter
                            </span>
                          ) : (
                            <span className="rounded-full bg-app-surface-muted px-2 py-1 text-xs font-medium capitalize text-app-text-muted">
                              {template.status}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-app-text-muted">
                          <span className="rounded-full bg-app-surface-muted px-2 py-1">
                            {templateCategoryOptions.find(
                              (categoryOption) => categoryOption.value === template.category
                            )?.label || template.category}
                          </span>
                          <span>
                            {template.pageCount} {template.pageCount === 1 ? 'page' : 'pages'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {createSiteError ? (
            <div className="rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
              {createSiteError}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-app-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreatingSite}
            className="rounded-lg border border-app-input-border px-4 py-2 text-app-text-muted hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void onCreateSite();
            }}
            disabled={siteCreateDisabled}
            className="inline-flex items-center justify-center rounded-lg bg-app-accent px-4 py-2 font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreatingSite ? 'Creating Site...' : 'Create and Publish Site'}
          </button>
        </div>
      </div>
    </div>
  );
}
