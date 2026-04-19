import type { PublicEventDetail, PublicEventListItem } from '@app-types/event';
import type { PublishedPage, PublishedSite } from '@app-types/publishing';
import type { WebsiteEntry } from '@app-types/websiteBuilder';
import { escapeHtml } from '@services/site-generator/escapeHtml';

export type ResolvedRoute =
  | { kind: 'static'; page: PublishedPage }
  | { kind: 'eventsIndex'; page: PublishedPage }
  | { kind: 'eventDetail'; page: PublishedPage; slug: string }
  | { kind: 'newslettersIndex'; page: PublishedPage }
  | { kind: 'newsletterDetail'; page: PublishedPage; slug: string };

export type RuntimeContext =
  | { kind: 'static' }
  | { kind: 'eventsIndex'; items: PublicEventListItem[]; detailPathPattern: string }
  | { kind: 'eventDetail'; event: PublicEventDetail; detailPathPattern: string }
  | { kind: 'newslettersIndex'; items: WebsiteEntry[]; detailPathPattern: string }
  | { kind: 'newsletterDetail'; entry: WebsiteEntry; detailPathPattern: string };

export const getPublicSiteOwnerUserId = (site: PublishedSite): string => site.ownerUserId || site.userId;

export const normalizePath = (value: string): string => {
  if (!value || value === '/') {
    return '/';
  }
  const normalized = value.startsWith('/') ? value : `/${value}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
};

export const matchRoutePattern = (
  routePattern: string,
  requestPath: string
): { matches: boolean; params: Record<string, string> } => {
  const pattern = normalizePath(routePattern);
  const path = normalizePath(requestPath);
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = path.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return { matches: false, params: {} };
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const pathSegment = pathSegments[index];

    if (patternSegment.startsWith(':')) {
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
      continue;
    }

    if (patternSegment !== pathSegment) {
      return { matches: false, params: {} };
    }
  }

  return { matches: true, params };
};

export const getPageRoutePattern = (page: PublishedPage): string => {
  if (page.routePattern && page.routePattern.trim().length > 0) {
    return page.routePattern.trim();
  }

  if (page.pageType === 'collectionIndex') {
    if (page.collection === 'events') return '/events';
    if (page.collection === 'newsletters') return '/newsletters';
  }

  if (page.pageType === 'collectionDetail') {
    if (page.collection === 'events') return '/events/:slug';
    if (page.collection === 'newsletters') return '/newsletters/:slug';
  }

  return page.isHomepage ? '/' : `/${page.slug}`;
};

export const buildDetailPath = (pattern: string, slug: string): string =>
  normalizePath(pattern.replace(':slug', encodeURIComponent(slug)).replace(':id', encodeURIComponent(slug)));

export const buildAnalyticsScript = (siteId: string): string => `
  <script>
    (function() {
      var visitorId = localStorage.getItem('npm_visitor_id') || (function() {
        var id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('npm_visitor_id', id);
        return id;
      })();
      var sessionId = sessionStorage.getItem('npm_session_id') || (function() {
        var id = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem('npm_session_id', id);
        return id;
      })();

      fetch('/api/v2/sites/${escapeHtml(siteId)}/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'pageview',
          pagePath: window.location.pathname,
          visitorId: visitorId,
          sessionId: sessionId
        })
      }).catch(function() {});

      function trackClick(target) {
        if (!target || !target.getAttribute) {
          return;
        }
        var trackingNode = target.closest('[data-track-click="true"]');
        if (!trackingNode) {
          return;
        }

        var payload = {
          eventType: 'click',
          pagePath: window.location.pathname,
          visitorId: visitorId,
          sessionId: sessionId,
          eventData: {
            label: trackingNode.getAttribute('data-track-label') || trackingNode.textContent || '',
            href: trackingNode.getAttribute('data-track-href') || trackingNode.getAttribute('href') || '',
            tag: trackingNode.tagName
          }
        };

        var body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/v2/sites/${escapeHtml(siteId)}/track', new Blob([body], { type: 'application/json' }));
          return;
        }

        fetch('/api/v2/sites/${escapeHtml(siteId)}/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true
        }).catch(function() {});
      }

      document.addEventListener('click', function(event) {
        var node = event.target;
        while (node && node !== document && node.nodeType === 1) {
          if (node.getAttribute && node.getAttribute('data-track-click') === 'true') {
            trackClick(node);
            return;
          }
          node = node.parentNode;
        }
      }, true);
    })();
  </script>
`;

export const buildPublicFormRuntimeScript = (): string => `
  <script>
    (function() {
      async function submitForm(form) {
        var statusNode = form.querySelector('[data-form-status]');
        var payload = {};
        var formData = new FormData(form);
        var visitorId = localStorage.getItem('npm_visitor_id');
        var sessionId = sessionStorage.getItem('npm_session_id');
        formData.forEach(function(value, key) {
          payload[key] = value;
        });
        if (visitorId) {
          payload.visitorId = visitorId;
        }
        if (sessionId) {
          payload.sessionId = sessionId;
        }

        if (statusNode) {
          statusNode.textContent = 'Submitting...';
        }

        try {
          var response = await fetch(form.action, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          var data = await response.json();
          if (!response.ok || data.success === false) {
            throw new Error(data.error && data.error.message ? data.error.message : 'Submission failed');
          }

          var result = data.data || data;
          if (statusNode) {
            statusNode.textContent = result.message || 'Submitted successfully.';
          }
          if (result.redirectUrl) {
            window.location.assign(result.redirectUrl);
            return;
          }
          form.reset();
        } catch (error) {
          if (statusNode) {
            statusNode.textContent = error instanceof Error ? error.message : 'Submission failed';
          }
        }
      }

      function attachHandlers() {
        var forms = document.querySelectorAll('[data-public-site-form="true"]');
        forms.forEach(function(form) {
          form.addEventListener('submit', function(event) {
            event.preventDefault();
            submitForm(form);
          });
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachHandlers);
      } else {
        attachHandlers();
      }
    })();
  </script>
`;
