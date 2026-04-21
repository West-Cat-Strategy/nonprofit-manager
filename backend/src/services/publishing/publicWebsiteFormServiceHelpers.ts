import type {
  PublishedSite,
  RenderablePublishedComponent,
} from '@app-types/publishing';

export interface ContactIdentity {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  message?: string;
}

export type SupportedPublicWebsiteFormType =
  | 'contact-form'
  | 'newsletter-signup'
  | 'volunteer-interest-form'
  | 'referral-form'
  | 'donation-form';

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const buildPublicWebsiteFormSubmissionPath = (
  siteKey: string,
  formKey: string
): string =>
  `/api/v2/public/forms/${encodeURIComponent(siteKey)}/${encodeURIComponent(formKey)}/submit`;

export const normalizePhone = (value: string | undefined): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
};

export const isTruthyFlag = (value: unknown): boolean =>
  value === true || value === 'true' || value === 'on' || value === '1' || value === 1;

export const splitName = (value: string | undefined): { firstName: string; lastName: string } => {
  const parts = (value || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: 'Website', lastName: 'Visitor' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Visitor' };
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
};

export const toIdentity = (payload: Record<string, unknown>): ContactIdentity => {
  const name = typeof payload.name === 'string' ? splitName(payload.name) : null;
  return {
    firstName:
      typeof payload.first_name === 'string' && payload.first_name.trim().length > 0
        ? payload.first_name.trim()
        : name?.firstName || 'Website',
    lastName:
      typeof payload.last_name === 'string' && payload.last_name.trim().length > 0
        ? payload.last_name.trim()
        : name?.lastName || 'Visitor',
    email: typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : undefined,
    phone: typeof payload.phone === 'string' ? payload.phone.trim() : undefined,
    message:
      typeof payload.message === 'string'
        ? payload.message.trim()
        : typeof payload.notes === 'string'
          ? payload.notes.trim()
          : undefined,
  };
};

export const appendUniqueTags = (
  existing: string[] | null | undefined,
  incoming: string[] = []
): string[] => {
  const seen = new Set<string>();
  const values = [...(existing || []), ...incoming]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const deduped: string[] = [];
  for (const value of values) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(value);
  }
  return deduped;
};

export const findPublishedComponentById = (
  site: PublishedSite,
  componentId: string
): RenderablePublishedComponent | null => {
  if (!site.publishedContent) {
    return null;
  }

  const search = (
    components: RenderablePublishedComponent[]
  ): RenderablePublishedComponent | null => {
    for (const component of components) {
      if (component.id === componentId) {
        return component;
      }

      const nestedComponents = Array.isArray(component.components)
        ? (component.components as RenderablePublishedComponent[])
        : [];
      const nestedMatch = nestedComponents.length > 0 ? search(nestedComponents) : null;
      if (nestedMatch) {
        return nestedMatch;
      }

      const nestedColumns = Array.isArray(component.columns)
        ? (component.columns as Array<{ components?: RenderablePublishedComponent[] }>)
        : [];
      for (const column of nestedColumns) {
        const columnComponents = Array.isArray(column.components)
          ? (column.components as RenderablePublishedComponent[])
          : [];
        const columnMatch = search(columnComponents);
        if (columnMatch) {
          return columnMatch;
        }
      }
    }

    return null;
  };

  for (const page of site.publishedContent.pages) {
    for (const section of page.sections) {
      const match = search(section.components as RenderablePublishedComponent[]);
      if (match) {
        return match;
      }
    }
  }

  return null;
};

export const requireSupportedPublicWebsiteFormType = (
  component: RenderablePublishedComponent
): SupportedPublicWebsiteFormType => {
  if (
    component.type === 'contact-form' ||
    component.type === 'newsletter-signup' ||
    component.type === 'volunteer-interest-form' ||
    component.type === 'referral-form' ||
    component.type === 'donation-form'
  ) {
    return component.type;
  }

  throw new Error('Unsupported website form type');
};
