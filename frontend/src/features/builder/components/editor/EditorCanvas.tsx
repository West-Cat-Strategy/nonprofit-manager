/**
 * Editor Canvas
 * Main editing area with sections and components
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PageSection, PageComponent, TemplateTheme } from '../../../../types/websiteBuilder';
import { sanitizeBuilderUrl } from '../../../../utils/validation';
import ComponentRenderer from './EditorCanvasRenderer';

interface EditorCanvasProps {
  sections: PageSection[];
  theme: TemplateTheme;
  selectedComponentId: string | null;
  selectedSectionId: string | null;
  onSelectComponent: (id: string | null) => void;
  onSelectSection: (id: string | null) => void;
  onAddSection: () => void;
  onDeleteSection: (id: string) => void;
  onDeleteComponent: (id: string) => void;
}

interface SortableComponentProps {
  component: PageComponent;
  theme: TemplateTheme;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const SortableComponent: React.FC<SortableComponentProps> = ({
  component,
  theme,
  isSelected,
  onSelect,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`relative group cursor-pointer ${
        isSelected ? 'ring-2 ring-app-accent' : 'hover:ring-2 hover:ring-app-accent'
      }`}
    >
      <ComponentRenderer component={component} theme={theme} />

      <div
        className={`absolute inset-0 bg-app-accent bg-opacity-0 group-hover:bg-opacity-5 transition-all ${
          isSelected ? 'bg-opacity-10' : ''
        }`}
      >
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 bg-app-accent text-[var(--app-accent-foreground)] rounded text-xs hover:bg-app-accent"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

interface SectionDropZoneProps {
  section: PageSection;
  theme: TemplateTheme;
  selectedComponentId: string | null;
  isSelected: boolean;
  onSelectSection: () => void;
  onSelectComponent: (id: string | null) => void;
  onDeleteSection: () => void;
  onDeleteComponent: (id: string) => void;
  canDelete: boolean;
}

const SectionDropZone: React.FC<SectionDropZoneProps> = ({
  section,
  theme,
  selectedComponentId,
  isSelected,
  onSelectSection,
  onSelectComponent,
  onDeleteSection,
  onDeleteComponent,
  canDelete,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: section.id,
  });

  const sectionStyle: React.CSSProperties = {
    backgroundColor: section.backgroundColor || 'transparent',
    backgroundImage: section.backgroundImage
      ? (() => {
          const safeBackgroundImage = sanitizeBuilderUrl(section.backgroundImage);
          return safeBackgroundImage ? `url(${safeBackgroundImage})` : undefined;
        })()
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    paddingTop: section.paddingTop || '2rem',
    paddingBottom: section.paddingBottom || '2rem',
    paddingLeft: section.paddingLeft || '1rem',
    paddingRight: section.paddingRight || '1rem',
  };

  return (
    <div
      ref={setNodeRef}
      style={sectionStyle}
      onClick={(e) => {
        e.stopPropagation();
        onSelectSection();
      }}
      className={`relative group min-h-[100px] ${
        isSelected ? 'ring-2 ring-app-accent' : ''
      } ${isOver ? 'ring-2 ring-app-accent bg-app-accent-soft' : ''}`}
    >
      <div className="absolute top-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="app-accent-surface flex items-center justify-between text-xs px-2 py-1">
          <span>{section.name}</span>
          <div className="flex gap-1">
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSection();
                }}
                className="p-0.5 hover:bg-app-accent-hover rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto" style={{ maxWidth: section.maxWidth || '1200px' }}>
        {section.components.length === 0 ? (
          <div className="border-2 border-dashed border-app-input-border rounded-lg p-8 text-center text-app-text-muted">
            <p>Drop components here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {section.components.map((component) => (
              <SortableComponent
                key={component.id}
                component={component}
                theme={theme}
                isSelected={selectedComponentId === component.id}
                onSelect={() => onSelectComponent(component.id)}
                onDelete={() => onDeleteComponent(component.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  sections,
  theme,
  selectedComponentId,
  selectedSectionId,
  onSelectComponent,
  onSelectSection,
  onAddSection,
  onDeleteSection,
  onDeleteComponent,
}) => {
  return (
    <div
      className="min-h-full"
      onClick={() => {
        onSelectComponent(null);
        onSelectSection(null);
      }}
    >
      {sections.map((section) => (
        <SectionDropZone
          key={section.id}
          section={section}
          theme={theme}
          selectedComponentId={selectedComponentId}
          isSelected={selectedSectionId === section.id}
          onSelectSection={() => onSelectSection(section.id)}
          onSelectComponent={onSelectComponent}
          onDeleteSection={() => onDeleteSection(section.id)}
          onDeleteComponent={onDeleteComponent}
          canDelete={sections.length > 1}
        />
      ))}

      <div className="p-4 border-t border-app-border">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddSection();
          }}
          className="w-full py-3 border-2 border-dashed border-app-input-border rounded-lg text-app-text-muted hover:border-app-accent hover:text-app-accent transition-colors"
        >
          + Add Section
        </button>
      </div>
    </div>
  );
};

export default EditorCanvas;
