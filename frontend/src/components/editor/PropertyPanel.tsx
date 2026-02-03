/**
 * Property Panel
 * Edit properties of selected component or section
 */

import React from 'react';
import type { PageComponent, PageSection, TextAlign, ButtonVariant, ButtonSize } from '../../types/websiteBuilder';

interface PropertyPanelProps {
  selectedComponent: PageComponent | null;
  selectedSection: PageSection | null;
  onUpdateComponent: (id: string, updates: Partial<PageComponent>) => void;
  onUpdateSection: (id: string, updates: Partial<PageSection>) => void;
  onDeleteComponent: (id: string) => void;
  onDeleteSection: (id: string) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedComponent,
  selectedSection,
  onUpdateComponent,
  onUpdateSection,
  onDeleteComponent,
  onDeleteSection,
}) => {
  if (!selectedComponent && !selectedSection) {
    return (
      <div className="w-72 bg-white border-l border-gray-200 p-4">
        <div className="text-center text-gray-500 py-8">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <p>Select an element to edit</p>
        </div>
      </div>
    );
  }

  // Section properties
  if (selectedSection && !selectedComponent) {
    return (
      <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Section Properties</h3>
          <p className="text-xs text-gray-500">{selectedSection.name}</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Section Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section Name
            </label>
            <input
              type="text"
              value={selectedSection.name}
              onChange={(e) =>
                onUpdateSection(selectedSection.id, { name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          {/* Padding */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Padding
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Top</label>
                <input
                  type="text"
                  value={selectedSection.paddingTop || ''}
                  onChange={(e) =>
                    onUpdateSection(selectedSection.id, {
                      paddingTop: e.target.value,
                    })
                  }
                  placeholder="2rem"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Bottom</label>
                <input
                  type="text"
                  value={selectedSection.paddingBottom || ''}
                  onChange={(e) =>
                    onUpdateSection(selectedSection.id, {
                      paddingBottom: e.target.value,
                    })
                  }
                  placeholder="2rem"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Max Width */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Width
            </label>
            <input
              type="text"
              value={selectedSection.maxWidth || ''}
              onChange={(e) =>
                onUpdateSection(selectedSection.id, { maxWidth: e.target.value })
              }
              placeholder="1200px"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* Delete Section */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => onDeleteSection(selectedSection.id)}
              className="w-full py-2 px-4 bg-red-50 text-red-600 rounded-md text-sm hover:bg-red-100"
            >
              Delete Section
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Component properties
  if (!selectedComponent) return null;

  const renderComponentProperties = () => {
    switch (selectedComponent.type) {
      case 'heading':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={selectedComponent.content}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { content: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <select
                value={selectedComponent.level}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    level: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alignment
              </label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
                  <button
                    key={align}
                    onClick={() =>
                      onUpdateComponent(selectedComponent.id, { align })
                    }
                    className={`flex-1 py-2 px-3 border rounded text-sm ${
                      selectedComponent.align === align
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {align.charAt(0).toUpperCase() + align.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={selectedComponent.color || '#1e293b'}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, { color: e.target.value })
                  }
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedComponent.color || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, { color: e.target.value })
                  }
                  placeholder="inherit"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </>
        );

      case 'text':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={selectedComponent.content}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { content: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alignment
              </label>
              <div className="flex gap-1">
                {(['left', 'center', 'right', 'justify'] as TextAlign[]).map((align) => (
                  <button
                    key={align}
                    onClick={() =>
                      onUpdateComponent(selectedComponent.id, { align })
                    }
                    className={`flex-1 py-2 px-2 border rounded text-xs ${
                      selectedComponent.align === align
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {align.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Font Size
              </label>
              <input
                type="text"
                value={selectedComponent.fontSize || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { fontSize: e.target.value })
                }
                placeholder="1rem"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </>
        );

      case 'button':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text
              </label>
              <input
                type="text"
                value={selectedComponent.text}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { text: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link URL
              </label>
              <input
                type="text"
                value={selectedComponent.href || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { href: e.target.value })
                }
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variant
              </label>
              <select
                value={selectedComponent.variant || 'primary'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    variant: e.target.value as ButtonVariant,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
                <option value="ghost">Ghost</option>
                <option value="link">Link</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size
              </label>
              <select
                value={selectedComponent.size || 'md'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    size: e.target.value as ButtonSize,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      fullWidth: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL
              </label>
              <input
                type="text"
                value={selectedComponent.src}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { src: e.target.value })
                }
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alt Text
              </label>
              <input
                type="text"
                value={selectedComponent.alt}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { alt: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width
                </label>
                <input
                  type="text"
                  value={selectedComponent.width || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, { width: e.target.value })
                  }
                  placeholder="100%"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height
                </label>
                <input
                  type="text"
                  value={selectedComponent.height || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, { height: e.target.value })
                  }
                  placeholder="auto"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fit
              </label>
              <select
                value={selectedComponent.objectFit || 'cover'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    objectFit: e.target.value as 'cover' | 'contain' | 'fill' | 'none',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Height
            </label>
            <input
              type="text"
              value={selectedComponent.height}
              onChange={(e) =>
                onUpdateComponent(selectedComponent.id, { height: e.target.value })
              }
              placeholder="2rem"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        );

      case 'divider':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={selectedComponent.color || '#e2e8f0'}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, { color: e.target.value })
                  }
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedComponent.color || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, { color: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thickness
              </label>
              <input
                type="text"
                value={selectedComponent.thickness || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { thickness: e.target.value })
                }
                placeholder="1px"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Width
              </label>
              <input
                type="text"
                value={selectedComponent.width || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { width: e.target.value })
                }
                placeholder="100%"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </>
        );

      default:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CSS Class
              </label>
              <input
                type="text"
                value={selectedComponent.className || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { className: e.target.value })
                }
                placeholder="custom-class"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margin
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={selectedComponent.margin?.top || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      margin: { ...selectedComponent.margin, top: e.target.value },
                    })
                  }
                  placeholder="Top"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={selectedComponent.margin?.right || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      margin: { ...selectedComponent.margin, right: e.target.value },
                    })
                  }
                  placeholder="Right"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={selectedComponent.margin?.bottom || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      margin: { ...selectedComponent.margin, bottom: e.target.value },
                    })
                  }
                  placeholder="Bottom"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={selectedComponent.margin?.left || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      margin: { ...selectedComponent.margin, left: e.target.value },
                    })
                  }
                  placeholder="Left"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Padding
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={selectedComponent.padding?.top || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      padding: { ...selectedComponent.padding, top: e.target.value },
                    })
                  }
                  placeholder="Top"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={selectedComponent.padding?.right || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      padding: { ...selectedComponent.padding, right: e.target.value },
                    })
                  }
                  placeholder="Right"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={selectedComponent.padding?.bottom || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      padding: { ...selectedComponent.padding, bottom: e.target.value },
                    })
                  }
                  placeholder="Bottom"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={selectedComponent.padding?.left || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      padding: { ...selectedComponent.padding, left: e.target.value },
                    })
                  }
                  placeholder="Left"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 capitalize">
          {selectedComponent.type.replace('-', ' ')}
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {renderComponentProperties()}

        {/* Delete Component */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={() => onDeleteComponent(selectedComponent.id)}
            className="w-full py-2 px-4 bg-red-50 text-red-600 rounded-md text-sm hover:bg-red-100"
          >
            Delete Component
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;
