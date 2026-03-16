import { Pool } from 'pg';
import dbPool from '@config/database';
import type {
  PublishedComponent,
  PublishedSite,
  WebsiteFacebookSettings,
  WebsiteFormOperationalConfig,
  WebsiteMailchimpSettings,
  WebsiteManagedFormType,
  WebsiteSocialSettings,
  WebsiteSiteSettings,
  WebsiteStripeSettings,
} from '@app-types/publishing';
import { SiteManagementService } from './siteManagementService';

const DEFAULT_CONVERSION_TRACKING: WebsiteSiteSettings['conversionTracking'] = {
  enabled: true,
  events: {
    formSubmit: true,
    donation: true,
    eventRegister: true,
  },
};

const MANAGED_FORM_TYPES = new Set<WebsiteManagedFormType>([
  'contact-form',
  'newsletter-signup',
  'donation-form',
  'volunteer-interest-form',
  'event-registration',
]);

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const cleanString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const cleanStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return items.length > 0 ? items : [];
};

const cleanNumberArray = (value: unknown): number[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((entry) => (typeof entry === 'number' ? entry : Number(entry)))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
    .map((entry) => Number(entry.toFixed(2)));
  return items.length > 0 ? items : [];
};

const cleanBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  return undefined;
};

const normalizeMailchimpSettings = (value: unknown): WebsiteMailchimpSettings => {
  const config = asObject(value);
  return {
    audienceId: config.audienceId === null ? null : cleanString(config.audienceId),
    audienceMode:
      config.audienceMode === 'crm' ||
      config.audienceMode === 'mailchimp' ||
      config.audienceMode === 'both'
        ? config.audienceMode
        : undefined,
    defaultTags: cleanStringArray(config.defaultTags),
    syncEnabled: cleanBoolean(config.syncEnabled),
  };
};

const normalizeStripeSettings = (value: unknown): WebsiteStripeSettings => {
  const config = asObject(value);
  return {
    accountId: config.accountId === null ? null : cleanString(config.accountId),
    currency: cleanString(config.currency)?.toLowerCase(),
    suggestedAmounts: cleanNumberArray(config.suggestedAmounts),
    recurringDefault: cleanBoolean(config.recurringDefault),
    campaignId: config.campaignId === null ? null : cleanString(config.campaignId),
  };
};

const normalizeFacebookSettings = (value: unknown): WebsiteFacebookSettings => {
  const config = asObject(value);
  return {
    trackedPageId: config.trackedPageId === null ? null : cleanString(config.trackedPageId),
    syncEnabled: cleanBoolean(config.syncEnabled),
  };
};

const normalizeSocialSettings = (value: unknown): WebsiteSocialSettings => {
  const config = asObject(value);
  return {
    facebook: normalizeFacebookSettings(config.facebook),
  };
};

const normalizeOperationalConfig = (value: unknown): WebsiteFormOperationalConfig => {
  const config = asObject(value);
  return {
    heading: cleanString(config.heading),
    description: cleanString(config.description),
    submitText: cleanString(config.submitText),
    buttonText: cleanString(config.buttonText),
    successMessage: cleanString(config.successMessage),
    accountId: config.accountId === null ? null : cleanString(config.accountId),
    campaignId: config.campaignId === null ? null : cleanString(config.campaignId),
    mailchimpListId:
      config.mailchimpListId === null ? null : cleanString(config.mailchimpListId),
    audienceMode:
      config.audienceMode === 'crm' ||
      config.audienceMode === 'mailchimp' ||
      config.audienceMode === 'both'
        ? config.audienceMode
        : undefined,
    defaultTags: cleanStringArray(config.defaultTags),
    includePhone: cleanBoolean(config.includePhone),
    includeMessage: cleanBoolean(config.includeMessage),
    formMode:
      config.formMode === 'contact' || config.formMode === 'supporter'
        ? config.formMode
        : undefined,
    defaultStatus: cleanString(config.defaultStatus),
    suggestedAmounts: cleanNumberArray(config.suggestedAmounts),
    allowCustomAmount: cleanBoolean(config.allowCustomAmount),
    recurringOption: cleanBoolean(config.recurringOption),
    recurringDefault: cleanBoolean(config.recurringDefault),
    currency: cleanString(config.currency)?.toLowerCase(),
    conversionGoal: cleanString(config.conversionGoal),
    trackingEnabled: cleanBoolean(config.trackingEnabled),
  };
};

