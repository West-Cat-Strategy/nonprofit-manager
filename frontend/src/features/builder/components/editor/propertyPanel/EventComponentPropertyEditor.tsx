import React from 'react';
import type { PageComponent } from '../../../../../types/websiteBuilder';
import { eventTypeOptions } from './options';
import { DraftInput } from './DraftPropertyFields';
import { parseBoundedInteger } from './draftPropertyParsers';
import { PropertyPanelCheckbox, PropertyPanelField } from './PropertyPanelField';

interface EventComponentPropertyEditorProps {
  selectedComponent: PageComponent;
  onUpdateComponent: (id: string, updates: Partial<PageComponent>) => void;
}

const EventComponentPropertyEditor: React.FC<EventComponentPropertyEditorProps> = ({
  selectedComponent,
  onUpdateComponent,
}) => {
  const update = (updates: Partial<PageComponent>) =>
    onUpdateComponent(selectedComponent.id, updates);

  switch (selectedComponent.type) {
    case 'event-list': {
      const selectedEventType = selectedComponent.eventType || selectedComponent.filterByTag || '';

      return (
        <>
          <PropertyPanelField label="Max Events">
            {(fieldId) => (
              <DraftInput
                id={fieldId}
                type="number"
                min={1}
                max={50}
                value={String(selectedComponent.maxEvents || 6)}
                onCommit={(value) =>
                  update({
                    maxEvents: parseBoundedInteger(value, 6, 1, 50),
                  })
                }
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              />
            )}
          </PropertyPanelField>

          <PropertyPanelField label="Layout">
            {(fieldId) => (
              <select
                id={fieldId}
                value={selectedComponent.layout || 'grid'}
                onChange={(e) =>
                  update({
                    layout: e.target.value as 'grid' | 'list' | 'calendar',
                  })
                }
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              >
                <option value="grid">Grid</option>
                <option value="list">List</option>
                <option value="calendar">Calendar (fallback to list)</option>
              </select>
            )}
          </PropertyPanelField>

          <PropertyPanelField label="Event Type">
            {(fieldId) => (
              <select
                id={fieldId}
                value={selectedEventType}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  update({
                    eventType: value || undefined,
                    filterByTag: value || undefined,
                  });
                }}
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              >
                {eventTypeOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </PropertyPanelField>

          <PropertyPanelField label="Empty Message">
            {(fieldId) => (
              <input
                id={fieldId}
                type="text"
                value={selectedComponent.emptyMessage || ''}
                onChange={(e) => update({ emptyMessage: e.target.value || undefined })}
                placeholder="No public events are available right now."
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              />
            )}
          </PropertyPanelField>

          <PropertyPanelField label="Site Key (Optional)">
            {(fieldId) => (
              <DraftInput
                id={fieldId}
                type="text"
                value={selectedComponent.siteKey || ''}
                onCommit={(value) => update({ siteKey: value.trim() || undefined })}
                placeholder="Use only when embedding cross-site events"
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              />
            )}
          </PropertyPanelField>

          <PropertyPanelCheckbox
            checked={selectedComponent.showPastEvents || false}
            label="Show past events"
            onChange={(e) => update({ showPastEvents: e.target.checked })}
          />
        </>
      );
    }

    case 'event-calendar':
      return (
        <>
          <PropertyPanelField label="Max Events">
            {(fieldId) => (
              <DraftInput
                id={fieldId}
                type="number"
                min={1}
                max={50}
                value={String(selectedComponent.maxEvents || 8)}
                onCommit={(value) =>
                  update({
                    maxEvents: parseBoundedInteger(value, 8, 1, 50),
                  })
                }
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              />
            )}
          </PropertyPanelField>

          <PropertyPanelField label="Initial View">
            {(fieldId) => (
              <select
                id={fieldId}
                value={selectedComponent.initialView || 'month'}
                onChange={(e) =>
                  update({
                    initialView: e.target.value as 'month' | 'agenda',
                  })
                }
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              >
                <option value="month">Month</option>
                <option value="agenda">Agenda</option>
              </select>
            )}
          </PropertyPanelField>

          <PropertyPanelField label="Event Type">
            {(fieldId) => (
              <select
                id={fieldId}
                value={selectedComponent.eventType || ''}
                onChange={(e) => update({ eventType: e.target.value || undefined })}
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              >
                {eventTypeOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </PropertyPanelField>

          <PropertyPanelCheckbox
            checked={selectedComponent.showPastEvents || false}
            label="Show past events"
            onChange={(e) => update({ showPastEvents: e.target.checked })}
          />
        </>
      );

    case 'event-detail':
      return (
        <div className="space-y-2">
          <PropertyPanelCheckbox
            checked={selectedComponent.showDescription !== false}
            label="Show description"
            onChange={(e) => update({ showDescription: e.target.checked })}
          />

          <PropertyPanelCheckbox
            checked={selectedComponent.showLocation !== false}
            label="Show location"
            onChange={(e) => update({ showLocation: e.target.checked })}
          />

          <PropertyPanelCheckbox
            checked={selectedComponent.showCapacity !== false}
            label="Show capacity"
            onChange={(e) => update({ showCapacity: e.target.checked })}
          />
        </div>
      );

    case 'event-registration':
      return (
        <>
          <PropertyPanelField label="Submit Text">
            {(fieldId) => (
              <DraftInput
                id={fieldId}
                type="text"
                value={selectedComponent.submitText || 'Register'}
                onCommit={(value) => update({ submitText: value || undefined })}
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              />
            )}
          </PropertyPanelField>

          <PropertyPanelField label="Default Registration Status">
            {(fieldId) => (
              <select
                id={fieldId}
                value={selectedComponent.defaultStatus || 'registered'}
                onChange={(e) =>
                  update({
                    defaultStatus: e.target.value as
                      | 'registered'
                      | 'waitlisted'
                      | 'cancelled'
                      | 'confirmed'
                      | 'no_show',
                  })
                }
                className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
              >
                <option value="registered">Registered</option>
                <option value="confirmed">Confirmed</option>
                <option value="waitlisted">Waitlisted</option>
              </select>
            )}
          </PropertyPanelField>

          <PropertyPanelCheckbox
            checked={selectedComponent.includePhone !== false}
            label="Include phone field"
            onChange={(e) => update({ includePhone: e.target.checked })}
          />
        </>
      );

    default:
      return null;
  }
};

export default EventComponentPropertyEditor;
