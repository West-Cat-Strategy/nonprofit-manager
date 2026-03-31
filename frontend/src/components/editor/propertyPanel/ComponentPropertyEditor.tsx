import React from 'react';
import BasicComponentPropertyEditor from './BasicComponentPropertyEditor';
import EventComponentPropertyEditor from './EventComponentPropertyEditor';
import FormComponentPropertyEditor from './FormComponentPropertyEditor';
import GenericStylePropertyEditor from './GenericStylePropertyEditor';
import type { ComponentPropertyEditorProps } from './types';

const ComponentPropertyEditor: React.FC<ComponentPropertyEditorProps> = ({
  selectedComponent,
  onUpdateComponent,
  onDeleteComponent,
}) => {
  const renderComponentProperties = () => {
    switch (selectedComponent.type) {
      case 'heading':
      case 'text':
      case 'button':
      case 'image':
      case 'spacer':
      case 'divider':
        return (
          <BasicComponentPropertyEditor
            selectedComponent={selectedComponent}
            onUpdateComponent={onUpdateComponent}
          />
        );

      case 'contact-form':
      case 'newsletter-signup':
      case 'donation-form':
      case 'newsletter-archive':
      case 'volunteer-interest-form':
        return (
          <FormComponentPropertyEditor
            selectedComponent={selectedComponent}
            onUpdateComponent={onUpdateComponent}
          />
        );

      case 'event-list':
      case 'event-calendar':
      case 'event-detail':
      case 'event-registration':
        return (
          <EventComponentPropertyEditor
            selectedComponent={selectedComponent}
            onUpdateComponent={onUpdateComponent}
          />
        );

      default:
        return (
          <GenericStylePropertyEditor
            selectedComponent={selectedComponent}
            onUpdateComponent={onUpdateComponent}
          />
        );
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-sm">
      <div className="border-b border-app-border px-4 py-4">
        <h3 className="font-semibold capitalize text-app-text">
          {selectedComponent.type.replace('-', ' ')}
        </h3>
        <p className="mt-1 text-xs text-app-text-muted">Edit component content and behavior</p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {renderComponentProperties()}

        <div className="border-t border-app-border pt-4">
          <button
            onClick={() => onDeleteComponent(selectedComponent.id)}
            className="w-full rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
          >
            Delete Component
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComponentPropertyEditor;
