import React from 'react';
import { sanitizeBuilderUrl } from '../../../utils/validation';
import type {
  ButtonSize,
  ButtonVariant,
  PageComponent,
  TextAlign,
} from '../../../types/websiteBuilder';

interface BasicComponentPropertyEditorProps {
  selectedComponent: PageComponent;
  onUpdateComponent: (id: string, updates: Partial<PageComponent>) => void;
}

const BasicComponentPropertyEditor: React.FC<BasicComponentPropertyEditorProps> = ({
  selectedComponent,
  onUpdateComponent,
}) => {
  const update = (updates: Partial<PageComponent>) =>
    onUpdateComponent(selectedComponent.id, updates);

  switch (selectedComponent.type) {
    case 'heading':
      return (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Content</label>
            <textarea
              value={selectedComponent.content}
              onChange={(e) => update({ content: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Level</label>
            <select
              value={selectedComponent.level}
              onChange={(e) =>
                update({
                  level: Number.parseInt(e.target.value, 10) as 1 | 2 | 3 | 4 | 5 | 6,
                })
              }
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            >
              <option value={1}>H1 - Main Title</option>
              <option value={2}>H2 - Section Title</option>
              <option value={3}>H3 - Subsection</option>
              <option value={4}>H4 - Minor Heading</option>
              <option value={5}>H5 - Small Heading</option>
              <option value={6}>H6 - Smallest</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Alignment</label>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
                <button
                  key={align}
                  onClick={() => update({ align })}
                  className={`flex-1 rounded border px-3 py-2 text-sm ${
                    selectedComponent.align === align
                      ? 'border-app-accent bg-app-accent-soft text-app-accent'
                      : 'border-app-input-border hover:bg-app-surface-muted'
                  }`}
                >
                  {align.charAt(0).toUpperCase() + align.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={selectedComponent.color || '#1e293b'}
                onChange={(e) => update({ color: e.target.value })}
                className="h-10 w-10 cursor-pointer rounded border border-app-input-border"
              />
              <input
                type="text"
                value={selectedComponent.color || ''}
                onChange={(e) => update({ color: e.target.value })}
                placeholder="inherit"
                className="flex-1 rounded-md border border-app-input-border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </>
      );

    case 'text':
      return (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Content</label>
            <textarea
              value={selectedComponent.content}
              onChange={(e) => update({ content: e.target.value })}
              rows={4}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Alignment</label>
            <div className="flex gap-1">
              {(['left', 'center', 'right', 'justify'] as TextAlign[]).map((align) => (
                <button
                  key={align}
                  onClick={() => update({ align })}
                  className={`flex-1 rounded border px-2 py-2 text-xs ${
                    selectedComponent.align === align
                      ? 'border-app-accent bg-app-accent-soft text-app-accent'
                      : 'border-app-input-border hover:bg-app-surface-muted'
                  }`}
                >
                  {align.charAt(0).toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Font Size</label>
            <input
              type="text"
              value={selectedComponent.fontSize || ''}
              onChange={(e) => update({ fontSize: e.target.value })}
              placeholder="1rem"
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>
        </>
      );

    case 'button':
      return (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Text</label>
            <input
              type="text"
              value={selectedComponent.text}
              onChange={(e) => update({ text: e.target.value })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Link URL</label>
            <input
              type="text"
              value={selectedComponent.href || ''}
              onChange={(e) => update({ href: sanitizeBuilderUrl(e.target.value) })}
              placeholder="https://..."
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Variant</label>
            <select
              value={selectedComponent.variant || 'primary'}
              onChange={(e) => update({ variant: e.target.value as ButtonVariant })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="outline">Outline</option>
              <option value="ghost">Ghost</option>
              <option value="link">Link</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Size</label>
            <select
              value={selectedComponent.size || 'md'}
              onChange={(e) => update({ size: e.target.value as ButtonSize })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="xl">Extra Large</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedComponent.fullWidth || false}
                onChange={(e) => update({ fullWidth: e.target.checked })}
                className="rounded border-app-input-border"
              />
              Full Width
            </label>
          </div>
        </>
      );

    case 'image':
      return (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Image URL</label>
            <input
              type="text"
              value={selectedComponent.src}
              onChange={(e) => update({ src: sanitizeBuilderUrl(e.target.value) })}
              placeholder="https://..."
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Alt Text</label>
            <input
              type="text"
              value={selectedComponent.alt}
              onChange={(e) => update({ alt: e.target.value })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-app-text-muted">Width</label>
              <input
                type="text"
                value={selectedComponent.width || ''}
                onChange={(e) => update({ width: e.target.value })}
                placeholder="100%"
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-app-text-muted">Height</label>
              <input
                type="text"
                value={selectedComponent.height || ''}
                onChange={(e) => update({ height: e.target.value })}
                placeholder="auto"
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Fit</label>
            <select
              value={selectedComponent.objectFit || 'cover'}
              onChange={(e) =>
                update({
                  objectFit: e.target.value as 'cover' | 'contain' | 'fill' | 'none',
                })
              }
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="fill">Fill</option>
              <option value="none">None</option>
            </select>
          </div>
        </>
      );

    case 'spacer':
      return (
        <div>
          <label className="mb-1 block text-sm font-medium text-app-text-muted">Height</label>
          <input
            type="text"
            value={selectedComponent.height}
            onChange={(e) => update({ height: e.target.value })}
            placeholder="2rem"
            className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
          />
        </div>
      );

    case 'divider':
      return (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={selectedComponent.color || '#e2e8f0'}
                onChange={(e) => update({ color: e.target.value })}
                className="h-10 w-10 cursor-pointer rounded border border-app-input-border"
              />
              <input
                type="text"
                value={selectedComponent.color || ''}
                onChange={(e) => update({ color: e.target.value })}
                className="flex-1 rounded-md border border-app-input-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Thickness</label>
            <input
              type="text"
              value={selectedComponent.thickness || ''}
              onChange={(e) => update({ thickness: e.target.value })}
              placeholder="1px"
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Width</label>
            <input
              type="text"
              value={selectedComponent.width || ''}
              onChange={(e) => update({ width: e.target.value })}
              placeholder="100%"
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>
        </>
      );

    default:
      return null;
  }
};

export default BasicComponentPropertyEditor;
