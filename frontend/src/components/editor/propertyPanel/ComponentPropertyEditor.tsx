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
    <div className="w-72 overflow-y-auto border-l border-app-border bg-app-surface">
      <div className="border-b border-app-border p-4">
        <h3 className="font-semibold capitalize text-app-text">
          {selectedComponent.type.replace('-', ' ')}
        </h3>
      </div>

      <div className="space-y-4 p-4">
        {renderComponentProperties()}

        <div className="border-t border-app-border pt-4">
          <button
            onClick={() => onDeleteComponent(selectedComponent.id)}
            className="w-full rounded-md bg-app-accent-soft px-4 py-2 text-sm text-app-accent hover:bg-app-accent-soft"
          >
            Delete Component
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComponentPropertyEditor;
