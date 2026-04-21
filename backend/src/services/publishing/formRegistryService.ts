import type {
  PublishedPage,
  WebsiteFormDefinition,
  WebsiteManagedFormType,
  WebsiteSiteSettings,
} from '@app-types/publishing';
import type { PageComponent, TemplatePage } from '@app-types/websiteBuilder';
import { buildPublicWebsiteFormSubmissionPath } from './publicWebsiteFormServiceHelpers';
import { mergeWebsiteFormOperationalConfig } from './siteSettingsService';

const MANAGED_FORM_TYPES = new Set<WebsiteManagedFormType>([
  'contact-form',
  'newsletter-signup',
  'donation-form',
  'volunteer-interest-form',
  'referral-form',
  'event-registration',
]);

const normalizePath = (value: string | undefined, fallback: string): string => {
  const raw = (value || fallback || '/').trim();
  if (!raw) return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
};

type RoutablePage = {
  routePattern?: string;
  slug: string;
  isHomepage: boolean;
};

const getPagePath = (page: RoutablePage): string =>
  normalizePath(page.routePattern, page.isHomepage ? '/' : `/${page.slug}`);

const PATH_PARAMETER_PATTERN = /(^|\/):[^/]+/;

const buildPageUrl = (baseUrl: string | null | undefined, path: string): string | null => {
  if (!baseUrl || PATH_PARAMETER_PATTERN.test(path)) {
    return null;
  }

  try {
    const url = new URL(baseUrl);
    url.pathname = path;
    const rendered = url.toString();

    if (path === '/') {
      return rendered.replace(/\/(?=\?|$)/, '');
    }

    return rendered.replace(/\/$/, '');
  } catch {
    return null;
  }
};

type WebsiteFormRuntimeContext = {
  siteKey: string;
  liveBaseUrl: string | null;
  livePreviewBaseUrl: string | null;
  previewBaseUrl: string | null;
};

const humanizeFormType = (formType: WebsiteManagedFormType): string => {
  switch (formType) {
    case 'contact-form':
      return 'Contact form';
    case 'newsletter-signup':
      return 'Newsletter signup';
    case 'donation-form':
      return 'Donation form';
    case 'volunteer-interest-form':
      return 'Volunteer interest form';
    case 'referral-form':
      return 'Referral form';
    case 'event-registration':
      return 'Event registration';
    default:
      return 'Website form';
  }
};

const traverseComponents = (
  components: PageComponent[],
  visitor: (component: PageComponent) => void
): void => {
  for (const component of components) {
    visitor(component);

    const componentRecord = component as PageComponent & {
      components?: PageComponent[];
      columns?: Array<{ components?: PageComponent[] }>;
    };

    if (Array.isArray(componentRecord.components)) {
      traverseComponents(componentRecord.components, visitor);
    }

    if (Array.isArray(componentRecord.columns)) {
      for (const column of componentRecord.columns) {
        if (Array.isArray(column.components)) {
          traverseComponents(column.components, visitor);
        }
      }
    }
  }
};

const isManagedForm = (component: PageComponent): component is PageComponent & {
  type: WebsiteManagedFormType;
} => MANAGED_FORM_TYPES.has(component.type as WebsiteManagedFormType);

const pickTitle = (
  component: PageComponent & { type: WebsiteManagedFormType },
  pageName: string
): string => {
  const componentRecord = component as unknown as Record<string, unknown>;
  const heading =
    typeof componentRecord.heading === 'string' && componentRecord.heading.trim().length > 0
      ? componentRecord.heading.trim()
      : undefined;
  const buttonText =
    typeof componentRecord.buttonText === 'string' && componentRecord.buttonText.trim().length > 0
      ? componentRecord.buttonText.trim()
      : typeof componentRecord.submitText === 'string' &&
          componentRecord.submitText.trim().length > 0
        ? componentRecord.submitText.trim()
        : undefined;

  return heading || buttonText || `${pageName} ${humanizeFormType(component.type)}`;
};

const pickDescription = (
  component: PageComponent & { type: WebsiteManagedFormType }
): string | undefined =>
  typeof (component as unknown as Record<string, unknown>).description === 'string' &&
  ((component as unknown as Record<string, unknown>).description as string).trim().length > 0
    ? ((component as unknown as Record<string, unknown>).description as string).trim()
    : undefined;

export class FormRegistryService {
  extract(
    pages: TemplatePage[],
    settings: WebsiteSiteSettings,
    livePages: PublishedPage[] = [],
    blocked: boolean = false,
    runtimeContext?: WebsiteFormRuntimeContext
  ): WebsiteFormDefinition[] {
    const livePathSet = new Set(livePages.map((page) => getPagePath(page)));
    const definitions: WebsiteFormDefinition[] = [];
    const siteKey = runtimeContext?.siteKey || settings.siteId;

    for (const page of pages) {
      const routePath = getPagePath(page);
      for (const section of page.sections) {
        traverseComponents(section.components, (component) => {
          if (!isManagedForm(component)) {
            return;
          }

          const live = livePathSet.has(routePath);
          const publicUrl = live ? buildPageUrl(runtimeContext?.liveBaseUrl, routePath) : null;
          const previewBaseUrl =
            runtimeContext?.previewBaseUrl ||
            (live ? runtimeContext?.livePreviewBaseUrl : null);

          definitions.push({
            formKey: component.id,
            componentId: component.id,
            formType: component.type,
            title: pickTitle(component, page.name),
            description: pickDescription(component),
            pageId: page.id,
            pageName: page.name,
            pageSlug: page.slug,
            pageType: page.pageType,
            collection: page.collection,
            routePattern: routePath,
            path: routePath,
            live,
            blocked,
            sourceConfig: { ...(component as unknown as Record<string, unknown>) },
            operationalSettings: mergeWebsiteFormOperationalConfig(
              component as unknown as Record<string, unknown>,
              settings,
              component.id
            ),
            publicRuntime: {
              siteKey,
              publicPath: routePath,
              publicUrl,
              previewUrl: buildPageUrl(previewBaseUrl, routePath),
              submissionPath: buildPublicWebsiteFormSubmissionPath(siteKey, component.id),
            },
          });
        });
      }
    }

    return definitions;
  }
}

export const formRegistryService = new FormRegistryService();
export default formRegistryService;
