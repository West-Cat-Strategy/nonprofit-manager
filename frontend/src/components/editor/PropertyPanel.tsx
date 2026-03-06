/**
 * Property Panel
 * Edit properties of selected component or section
 */

import React from 'react';
import type {
  ButtonSize,
  ButtonVariant,
  PageCollectionType,
  PageComponent,
  PageSection,
  TemplatePage,
  TemplatePageType,
  TextAlign,
  UpdatePageRequest,
} from '../../types/websiteBuilder';

interface PropertyPanelProps {
  currentPage: TemplatePage | null;
  selectedComponent: PageComponent | null;
  selectedSection: PageSection | null;
  onUpdatePage: (updates: UpdatePageRequest) => void;
  onUpdateComponent: (id: string, updates: Partial<PageComponent>) => void;
  onUpdateSection: (id: string, updates: Partial<PageSection>) => void;
  onDeleteComponent: (id: string) => void;
  onDeleteSection: (id: string) => void;
}

const pageTypeOptions: Array<{ value: TemplatePageType; label: string }> = [
  { value: 'static', label: 'Static page' },
  { value: 'collectionIndex', label: 'Collection index' },
  { value: 'collectionDetail', label: 'Collection detail' },
];

const collectionOptions: Array<{ value: PageCollectionType; label: string }> = [
  { value: 'events', label: 'Events' },
  { value: 'newsletters', label: 'Newsletters' },
];

