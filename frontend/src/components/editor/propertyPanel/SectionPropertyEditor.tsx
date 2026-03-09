import React from 'react';
import type { SectionPropertyEditorProps } from './types';

const SectionPropertyEditor: React.FC<SectionPropertyEditorProps> = ({
  selectedSection,
  onUpdateSection,
  onDeleteSection,
}) => (
  <div className="w-72 overflow-y-auto border-l border-app-border bg-app-surface">
    <div className="border-b border-app-border p-4">
      <h3 className="font-semibold text-app-text">Section Properties</h3>
      <p className="text-xs text-app-text-muted">{selectedSection.name}</p>
    </div>

    <div className="space-y-4 p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-app-text-muted">Section Name</label>
        <input
          type="text"
          value={selectedSection.name}
          onChange={(e) => onUpdateSection(selectedSection.id, { name: e.target.value })}
          className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm focus:border-app-accent focus:ring-2 focus:ring-app-accent"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-app-text-muted">
          Background Color
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={selectedSection.backgroundColor || '#ffffff'}
            onChange={(e) =>
              onUpdateSection(selectedSection.id, {
                backgroundColor: e.target.value,
              })
            }
            className="h-10 w-10 cursor-pointer rounded border border-app-input-border"
          />
          <input
            type="text"
            value={selectedSection.backgroundColor || ''}
            onChange={(e) =>
              onUpdateSection(selectedSection.id, {
                backgroundColor: e.target.value,
              })
            }
            placeholder="#ffffff"
            className="flex-1 rounded-md border border-app-input-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-app-text-muted">Padding</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-app-text-muted">Top</label>
            <input
              type="text"
              value={selectedSection.paddingTop || ''}
              onChange={(e) =>
                onUpdateSection(selectedSection.id, {
                  paddingTop: e.target.value,
                })
              }
              placeholder="2rem"
              className="w-full rounded border border-app-input-border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-app-text-muted">Bottom</label>
            <input
              type="text"
              value={selectedSection.paddingBottom || ''}
              onChange={(e) =>
                onUpdateSection(selectedSection.id, {
                  paddingBottom: e.target.value,
                })
              }
              placeholder="2rem"
              className="w-full rounded border border-app-input-border px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-app-text-muted">Max Width</label>
        <input
          type="text"
          value={selectedSection.maxWidth || ''}
          onChange={(e) => onUpdateSection(selectedSection.id, { maxWidth: e.target.value })}
          placeholder="1200px"
          className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-app-border pt-4">
        <button
          onClick={() => onDeleteSection(selectedSection.id)}
          className="w-full rounded-md bg-app-accent-soft px-4 py-2 text-sm text-app-accent hover:bg-app-accent-soft"
        >
          Delete Section
        </button>
      </div>
    </div>
  </div>
);

export default SectionPropertyEditor;
