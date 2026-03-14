/**
 * MODULE-OWNERSHIP: builder page support
 *
 * Shared template-settings dialog used by the feature-owned page editor.
 */

import React from 'react';
import type { TemplateStatus } from '../../../types/websiteBuilder';
import type { TemplateSettingsDraft } from './templateSettingsDraft';

interface TemplateSettingsDialogProps {
  error: string | null;
  settings: TemplateSettingsDraft;
  onClose: () => void;
  onSave: () => void;
  onSettingsChange: React.Dispatch<React.SetStateAction<TemplateSettingsDraft>>;
}

const TemplateSettingsDialog: React.FC<TemplateSettingsDialogProps> = ({
  error,
  settings,
  onClose,
  onSave,
  onSettingsChange,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-app-surface rounded-lg shadow-xl w-full max-w-lg mx-4">
      <div className="p-4 border-b border-app-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-app-text">Template Settings</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-app-text-subtle hover:text-app-text-muted rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-app-accent-soft border border-app-border text-app-accent-text px-3 py-2 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-app-text-muted mb-1">
            Template Name
          </label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) =>
              onSettingsChange((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-app-text-muted mb-1">
            Description
          </label>
          <textarea
            value={settings.description}
            onChange={(e) =>
              onSettingsChange((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={3}
            className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-app-text-muted mb-1">
            Status
          </label>
          <select
            value={settings.status}
            onChange={(e) =>
              onSettingsChange((prev) => ({
                ...prev,
                status: e.target.value as TemplateStatus,
              }))
            }
            className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="p-4 border-t border-app-border flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-app-input-border rounded-md text-sm hover:bg-app-surface-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="px-4 py-2 bg-app-accent text-white rounded-md text-sm hover:bg-app-accent-hover"
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
);

export default TemplateSettingsDialog;
