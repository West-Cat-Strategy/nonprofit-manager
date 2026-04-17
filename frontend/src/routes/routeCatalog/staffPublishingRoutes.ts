import type { RouteCatalogEntry } from './types';
import { staffRoute } from './shared';

export const staffPublishingRouteCatalogEntries: readonly RouteCatalogEntry[] = [
  staffRoute({
    id: 'website-builder',
    title: 'Website Builder',
    section: 'Builder',
    path: '/website-builder',
  }),
  staffRoute({
    id: 'websites',
    title: 'Websites',
    section: 'Websites',
    path: '/websites',
    primaryAction: { label: 'Open Builder', href: '/website-builder' },
    staffNav: {
      group: 'secondary',
      order: 85,
      label: 'Websites',
      shortLabel: 'Websites',
      ariaLabel: 'Go to websites',
      icon: '🌐',
      pinnedEligible: true,
    },
  }),
  staffRoute({
    id: 'website-console-redirect',
    title: 'Website Console',
    section: 'Websites',
    path: '/websites/:siteId',
  }),
  staffRoute({
    id: 'website-console-overview',
    title: 'Website Overview',
    section: 'Websites',
    path: '/websites/:siteId/overview',
  }),
  staffRoute({
    id: 'website-console-content',
    title: 'Website Content',
    section: 'Websites',
    path: '/websites/:siteId/content',
  }),
  staffRoute({
    id: 'website-console-newsletters',
    title: 'Website Newsletters',
    section: 'Websites',
    path: '/websites/:siteId/newsletters',
  }),
  staffRoute({
    id: 'website-console-forms',
    title: 'Website Forms',
    section: 'Websites',
    path: '/websites/:siteId/forms',
  }),
  staffRoute({
    id: 'website-console-integrations',
    title: 'Website Integrations',
    section: 'Websites',
    path: '/websites/:siteId/integrations',
  }),
  staffRoute({
    id: 'website-console-publishing',
    title: 'Website Publishing',
    section: 'Websites',
    path: '/websites/:siteId/publishing',
  }),
  staffRoute({
    id: 'website-console-builder',
    title: 'Website Builder (Site)',
    section: 'Websites',
    path: '/websites/:siteId/builder',
  }),
  staffRoute({
    id: 'website-builder-preview',
    title: 'Website Preview',
    section: 'Builder',
    path: '/website-builder/:templateId/preview',
  }),
  staffRoute({
    id: 'website-builder-editor',
    title: 'Website Editor',
    section: 'Builder',
    path: '/website-builder/:templateId',
  }),
];

export const staffPublishingRouteCatalogAuditTargets = [
  { path: '/website-builder' },
  { path: '/websites' },
  { href: '/website-builder' },
  { path: '/websites/:siteId' },
  { path: '/websites/:siteId/overview' },
  { path: '/websites/:siteId/content' },
  { path: '/websites/:siteId/newsletters' },
  { path: '/websites/:siteId/forms' },
  { path: '/websites/:siteId/integrations' },
  { path: '/websites/:siteId/publishing' },
  { path: '/websites/:siteId/builder' },
  { path: '/website-builder/:templateId/preview' },
  { path: '/website-builder/:templateId' },
] as const;
