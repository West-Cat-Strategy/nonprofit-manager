import { logger } from '@config/logger';
import type {
  WebsiteNewsletterProvider,
  WebsiteNewsletterListPreset,
  WebsiteSiteSettings,
} from '@app-types/publishing';
import mailchimpService from '@services/mailchimpService';
import mauticService from '@services/mauticService';
import type { SyncContactRequest, SyncResult } from '@app-types/mailchimp';

type NewsletterAudienceMode = 'crm' | 'local_email' | 'mailchimp' | 'mautic' | 'both';

interface NewsletterDestinationConfig {
  audienceMode?: NewsletterAudienceMode;
  mailchimpListId?: string | null;
  mauticSegmentId?: string | null;
  defaultTags?: string[];
}

interface NewsletterDestination {
  provider: WebsiteNewsletterProvider;
  audienceId: string | null;
  tags: string[];
  shouldSync: boolean;
}

const hasConfiguredMailchimp = (): boolean => mailchimpService.isMailchimpConfigured();
const hasConfiguredMautic = (): boolean => mauticService.isMauticConfigured();

const uniqueTags = (values: readonly string[] = []): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const canUseProvider = (provider: WebsiteNewsletterProvider): boolean => {
  if (provider === 'local_email') return true;
  return provider === 'mailchimp' ? hasConfiguredMailchimp() : hasConfiguredMautic();
};

const getSelectedPreset = (
  settings: Pick<WebsiteSiteSettings, 'newsletter'>
): WebsiteNewsletterListPreset | undefined => {
  const presets = settings.newsletter.listPresets ?? [];
  const selectedPresetId = settings.newsletter.selectedPresetId;
  if (!selectedPresetId) {
    return undefined;
  }
  return presets.find((preset) => preset.id === selectedPresetId && preset.syncEnabled !== false);
};

export const resolveNewsletterProvider = (
  settings: Pick<WebsiteSiteSettings, 'newsletter' | 'mailchimp' | 'mautic'>
): WebsiteNewsletterProvider => {
  const selectedPreset = getSelectedPreset(settings);
  if (selectedPreset && canUseProvider(selectedPreset.provider)) {
    return selectedPreset.provider;
  }

  const configuredProvider = settings.newsletter.provider;

  if (configuredProvider === 'local_email') {
    return 'local_email';
  }

  if (configuredProvider === 'mailchimp' && hasConfiguredMailchimp()) {
    return 'mailchimp';
  }

  if (configuredProvider === 'mautic' && hasConfiguredMautic()) {
    return 'mautic';
  }

  return 'local_email';
};

export const resolveNewsletterDestination = (
  settings: Pick<WebsiteSiteSettings, 'newsletter' | 'mailchimp' | 'mautic'>,
  componentConfig: NewsletterDestinationConfig = {}
): NewsletterDestination => {
  const selectedPreset = getSelectedPreset(settings);
  const audienceMode = componentConfig.audienceMode || 'crm';
  const provider = (() => {
    if (audienceMode === 'crm' || audienceMode === 'local_email') {
      return 'local_email';
    }
    if (audienceMode === 'mailchimp') {
      return hasConfiguredMailchimp() ? 'mailchimp' : 'local_email';
    }
    if (audienceMode === 'mautic') {
      return hasConfiguredMautic() ? 'mautic' : 'local_email';
    }
    if (componentConfig.mailchimpListId && hasConfiguredMailchimp()) {
      return 'mailchimp';
    }
    if (componentConfig.mauticSegmentId && hasConfiguredMautic()) {
      return 'mautic';
    }
    return resolveNewsletterProvider(settings);
  })();
  const explicitAudienceId =
    provider === 'mailchimp'
      ? componentConfig.mailchimpListId
      : provider === 'mautic'
        ? componentConfig.mauticSegmentId
        : null;
  const selectedProviderAudience =
    settings.newsletter.provider === provider ? settings.newsletter.selectedAudienceId : null;
  const configuredAudience =
    provider === 'mailchimp'
      ? settings.mailchimp.audienceId
      : provider === 'mautic'
        ? settings.mautic.segmentId
        : null;
  const presetAudienceId =
    selectedPreset?.provider === provider && selectedPreset.syncEnabled !== false
      ? selectedPreset.audienceId
      : null;
  const audienceId =
    provider === 'local_email'
      ? null
      : explicitAudienceId ||
        presetAudienceId ||
        selectedProviderAudience ||
        configuredAudience ||
        null;
  const shouldSync =
    provider !== 'local_email' &&
    audienceMode !== 'crm' &&
    audienceMode !== 'local_email' &&
    Boolean(audienceId) &&
    canUseProvider(provider) &&
    (provider === 'mailchimp'
      ? settings.mailchimp.syncEnabled !== false
      : settings.mautic.syncEnabled !== false) &&
    (!selectedPreset || selectedPreset.provider === provider || Boolean(explicitAudienceId));

  return {
    provider,
    audienceId,
    shouldSync,
    tags: uniqueTags([
      ...(componentConfig.defaultTags ?? []),
      ...(selectedPreset?.provider === provider ? (selectedPreset.defaultTags ?? []) : []),
      ...(provider === 'mailchimp'
        ? (settings.mailchimp.defaultTags ?? [])
        : provider === 'mautic'
          ? (settings.mautic.defaultTags ?? [])
          : []),
    ]),
  };
};

export const syncNewsletterContact = async (
  settings: Pick<WebsiteSiteSettings, 'newsletter' | 'mailchimp' | 'mautic'>,
  request: SyncContactRequest & { provider?: WebsiteNewsletterProvider }
): Promise<SyncResult> => {
  const provider = request.provider ?? resolveNewsletterProvider(settings);

  if (provider === 'mailchimp') {
    return mailchimpService.syncContact({
      contactId: request.contactId,
      listId: request.listId,
      tags: request.tags,
    });
  }

  if (provider === 'local_email') {
    return {
      contactId: request.contactId,
      email: '',
      success: true,
      action: 'skipped',
      error: 'Local newsletter signup is already stored in CRM',
    };
  }

  return mauticService.syncContact({
    contactId: request.contactId,
    listId: request.listId,
    tags: request.tags,
  });
};
logger.debug('Newsletter provider service loaded');

export default {
  resolveNewsletterProvider,
  resolveNewsletterDestination,
  syncNewsletterContact,
};
