/**
 * Editor Header
 * Top navigation bar for the page editor
 */

import React from 'react';
import type { Template, TemplatePage } from '../../types/websiteBuilder';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

interface EditorHeaderProps {
  template: Template;
  currentPage: TemplatePage;
  viewMode: ViewMode;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onSave: () => void;
  onSaveVersion: () => void;
  onBack: () => void;
  onShowPages: () => void;
  onOpenSettings: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  lastSaved?: Date | null;
  backLabel?: string;
  contextLabel?: string;
  statusLabel?: string;
  previewHref?: string;
  publishingHref?: string;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  template,
  currentPage,
  viewMode,
  isSaving,
  hasUnsavedChanges,
  onViewModeChange,
  onSave,
  onSaveVersion,
  onBack,
  onShowPages,
  onOpenSettings,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  lastSaved,
  backLabel = 'Back',
  contextLabel,
  statusLabel,
  previewHref,
  publishingHref,
}) => {
  // Format last saved time
  const formatLastSaved = (date: Date | null | undefined) => {
    if (!date) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString();
  };
  return (
    <header className="sticky top-0 z-40 border-b border-app-border bg-app-surface/95 backdrop-blur supports-[backdrop-filter]:bg-app-surface/90">
      <div className="mx-auto grid max-w-[100vw] gap-4 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-app-border bg-app-surface p-2 text-app-text-muted transition-colors hover:bg-app-surface-muted hover:text-app-text"
              title={backLabel}
              aria-label={backLabel}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-app-text">{template.name}</h1>
              <button
                type="button"
                onClick={onShowPages}
                className="mt-0.5 flex items-center gap-1 text-sm text-app-text-muted transition-colors hover:text-app-accent"
                aria-haspopup="dialog"
              >
                <span className="truncate">{currentPage.name}</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>

            {contextLabel ? (
              <span className="inline-flex items-center rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-medium text-app-text-muted">
                {contextLabel}
              </span>
            ) : null}

            {statusLabel ? (
              <span className="inline-flex items-center rounded-full bg-app-accent-soft px-3 py-1 text-xs font-medium text-app-accent-text">
                {statusLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hasUnsavedChanges ? (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                Unsaved changes
              </span>
            ) : lastSaved ? (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                Saved {formatLastSaved(lastSaved)}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-medium text-app-text-muted">
                All changes saved
              </span>
            )}

            <span className="inline-flex items-center rounded-full border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-medium text-app-text-muted">
              {template.status}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-start">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full border border-app-border bg-app-surface-muted p-1">
              <button
                type="button"
                onClick={onUndo}
                disabled={!onUndo || !canUndo}
                className={`rounded-full px-3 py-2 text-sm transition-colors ${
                  onUndo && canUndo
                    ? 'text-app-text-muted hover:bg-app-surface hover:text-app-text'
                    : 'cursor-not-allowed text-app-text-subtle'
                }`}
                title="Undo"
                aria-label="Undo"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v6h6M3 13c2.5-3.5 5.5-5 9-5 4.97 0 9 4.03 9 9"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!onRedo || !canRedo}
                className={`rounded-full px-3 py-2 text-sm transition-colors ${
                  onRedo && canRedo
                    ? 'text-app-text-muted hover:bg-app-surface hover:text-app-text'
                    : 'cursor-not-allowed text-app-text-subtle'
                }`}
                title="Redo"
                aria-label="Redo"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 7v6h-6M21 13c-2.5-3.5-5.5-5-9-5-4.97 0-9 4.03-9 9"
                  />
                </svg>
              </button>
            </div>

            <div className="flex items-center rounded-full border border-app-border bg-app-surface-muted p-1">
            <button
              type="button"
              onClick={() => onViewModeChange('desktop')}
              className={`rounded-full px-3 py-2 text-sm transition-colors ${
                viewMode === 'desktop'
                  ? 'bg-app-surface text-app-accent shadow-sm'
                  : 'text-app-text-muted hover:text-app-text'
              }`}
              title="Desktop view"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('tablet')}
              className={`rounded-full px-3 py-2 text-sm transition-colors ${
                viewMode === 'tablet'
                  ? 'bg-app-surface text-app-accent shadow-sm'
                  : 'text-app-text-muted hover:text-app-text'
              }`}
              title="Tablet view"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('mobile')}
              className={`rounded-full px-3 py-2 text-sm transition-colors ${
                viewMode === 'mobile'
                  ? 'bg-app-surface text-app-accent shadow-sm'
                  : 'text-app-text-muted hover:text-app-text'
              }`}
              title="Mobile view"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
          {previewHref ? (
            <a
              href={previewHref}
              className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
            >
              Preview
            </a>
          ) : null}

          {publishingHref ? (
            <a
              href={publishingHref}
              className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
            >
              Publishing
            </a>
          ) : null}

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              hasUnsavedChanges
                ? 'bg-app-accent text-white hover:bg-app-accent-hover'
                : 'cursor-not-allowed border border-app-border bg-app-surface-muted text-app-text-subtle'
            }`}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving
              </span>
            ) : (
              'Save'
            )}
          </button>

          <div className="group relative">
            <button
              type="button"
              className="rounded-full border border-app-border bg-app-surface p-2 text-app-text-muted transition-colors hover:bg-app-surface-muted hover:text-app-text"
              title="More options"
              aria-label="More options"
              aria-haspopup="menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>

            <div className="menu-surface-opaque absolute right-0 z-50 mt-2 hidden w-56 rounded-2xl border border-app-border py-1 shadow-lg group-hover:block group-focus-within:block">
              <button
                type="button"
                onClick={onSaveVersion}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-app-text-muted transition-colors hover:bg-app-surface-muted"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Save version
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-app-text-muted transition-colors hover:bg-app-surface-muted"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Template settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default EditorHeader;
