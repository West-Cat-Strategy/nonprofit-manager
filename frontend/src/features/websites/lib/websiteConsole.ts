import type {
  WebsiteFormDefinition,
  WebsiteIntegrationStatus,
  WebsiteManagedFormType,
  WebsiteManagementSnapshot,
  WebsiteOverviewSummary,
  WebsiteSiteManagementSummary,
  WebsiteSiteSummary,
} from '../types';
import {
  getWebsiteBuilderPath,
  getWebsiteContentPath,
  getWebsiteFormsPath,
  getWebsiteIntegrationsPath,
  getWebsiteNewslettersPath,
  getWebsiteOverviewPath,
  getWebsitePublishingPath,
} from './websiteRouteTargets';

type FormDependencyKey = 'crm' | 'newsletter' | 'stripe' | 'events';

export interface FormSurfaceMeta {
  label: string;
  description: string;
  dependencyLabel: string;
  dependencyKey: FormDependencyKey;
}

const FORM_SURFACE_META: Record<WebsiteManagedFormType, FormSurfaceMeta> = {
  'contact-form': {
    label: 'Contact / referral',
    description: 'Conversations, intake, and referrals land in the CRM inbox.',
    dependencyLabel: 'CRM',
    dependencyKey: 'crm',
  },
  'newsletter-signup': {
    label: 'Newsletter signup',
    description: 'Subscriber capture and supporter updates route through the active newsletter provider.',
    dependencyLabel: 'Newsletter provider',
    dependencyKey: 'newsletter',
  },
  'donation-form': {
    label: 'Donate',
    description: 'Donation amounts and recurring support depend on the selected payment provider.',
    dependencyLabel: 'Donation provider',
    dependencyKey: 'stripe',
  },
  'volunteer-interest-form': {
    label: 'Volunteer',
    description: 'Volunteer interest submissions land in the CRM for follow-up.',
    dependencyLabel: 'CRM',
    dependencyKey: 'crm',
  },
  'referral-form': {
    label: 'Referral',
    description: 'Referrals create CRM intake records for staff follow-up.',
    dependencyLabel: 'CRM',
    dependencyKey: 'crm',
  },
  'event-registration': {
    label: 'Events',
    description: 'Event signups stay tied to the live public event route.',
    dependencyLabel: 'Events',
    dependencyKey: 'events',
  },
};

const PRIMARY_MANAGED_FORM_PRIORITY: WebsiteManagedFormType[] = [
  'contact-form',
  'newsletter-signup',
  'donation-form',
  'volunteer-interest-form',
  'referral-form',
  'event-registration',
];

const PUBLIC_SUBMISSION_FORM_TYPES = new Set<WebsiteManagedFormType>([
  'contact-form',
  'newsletter-signup',
  'donation-form',
  'volunteer-interest-form',
  'referral-form',
]);

const PATH_PARAMETER_PATTERN = /(^|\/):[^/]+/;

type FormMetadataRecord = Record<string, unknown>;

export interface WebsiteManagedFormVerificationSummary {
  form: WebsiteFormDefinition;
  surfaceMeta: FormSurfaceMeta;
  dependency: {
    label: string;
    ready: boolean;
    detail: string;
  };
  readiness: {
    launchReady: boolean;
    preview: boolean;
    live: boolean;
    submission: boolean;
    dependency: boolean;
  };
  publishState: 'draft' | 'preview' | 'live' | 'live-preview';
  publishStateLabel: string;
  publishStateDetail: string;
  launchStateLabel: string;
  launchStateDetail: string;
  previewPageUrl: string | null;
  livePageUrl: string | null;
  submissionEndpoint: string | null;
  submissionMethod: string;
}

const isRecord = (value: unknown): value is FormMetadataRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getNestedRecord = (
  value: FormMetadataRecord | null,
  key: string
): FormMetadataRecord | null => {
  if (!value) return null;
  const nested = value[key];
  return isRecord(nested) ? nested : null;
};

