import type {
  WebsiteFormDefinition,
  WebsiteIntegrationStatus,
  WebsiteManagedFormType,
  WebsiteManagementSnapshot,
  WebsiteOverviewSummary,
} from '../types';

type FormDependencyKey = 'crm' | 'mailchimp' | 'stripe' | 'events';

interface FormSurfaceMeta {
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
    description: 'Subscriber capture and supporter updates route through Mailchimp.',
    dependencyLabel: 'Mailchimp',
    dependencyKey: 'mailchimp',
  },
  'donation-form': {
    label: 'Donate',
    description: 'Donation amounts and recurring support depend on Stripe.',
    dependencyLabel: 'Stripe',
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
    case 'mailchimp':
      return integrations.mailchimp.configured;
    case 'stripe':
      return integrations.stripe.configured && integrations.stripe.publishableKeyConfigured;
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
  mailchimp: {
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

const buildNextAction = (
  overview: WebsiteOverviewSummary,
  snapshot: Omit<WebsiteManagementSnapshot, 'nextAction'>
): WebsiteManagementSnapshot['nextAction'] => {
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
      href: `/websites/${overview.site.id}/publishing`,
      tone: 'warning',
    };
  }

  if (!snapshot.readiness.publish) {
    return {
      title: 'Publish the site',
      detail: 'Draft pages are ready. Publish to make the public nonprofit site live.',
      href: `/websites/${overview.site.id}/publishing`,
      tone: 'primary',
    };
  }

  if (!snapshot.readiness.domain) {
    return {
      title: 'Configure the public domain',
      detail: 'Add a subdomain or custom domain so staff can share the live site confidently.',
      href: `/websites/${overview.site.id}/publishing`,
      tone: 'warning',
    };
  }

  if (!snapshot.readiness.forms) {
    return {
      title: 'Open the forms workspace',
      detail: 'Connect at least one contact, newsletter, referral, or donation form before launch.',
      href: `/websites/${overview.site.id}/forms`,
      tone: 'warning',
    };
  }

  if (!snapshot.readiness.integrations) {
    return {
      title: 'Connect the missing integration',
      detail: 'One or more public CTAs still need their connected service before launch.',
      href: `/websites/${overview.site.id}/integrations`,
      tone: 'warning',
    };
  }

  if (!snapshot.readiness.ssl) {
    return {
      title: 'Review SSL renewal timing',
      detail: 'The certificate is close to expiry, so renew it before the public site is affected.',
      href: `/websites/${overview.site.id}/publishing`,
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
  const detail = ready
    ? `${meta.dependencyLabel} is connected for this CTA.`
    : `${meta.dependencyLabel} is not configured yet.`;

  return {
    label: meta.dependencyLabel,
    ready,
    detail,
  };
};

export const formatWebsiteConsoleDate = toDateLabel;

export const deriveWebsiteManagementSnapshot = (
  overview: WebsiteOverviewSummary | null
): WebsiteManagementSnapshot | null => {
  if (!overview) return null;

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
    Boolean(sslCertificateExpiresAt) &&
    (sslCertificateExpiresAt
      ? (sslCertificateExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30
      : false);
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
      href: `/websites/${overview.site.id}/publishing`,
      actionLabel: 'Review publishing',
    });
  }

  if (!draftRoutes.length) {
    attentionItems.push({
      id: 'draft-routes',
      title: 'No editable pages were found',
      detail: 'The template has no route entries yet, so there is nothing ready to publish.',
      severity: 'critical',
      href: `/websites/${overview.site.id}/builder`,
      actionLabel: 'Open builder',
    });
  } else if (!liveRoutes.length) {
    attentionItems.push({
      id: 'publish',
      title: 'The public site has not been published yet',
      detail: 'Draft pages exist, but the live site still needs a publish step.',
      severity: 'warning',
      href: `/websites/${overview.site.id}/publishing`,
      actionLabel: 'Publish site',
    });
  }

  if (!overview.site.customDomain && !overview.site.subdomain) {
    attentionItems.push({
      id: 'domain',
      title: 'No public domain is configured',
      detail: 'Set a subdomain or custom domain so supporters can find the site easily.',
      severity: 'warning',
      href: `/websites/${overview.site.id}/publishing`,
      actionLabel: 'Set domain',
    });
  }

  if (sslExpiringSoon) {
    attentionItems.push({
      id: 'ssl',
      title: 'SSL certificate is expiring soon',
      detail: 'Renew or reissue the certificate before the public site loses a secure connection.',
      severity: 'warning',
      href: `/websites/${overview.site.id}/publishing`,
      actionLabel: 'Review SSL',
    });
  }

  if (!forms.length) {
    attentionItems.push({
      id: 'forms',
      title: 'No public CTA forms are connected',
      detail: 'Connect at least one contact, newsletter, referral, or donation form before launch.',
      severity: 'warning',
      href: `/websites/${overview.site.id}/forms`,
      actionLabel: 'Open forms',
    });
  }

  if (newsletterForms.length > 0 && !integrations.mailchimp.configured) {
    attentionItems.push({
      id: 'mailchimp',
      title: 'Newsletter signup needs Mailchimp',
      detail: 'Newsletter capture will stay local until a Mailchimp audience is configured.',
      severity: 'critical',
      href: `/websites/${overview.site.id}/integrations`,
      actionLabel: 'Open integrations',
    });
  }

  if (donationForms.length > 0 && !integrations.stripe.configured) {
    attentionItems.push({
      id: 'stripe',
      title: 'Donation forms need Stripe',
      detail: 'Donation and recurring support actions are waiting on Stripe configuration.',
      severity: 'critical',
      href: `/websites/${overview.site.id}/integrations`,
      actionLabel: 'Open integrations',
    });
  }

  if (!overview.site.analyticsEnabled) {
    attentionItems.push({
      id: 'analytics',
      title: 'Conversion tracking is disabled',
      detail: 'Enable analytics to keep a reliable record of clicks, submits, and donations.',
      severity: 'info',
      href: `/websites/${overview.site.id}/publishing`,
      actionLabel: 'Review analytics',
    });
  }

  if (contentSummary.nativeNewsletters === 0 && contentSummary.syncedNewsletters === 0) {
    attentionItems.push({
      id: 'content',
      title: 'No newsletter content is published yet',
      detail: 'Add a newsletter post or import the archive so the public site has a content stream.',
      severity: 'info',
      href: `/websites/${overview.site.id}/content`,
      actionLabel: 'Open content',
    });
  }

  const integrationsReady =
    newsletterForms.every(() => integrations.mailchimp.configured) &&
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
