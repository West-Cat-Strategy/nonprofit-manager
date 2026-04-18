import { logger } from '@config/logger';
import type { WebsiteNewsletterProvider, WebsiteSiteSettings } from '@app-types/publishing';
import mailchimpService from '@services/mailchimpService';
import mauticService from '@services/mauticService';
import type {
  SyncContactRequest,
  SyncResult,
} from '@app-types/mailchimp';

const hasConfiguredMailchimp = (): boolean => mailchimpService.isMailchimpConfigured();
const hasConfiguredMautic = (): boolean => mauticService.isMauticConfigured();

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
logger.debug('Newsletter provider service loaded');

export default {
  resolveNewsletterProvider,
  syncNewsletterContact,
};