const getMetadataRecords = (form: WebsiteFormDefinition): FormMetadataRecord[] => {
  const formRecord = form as unknown as FormMetadataRecord;
  const sourceConfig = isRecord(form.sourceConfig) ? form.sourceConfig : null;
  const candidates = [
    getNestedRecord(formRecord, 'runtimeMetadata'),
    getNestedRecord(formRecord, 'runtime'),
    getNestedRecord(formRecord, 'publicSurface'),
    getNestedRecord(formRecord, 'verification'),
    getNestedRecord(formRecord, 'publicRuntime'),
    getNestedRecord(formRecord, 'managedRuntime'),
    sourceConfig,
    getNestedRecord(sourceConfig, 'runtimeMetadata'),
    getNestedRecord(sourceConfig, 'runtime'),
    getNestedRecord(sourceConfig, 'publicSurface'),
    getNestedRecord(sourceConfig, 'verification'),
  ];

  return [formRecord, ...candidates.filter((candidate): candidate is FormMetadataRecord => Boolean(candidate))];
};

const pickStringCandidate = (
  records: FormMetadataRecord[],
  keys: string[]
): string | null => {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
  }
  return null;
};

const pickBooleanCandidate = (
  records: FormMetadataRecord[],
  keys: string[]
): boolean | null => {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'boolean') {
        return value;
      }
    }
  }
  return null;
};

