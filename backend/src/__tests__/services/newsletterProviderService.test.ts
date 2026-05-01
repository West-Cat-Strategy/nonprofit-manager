import newsletterProviderService from '@services/newsletterProviderService';
import mailchimpService from '@services/mailchimpService';
import mauticService from '@services/mauticService';
import type { WebsiteSiteSettings } from '@app-types/publishing';

jest.mock('@services/mailchimpService', () => ({
  __esModule: true,
  default: {
    isMailchimpConfigured: jest.fn(),
    getStatus: jest.fn(),
    getLists: jest.fn(),
    syncContact: jest.fn(),
    bulkSyncContacts: jest.fn(),
  },
}));

jest.mock('@services/mauticService', () => ({
  __esModule: true,
  default: {
    isMauticConfigured: jest.fn(),
    getStatus: jest.fn(),
    getSegments: jest.fn(),
    syncContact: jest.fn(),
    bulkSyncContacts: jest.fn(),
  },
}));

const mailchimpModule = mailchimpService as jest.Mocked<typeof mailchimpService>;
const mauticModule = mauticService as jest.Mocked<typeof mauticService>;

describe('newsletterProviderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults newsletter signups to local CRM storage when no external provider is selected', () => {
    mailchimpModule.isMailchimpConfigured.mockReturnValue(true);
    mauticModule.isMauticConfigured.mockReturnValue(true);

    const provider = newsletterProviderService.resolveNewsletterProvider({
      newsletter: {},
      mailchimp: {},
      mautic: {},
    } as never);

    const destination = newsletterProviderService.resolveNewsletterDestination(
      {
        newsletter: {},
        mailchimp: {},
        mautic: {},
      } as never,
      {
        audienceMode: 'local_email',
        defaultTags: ['newsletter'],
      }
    );

    expect(provider).toBe('local_email');
    expect(destination).toEqual({
      provider: 'local_email',
      audienceId: null,
      shouldSync: false,
      tags: ['newsletter'],
    });
  });

  it('allows local email presets without provider audience IDs', () => {
    mailchimpModule.isMailchimpConfigured.mockReturnValue(true);
    mauticModule.isMauticConfigured.mockReturnValue(true);

    const settings = {
      newsletter: {
        selectedPresetId: 'preset-local',
        listPresets: [
          {
            id: 'preset-local',
            name: 'Local newsletter',
            provider: 'local_email',
            defaultTags: ['local'],
          },
        ],
      },
      mailchimp: {
        audienceId: 'list-fallback',
      },
      mautic: {
        segmentId: 'segment-fallback',
      },
    } satisfies Pick<WebsiteSiteSettings, 'newsletter' | 'mailchimp' | 'mautic'>;

    expect(newsletterProviderService.resolveNewsletterProvider(settings)).toBe('local_email');
    expect(
      newsletterProviderService.resolveNewsletterDestination(settings, {
        audienceMode: 'local_email',
        defaultTags: ['newsletter'],
      })
    ).toEqual({
      provider: 'local_email',
      audienceId: null,
      shouldSync: false,
      tags: ['newsletter', 'local'],
    });
  });

  it('resolves Mailchimp when the site is configured for Mailchimp', () => {
    mailchimpModule.isMailchimpConfigured.mockReturnValue(true);
    mauticModule.isMauticConfigured.mockReturnValue(true);

    const provider = newsletterProviderService.resolveNewsletterProvider({
      newsletter: { provider: 'mailchimp' },
      mailchimp: {},
      mautic: {},
    } as never);

    expect(provider).toBe('mailchimp');
  });

  it('falls back to local CRM storage when the selected provider is unavailable', () => {
    mailchimpModule.isMailchimpConfigured.mockReturnValue(false);
    mauticModule.isMauticConfigured.mockReturnValue(true);

    const provider = newsletterProviderService.resolveNewsletterProvider({
      newsletter: { provider: 'mailchimp' },
      mailchimp: {},
      mautic: {},
    } as never);

    expect(provider).toBe('local_email');
  });

  it('routes sync requests to the active provider backend', async () => {
    mailchimpModule.isMailchimpConfigured.mockReturnValue(true);
    mauticModule.isMauticConfigured.mockReturnValue(false);
    mailchimpModule.syncContact.mockResolvedValue({
      contactId: 'contact-1',
      email: 'ada@example.com',
      success: true,
      action: 'added',
    });

    const result = await newsletterProviderService.syncNewsletterContact(
      {
        newsletter: { provider: 'mailchimp' },
        mailchimp: {},
        mautic: {},
      } as never,
      {
        contactId: 'contact-1',
        listId: 'aud-1',
        tags: ['newsletter'],
      }
    );

    expect(mailchimpModule.syncContact).toHaveBeenCalledWith({
      contactId: 'contact-1',
      listId: 'aud-1',
      tags: ['newsletter'],
    });
    expect(mauticModule.syncContact).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('uses the selected newsletter preset as the active Mailchimp signup destination', () => {
    mailchimpModule.isMailchimpConfigured.mockReturnValue(true);
    mauticModule.isMauticConfigured.mockReturnValue(true);

    const destination = newsletterProviderService.resolveNewsletterDestination(
      {
        newsletter: {
          provider: 'mautic',
          selectedPresetId: 'preset-mailchimp',
          selectedAudienceId: 'segment-fallback',
          listPresets: [
            {
              id: 'preset-mailchimp',
              name: 'Website Newsletter',
              provider: 'mailchimp',
              audienceId: 'list-active',
              defaultTags: ['website'],
            },
          ],
        },
        mailchimp: {
          audienceId: 'list-fallback',
          defaultTags: ['mailchimp-default'],
        },
        mautic: {
          segmentId: 'segment-fallback',
        },
      } as never,
      {
        audienceMode: 'mailchimp',
        defaultTags: ['newsletter'],
      }
    );

    expect(destination).toEqual({
      provider: 'mailchimp',
      audienceId: 'list-active',
      shouldSync: true,
      tags: ['newsletter', 'website', 'mailchimp-default'],
    });
  });

  it('lets explicit component Mailchimp list IDs override selected presets', () => {
    mailchimpModule.isMailchimpConfigured.mockReturnValue(true);
    mauticModule.isMauticConfigured.mockReturnValue(false);

    const destination = newsletterProviderService.resolveNewsletterDestination(
      {
        newsletter: {
          provider: 'mailchimp',
          selectedPresetId: 'preset-mailchimp',
          listPresets: [
            {
              id: 'preset-mailchimp',
              name: 'Website Newsletter',
              provider: 'mailchimp',
              audienceId: 'list-active',
            },
          ],
        },
        mailchimp: {
          audienceId: 'list-fallback',
        },
        mautic: {},
      } as never,
      {
        audienceMode: 'mailchimp',
        mailchimpListId: 'list-component',
      }
    );

    expect(destination.audienceId).toBe('list-component');
    expect(destination.shouldSync).toBe(true);
  });

  it('syncs to an explicitly selected Mailchimp component destination even when the site default is local', () => {
    mailchimpModule.isMailchimpConfigured.mockReturnValue(true);
    mauticModule.isMauticConfigured.mockReturnValue(false);

    const destination = newsletterProviderService.resolveNewsletterDestination(
      {
        newsletter: {
          provider: 'local_email',
        },
        mailchimp: {
          audienceId: 'list-fallback',
          defaultTags: ['mailchimp-default'],
        },
        mautic: {},
      } as never,
      {
        audienceMode: 'mailchimp',
        mailchimpListId: 'list-component',
        defaultTags: ['newsletter'],
      }
    );

    expect(destination).toEqual({
      provider: 'mailchimp',
      audienceId: 'list-component',
      shouldSync: true,
      tags: ['newsletter', 'mailchimp-default'],
    });
  });
});
