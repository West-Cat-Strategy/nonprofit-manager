/**
 * Editor Canvas
 * Main editing area with sections and components
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import type { PageSection, PageComponent, TemplateTheme } from '../../../../types/websiteBuilder';
import { sanitizeBuilderUrl } from '../../../../utils/validation';
import ComponentRenderer from './EditorCanvasRenderer';

type MoveDirection = 'up' | 'down';

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
  onDuplicateSection: (id: string) => void;
  onDuplicateComponent: (id: string) => void;
  onMoveSection: (id: string, direction: MoveDirection) => void;
  onMoveComponent: (id: string, direction: MoveDirection) => void;
}

interface SortableComponentProps {
  component: PageComponent;
  theme: TemplateTheme;
  isSelected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: MoveDirection) => void;
}

interface BuilderIconButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const BuilderIconButton: React.FC<BuilderIconButtonProps> = ({
  label,
  disabled = false,
  onClick,
  children,
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => {
      event.stopPropagation();
      if (!disabled) {
        onClick();
      }
    }}
    className="rounded p-1 text-xs text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
  >
    {children}
  </button>
);

const SortableComponent: React.FC<SortableComponentProps> = ({
  component,
  theme,
  isSelected,
  canMoveUp,
  canMoveDown,
  onSelect,
  onDelete,
  onDuplicate,
  onMove,
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
        {isSelected && (
          <div
            className="absolute top-1 right-1 flex gap-1 rounded bg-app-accent p-0.5 transition-opacity"
          >
            <BuilderIconButton label="Duplicate component" onClick={onDuplicate}>
              <DocumentDuplicateIcon className="h-4 w-4" />
            </BuilderIconButton>
            <BuilderIconButton
              label="Move component up"
              disabled={!canMoveUp}
              onClick={() => onMove('up')}
            >
              <ArrowUpIcon className="h-4 w-4" />
            </BuilderIconButton>
            <BuilderIconButton
              label="Move component down"
              disabled={!canMoveDown}
              onClick={() => onMove('down')}
            >
              <ArrowDownIcon className="h-4 w-4" />
            </BuilderIconButton>
            <BuilderIconButton label="Delete component" onClick={onDelete}>
              <TrashIcon className="h-4 w-4" />
            </BuilderIconButton>
          </div>
        )}
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
  onDuplicateSection: () => void;
  onDuplicateComponent: (id: string) => void;
  onMoveSection: (direction: MoveDirection) => void;
  onMoveComponent: (id: string, direction: MoveDirection) => void;
  canDelete: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
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
  onDuplicateSection,
  onDuplicateComponent,
  onMoveSection,
  onMoveComponent,
  canDelete,
  canMoveUp,
  canMoveDown,
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
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 z-10 transition-opacity">
          <div className="app-accent-surface flex items-center justify-between text-xs px-2 py-1">
            <span>{section.name}</span>
            <div className="flex gap-1">
              <BuilderIconButton label="Duplicate section" onClick={onDuplicateSection}>
                <DocumentDuplicateIcon className="h-4 w-4" />
              </BuilderIconButton>
              <BuilderIconButton
                label="Move section up"
                disabled={!canMoveUp}
                onClick={() => onMoveSection('up')}
              >
                <ArrowUpIcon className="h-4 w-4" />
              </BuilderIconButton>
              <BuilderIconButton
                label="Move section down"
                disabled={!canMoveDown}
                onClick={() => onMoveSection('down')}
              >
                <ArrowDownIcon className="h-4 w-4" />
              </BuilderIconButton>
              {canDelete && (
                <BuilderIconButton label="Delete section" onClick={onDeleteSection}>
                  <TrashIcon className="h-4 w-4" />
                </BuilderIconButton>
              )}
            </div>
          </div>
        </div>
      )}

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
                canMoveUp={section.components.indexOf(component) > 0}
                canMoveDown={section.components.indexOf(component) < section.components.length - 1}
                onSelect={() => onSelectComponent(component.id)}
                onDelete={() => onDeleteComponent(component.id)}
                onDuplicate={() => onDuplicateComponent(component.id)}
                onMove={(direction) => onMoveComponent(component.id, direction)}
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
  onDuplicateSection,
  onDuplicateComponent,
  onMoveSection,
  onMoveComponent,
}) => {
  return (
    <div
      className="min-h-full"
      onClick={() => {
        onSelectComponent(null);
        onSelectSection(null);
      }}
    >
      {sections.map((section, sectionIndex) => (
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
          onDuplicateSection={() => onDuplicateSection(section.id)}
          onDuplicateComponent={onDuplicateComponent}
          onMoveSection={(direction) => onMoveSection(section.id, direction)}
          onMoveComponent={onMoveComponent}
          canDelete={sections.length > 1}
          canMoveUp={sectionIndex > 0}
          canMoveDown={sectionIndex < sections.length - 1}
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
