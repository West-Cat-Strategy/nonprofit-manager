export function generateEventListRuntimeScript(): string {
  return `
  <script>
    (function() {
      function parseBoolean(value) {
        return value === 'true' || value === true;
      }

      function parseInteger(value, fallback) {
        var parsed = Number.parseInt(String(value || ''), 10);
        if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 1) {
          return fallback;
        }
        return parsed;
      }

      function formatDateRange(startDate, endDate) {
        var start = new Date(startDate);
        var end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return 'Date TBD';
        }
        return start.toLocaleString() + ' - ' + end.toLocaleString();
      }

      function buildLocation(eventItem) {
        var parts = [
          eventItem.location_name,
          eventItem.city,
          eventItem.state_province,
          eventItem.country,
        ].filter(function(part) {
          return typeof part === 'string' && part.trim().length > 0;
        });

        return parts.length > 0 ? parts.join(', ') : 'Location TBD';
      }

      function truncate(value, maxLength) {
        if (typeof value !== 'string') {
          return '';
        }

        if (value.length <= maxLength) {
          return value;
        }

        return value.slice(0, maxLength - 1) + '\u2026';
      }

      function setListLayout(listNode, layout) {
        if (layout === 'grid') {
          listNode.style.display = 'grid';
          listNode.style.gridTemplateColumns = 'repeat(auto-fit, minmax(240px, 1fr))';
          listNode.style.gap = '1rem';
          return;
        }

        listNode.style.display = 'flex';
        listNode.style.flexDirection = 'column';
        listNode.style.gap = '0.75rem';
      }

      function buildEventCard(eventItem, compact) {
        var article = document.createElement('article');
        article.className = 'event-list-card';
        article.style.border = '1px solid var(--color-border, #e5e7eb)';
        article.style.borderRadius = 'var(--radius-md, 8px)';
        article.style.padding = compact ? '0.75rem 1rem' : '1rem';
        article.style.background = 'var(--color-surface, #ffffff)';

        var title = document.createElement('h3');
        title.style.margin = '0 0 0.5rem';
        title.style.fontSize = compact ? '1rem' : '1.1rem';
        title.textContent = typeof eventItem.event_name === 'string' ? eventItem.event_name : 'Untitled event';

        var date = document.createElement('p');
        date.style.margin = '0 0 0.5rem';
        date.style.color = 'var(--color-text-muted, #6b7280)';
        date.style.fontSize = '0.9rem';
        date.textContent = formatDateRange(eventItem.start_date, eventItem.end_date);

        var location = document.createElement('p');
        location.style.margin = '0 0 0.5rem';
        location.style.color = 'var(--color-text-muted, #6b7280)';
        location.style.fontSize = '0.9rem';
        location.textContent = buildLocation(eventItem);

        article.appendChild(title);
        article.appendChild(date);
        article.appendChild(location);

        if (typeof eventItem.description === 'string' && eventItem.description.trim().length > 0) {
          var description = document.createElement('p');
          description.style.margin = '0';
          description.style.lineHeight = '1.4';
          description.textContent = truncate(eventItem.description.trim(), compact ? 140 : 220);
          article.appendChild(description);
        }

        return article;
      }

      function renderEmptyState(listNode, message) {
        listNode.innerHTML = '';
        var empty = document.createElement('p');
        empty.style.margin = '0';
        empty.style.padding = '0.75rem 0';
        empty.style.color = 'var(--color-text-muted, #6b7280)';
        empty.textContent = message;
        listNode.appendChild(empty);
      }

      async function fetchAndRender(container) {
        var listNode = container.querySelector('[data-event-list-items]');
        var loadingNode = container.querySelector('[data-event-list-loading]');
        var calendarFallbackNode = container.querySelector('[data-event-list-calendar-fallback]');

        if (!listNode) {
          return;
        }

        var layout = container.getAttribute('data-layout') || 'grid';
        var resolvedLayout = layout === 'list' || layout === 'grid' ? layout : 'list';
        var maxEvents = parseInteger(container.getAttribute('data-max-events'), 6);
        var showPastEvents = parseBoolean(container.getAttribute('data-show-past-events'));
        var eventType = container.getAttribute('data-event-type') || '';
        var emptyMessage =
          container.getAttribute('data-empty-message') || 'No public events are available right now.';
        var siteKey = container.getAttribute('data-site-key') || '';

        if (calendarFallbackNode) {
          calendarFallbackNode.hidden = layout !== 'calendar';
        }

        setListLayout(listNode, resolvedLayout);

        var endpoint = siteKey
          ? '/api/v2/public/events/sites/' + encodeURIComponent(siteKey)
          : '/api/v2/public/events';

        var params = new URLSearchParams();
        params.set('limit', String(maxEvents));
        params.set('offset', '0');
        params.set('sort_by', 'start_date');
        params.set('sort_order', 'asc');
        if (showPastEvents) {
          params.set('include_past', 'true');
        }
        if (eventType) {
          params.set('event_type', eventType);
        }

        if (loadingNode) {
          loadingNode.hidden = false;
        }

        try {
          var response = await fetch(endpoint + '?' + params.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch public events');
          }

          var payload = await response.json();
          var data = payload && payload.success === true ? payload.data : payload;
          var items = Array.isArray(data && data.items) ? data.items : [];

          listNode.innerHTML = '';
          if (items.length === 0) {
            renderEmptyState(listNode, emptyMessage);
            return;
          }

          var compactCards = resolvedLayout !== 'grid';
          items.forEach(function(eventItem) {
            listNode.appendChild(buildEventCard(eventItem, compactCards));
          });
        } catch (_error) {
          renderEmptyState(listNode, 'Unable to load events right now. Please try again later.');
        } finally {
          if (loadingNode) {
            loadingNode.hidden = true;
          }
        }
      }

      function initializeEventLists() {
        var containers = document.querySelectorAll('[data-event-list="true"]');
        containers.forEach(function(node) {
          fetchAndRender(node);
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEventLists);
      } else {
        initializeEventLists();
      }
    })();
  </script>
`;
}
