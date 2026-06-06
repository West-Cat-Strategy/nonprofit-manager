const legacyPathRedirects: Record<string, string> = {
  '/email-marketing': '/settings/communications',
  '/settings/admin': '/settings/admin/dashboard',
  '/settings/admin/email': '/settings/communications',
  '/settings/admin/portal': '/settings/admin/portal/access',
  '/settings/organization': '/settings/admin/organization',
  '/admin/audit-logs': '/settings/admin/audit_logs',
};

const nextPath = legacyPathRedirects[window.location.pathname];

if (nextPath) {
  window.history.replaceState(
    null,
    '',
    `${nextPath}${window.location.search}${window.location.hash}`
  );
}
