import type { PublishedTheme, RenderablePublishedComponent } from '@app-types/publishing';
import { escapeHtml } from '../escapeHtml';

const DEFAULT_EMPTY_MESSAGE = 'No public events are available right now.';

const parsePositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
};

const resolveLayout = (value: unknown): 'list' | 'grid' | 'calendar' => {
  if (value === 'list' || value === 'grid' || value === 'calendar') {
    return value;
  }
  return 'grid';
};

const resolveEventType = (component: RenderablePublishedComponent): string | undefined => {
  const eventType = typeof component.eventType === 'string' ? component.eventType.trim() : '';
  if (eventType.length > 0) {
    return eventType;
  }

  const legacyTag = typeof component.filterByTag === 'string' ? component.filterByTag.trim() : '';
  return legacyTag.length > 0 ? legacyTag : undefined;
};

export function generateEventList(
  component: RenderablePublishedComponent,
  theme: PublishedTheme
): string {
  const maxEvents = Math.min(parsePositiveInt(component.maxEvents, 6), 50);
  const layout = resolveLayout(component.layout);
  const showPastEvents = component.showPastEvents === true;
  const eventType = resolveEventType(component);
  const emptyMessage =
    typeof component.emptyMessage === 'string' && component.emptyMessage.trim().length > 0
      ? component.emptyMessage.trim()
      : DEFAULT_EMPTY_MESSAGE;
  const siteKey =
    typeof component.siteKey === 'string' && component.siteKey.trim().length > 0
      ? component.siteKey.trim()
      : undefined;

  return `
      <section
        class="event-list-component"
        data-event-list="true"
        data-max-events="${maxEvents}"
        data-layout="${escapeHtml(layout)}"
        data-show-past-events="${showPastEvents ? 'true' : 'false'}"
        ${eventType ? `data-event-type="${escapeHtml(eventType)}"` : ''}
        data-empty-message="${escapeHtml(emptyMessage)}"
        ${siteKey ? `data-site-key="${escapeHtml(siteKey)}"` : ''}
        style="display: flex; flex-direction: column; gap: 1rem;"
      >
        <div
          class="event-list-loading"
          data-event-list-loading
          style="padding: 1rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md}; color: ${theme.colors.textMuted};"
        >
          Loading events...
        </div>
        <div
          class="event-list-calendar-fallback"
          data-event-list-calendar-fallback
          hidden
          style="padding: 0.75rem 1rem; border: 1px solid ${theme.colors.warning}; border-radius: ${theme.borderRadius.md}; color: ${theme.colors.warning}; background: ${theme.colors.surface};"
        >
          Calendar view is not available yet. Rendering list view instead.
        </div>
        <div class="event-list-items" data-event-list-items></div>
      </section>`;
}
