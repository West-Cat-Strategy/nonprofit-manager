import React, { useEffect, useState } from 'react';
import { collectionOptions, pageTypeOptions } from './options';
import type { PagePropertyEditorProps, PageSettingsDraft } from './types';

const buildDraft = (currentPage: PagePropertyEditorProps['currentPage']): PageSettingsDraft => ({
  name: currentPage.name,
  slug: currentPage.slug,
  pageType: currentPage.pageType || 'static',
  collection: currentPage.collection || undefined,
  routePattern: currentPage.routePattern || '',
  isHomepage: currentPage.isHomepage,
});

const PagePropertyEditor: React.FC<PagePropertyEditorProps> = ({
  currentPage,
  onUpdatePage,
  previewHref,
  onPublishPage,
  canPublish = true,
  isPublishing = false,
}) => {
  const [draft, setDraft] = useState<PageSettingsDraft>(() => buildDraft(currentPage));

  useEffect(() => {
    setDraft(buildDraft(currentPage));
  }, [currentPage]);

  const persistDraft = () => {
    void onUpdatePage({
      name: draft.name,
      slug: draft.slug,
      pageType: draft.pageType,
      collection: draft.pageType === 'static' ? undefined : draft.collection || 'events',
      routePattern: draft.routePattern,
      isHomepage: draft.pageType === 'static' ? draft.isHomepage : false,
    });
  };

  const previewTarget = previewHref || null;

  const handlePublish = () => {
    if (!onPublishPage || !canPublish || isPublishing) return;
    void onPublishPage({
      ...draft,
      collection: draft.pageType === 'static' ? undefined : draft.collection || 'events',
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-sm">
      <div className="border-b border-app-border px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-app-text">Page Settings</h3>
            <p className="mt-1 text-xs text-app-text-muted">{currentPage.name}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePublish}
              disabled={!onPublishPage || !canPublish || isPublishing}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                !onPublishPage || !canPublish || isPublishing
                  ? 'cursor-not-allowed border border-app-border bg-app-surface-muted text-app-text-subtle'
                  : 'bg-app-accent text-[var(--app-accent-foreground)] hover:bg-app-accent-hover'
              }`}
            >
              {isPublishing ? 'Publishing…' : 'Publish'}
            </button>

            {previewTarget ? (
              <a
                href={previewTarget}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
              >
                Preview
              </a>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="cursor-not-allowed rounded-full border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-medium text-app-text-subtle"
              >
                Preview
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-app-text-muted">
          Publish updates the live site. Preview opens the currently available review target.
        </p>
      </div>

      <div key={currentPage.id} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <label htmlFor="page-property-name" className="mb-1 block text-sm font-medium text-app-text-muted">
            Page Name
          </label>
          <input
            id="page-property-name"
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            onBlur={persistDraft}
            className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="page-property-slug" className="mb-1 block text-sm font-medium text-app-text-muted">
            Slug
          </label>
          <input
            id="page-property-slug"
            type="text"
            value={draft.slug}
            onChange={(e) => setDraft((prev) => ({ ...prev, slug: e.target.value }))}
            onBlur={persistDraft}
            className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="page-property-type" className="mb-1 block text-sm font-medium text-app-text-muted">
            Page Type
          </label>
          <select
            id="page-property-type"
            value={draft.pageType}
            onChange={(e) => {
              const pageType = e.target.value as PageSettingsDraft['pageType'];
              setDraft((prev) => ({
                ...prev,
                pageType,
                collection: pageType === 'static' ? undefined : prev.collection || 'events',
                isHomepage: pageType === 'static' ? prev.isHomepage : false,
              }));
              void onUpdatePage({
                pageType,
                collection: pageType === 'static' ? undefined : draft.collection || 'events',
                isHomepage: pageType === 'static' ? draft.isHomepage : false,
              });
            }}
            className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
          >
            {pageTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {draft.pageType !== 'static' ? (
          <div>
            <label
              htmlFor="page-property-collection"
              className="mb-1 block text-sm font-medium text-app-text-muted"
            >
              Collection
            </label>
            <select
              id="page-property-collection"
              value={draft.collection || 'events'}
              onChange={(e) => {
                const collection = e.target.value as PageSettingsDraft['collection'];
                setDraft((prev) => ({ ...prev, collection }));
                void onUpdatePage({ collection });
              }}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            >
              {collectionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="page-property-route-pattern"
            className="mb-1 block text-sm font-medium text-app-text-muted"
          >
            Route Pattern
          </label>
          <input
            id="page-property-route-pattern"
            type="text"
            value={draft.routePattern}
            onChange={(e) => setDraft((prev) => ({ ...prev, routePattern: e.target.value }))}
            onBlur={persistDraft}
            className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            placeholder={draft.pageType === 'static' ? '/about' : '/events/:slug'}
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isHomepage}
              disabled={draft.pageType !== 'static'}
              onChange={(e) => {
                const isHomepage = e.target.checked;
                setDraft((prev) => ({ ...prev, isHomepage }));
                void onUpdatePage({ isHomepage });
              }}
              className="rounded border-app-input-border"
            />
            Set as homepage
          </label>
        </div>

        <div className="rounded-2xl border border-app-border bg-app-surface-muted p-3 text-xs text-app-text-muted">
          Collection pages reuse the builder layout and render live events or newsletters at publish
          time.
        </div>
      </div>
    </div>
  );
};

export default PagePropertyEditor;
