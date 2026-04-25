/**
 * Property Panel
 * Edit properties of selected component or section
 */

import React from 'react';
import ComponentPropertyEditor from './propertyPanel/ComponentPropertyEditor';
import PagePropertyEditor from './propertyPanel/PagePropertyEditor';
import SectionPropertyEditor from './propertyPanel/SectionPropertyEditor';
import type { PropertyPanelProps } from './propertyPanel/types';

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  currentPage = null,
  selectedComponent,
  selectedSection,
  onUpdatePage,
  onUpdateComponent,
  onUpdateSection,
  onDeleteComponent,
  onDeleteSection,
  previewHref,
  onPublishPage,
  canPublish,
  isPublishing,
}) => {
  if (!selectedComponent && !selectedSection) {
    if (currentPage && onUpdatePage) {
      return (
        <PagePropertyEditor
          currentPage={currentPage}
          onUpdatePage={onUpdatePage}
          previewHref={previewHref}
          onPublishPage={onPublishPage}
          canPublish={canPublish}
          isPublishing={isPublishing}
        />
      );
    }

    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-sm">
        <div className="flex-1 py-8 text-center text-app-text-muted">
          <svg
            className="mx-auto mb-2 h-12 w-12 text-app-text-subtle"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <p>Select an element to edit</p>
        </div>
      </div>
    );
  }

  if (selectedSection && !selectedComponent) {
    return (
      <SectionPropertyEditor
        selectedSection={selectedSection}
        onUpdateSection={onUpdateSection}
        onDeleteSection={onDeleteSection}
      />
    );
  }

  if (!selectedComponent) {
    return null;
  }

  return (
    <ComponentPropertyEditor
      selectedComponent={selectedComponent}
      onUpdateComponent={onUpdateComponent}
      onDeleteComponent={onDeleteComponent}
    />
  );
};

export default PropertyPanel;
