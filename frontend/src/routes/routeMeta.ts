export interface RouteMeta {
  title: string;
  section: 'Auth' | 'Portal' | 'People' | 'Engagement' | 'Finance' | 'Analytics' | 'Settings' | 'Builder' | 'Core' | 'Demo';
  requiresAuth: boolean;
  primaryAction?: {
    label: string;
    path: string;
  };
}

type RouteMetaMatcher = {
  pattern: RegExp;
  meta: RouteMeta;
};

const routeMetaMatchers: RouteMetaMatcher[] = [
  { pattern: /^\/(login|register|setup|forgot-password|reset-password|accept-invitation)/, meta: { title: 'Authentication', section: 'Auth', requiresAuth: false } },
  { pattern: /^\/portal(\/|$)/, meta: { title: 'Client Portal', section: 'Portal', requiresAuth: true } },
  { pattern: /^\/accounts(\/|$)/, meta: { title: 'Accounts', section: 'People', requiresAuth: true, primaryAction: { label: 'New Account', path: '/accounts/new' } } },
  { pattern: /^\/contacts(\/|$)/, meta: { title: 'Contacts', section: 'People', requiresAuth: true, primaryAction: { label: 'New Contact', path: '/contacts/new' } } },
  { pattern: /^\/volunteers(\/|$)/, meta: { title: 'Volunteers', section: 'People', requiresAuth: true, primaryAction: { label: 'New Volunteer', path: '/volunteers/new' } } },
  { pattern: /^\/(events|tasks|cases|follow-ups|opportunities|external-service-providers)(\/|$)/, meta: { title: 'Engagement', section: 'Engagement', requiresAuth: true } },
  { pattern: /^\/(donations|reconciliation)(\/|$)/, meta: { title: 'Finance', section: 'Finance', requiresAuth: true } },
  { pattern: /^\/(analytics|reports|dashboard\/custom)(\/|$)/, meta: { title: 'Analytics', section: 'Analytics', requiresAuth: true } },
  { pattern: /^\/settings(\/|$)/, meta: { title: 'Settings', section: 'Settings', requiresAuth: true } },
  { pattern: /^\/website-builder(\/|$)/, meta: { title: 'Website Builder', section: 'Builder', requiresAuth: true } },
  { pattern: /^\/(dashboard|people|linking|operations|outreach|intake|interactions)(\/|$)/, meta: { title: 'Workspace', section: 'Core', requiresAuth: true } },
  { pattern: /^\/demo(\/|$)/, meta: { title: 'Demo', section: 'Demo', requiresAuth: false } },
];

export function getRouteMeta(pathname: string): RouteMeta {
  const matched = routeMetaMatchers.find((item) => item.pattern.test(pathname));
  if (matched) {
    return matched.meta;
  }
  return {
    title: 'Workspace',
    section: 'Core',
    requiresAuth: true,
  };
}
