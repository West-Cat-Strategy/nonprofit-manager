import React from 'react';
import type { PageCollectionType, TemplatePageType } from '../../../types/websiteBuilder';
import { collectionOptions, pageTypeOptions } from './options';
import type { PagePropertyEditorProps } from './types';

const PagePropertyEditor: React.FC<PagePropertyEditorProps> = ({ currentPage, onUpdatePage }) => (
  <div className="w-72 overflow-y-auto border-l border-app-border bg-app-surface">
    <div className="border-b border-app-border p-4">
      <h3 className="font-semibold text-app-text">Page Settings</h3>
      <p className="text-xs text-app-text-muted">{currentPage.name}</p>
    </div>

    <div key={currentPage.id} className="space-y-4 p-4">
      <div>
        <label htmlFor="page-property-name" className="mb-1 block text-sm font-medium text-app-text-muted">Page Name</label>
        <input
          id="page-property-name"
          type="text"
          defaultValue={currentPage.name}
          onBlur={(e) => onUpdatePage({ name: e.target.value })}
          className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="page-property-slug" className="mb-1 block text-sm font-medium text-app-text-muted">Slug</label>
        <input
          id="page-property-slug"
          type="text"
          defaultValue={currentPage.slug}
          onBlur={(e) => onUpdatePage({ slug: e.target.value })}
          className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="page-property-type" className="mb-1 block text-sm font-medium text-app-text-muted">Page Type</label>
        <select
          id="page-property-type"
          value={currentPage.pageType || 'static'}
          onChange={(e) => {
            const pageType = e.target.value as TemplatePageType;
            onUpdatePage({
              pageType,
              collection: pageType === 'static' ? undefined : currentPage.collection || 'events',
              isHomepage: pageType === 'static' ? currentPage.isHomepage : false,
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

      {currentPage.pageType !== 'static' ? (
        <div>
          <label htmlFor="page-property-collection" className="mb-1 block text-sm font-medium text-app-text-muted">Collection</label>
          <select
            id="page-property-collection"
            value={currentPage.collection || 'events'}
            onChange={(e) => onUpdatePage({ collection: e.target.value as PageCollectionType })}
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
        <label htmlFor="page-property-route-pattern" className="mb-1 block text-sm font-medium text-app-text-muted">Route Pattern</label>
        <input
          id="page-property-route-pattern"
          type="text"
          defaultValue={currentPage.routePattern || ''}
          onBlur={(e) => onUpdatePage({ routePattern: e.target.value })}
          className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
          placeholder={currentPage.pageType === 'static' ? '/about' : '/events/:slug'}
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={currentPage.isHomepage}
            disabled={currentPage.pageType !== 'static'}
            onChange={(e) => onUpdatePage({ isHomepage: e.target.checked })}
            className="rounded border-app-input-border"
          />
          Set as homepage
        </label>
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface-muted p-3 text-xs text-app-text-muted">
        Collection pages reuse the builder layout and render live events or newsletters at publish
        time.
      </div>
    </div>
  </div>
);

export default PagePropertyEditor;