const eventTypeOptions = [
  { value: '', label: 'All public events' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'community', label: 'Community' },
  { value: 'training', label: 'Training' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'conference', label: 'Conference' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
] as const;

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  currentPage,
  selectedComponent,
  selectedSection,
  onUpdatePage,
  onUpdateComponent,
  onUpdateSection,
  onDeleteComponent,
  onDeleteSection,
}) => {
  if (!selectedComponent && !selectedSection) {
    if (currentPage) {
      return (
        <div className="w-72 bg-app-surface border-l border-app-border overflow-y-auto">
          <div className="p-4 border-b border-app-border">
            <h3 className="font-semibold text-app-text">Page Settings</h3>
            <p className="text-xs text-app-text-muted">{currentPage.name}</p>
          </div>

          <div key={currentPage.id} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Page Name
              </label>
              <input
                type="text"
                defaultValue={currentPage.name}
                onBlur={(e) => onUpdatePage({ name: e.target.value })}
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Slug
              </label>
              <input
                type="text"
                defaultValue={currentPage.slug}
                onBlur={(e) => onUpdatePage({ slug: e.target.value })}
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Page Type
              </label>
              <select
                value={currentPage.pageType || 'static'}
                onChange={(e) => {
                  const pageType = e.target.value as TemplatePageType;
                  onUpdatePage({
                    pageType,
                    collection:
                      pageType === 'static'
                        ? undefined
                        : currentPage.collection || 'events',
                    isHomepage: pageType === 'static' ? currentPage.isHomepage : false,
                  });
                }}
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
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
                <label className="block text-sm font-medium text-app-text-muted mb-1">
                  Collection
                </label>
                <select
                  value={currentPage.collection || 'events'}
                  onChange={(e) =>
                    onUpdatePage({ collection: e.target.value as PageCollectionType })
                  }
                  className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
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
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Route Pattern
              </label>
              <input
                type="text"
                defaultValue={currentPage.routePattern || ''}
                onBlur={(e) => onUpdatePage({ routePattern: e.target.value })}
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
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
              Collection pages reuse the builder layout and render live events or newsletters at publish time.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-72 bg-app-surface border-l border-app-border p-4">
        <div className="text-center text-app-text-muted py-8">
          <svg className="w-12 h-12 mx-auto mb-2 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="w-72 bg-app-surface border-l border-app-border overflow-y-auto">
        <div className="p-4 border-b border-app-border">
          <h3 className="font-semibold text-app-text">Section Properties</h3>
          <p className="text-xs text-app-text-muted">{selectedSection.name}</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Section Name */}
          <div>
            <label className="block text-sm font-medium text-app-text-muted mb-1">
              Section Name
            </label>
            <input
              type="text"
              value={selectedSection.name}
              onChange={(e) =>
                onUpdateSection(selectedSection.id, { name: e.target.value })
              }
              className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm focus:ring-2 focus:ring-app-accent focus:border-app-accent"
            />
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium text-app-text-muted mb-1">
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
                className="w-10 h-10 rounded border border-app-input-border cursor-pointer"
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
                className="flex-1 px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>
          </div>

          {/* Padding */}
          <div>
            <label className="block text-sm font-medium text-app-text-muted mb-1">
              Padding
            </label>
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
                  className="w-full px-2 py-1 border border-app-input-border rounded text-sm"
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
                  className="w-full px-2 py-1 border border-app-input-border rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Max Width */}
          <div>
            <label className="block text-sm font-medium text-app-text-muted mb-1">
              Max Width
            </label>
            <input
              type="text"
              value={selectedSection.maxWidth || ''}
              onChange={(e) =>
                onUpdateSection(selectedSection.id, { maxWidth: e.target.value })
              }
              placeholder="1200px"
              className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
            />
          </div>

          {/* Delete Section */}
          <div className="pt-4 border-t border-app-border">
            <button
              onClick={() => onDeleteSection(selectedSection.id)}
              className="w-full py-2 px-4 bg-app-accent-soft text-app-accent rounded-md text-sm hover:bg-app-accent-soft"
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
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Content
              </label>
              <textarea
                value={selectedComponent.content}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { content: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Level
              </label>
              <select
                value={selectedComponent.level}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    level: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6,
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
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
              <label className="block text-sm font-medium text-app-text-muted mb-1">
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
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={selectedComponent.color || '#1e293b'}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, { color: e.target.value })
                  }
                  className="w-10 h-10 rounded border border-app-input-border cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedComponent.color || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, { color: e.target.value })
                  }
                  placeholder="inherit"
                  className="flex-1 px-3 py-2 border border-app-input-border rounded-md text-sm"
                />
              </div>
            </div>
          </>
        );

      case 'text':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Content
              </label>
              <textarea
                value={selectedComponent.content}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { content: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
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
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Font Size
              </label>
              <input
                type="text"
                value={selectedComponent.fontSize || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { fontSize: e.target.value })
                }
                placeholder="1rem"
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>
          </>
        );

      case 'button':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Text
              </label>
              <input
                type="text"
                value={selectedComponent.text}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { text: e.target.value })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Link URL
              </label>
              <input
                type="text"
                value={selectedComponent.href || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { href: e.target.value })
                }
                placeholder="https://..."
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Variant
              </label>
              <select
                value={selectedComponent.variant || 'primary'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    variant: e.target.value as ButtonVariant,
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
                <option value="ghost">Ghost</option>
                <option value="link">Link</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Size
              </label>
              <select
                value={selectedComponent.size || 'md'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    size: e.target.value as ButtonSize,
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
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
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Image URL
              </label>
              <input
                type="text"
                value={selectedComponent.src}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { src: e.target.value })
                }
                placeholder="https://..."
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Alt Text
              </label>
              <input
                type="text"
                value={selectedComponent.alt}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { alt: e.target.value })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-app-text-muted mb-1">
                  Width
                </label>
                <input
                  type="text"
                  value={selectedComponent.width || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, { width: e.target.value })
                  }
                  placeholder="100%"
                  className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text-muted mb-1">
                  Height
                </label>
                <input
                  type="text"
                  value={selectedComponent.height || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, { height: e.target.value })
                  }
                  placeholder="auto"
                  className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Fit
              </label>
              <select
                value={selectedComponent.objectFit || 'cover'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    objectFit: e.target.value as 'cover' | 'contain' | 'fill' | 'none',
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
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
            <label className="block text-sm font-medium text-app-text-muted mb-1">
              Height
            </label>
            <input
              type="text"
              value={selectedComponent.height}
              onChange={(e) =>
                onUpdateComponent(selectedComponent.id, { height: e.target.value })
              }
              placeholder="2rem"
              className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
            />
          </div>
        );

      case 'divider':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={selectedComponent.color || '#e2e8f0'}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, { color: e.target.value })
                  }
                  className="w-10 h-10 rounded border border-app-input-border cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedComponent.color || ''}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, { color: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-app-input-border rounded-md text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Thickness
              </label>
              <input
                type="text"
                value={selectedComponent.thickness || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { thickness: e.target.value })
                }
                placeholder="1px"
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Width
              </label>
              <input
                type="text"
                value={selectedComponent.width || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { width: e.target.value })
                }
                placeholder="100%"
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>
          </>
        );

      case 'contact-form':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Heading
              </label>
              <input
                type="text"
                value={selectedComponent.heading || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { heading: e.target.value || undefined })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Description
              </label>
              <textarea
                value={selectedComponent.description || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    description: e.target.value || undefined,
                  })
                }
                rows={3}
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Submit Text
              </label>
              <input
                type="text"
                value={selectedComponent.submitText || 'Send Message'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { submitText: e.target.value })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Form Mode
              </label>
              <select
                value={selectedComponent.formMode || 'contact'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    formMode: e.target.value as 'contact' | 'supporter',
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              >
                <option value="contact">Contact / inquiry</option>
                <option value="supporter">Add your name / supporter</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedComponent.includePhone !== false}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      includePhone: e.target.checked,
                    })
                  }
                  className="rounded border-app-input-border"
                />
                Include phone field
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedComponent.includeMessage !== false}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      includeMessage: e.target.checked,
                    })
                  }
                  className="rounded border-app-input-border"
                />
                Include message field
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Success Message
              </label>
              <input
                type="text"
                value={selectedComponent.successMessage || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    successMessage: e.target.value || undefined,
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>
          </>
        );

      case 'newsletter-signup':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Heading
              </label>
              <input
                type="text"
                value={selectedComponent.heading || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { heading: e.target.value || undefined })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Description
              </label>
              <textarea
                value={selectedComponent.description || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    description: e.target.value || undefined,
                  })
                }
                rows={3}
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Button Text
              </label>
              <input
                type="text"
                value={selectedComponent.buttonText || 'Subscribe'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { buttonText: e.target.value })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Audience Mode
              </label>
              <select
                value={selectedComponent.audienceMode || 'crm'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    audienceMode: e.target.value as 'crm' | 'mailchimp' | 'both',
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              >
                <option value="crm">CRM only</option>
                <option value="mailchimp">Mailchimp only</option>
                <option value="both">CRM + Mailchimp</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Mailchimp List ID
              </label>
              <input
                type="text"
                value={selectedComponent.mailchimpListId || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    mailchimpListId: e.target.value.trim() || undefined,
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>
          </>
        );

      case 'donation-form':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Heading
              </label>
              <input
                type="text"
                value={selectedComponent.heading || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { heading: e.target.value || undefined })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Description
              </label>
              <textarea
                value={selectedComponent.description || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    description: e.target.value || undefined,
                  })
                }
                rows={3}
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Suggested Amounts
              </label>
              <input
                type="text"
                value={(selectedComponent.suggestedAmounts || []).join(', ')}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    suggestedAmounts: e.target.value
                      .split(',')
                      .map((value) => Number.parseFloat(value.trim()))
                      .filter((value) => Number.isFinite(value) && value > 0),
                  })
                }
                placeholder="25, 50, 100, 250"
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedComponent.allowCustomAmount !== false}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      allowCustomAmount: e.target.checked,
                    })
                  }
                  className="rounded border-app-input-border"
                />
                Allow custom amount
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedComponent.recurringOption === true}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      recurringOption: e.target.checked,
                    })
                  }
                  className="rounded border-app-input-border"
                />
                Offer monthly recurring option
              </label>
            </div>
          </>
        );

      case 'event-list': {
        const selectedEventType = selectedComponent.eventType || selectedComponent.filterByTag || '';

        return (
          <>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Max Events
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={selectedComponent.maxEvents || 6}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    maxEvents: Math.max(1, Math.min(50, Number.parseInt(e.target.value || '6', 10) || 6)),
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Layout
              </label>
              <select
                value={selectedComponent.layout || 'grid'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    layout: e.target.value as 'grid' | 'list' | 'calendar',
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              >
                <option value="grid">Grid</option>
                <option value="list">List</option>
                <option value="calendar">Calendar (fallback to list)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Event Type
              </label>
              <select
                value={selectedEventType}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  onUpdateComponent(selectedComponent.id, {
                    eventType: value || undefined,
                    filterByTag: value || undefined,
                  });
                }}
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              >
                {eventTypeOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Empty Message
              </label>
              <input
                type="text"
                value={selectedComponent.emptyMessage || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    emptyMessage: e.target.value || undefined,
                  })
                }
                placeholder="No public events are available right now."
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Site Key (Optional)
              </label>
              <input
                type="text"
                value={selectedComponent.siteKey || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    siteKey: e.target.value.trim() || undefined,
                  })
                }
                placeholder="Use only when embedding cross-site events"
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedComponent.showPastEvents || false}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      showPastEvents: e.target.checked,
                    })
                  }
                  className="rounded border-app-input-border"
                />
                Show past events
              </label>
            </div>
          </>
        );
      }

      case 'event-calendar':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Max Events
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={selectedComponent.maxEvents || 8}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    maxEvents: Math.max(1, Math.min(50, Number.parseInt(e.target.value || '8', 10) || 8)),
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Initial View
              </label>
              <select
                value={selectedComponent.initialView || 'month'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    initialView: e.target.value as 'month' | 'agenda',
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              >
                <option value="month">Month</option>
                <option value="agenda">Agenda</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Event Type
              </label>
              <select
                value={selectedComponent.eventType || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    eventType: e.target.value || undefined,
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              >
                {eventTypeOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedComponent.showPastEvents || false}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      showPastEvents: e.target.checked,
                    })
                  }
                  className="rounded border-app-input-border"
                />
                Show past events
              </label>
            </div>
          </>
        );

      case 'event-detail':
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedComponent.showDescription !== false}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    showDescription: e.target.checked,
                  })
                }
                className="rounded border-app-input-border"
              />
              Show description
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedComponent.showLocation !== false}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    showLocation: e.target.checked,
                  })
                }
                className="rounded border-app-input-border"
              />
              Show location
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedComponent.showCapacity !== false}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    showCapacity: e.target.checked,
                  })
                }
                className="rounded border-app-input-border"
              />
              Show capacity
            </label>
          </div>
        );

      case 'event-registration':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Submit Text
              </label>
              <input
                type="text"
                value={selectedComponent.submitText || 'Register'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { submitText: e.target.value })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Default Registration Status
              </label>
              <select
                value={selectedComponent.defaultStatus || 'registered'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    defaultStatus: e.target.value as
                      | 'registered'
                      | 'waitlisted'
                      | 'cancelled'
                      | 'confirmed'
                      | 'no_show',
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              >
                <option value="registered">Registered</option>
                <option value="confirmed">Confirmed</option>
                <option value="waitlisted">Waitlisted</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedComponent.includePhone !== false}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    includePhone: e.target.checked,
                  })
                }
                className="rounded border-app-input-border"
              />
              Include phone field
            </label>
          </>
        );

      case 'newsletter-archive':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Max Items
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={selectedComponent.maxItems || 10}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    maxItems: Math.max(1, Math.min(30, Number.parseInt(e.target.value || '10', 10) || 10)),
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Source Filter
              </label>
              <select
                value={selectedComponent.sourceFilter || 'all'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    sourceFilter: e.target.value as 'native' | 'mailchimp' | 'all',
                  })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              >
                <option value="all">Native + Mailchimp</option>
                <option value="native">Native only</option>
                <option value="mailchimp">Mailchimp only</option>
              </select>
            </div>
          </>
        );

      case 'volunteer-interest-form':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Heading
              </label>
              <input
                type="text"
                value={selectedComponent.heading || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { heading: e.target.value || undefined })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Description
              </label>
              <textarea
                value={selectedComponent.description || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    description: e.target.value || undefined,
                  })
                }
                rows={3}
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                Submit Text
              </label>
              <input
                type="text"
                value={selectedComponent.submitText || 'Share Interest'}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { submitText: e.target.value })
                }
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedComponent.includePhone !== false}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, {
                    includePhone: e.target.checked,
                  })
                }
                className="rounded border-app-input-border"
              />
              Include phone field
            </label>
          </>
        );

      default:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
                CSS Class
              </label>
              <input
                type="text"
                value={selectedComponent.className || ''}
                onChange={(e) =>
                  onUpdateComponent(selectedComponent.id, { className: e.target.value })
                }
                placeholder="custom-class"
                className="w-full px-3 py-2 border border-app-input-border rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
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
                  className="w-full px-2 py-1 border border-app-input-border rounded text-sm"
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
                  className="w-full px-2 py-1 border border-app-input-border rounded text-sm"
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
                  className="w-full px-2 py-1 border border-app-input-border rounded text-sm"
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
                  className="w-full px-2 py-1 border border-app-input-border rounded text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-muted mb-1">
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
                  className="w-full px-2 py-1 border border-app-input-border rounded text-sm"
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
                  className="w-full px-2 py-1 border border-app-input-border rounded text-sm"
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
                  className="w-full px-2 py-1 border border-app-input-border rounded text-sm"
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
                  className="w-full px-2 py-1 border border-app-input-border rounded text-sm"
                />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="w-72 bg-app-surface border-l border-app-border overflow-y-auto">
      <div className="p-4 border-b border-app-border">
        <h3 className="font-semibold text-app-text capitalize">
          {selectedComponent.type.replace('-', ' ')}
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {renderComponentProperties()}

        {/* Delete Component */}
        <div className="pt-4 border-t border-app-border">
          <button
            onClick={() => onDeleteComponent(selectedComponent.id)}
            className="w-full py-2 px-4 bg-app-accent-soft text-app-accent rounded-md text-sm hover:bg-app-accent-soft"
          >
            Delete Component
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;