const normalizeConversionTracking = (
  value: unknown
): WebsiteSiteSettings['conversionTracking'] => {
  const config = asObject(value);
  const events = asObject(config.events);
  return {
    enabled: cleanBoolean(config.enabled) ?? DEFAULT_CONVERSION_TRACKING.enabled,
    events: {
      formSubmit:
        cleanBoolean(events.formSubmit) ?? DEFAULT_CONVERSION_TRACKING.events.formSubmit,
      donation: cleanBoolean(events.donation) ?? DEFAULT_CONVERSION_TRACKING.events.donation,
      eventRegister:
        cleanBoolean(events.eventRegister) ??
        DEFAULT_CONVERSION_TRACKING.events.eventRegister,
    },
  };
};

const stripUndefined = <T extends object>(value: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>;

const buildDefaultSettings = (
  siteId: string,
  organizationId: string | null
): WebsiteSiteSettings => ({
  siteId,
  organizationId,
  mailchimp: {},
  stripe: {},
  social: {
    facebook: {},
  },
  formDefaults: {},
  formOverrides: {},
  conversionTracking: DEFAULT_CONVERSION_TRACKING,
  createdAt: null,
  updatedAt: null,
});

export const mergeWebsiteFormOperationalConfig = (
  sourceConfig: Record<string, unknown>,
  settings: WebsiteSiteSettings,
  formKey: string
): WebsiteFormOperationalConfig => ({
  ...normalizeOperationalConfig(sourceConfig),
  ...settings.formDefaults,
  ...(settings.formOverrides[formKey] || {}),
});

export const mergeManagedComponentConfig = (
  component: PublishedComponent,
  settings: WebsiteSiteSettings
): PublishedComponent => {
  if (!MANAGED_FORM_TYPES.has(component.type as WebsiteManagedFormType)) {
    return component;
  }

  const operationalConfig = mergeWebsiteFormOperationalConfig(
    component,
    settings,
    component.id
  );
  return {
    ...component,
    ...operationalConfig,
  };
};

export class WebsiteSiteSettingsService {
  private readonly siteManagement: SiteManagementService;

  constructor(private readonly pool: Pool) {
    this.siteManagement = new SiteManagementService(pool);
  }

  private mapRowToSettings(
    row: Record<string, unknown> | undefined,
    siteId: string,
    organizationId: string | null
  ): WebsiteSiteSettings {
    if (!row) {
      return buildDefaultSettings(siteId, organizationId);
    }

    const formOverridesSource = asObject(row.form_overrides);
    const formOverrides = Object.fromEntries(
      Object.entries(formOverridesSource).map(([formKey, config]) => [
        formKey,
        normalizeOperationalConfig(config),
      ])
    ) as Record<string, WebsiteFormOperationalConfig>;

    return {
      siteId: row.site_id as string,
      organizationId: (row.organization_id as string | null) ?? organizationId,
      mailchimp: normalizeMailchimpSettings(row.mailchimp_config),
      stripe: normalizeStripeSettings(row.stripe_config),
      social: normalizeSocialSettings(row.social_config),
      formDefaults: normalizeOperationalConfig(row.form_defaults),
      formOverrides,
      conversionTracking: normalizeConversionTracking(row.conversion_tracking),
      createdAt: row.created_at ? new Date(row.created_at as string) : null,
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
    };
  }

  private async loadSettingsRow(siteId: string): Promise<Record<string, unknown> | undefined> {
    const result = await this.pool.query(
      `SELECT *
       FROM website_site_settings
       WHERE site_id = $1
       LIMIT 1`,
      [siteId]
    );

    return result.rows[0];
  }

  private async requireOwnedSite(
    siteId: string,
    userId: string,
    organizationId?: string
  ): Promise<PublishedSite> {
    const site = await this.siteManagement.getSite(siteId, userId, organizationId);
    if (!site) {
      throw new Error('Site not found or access denied');
    }
    return site;
  }

  private assertMutableSite(site: PublishedSite): void {
    if (site.migrationStatus === 'needs_assignment') {
      throw new Error('Site needs organization assignment before changing website settings');
    }
  }

  private async persistSettings(
    site: PublishedSite,
    settings: WebsiteSiteSettings,
    userId: string
  ): Promise<WebsiteSiteSettings> {
    const result = await this.pool.query(
      `INSERT INTO website_site_settings (
         site_id,
         organization_id,
         mailchimp_config,
         stripe_config,
         social_config,
         form_defaults,
         form_overrides,
         conversion_tracking,
         created_by,
         updated_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
       ON CONFLICT (site_id)
       DO UPDATE SET
         organization_id = EXCLUDED.organization_id,
         mailchimp_config = EXCLUDED.mailchimp_config,
         stripe_config = EXCLUDED.stripe_config,
         social_config = EXCLUDED.social_config,
         form_defaults = EXCLUDED.form_defaults,
         form_overrides = EXCLUDED.form_overrides,
         conversion_tracking = EXCLUDED.conversion_tracking,
         updated_by = EXCLUDED.updated_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        site.id,
        site.organizationId,
        JSON.stringify(settings.mailchimp || {}),
        JSON.stringify(settings.stripe || {}),
        JSON.stringify(settings.social || { facebook: {} }),
        JSON.stringify(settings.formDefaults || {}),
        JSON.stringify(settings.formOverrides || {}),
        JSON.stringify(settings.conversionTracking || DEFAULT_CONVERSION_TRACKING),
        userId,
      ]
    );

    return this.mapRowToSettings(result.rows[0], site.id, site.organizationId);
  }

  async getSettings(
    siteId: string,
    userId: string,
    organizationId?: string
  ): Promise<WebsiteSiteSettings> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    const row = await this.loadSettingsRow(site.id);
    return this.mapRowToSettings(row, site.id, site.organizationId);
  }

  async getSettingsForSite(site: PublishedSite): Promise<WebsiteSiteSettings> {
    const row = await this.loadSettingsRow(site.id);
    return this.mapRowToSettings(row, site.id, site.organizationId);
  }

  async getPublicSettings(siteId: string): Promise<WebsiteSiteSettings> {
    const row = await this.loadSettingsRow(siteId);
    return this.mapRowToSettings(row, siteId, (row?.organization_id as string | null) ?? null);
  }

  async updateMailchimpSettings(
    siteId: string,
    patch: Partial<WebsiteMailchimpSettings>,
    userId: string,
    organizationId?: string
  ): Promise<WebsiteSiteSettings> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    this.assertMutableSite(site);

    const current = await this.getSettingsForSite(site);
    const nextSettings: WebsiteSiteSettings = {
      ...current,
      mailchimp: {
        ...current.mailchimp,
        ...stripUndefined(normalizeMailchimpSettings(patch)),
      },
    };

    return this.persistSettings(site, nextSettings, userId);
  }

  async updateStripeSettings(
    siteId: string,
    patch: Partial<WebsiteStripeSettings>,
    userId: string,
    organizationId?: string
  ): Promise<WebsiteSiteSettings> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    this.assertMutableSite(site);

    const current = await this.getSettingsForSite(site);
    const nextSettings: WebsiteSiteSettings = {
      ...current,
      stripe: {
        ...current.stripe,
        ...stripUndefined(normalizeStripeSettings(patch)),
      },
    };

    return this.persistSettings(site, nextSettings, userId);
  }

  async updateFormOverride(
    siteId: string,
    formKey: string,
    patch: Partial<WebsiteFormOperationalConfig>,
    userId: string,
    organizationId?: string
  ): Promise<WebsiteSiteSettings> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    this.assertMutableSite(site);

    const current = await this.getSettingsForSite(site);
    const existingOverride = current.formOverrides[formKey] || {};
    const nextOverride = {
      ...existingOverride,
      ...stripUndefined(normalizeOperationalConfig(patch)),
    };

    const nextSettings: WebsiteSiteSettings = {
      ...current,
      formOverrides: {
        ...current.formOverrides,
        [formKey]: nextOverride,
      },
    };

    return this.persistSettings(site, nextSettings, userId);
  }

  async updateFacebookSettings(
    siteId: string,
    patch: Partial<WebsiteFacebookSettings>,
    userId: string,
    organizationId?: string
  ): Promise<WebsiteSiteSettings> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    this.assertMutableSite(site);

    const current = await this.getSettingsForSite(site);
    const nextSettings: WebsiteSiteSettings = {
      ...current,
      social: {
        ...current.social,
        facebook: {
          ...current.social.facebook,
          ...stripUndefined(normalizeFacebookSettings(patch)),
        },
      },
    };

    return this.persistSettings(site, nextSettings, userId);
  }
}

export const websiteSiteSettingsService = new WebsiteSiteSettingsService(dbPool);
export default websiteSiteSettingsService;