const normalizePublicPath = (value?: string | null): string => {
  if (!value) return '/';
  const [pathname] = value.split('?');
  const trimmed = pathname.trim();
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const buildPublicSurfaceUrl = (
  baseUrl: string | null | undefined,
  path: string | null | undefined
): string | null => {
  if (!baseUrl) return null;

  if (path && !path.startsWith('?') && PATH_PARAMETER_PATTERN.test(path)) {
    return null;
  }

  try {
    const url = new URL(baseUrl);

    if (path?.startsWith('?')) {
      url.search = path;
      return url.toString();
    }

    if (path) {
      const [pathname, search] = path.split('?');
      url.pathname = normalizePublicPath(pathname);
      if (search) {
        url.search = `?${search}`;
      }
      return url.toString();
    }

    return url.toString();
  } catch {
    return null;
  }
};

const resolveRuntimeUrl = (
  candidate: string | null,
  baseUrl: string | null | undefined,
  fallbackPath: string
): string | null => {
  if (!candidate) {
    return buildPublicSurfaceUrl(baseUrl, fallbackPath);
  }

  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  if (candidate.startsWith('/') || candidate.startsWith('?')) {
    return buildPublicSurfaceUrl(baseUrl, candidate);
  }

  return buildPublicSurfaceUrl(baseUrl, fallbackPath);
};

const toDateValue = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

const toDateLabel = (value: Date | string | null | undefined): string => {
  const date = toDateValue(value);
  if (!date) return 'Not available';
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
};

const hasIntegration = (
  dependencyKey: FormDependencyKey,
  integrations: WebsiteIntegrationStatus
): boolean => {
  switch (dependencyKey) {
    case 'newsletter':
      return Boolean(
        integrations.newsletter.configured && integrations.newsletter.selectedAudienceId
      );
    case 'stripe':
      return integrations.stripe.configured;
    case 'crm':
    case 'events':
      return true;
    default:
      return true;
  }
};

const EMPTY_INTEGRATIONS: WebsiteIntegrationStatus = {
  blocked: false,
  publishStatus: 'draft',
  newsletter: {
    provider: 'mautic',
    configured: false,
    selectedAudienceId: null,
    selectedAudienceName: null,
    selectedPresetId: null,
    listPresets: [],
    availableAudiences: [],
    audienceCount: 0,
    lastRefreshedAt: null,
    lastSyncAt: null,
  },
  mailchimp: {
    configured: false,
    availableAudiences: [],
    lastSyncAt: null,
  },
  mautic: {
    configured: false,
    availableAudiences: [],
    lastSyncAt: null,
  },
  stripe: {
    configured: false,
    publishableKeyConfigured: false,
  },
  social: {
    facebook: {
      lastSyncAt: null,
      lastSyncError: null,
    },
  },
};

const buildSiteManagementNextAction = (
  site: WebsiteSiteSummary,
  readiness: WebsiteSiteManagementSummary['readiness']
): WebsiteSiteManagementSummary['nextAction'] => {
  const publishingHref = getWebsitePublishingPath(site.id);
  const overviewHref = getWebsiteOverviewPath(site.id);

  if (site.blocked) {
    return {
      title: 'Resolve the blocked assignment',
      detail: 'Publishing, domains, and live changes stay paused until the site is assigned.',
      href: publishingHref,
      tone: 'warning',
    };
  }

  if (!readiness.publish) {
    return {
      title: 'Publish the site',
      detail: 'Draft pages exist, but the public site still needs a publish step.',
      href: publishingHref,
      tone: 'primary',
    };
  }

  if (!readiness.domain) {
    return {
      title: 'Set the public domain',
      detail: 'Add a subdomain or custom domain before sharing the site more broadly.',
      href: publishingHref,
      tone: 'warning',
    };
  }

  if (!readiness.ssl) {
    return {
      title: 'Review SSL settings',
      detail: 'Secure traffic for the live domain before the certificate expires.',
      href: publishingHref,
      tone: 'warning',
    };
  }

  if (!readiness.analytics) {
    return {
      title: 'Enable analytics',
      detail: 'Turn on analytics to track visits and conversions from the site hub.',
      href: overviewHref,
      tone: 'warning',
    };
  }

  return {
    title: 'Open the site overview',
    detail: 'Review content, forms, integrations, and publishing details from the console.',
    href: overviewHref,
    tone: 'neutral',
  };
};

export const deriveWebsiteSiteManagementSummary = (
  site: WebsiteSiteSummary
): WebsiteSiteManagementSummary => {
  const sslCertificateExpiresAt = toDateValue(site.sslCertificateExpiresAt);
  const sslExpiringSoon =
    Boolean(site.customDomain) &&
    sslCertificateExpiresAt !== null &&
    sslCertificateExpiresAt.getTime() - Date.now() <= 1000 * 60 * 60 * 24 * 30;

  const readiness: WebsiteSiteManagementSummary['readiness'] = {
    publish: site.status === 'published' && Boolean(site.publishedVersion),
    preview: Boolean(site.previewUrl),
    domain: Boolean(site.customDomain || site.subdomain),
    ssl: !site.customDomain || (site.sslEnabled && !sslExpiringSoon),
    analytics: site.analyticsEnabled,
  };

  const attentionCount = Object.values(readiness).filter((value) => !value).length;

  return {
    status: site.blocked ? 'blocked' : attentionCount > 0 ? 'attention' : 'healthy',
    nextAction: buildSiteManagementNextAction(site, readiness),
    readiness,
    attentionCount,
  };
};

const buildNextAction = (
  overview: WebsiteOverviewSummary,
  snapshot: Omit<WebsiteManagementSnapshot, 'nextAction'>
): WebsiteManagementSnapshot['nextAction'] => {
  const siteId = overview.site.id;
  const publishingHref = getWebsitePublishingPath(siteId);
  const formsHref = getWebsiteFormsPath(siteId);
  const integrationsHref = getWebsiteIntegrationsPath(siteId);
  const newslettersHref = getWebsiteNewslettersPath(siteId);
  const deployment = overview.deployment || {
    primaryUrl: overview.site.primaryUrl,
    previewUrl: null,
    domainStatus: 'none' as const,
    sslStatus: 'unconfigured' as const,
  };

  if (snapshot.status === 'blocked') {
    return {
      title: 'Resolve the blocking site assignment',
      detail: 'Publishing, domains, and integration edits are paused until the site is assigned.',
      href: publishingHref,
      tone: 'warning',
    };
  }

  if (!snapshot.readiness.publish) {
    return {
      title: 'Publish the site',
      detail: 'Draft pages are ready. Publish to make the public nonprofit site live.',
      href: publishingHref,
      tone: 'primary',
    };
  }

  if (!snapshot.readiness.domain) {
    return {
      title: 'Configure the public domain',
      detail: 'Add a subdomain or custom domain so staff can share the live site confidently.',
      href: publishingHref,
      tone: 'warning',
    };
  }

  if (!snapshot.readiness.forms) {
    return {
      title: 'Open the forms workspace',
      detail: 'Connect at least one contact, newsletter, referral, or donation form before launch.',
      href: formsHref,
      tone: 'warning',
    };
  }

  if (!snapshot.readiness.integrations) {
    const newsletterMissing =
      overview.forms.some((form) => form.formType === 'newsletter-signup') &&
      !overview.integrations.newsletter.configured;
    return {
      title: newsletterMissing ? 'Choose a newsletter audience' : 'Connect the missing integration',
      detail: newsletterMissing
        ? 'Open the Newsletters workspace to pick the audience or list that should receive signup traffic.'
        : 'One or more public CTAs still need their connected service before launch.',
      href: newsletterMissing ? newslettersHref : integrationsHref,
      tone: 'warning',
    };
  }

  if (!snapshot.readiness.ssl) {
    return {
      title: 'Review SSL renewal timing',
      detail: 'The certificate is close to expiry, so renew it before the public site is affected.',
      href: publishingHref,
      tone: 'warning',
    };
  }

  return {
    title: 'Open the public preview',
    detail: 'Review the live pages, recent updates, and conversion flow before sharing the site.',
    href: deployment.previewUrl || deployment.primaryUrl,
    tone: 'neutral',
  };
};

export const getFormSurfaceMeta = (formType: WebsiteManagedFormType): FormSurfaceMeta =>
  FORM_SURFACE_META[formType];

export const getFormDependencyState = (
  form: WebsiteFormDefinition,
  integrations: WebsiteIntegrationStatus
): { label: string; ready: boolean; detail: string } => {
  const meta = getFormSurfaceMeta(form.formType);
  const ready = hasIntegration(meta.dependencyKey, integrations);
  const detail =
    meta.dependencyKey === 'newsletter'
      ? ready
        ? `Newsletter audience "${integrations.newsletter.selectedAudienceName || integrations.newsletter.selectedAudienceId}" is active for this CTA.`
        : 'Choose an active newsletter audience in the Newsletters workspace before this CTA can send subscribers anywhere.'
      : ready
        ? `${meta.dependencyLabel} is connected for this CTA.`
        : `${meta.dependencyLabel} is not configured yet.`;

  return {
    label: meta.dependencyLabel,
    ready,
    detail,
  };
};

export const pickManagedWebsiteForm = (
  forms: WebsiteFormDefinition[]
): WebsiteFormDefinition | null => {
  if (forms.length === 0) return null;

  const flaggedPrimary = forms.find((form) => {
    const metadataRecords = getMetadataRecords(form);
    return pickBooleanCandidate(metadataRecords, [
      'primary',
      'isPrimary',
      'primaryForm',
      'isPrimaryManagedForm',
      'verificationFocus',
      'focus',
    ]);
  });

  if (flaggedPrimary) {
    return flaggedPrimary;
  }

  const prioritizedForms = [...forms].sort((left, right) => {
    if (left.live !== right.live) {
      return Number(right.live) - Number(left.live);
    }

    const leftPriority = PRIMARY_MANAGED_FORM_PRIORITY.indexOf(left.formType);
    const rightPriority = PRIMARY_MANAGED_FORM_PRIORITY.indexOf(right.formType);
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.title.localeCompare(right.title);
  });

  return prioritizedForms[0] ?? null;
};

export const deriveWebsiteManagedFormVerification = (
  overview: WebsiteOverviewSummary | null,
  formOverride?: WebsiteFormDefinition | null
): WebsiteManagedFormVerificationSummary | null => {
  if (!overview) return null;

  const form = formOverride ?? pickManagedWebsiteForm(overview.forms || []);
  if (!form) return null;

  const metadataRecords = getMetadataRecords(form);
  const surfaceMeta = getFormSurfaceMeta(form.formType);
  const dependency = getFormDependencyState(form, overview.integrations || EMPTY_INTEGRATIONS);
  const previewBaseUrl = overview.deployment?.previewUrl || overview.site.previewUrl;
  const liveBaseUrl = overview.deployment?.primaryUrl || overview.site.primaryUrl;
  const isEventRegistration = form.formType === 'event-registration';

  const previewPageUrl = resolveRuntimeUrl(
    pickStringCandidate(metadataRecords, [
      'previewPageUrl',
      'previewUrl',
      'previewHref',
      'previewLink',
      'verificationPreviewUrl',
    ]),
    previewBaseUrl,
    form.path
  );
  const livePageUrl = resolveRuntimeUrl(
    pickStringCandidate(metadataRecords, [
      'livePageUrl',
      'publicUrl',
      'liveUrl',
      'liveHref',
      'publishedUrl',
      'verificationLiveUrl',
    ]),
    form.live ? liveBaseUrl : null,
    form.path
  );

  const supportsPublicSubmission = PUBLIC_SUBMISSION_FORM_TYPES.has(form.formType);
  const submissionEndpoint =
    pickStringCandidate(metadataRecords, [
      'submissionEndpoint',
      'submissionPath',
      'submitEndpoint',
      'submissionUrl',
      'submitUrl',
      'formAction',
      'action',
    ]) ||
    (supportsPublicSubmission
      ? `/api/v2/public/forms/${encodeURIComponent(overview.site.id)}/${encodeURIComponent(
          form.componentId
        )}/submit`
      : null);
  const submissionMethod =
    (pickStringCandidate(metadataRecords, ['submissionMethod', 'submitMethod', 'method']) || 'POST')
      .toUpperCase();

  const hasPreview = Boolean(previewPageUrl);
  const hasLive = Boolean(livePageUrl);
  const hasLiveSurface = hasLive || (isEventRegistration && form.live);
  const hasSubmission = Boolean(submissionEndpoint);
  const launchReady = dependency.ready && hasSubmission && (hasPreview || hasLiveSurface);

  let publishState: WebsiteManagedFormVerificationSummary['publishState'] = 'draft';
  if (hasLiveSurface && hasPreview) {
    publishState = 'live-preview';
  } else if (hasLiveSurface) {
    publishState = 'live';
  } else if (hasPreview) {
    publishState = 'preview';
  }

  const publishStateLabel =
    publishState === 'live-preview'
      ? 'Live + preview'
      : publishState === 'live'
        ? 'Live'
        : publishState === 'preview'
          ? 'Preview only'
          : 'Draft only';

  const publishStateDetail = isEventRegistration
    ? publishState === 'live-preview'
      ? 'This event-registration CTA is available on live event detail pages and can still be checked through preview.'
      : publishState === 'live'
        ? 'This event-registration CTA is available on live event detail pages.'
        : publishState === 'preview'
          ? 'This event-registration CTA is available in preview before the next live publish.'
          : 'Publish a preview or live version to expose this event-registration CTA.'
    : publishState === 'live-preview'
      ? 'This managed CTA is available on the live site and can still be verified through preview.'
      : publishState === 'live'
        ? 'This managed CTA is currently exposed on the live public site.'
        : publishState === 'preview'
          ? 'This managed CTA is available in preview before the next live publish.'
          : 'Publish a preview or live version to expose this CTA on the public surface.';

  const launchStateLabel = launchReady
    ? hasLiveSurface
      ? 'Ready to verify'
      : 'Preview ready'
    : !dependency.ready
      ? `${dependency.label} needed`
      : !hasPreview && !hasLiveSurface
        ? 'Publish needed'
        : !hasSubmission
          ? 'Submission route unavailable'
          : 'Needs attention';

  const launchStateDetail = launchReady
    ? hasLiveSurface
      ? isEventRegistration
        ? 'Open a live event detail page, submit the registration CTA, and confirm the public event registration workflow end to end.'
        : 'Open the live page or preview page, submit the form, and confirm the public workflow end to end.'
      : 'Use the preview page to test the managed form before the next live publish.'
    : !dependency.ready
      ? dependency.detail
      : !hasPreview && !hasLiveSurface
        ? 'Publish a preview or live version so the focus CTA can be opened from the public surface.'
        : !hasSubmission
          ? 'The managed public submission endpoint is not available yet for this CTA.'
          : 'Review the preview/live page and submission path before continuing.';

  return {
    form,
    surfaceMeta,
    dependency,
    readiness: {
      launchReady,
      preview: hasPreview,
      live: hasLiveSurface,
      submission: hasSubmission,
      dependency: dependency.ready,
    },
    publishState,
    publishStateLabel,
    publishStateDetail,
    launchStateLabel,
    launchStateDetail,
    previewPageUrl,
    livePageUrl,
    submissionEndpoint,
    submissionMethod,
  };
};

export const formatWebsiteConsoleDate = toDateLabel;

export const getWebsiteConsoleUrlTarget = (
  target:
    | {
        previewUrl?: string | null;
        primaryUrl?: string | null;
      }
    | null
    | undefined
): string | null => target?.previewUrl || target?.primaryUrl || null;

export const deriveWebsiteManagementSnapshot = (
  overview: WebsiteOverviewSummary | null
): WebsiteManagementSnapshot | null => {
  if (!overview) return null;

  const siteId = overview.site.id;
  const builderHref = getWebsiteBuilderPath(siteId);
  const contentHref = getWebsiteContentPath(siteId);
  const formsHref = getWebsiteFormsPath(siteId);
  const integrationsHref = getWebsiteIntegrationsPath(siteId);
  const newslettersHref = getWebsiteNewslettersPath(siteId);
  const publishingHref = getWebsitePublishingPath(siteId);
  const forms = overview.forms || [];
  const liveRoutes = overview.liveRoutes || [];
  const draftRoutes = overview.draftRoutes || [];
  const contentSummary = overview.contentSummary || {
    nativeNewsletters: 0,
    syncedNewsletters: 0,
    publishedNewsletters: 0,
  };
  const deployment = overview.deployment || {
    primaryUrl: overview.site.primaryUrl,
    previewUrl: null,
    domainStatus: 'none' as const,
    sslStatus: 'unconfigured' as const,
  };
  const integrations = overview.integrations || EMPTY_INTEGRATIONS;
  const newsletterForms = forms.filter((form) => form.formType === 'newsletter-signup');
  const donationForms = forms.filter((form) => form.formType === 'donation-form');
  const sslCertificateExpiresAt = toDateValue(overview.site.sslCertificateExpiresAt);
  const sslExpiringSoon =
    Boolean(overview.site.customDomain) &&
    sslCertificateExpiresAt !== null &&
    (sslCertificateExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30;
  const conversionMetrics = overview.conversionMetrics || {
    totalConversions: 0,
    totalPageviews: 0,
    uniqueVisitors: 0,
    formSubmissions: 0,
    eventRegistrations: 0,
    donations: 0,
    periodStart: null,
    periodEnd: null,
    recentConversions: [],
  };

  const attentionItems: WebsiteManagementSnapshot['attentionItems'] = [];

  if (overview.site.blocked) {
    attentionItems.push({
      id: 'assignment',
      title: 'Site assignment needs attention',
      detail: 'This site can be edited, but publishing and live integration changes are blocked.',
      severity: 'critical',
      href: publishingHref,
      actionLabel: 'Review publishing',
    });
  }

  if (!draftRoutes.length) {
    attentionItems.push({
      id: 'draft-routes',
      title: 'No editable pages were found',
      detail: 'The template has no route entries yet, so there is nothing ready to publish.',
      severity: 'critical',
      href: builderHref,
      actionLabel: 'Open builder',
    });
  } else if (!liveRoutes.length) {
    attentionItems.push({
      id: 'publish',
      title: 'The public site has not been published yet',
      detail: 'Draft pages exist, but the live site still needs a publish step.',
      severity: 'warning',
      href: publishingHref,
      actionLabel: 'Publish site',
    });
  }

  if (!overview.site.customDomain && !overview.site.subdomain) {
    attentionItems.push({
      id: 'domain',
      title: 'No public domain is configured',
      detail: 'Set a subdomain or custom domain so supporters can find the site easily.',
      severity: 'warning',
      href: publishingHref,
      actionLabel: 'Set domain',
    });
  }

  if (sslExpiringSoon) {
    attentionItems.push({
      id: 'ssl',
      title: 'SSL certificate is expiring soon',
      detail: 'Renew or reissue the certificate before the public site loses a secure connection.',
      severity: 'warning',
      href: publishingHref,
      actionLabel: 'Review SSL',
    });
  }

  if (!forms.length) {
    attentionItems.push({
      id: 'forms',
      title: 'No public CTA forms are connected',
      detail: 'Connect at least one contact, newsletter, referral, or donation form before launch.',
      severity: 'warning',
      href: formsHref,
      actionLabel: 'Open forms',
    });
  }

  if (newsletterForms.length > 0 && !integrations.newsletter.configured) {
    attentionItems.push({
      id: 'newsletter',
      title: 'Newsletter audience needs attention',
      detail: 'Newsletter capture will stay local until an active audience is selected in Newsletters.',
      severity: 'critical',
      href: newslettersHref,
      actionLabel: 'Open newsletters',
    });
  }

  if (donationForms.length > 0 && !integrations.stripe.configured) {
    attentionItems.push({
      id: 'stripe',
      title: 'Donation forms need a payment provider',
      detail: 'Donation and recurring support actions are waiting on the selected provider.',
      severity: 'critical',
      href: integrationsHref,
      actionLabel: 'Open integrations',
    });
  }

  if (!overview.site.analyticsEnabled) {
    attentionItems.push({
      id: 'analytics',
      title: 'Conversion tracking is disabled',
      detail: 'Enable analytics to keep a reliable record of clicks, submits, and donations.',
      severity: 'info',
      href: publishingHref,
      actionLabel: 'Review analytics',
    });
  }

  if (contentSummary.nativeNewsletters === 0 && contentSummary.syncedNewsletters === 0) {
    attentionItems.push({
      id: 'content',
      title: 'No newsletter content is published yet',
      detail: 'Add a newsletter post or import the archive so the public site has a content stream.',
      severity: 'info',
      href: contentHref,
      actionLabel: 'Open content',
    });
  }

  const integrationsReady =
    newsletterForms.every(
      () => integrations.newsletter.configured && Boolean(integrations.newsletter.selectedAudienceId)
    ) &&
    donationForms.every(() => integrations.stripe.configured);
  const publishReady = !overview.site.blocked && draftRoutes.length > 0;
  const snapshotWithoutNextAction: Omit<WebsiteManagementSnapshot, 'nextAction'> = {
    status: overview.site.blocked
      ? 'blocked'
      : attentionItems.some((item) => item.severity === 'critical' || item.severity === 'warning')
        ? 'attention'
        : 'healthy',
    readiness: {
      publish: publishReady,
      preview: Boolean(deployment.previewUrl),
      content:
        liveRoutes.length > 0 ||
        contentSummary.nativeNewsletters > 0 ||
        contentSummary.syncedNewsletters > 0,
      forms: forms.length > 0,
      integrations: integrationsReady,
      domain: Boolean(overview.site.customDomain || overview.site.subdomain),
      ssl: overview.site.customDomain ? overview.site.sslEnabled && !sslExpiringSoon : true,
      analytics: overview.site.analyticsEnabled,
    },
    signals: {
      liveRoutes: liveRoutes.length,
      draftRoutes: draftRoutes.length,
      forms: forms.length,
      conversions: conversionMetrics.totalConversions,
      nativeNewsletters: contentSummary.nativeNewsletters,
      syncedNewsletters: contentSummary.syncedNewsletters,
      publishedNewsletters: contentSummary.publishedNewsletters,
    },
    attentionItems,
    lastPublishedAt: overview.site.publishedAt,
    lastUpdatedAt: overview.site.updatedAt,
  };

  return {
    ...snapshotWithoutNextAction,
    nextAction: buildNextAction(overview, snapshotWithoutNextAction),
  };
};
