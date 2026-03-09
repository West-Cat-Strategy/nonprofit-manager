import React from 'react';
import type { PageComponent } from '../../../types/websiteBuilder';

interface GenericStylePropertyEditorProps {
  selectedComponent: PageComponent;
  onUpdateComponent: (id: string, updates: Partial<PageComponent>) => void;
}

const GenericStylePropertyEditor: React.FC<GenericStylePropertyEditorProps> = ({
  selectedComponent,
  onUpdateComponent,
}) => {
  const update = (updates: Partial<PageComponent>) =>
    onUpdateComponent(selectedComponent.id, updates);

  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium text-app-text-muted">CSS Class</label>
        <input
          type="text"
          value={selectedComponent.className || ''}
          onChange={(e) => update({ className: e.target.value })}
          placeholder="custom-class"
          className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-app-text-muted">Margin</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={selectedComponent.margin?.top || ''}
            onChange={(e) =>
              update({
                margin: { ...selectedComponent.margin, top: e.target.value },
              })
            }
            placeholder="Top"
            className="w-full rounded border border-app-input-border px-2 py-1 text-sm"
          />
          <input
            type="text"
            value={selectedComponent.margin?.right || ''}
            onChange={(e) =>
              update({
                margin: { ...selectedComponent.margin, right: e.target.value },
              })
            }
            placeholder="Right"
            className="w-full rounded border border-app-input-border px-2 py-1 text-sm"
          />
          <input
            type="text"
            value={selectedComponent.margin?.bottom || ''}
            onChange={(e) =>
              update({
                margin: { ...selectedComponent.margin, bottom: e.target.value },
              })
            }
            placeholder="Bottom"
            className="w-full rounded border border-app-input-border px-2 py-1 text-sm"
          />
          <input
            type="text"
            value={selectedComponent.margin?.left || ''}
            onChange={(e) =>
              update({
                margin: { ...selectedComponent.margin, left: e.target.value },
              })
            }
            placeholder="Left"
            className="w-full rounded border border-app-input-border px-2 py-1 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-app-text-muted">Padding</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={selectedComponent.padding?.top || ''}
            onChange={(e) =>
              update({
                padding: { ...selectedComponent.padding, top: e.target.value },
              })
            }
            placeholder="Top"
            className="w-full rounded border border-app-input-border px-2 py-1 text-sm"
          />
          <input
            type="text"
            value={selectedComponent.padding?.right || ''}
            onChange={(e) =>
              update({
                padding: { ...selectedComponent.padding, right: e.target.value },
              })
            }
            placeholder="Right"
            className="w-full rounded border border-app-input-border px-2 py-1 text-sm"
          />
          <input
            type="text"
            value={selectedComponent.padding?.bottom || ''}
            onChange={(e) =>
              update({
                padding: { ...selectedComponent.padding, bottom: e.target.value },
              })
            }
            placeholder="Bottom"
            className="w-full rounded border border-app-input-border px-2 py-1 text-sm"
          />
          <input
            type="text"
            value={selectedComponent.padding?.left || ''}
            onChange={(e) =>
              update({
                padding: { ...selectedComponent.padding, left: e.target.value },
              })
            }
            placeholder="Left"
            className="w-full rounded border border-app-input-border px-2 py-1 text-sm"
          />
        </div>
      </div>
    </>
  );
};

export default GenericStylePropertyEditor;
