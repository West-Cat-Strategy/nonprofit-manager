import { logger } from '@config/logger';
import type { WebsiteNewsletterProvider, WebsiteSiteSettings } from '@app-types/publishing';
import mailchimpService from '@services/mailchimpService';
import mauticService from '@services/mauticService';
import type {
  BulkSyncRequest,
  BulkSyncResponse,
  SyncContactRequest,
  SyncResult,
} from '@app-types/mailchimp';

export interface NewsletterAudienceSummary {
  id: string;
  name: string;
  memberCount?: number;
}

export interface NewsletterProviderStatus {
  provider: WebsiteNewsletterProvider;
  configured: boolean;
  accountName?: string;
  baseUrl?: string;
  audienceCount?: number;
  availableAudiences: NewsletterAudienceSummary[];
  lastSyncAt: Date | null;
}

type NewsletterAudience = {
  id: string;
  name: string;
  memberCount?: number;
};

const hasConfiguredMailchimp = (): boolean => mailchimpService.isMailchimpConfigured();
const hasConfiguredMautic = (): boolean => mauticService.isMauticConfigured();

const toAudienceSummary = (audience: NewsletterAudience): NewsletterAudienceSummary => ({
  id: audience.id,
  name: audience.name,
  memberCount: audience.memberCount,
});

export const resolveNewsletterProvider = (
  settings: Pick<WebsiteSiteSettings, 'newsletter' | 'mailchimp' | 'mautic'>
): WebsiteNewsletterProvider => {
  const configuredProvider = settings.newsletter.provider;

  if (configuredProvider === 'mailchimp' && hasConfiguredMailchimp()) {
    return 'mailchimp';
  }

  if (configuredProvider === 'mautic' && hasConfiguredMautic()) {
    return 'mautic';
  }

  if (settings.mautic.syncEnabled !== false && hasConfiguredMautic()) {
    return 'mautic';
  }

  if (settings.mailchimp.syncEnabled !== false && hasConfiguredMailchimp()) {
    return 'mailchimp';
  }

  return configuredProvider || 'mautic';
};

export const getNewsletterProviderStatus = async (
  settings: Pick<WebsiteSiteSettings, 'newsletter' | 'mailchimp' | 'mautic'>
): Promise<NewsletterProviderStatus> => {
  const provider = resolveNewsletterProvider(settings);

  if (provider === 'mailchimp') {
    const status = await mailchimpService.getStatus();
    const audiences = status.configured ? await mailchimpService.getLists() : [];
    return {
      provider,
      configured: Boolean(status.configured),
      accountName: status.accountName,
      audienceCount: status.listCount,
      availableAudiences: audiences.map(toAudienceSummary),
      lastSyncAt: null,
    };
  }

  const status = await mauticService.getStatus();
  const audiences = status.configured ? await mauticService.getSegments() : [];
  return {
    provider,
    configured: Boolean(status.configured),
    baseUrl: status.baseUrl,
    audienceCount: status.segmentCount,
    availableAudiences: audiences.map(toAudienceSummary),
    lastSyncAt: null,
  };
};

export const syncNewsletterContact = async (
  settings: Pick<WebsiteSiteSettings, 'newsletter' | 'mailchimp' | 'mautic'>,
  request: SyncContactRequest
): Promise<SyncResult> => {
  const provider = resolveNewsletterProvider(settings);

  if (provider === 'mailchimp') {
    return mailchimpService.syncContact({
      contactId: request.contactId,
      listId: request.listId,
      tags: request.tags,
    });
  }

  return mauticService.syncContact({
    contactId: request.contactId,
    listId: request.listId,
    tags: request.tags,
  });
};

export const bulkSyncNewsletterContacts = async (
  settings: Pick<WebsiteSiteSettings, 'newsletter' | 'mailchimp' | 'mautic'>,
  request: BulkSyncRequest
): Promise<BulkSyncResponse> => {
  const provider = resolveNewsletterProvider(settings);

  if (provider === 'mailchimp') {
    return mailchimpService.bulkSyncContacts(request);
  }

  return mauticService.bulkSyncContacts(request);
};

export const getNewsletterProviderList = async (
  settings: Pick<WebsiteSiteSettings, 'newsletter' | 'mailchimp' | 'mautic'>
): Promise<NewsletterAudienceSummary[]> => {
  const provider = resolveNewsletterProvider(settings);
  if (provider === 'mailchimp') {
    const audiences = await mailchimpService.getLists();
    return audiences.map(toAudienceSummary);
  }

  const audiences = await mauticService.getSegments();
  return audiences.map(toAudienceSummary);
};

export const isConfigured = (settings: Pick<WebsiteSiteSettings, 'newsletter' | 'mailchimp' | 'mautic'>): boolean => {
  const provider = resolveNewsletterProvider(settings);
  return provider === 'mailchimp' ? hasConfiguredMailchimp() : hasConfiguredMautic();
};

logger.debug('Newsletter provider service loaded');

export default {
  resolveNewsletterProvider,
  getNewsletterProviderStatus,
  syncNewsletterContact,
  bulkSyncNewsletterContacts,
  getNewsletterProviderList,
  isConfigured,
};
