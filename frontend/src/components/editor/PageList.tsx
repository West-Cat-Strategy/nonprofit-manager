/**
 * Page List
 * Modal to select and manage template pages
 */

import React from 'react';
import type { TemplatePage } from '../../types/websiteBuilder';

interface PageListProps {
  pages: TemplatePage[];
  currentPageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onClose: () => void;
}

const PageList: React.FC<PageListProps> = ({
  pages,
  currentPageId,
  onSelectPage,
  onAddPage,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-app-surface rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-app-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-app-text">Pages</h2>
          <button
            onClick={onClose}
            className="p-1 text-app-text-subtle hover:text-app-text-muted rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Page list */}
        <div className="flex-1 overflow-y-auto p-2">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              className={`w-full p-3 text-left rounded-lg mb-1 flex items-center gap-3 transition-colors ${
                page.id === currentPageId
                  ? 'bg-app-accent-soft text-app-accent'
                  : 'hover:bg-app-surface-muted text-app-text-muted'
              }`}
            >
              {/* Page icon */}
              <div
                className={`w-10 h-10 rounded flex items-center justify-center ${
                  page.id === currentPageId
                    ? 'bg-app-accent-soft'
                    : 'bg-app-surface-muted'
                }`}
              >
                {page.isHomepage ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>

              {/* Page info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{page.name}</div>
                <div className="text-sm text-app-text-muted truncate">/{page.slug}</div>
              </div>

              {/* Homepage badge */}
              {page.isHomepage && (
                <span className="text-xs bg-app-accent-soft text-app-accent px-2 py-0.5 rounded">
                  Home
                </span>
              )}

              {/* Selected indicator */}
              {page.id === currentPageId && (
                <svg className="w-5 h-5 text-app-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-app-border">
          <button
            onClick={onAddPage}
            className="w-full py-2 px-4 border-2 border-dashed border-app-input-border rounded-lg text-app-text-muted hover:border-app-accent hover:text-app-accent transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default PageList;
