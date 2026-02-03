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
    <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          title="Back to templates"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <div className="border-l border-gray-200 pl-4">
          <h1 className="font-semibold text-gray-900">{template.name}</h1>
          <button
            onClick={onShowPages}
            className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
          >
            <span>{currentPage.name}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {hasUnsavedChanges ? (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            Unsaved changes
          </span>
        ) : lastSaved ? (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            Saved {formatLastSaved(lastSaved)}
          </span>
        ) : null}

        {/* Undo/Redo buttons */}
        <div className="flex items-center border-l border-gray-200 pl-4 ml-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-colors ${
              canUndo
                ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-colors ${
              canRedo
                ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Center - View mode */}
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onViewModeChange('desktop')}
          className={`p-2 rounded-md transition-colors ${
            viewMode === 'desktop'
              ? 'bg-white shadow text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          title="Desktop view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={() => onViewModeChange('tablet')}
          className={`p-2 rounded-md transition-colors ${
            viewMode === 'tablet'
              ? 'bg-white shadow text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          title="Tablet view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={() => onViewModeChange('mobile')}
          className={`p-2 rounded-md transition-colors ${
            viewMode === 'mobile'
              ? 'bg-white shadow text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          title="Mobile view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={isSaving || !hasUnsavedChanges}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            hasUnsavedChanges
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          ) : (
            'Save'
          )}
        </button>

        <div className="relative group">
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="More options"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* Dropdown menu */}
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden group-hover:block z-50">
            <button
              onClick={onSaveVersion}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Save Version
            </button>
            <button
              onClick={() => window.open(`/website-builder/${template.id}/preview`, '_blank')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview Site
            </button>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={onOpenSettings}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Template Settings
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default EditorHeader;
