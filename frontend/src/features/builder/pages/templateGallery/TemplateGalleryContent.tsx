import { TemplateCard } from '../../../../components/templates';
import type { TemplateListItem } from '../../../../types/websiteBuilder';
import type { TemplateGalleryTab } from './options';

type TemplateGalleryContentProps = {
  activeTab: TemplateGalleryTab;
  displayedTemplates: TemplateListItem[];
  error: string | null;
  isLoading: boolean;
  onBrowseStarterTemplates: () => void;
  onDeleteTemplate: (template: TemplateListItem) => void;
  onDismissError: () => void;
  onDuplicateTemplate: (template: TemplateListItem) => void | Promise<void>;
  onPageChange: (page: number) => void;
  onPreviewTemplate: (template: TemplateListItem) => void;
  onSelectTemplate: (template: TemplateListItem) => void | Promise<void>;
  pagination: {
    page: number;
    total: number;
    totalPages: number;
  };
};

export default function TemplateGalleryContent({
  activeTab,
  displayedTemplates,
  error,
  isLoading,
  onBrowseStarterTemplates,
  onDeleteTemplate,
  onDismissError,
  onDuplicateTemplate,
  onPageChange,
  onPreviewTemplate,
  onSelectTemplate,
  pagination,
}: TemplateGalleryContentProps) {
  return (
    <>
      {error ? (
        <div className="mx-auto mb-4 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-app-accent-text">
            <span>{error}</span>
            <button
              type="button"
              onClick={onDismissError}
              className="text-app-accent hover:text-app-accent-text"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-app-accent"></div>
          </div>
        ) : displayedTemplates.length === 0 ? (
          <div className="py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-app-text-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-app-text">No templates found</h3>
            <p className="mt-1 text-sm text-app-text-muted">
              {activeTab === 'my-templates'
                ? 'Get started by selecting a starter template.'
                : 'No starter templates available.'}
            </p>
            {activeTab === 'my-templates' ? (
              <button
                type="button"
                onClick={onBrowseStarterTemplates}
                className="mt-4 inline-flex items-center rounded-lg bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
              >
                Browse Starter Templates
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayedTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={(selectedTemplate) => {
                  void onSelectTemplate(selectedTemplate);
                }}
                onPreview={onPreviewTemplate}
                onDuplicate={(selectedTemplate) => {
                  void onDuplicateTemplate(selectedTemplate);
                }}
                onDelete={activeTab === 'my-templates' ? onDeleteTemplate : undefined}
              />
            ))}
          </div>
        )}

        {activeTab === 'my-templates' && pagination.totalPages > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="rounded-lg border border-app-input-border px-3 py-2 text-sm hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-app-text-muted">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="rounded-lg border border-app-input-border px-3 py-2 text-sm hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
