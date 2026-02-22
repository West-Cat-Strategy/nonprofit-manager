/**
 * Editor Canvas
 * Main editing area with sections and components
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PageSection, PageComponent, TemplateTheme } from '../../types/websiteBuilder';

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

      {/* Component overlay with actions */}
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
            className="p-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
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
    backgroundImage: section.backgroundImage ? `url(${section.backgroundImage})` : undefined,
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
        isSelected ? 'ring-2 ring-purple-500' : ''
      } ${isOver ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
    >
      {/* Section overlay with label and actions */}
      <div className="absolute top-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex items-center justify-between bg-purple-600 text-white text-xs px-2 py-1">
          <span>{section.name}</span>
          <div className="flex gap-1">
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSection();
                }}
                className="p-0.5 hover:bg-purple-700 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section content */}
      <div
        className="max-w-6xl mx-auto"
        style={{ maxWidth: section.maxWidth || '1200px' }}
      >
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

      {/* Add Section Button */}
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

// Component Renderer
interface ComponentRendererProps {
  component: PageComponent;
  theme: TemplateTheme;
}

const ComponentRenderer: React.FC<ComponentRendererProps> = ({ component, theme }) => {
  const baseStyle: React.CSSProperties = {
    margin: component.margin
      ? `${component.margin.top || 0} ${component.margin.right || 0} ${component.margin.bottom || 0} ${component.margin.left || 0}`
      : undefined,
    padding: component.padding
      ? `${component.padding.top || 0} ${component.padding.right || 0} ${component.padding.bottom || 0} ${component.padding.left || 0}`
      : undefined,
    ...component.style,
  };

  switch (component.type) {
    case 'heading': {
      const headingTag = `h${component.level}`;
      const fontSizes: Record<number, string> = {
        1: '2.5rem',
        2: '2rem',
        3: '1.5rem',
        4: '1.25rem',
        5: '1.125rem',
        6: '1rem',
      };
      return React.createElement(
        headingTag,
        {
          style: {
            ...baseStyle,
            textAlign: component.align,
            color: component.color || theme.colors.text,
            fontFamily: theme.typography.headingFontFamily,
            fontWeight: theme.typography.fontWeightBold,
            fontSize: fontSizes[component.level],
            lineHeight: theme.typography.headingLineHeight,
          },
        },
        component.content
      );
    }

    case 'text':
      return (
        <p
          style={{
            ...baseStyle,
            textAlign: component.align,
            color: component.color || theme.colors.text,
            fontFamily: theme.typography.fontFamily,
            fontSize: component.fontSize || theme.typography.baseFontSize,
            lineHeight: theme.typography.lineHeight,
          }}
        >
          {component.content}
        </p>
      );

    case 'button': {
      const variants: Record<string, React.CSSProperties> = {
        primary: {
          backgroundColor: theme.colors.primary,
          color: '#ffffff',
          border: 'none',
        },
        secondary: {
          backgroundColor: theme.colors.secondary,
          color: '#ffffff',
          border: 'none',
        },
        outline: {
          backgroundColor: 'transparent',
          color: theme.colors.primary,
          border: `2px solid ${theme.colors.primary}`,
        },
        ghost: {
          backgroundColor: 'transparent',
          color: theme.colors.primary,
          border: 'none',
        },
        link: {
          backgroundColor: 'transparent',
          color: theme.colors.primary,
          border: 'none',
          textDecoration: 'underline',
        },
      };

      const sizes: Record<string, React.CSSProperties> = {
        sm: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
        md: { padding: '0.75rem 1.5rem', fontSize: '1rem' },
        lg: { padding: '1rem 2rem', fontSize: '1.125rem' },
        xl: { padding: '1.25rem 2.5rem', fontSize: '1.25rem' },
      };

      return (
        <button
          style={{
            ...baseStyle,
            ...variants[component.variant || 'primary'],
            ...sizes[component.size || 'md'],
            borderRadius: theme.borderRadius.md,
            fontWeight: theme.typography.fontWeightMedium,
            cursor: 'pointer',
            width: component.fullWidth ? '100%' : 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {component.text}
        </button>
      );
    }

    case 'image':
      return (
        <div style={baseStyle}>
          {component.src ? (
            <img
              src={component.src}
              alt={component.alt}
              style={{
                width: component.width || '100%',
                height: component.height || 'auto',
                objectFit: component.objectFit || 'cover',
                borderRadius: component.borderRadius || theme.borderRadius.md,
              }}
            />
          ) : (
            <div
              className="bg-app-surface-muted flex items-center justify-center"
              style={{
                width: component.width || '100%',
                height: component.height || '200px',
                borderRadius: component.borderRadius || theme.borderRadius.md,
              }}
            >
              <svg className="w-12 h-12 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {component.caption && (
            <p className="text-sm text-app-text-muted mt-2 text-center">{component.caption}</p>
          )}
        </div>
      );

    case 'divider':
      return (
        <hr
          style={{
            ...baseStyle,
            border: 'none',
            borderTop: `${component.thickness || '1px'} solid ${component.color || theme.colors.border}`,
            width: component.width || '100%',
            margin: '1rem auto',
          }}
        />
      );

    case 'spacer':
      return <div style={{ ...baseStyle, height: component.height }} />;

    case 'stats':
      return (
        <div
          style={baseStyle}
          className={`grid gap-4 grid-cols-${component.columns || 4}`}
        >
          {component.items.map((item) => (
            <div key={item.id} className="text-center">
              <div
                className="text-3xl font-bold"
                style={{ color: theme.colors.primary }}
              >
                {item.value}
              </div>
              <div className="text-sm" style={{ color: theme.colors.textMuted }}>
                {item.label}
              </div>
            </div>
          ))}
          {component.items.length === 0 && (
            <div className="col-span-full text-center text-app-text-subtle py-4">
              Add statistics items in the property panel
            </div>
          )}
        </div>
      );

    case 'testimonial':
      return (
        <blockquote style={baseStyle} className="text-center">
          <p
            className="text-lg italic mb-4"
            style={{ color: theme.colors.text }}
          >
            "{component.quote}"
          </p>
          <footer>
            {component.avatar && (
              <img
                src={component.avatar}
                alt={component.author}
                className="w-12 h-12 rounded-full mx-auto mb-2"
              />
            )}
            <cite className="not-italic">
              <span className="font-semibold" style={{ color: theme.colors.text }}>
                {component.author}
              </span>
              {component.title && (
                <span className="block text-sm" style={{ color: theme.colors.textMuted }}>
                  {component.title}
                </span>
              )}
            </cite>
          </footer>
        </blockquote>
      );

    case 'contact-form':
    case 'newsletter-signup':
    case 'donation-form':
      return (
        <div style={baseStyle} className="p-6 bg-app-surface-muted rounded-lg">
          <div className="text-center text-app-text-muted">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-medium">{component.type.replace('-', ' ')}</p>
            <p className="text-sm">Configure in property panel</p>
          </div>
        </div>
      );

    case 'event-list':
      return (
        <div style={baseStyle} className="p-6 bg-app-surface-muted rounded-lg">
          <div className="text-center text-app-text-muted">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="font-medium">Event List</p>
            <p className="text-sm">Shows {component.maxEvents} events</p>
          </div>
        </div>
      );

    case 'gallery':
      return (
        <div style={baseStyle}>
          {component.items && component.items.length > 0 ? (
            <div
              className={`grid gap-4`}
              style={{
                gridTemplateColumns: `repeat(${component.columns || 3}, 1fr)`,
                gap: component.gap || '1rem',
              }}
            >
              {component.items.map((item) => (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-lg bg-app-surface-muted"
                  style={{ aspectRatio: component.aspectRatio || '1' }}
                >
                  {item.src ? (
                    <img
                      src={item.src}
                      alt={item.alt || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-app-text-subtle">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-sm p-2">
                      {item.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-app-surface-muted rounded-lg text-center text-app-text-muted">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-medium">Gallery</p>
              <p className="text-sm">Add images in the property panel</p>
            </div>
          )}
        </div>
      );

    case 'video': {
      const getVideoEmbedUrl = () => {
        if (!component.src) return null;
        if (component.provider === 'youtube') {
          // Extract YouTube video ID
          const match = component.src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
          if (match) {
            return `HTTPS://www.youtube.com/embed/${match[1]}`;
          }
        }
        if (component.provider === 'vimeo') {
          const match = component.src.match(/vimeo\.com\/(\d+)/);
          if (match) {
            return `HTTPS://player.vimeo.com/video/${match[1]}`;
          }
        }
        return component.src;
      };

      const embedUrl = getVideoEmbedUrl();

      return (
        <div style={baseStyle}>
          {embedUrl ? (
            <div
              className="relative w-full rounded-lg overflow-hidden bg-black"
              style={{ aspectRatio: component.aspectRatio || '16/9' }}
            >
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video"
              />
            </div>
          ) : (
            <div
              className="bg-app-text rounded-lg flex items-center justify-center text-app-text-subtle"
              style={{
                aspectRatio: component.aspectRatio || '16/9',
                backgroundImage: component.poster ? `url(${component.poster})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Add video URL in property panel</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'map':
      return (
        <div style={baseStyle}>
          {component.address || (component.latitude && component.longitude) ? (
            <div
              className="relative w-full rounded-lg overflow-hidden bg-app-surface-muted"
              style={{ height: component.height || '300px' }}
            >
              {/* In production, integrate with Google Maps or OpenStreetMap */}
              <div className="absolute inset-0 flex items-center justify-center bg-app-surface-muted">
                <div className="text-center text-app-text-muted">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="font-medium">{component.address || 'Map Location'}</p>
                  {component.latitude && component.longitude && (
                    <p className="text-xs mt-1">
                      {component.latitude.toFixed(4)}, {component.longitude.toFixed(4)}
                    </p>
                  )}
                  <p className="text-xs mt-2 text-app-text-subtle">
                    Map preview in published site
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="bg-app-surface-muted rounded-lg flex items-center justify-center text-app-text-subtle"
              style={{ height: component.height || '300px' }}
            >
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="font-medium">Map</p>
                <p className="text-sm">Add location in property panel</p>
              </div>
            </div>
          )}
        </div>
      );

    case 'social-links': {
      const iconSizes = {
        sm: 'w-5 h-5',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
      };

      const getSocialIcon = (platform: string) => {
        switch (platform) {
          case 'facebook':
            return (
              <svg className={iconSizes[component.iconSize || 'md']} fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            );
          case 'twitter':
            return (
              <svg className={iconSizes[component.iconSize || 'md']} fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            );
          case 'instagram':
            return (
              <svg className={iconSizes[component.iconSize || 'md']} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            );
          case 'linkedin':
            return (
              <svg className={iconSizes[component.iconSize || 'md']} fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            );
          case 'youtube':
            return (
              <svg className={iconSizes[component.iconSize || 'md']} fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            );
          case 'tiktok':
            return (
              <svg className={iconSizes[component.iconSize || 'md']} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            );
          case 'email':
            return (
              <svg className={iconSizes[component.iconSize || 'md']} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            );
          case 'website':
            return (
              <svg className={iconSizes[component.iconSize || 'md']} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            );
          default:
            return null;
        }
      };

      return (
        <div style={baseStyle}>
          {component.links && component.links.length > 0 ? (
            <div
              className="flex flex-wrap gap-3"
              style={{
                justifyContent: component.align === 'center' ? 'center' : component.align === 'right' ? 'flex-end' : 'flex-start',
              }}
            >
              {component.links.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-lg transition-colors ${
                    component.iconStyle === 'filled'
                      ? 'bg-app-text text-white hover:bg-app-accent-hover'
                      : component.iconStyle === 'rounded'
                      ? 'bg-app-surface-muted text-app-text-muted hover:bg-app-surface-muted rounded-full'
                      : 'text-app-text-muted hover:text-app-text'
                  }`}
                  style={{ color: component.iconStyle === 'outline' ? theme.colors.primary : undefined }}
                >
                  {getSocialIcon(link.platform)}
                </a>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-app-surface-muted rounded-lg text-center text-app-text-muted">
              <div className="flex justify-center gap-4 mb-2">
                {getSocialIcon('facebook')}
                {getSocialIcon('twitter')}
                {getSocialIcon('instagram')}
              </div>
              <p className="font-medium">Social Links</p>
              <p className="text-sm">Add links in property panel</p>
            </div>
          )}
        </div>
      );
    }

    default:
      return (
        <div style={baseStyle} className="p-4 bg-app-surface-muted rounded text-app-text-muted text-center">
          {component.type} component
        </div>
      );
  }
};

export default EditorCanvas;
