import React from 'react';
import type { PageComponent } from '../../../../../types/websiteBuilder';
import { eventTypeOptions } from './options';

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
          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Max Events</label>
            <input
              type="number"
              min={1}
              max={50}
              value={selectedComponent.maxEvents || 6}
              onChange={(e) =>
                update({
                  maxEvents: Math.max(
                    1,
                    Math.min(50, Number.parseInt(e.target.value || '6', 10) || 6)
                  ),
                })
              }
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Layout</label>
            <select
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
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Event Type</label>
            <select
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
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Empty Message
            </label>
            <input
              type="text"
              value={selectedComponent.emptyMessage || ''}
              onChange={(e) => update({ emptyMessage: e.target.value || undefined })}
              placeholder="No public events are available right now."
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Site Key (Optional)
            </label>
            <input
              type="text"
              value={selectedComponent.siteKey || ''}
              onChange={(e) => update({ siteKey: e.target.value.trim() || undefined })}
              placeholder="Use only when embedding cross-site events"
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedComponent.showPastEvents || false}
                onChange={(e) => update({ showPastEvents: e.target.checked })}
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
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Max Events</label>
            <input
              type="number"
              min={1}
              max={50}
              value={selectedComponent.maxEvents || 8}
              onChange={(e) =>
                update({
                  maxEvents: Math.max(
                    1,
                    Math.min(50, Number.parseInt(e.target.value || '8', 10) || 8)
                  ),
                })
              }
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Initial View
            </label>
            <select
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
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">Event Type</label>
            <select
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
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedComponent.showPastEvents || false}
                onChange={(e) => update({ showPastEvents: e.target.checked })}
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
              onChange={(e) => update({ showDescription: e.target.checked })}
              className="rounded border-app-input-border"
            />
            Show description
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedComponent.showLocation !== false}
              onChange={(e) => update({ showLocation: e.target.checked })}
              className="rounded border-app-input-border"
            />
            Show location
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedComponent.showCapacity !== false}
              onChange={(e) => update({ showCapacity: e.target.checked })}
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
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Submit Text
            </label>
            <input
              type="text"
              value={selectedComponent.submitText || 'Register'}
              onChange={(e) => update({ submitText: e.target.value })}
              className="w-full rounded-md border border-app-input-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-app-text-muted">
              Default Registration Status
            </label>
            <select
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
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedComponent.includePhone !== false}
              onChange={(e) => update({ includePhone: e.target.checked })}
              className="rounded border-app-input-border"
            />
            Include phone field
          </label>
        </>
      );

    default:
      return null;
  }
};

export default EventComponentPropertyEditor;
