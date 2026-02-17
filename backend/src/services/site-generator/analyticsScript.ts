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

      fetch('/api/sites/' + siteId + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'pageview',
          pagePath: window.location.pathname,
          visitorId: visitorId,
          sessionId: sessionId
        })
      }).catch(function(err) { if (console && console.debug) console.debug('Analytics tracking failed:', err); });
    })();
  </script>
`;
}
