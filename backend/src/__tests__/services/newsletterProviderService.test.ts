import newsletterProviderService from '@services/newsletterProviderService';
import mailchimpService from '@services/mailchimpService';
import mauticService from '@services/mauticService';

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

  it('falls back to Mautic when Mailchimp is unavailable', () => {
    mailchimpModule.isMailchimpConfigured.mockReturnValue(false);
    mauticModule.isMauticConfigured.mockReturnValue(true);

    const provider = newsletterProviderService.resolveNewsletterProvider({
      newsletter: { provider: 'mailchimp' },
      mailchimp: {},
      mautic: {},
    } as never);

    expect(provider).toBe('mautic');
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
});
