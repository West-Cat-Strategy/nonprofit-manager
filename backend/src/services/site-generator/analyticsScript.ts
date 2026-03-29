import { escapeHtml } from './escapeHtml';

export function generateSiteAnalyticsScript(templateId: string): string {
  return `
  <!-- Site Analytics -->
  <script>
    (function() {
      var siteId = '${escapeHtml(templateId)}';
      var visitorId = localStorage.getItem('npm_visitor_id') || (function() {
        var id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('npm_visitor_id', id);
        return id;
      })();
      var sessionId = sessionStorage.getItem('npm_session_id') || (function() {
        var id = 's_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        sessionStorage.setItem('npm_session_id', id);
        return id;
      })();

      fetch('/api/v2/sites/' + siteId + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'pageview',
          pagePath: window.location.pathname,
          visitorId: visitorId,
          sessionId: sessionId
        })
      }).catch(function(err) { if (console && console.debug) console.debug('Analytics tracking failed:', err); });

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
          navigator.sendBeacon('/api/v2/sites/' + siteId + '/track', new Blob([body], { type: 'application/json' }));
          return;
        }

        fetch('/api/v2/sites/' + siteId + '/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true
        }).catch(function(err) { if (console && console.debug) console.debug('Click analytics tracking failed:', err); });
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
}
