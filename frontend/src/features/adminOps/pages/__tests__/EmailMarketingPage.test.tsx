import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailMarketingPage from '../../../mailchimp/pages/EmailMarketingPage';
import { renderWithProviders } from '../../../../test/testUtils';
import api from '../../../../services/api';

vi.mock('../../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../components/AdminPanelLayout', () => ({
  default: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

vi.mock('../../components/AdminPanelNav', () => ({
  default: () => <div data-testid="admin-panel-nav" />,
}));

vi.mock('../adminSettings/sections/EmailSettingsSection', () => ({
  default: () => <div data-testid="email-settings-section" />,
}));

const mockedApi = vi.mocked(api);

describe('EmailMarketingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/communications/status') {
        return Promise.resolve({
          data: {
            configured: true,
            provider: 'local_email',
            defaultProvider: 'local_email',
            providers: {
              local_email: { provider: 'local_email', configured: true, ready: true },
              mailchimp: { provider: 'mailchimp', configured: false },
            },
          },
        });
      }

      if (url === '/communications/audiences?scope=provider') {
        return Promise.resolve({
          data: [
            {
              id: 'list-1',
              name: 'Main Audience',
              memberCount: 42,
              doubleOptIn: false,
              provider: 'local_email',
            },
          ],
        });
      }

      if (url === '/communications/campaigns') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/communications/audiences?scope=saved') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/communications/campaign-runs') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/mailchimp/lists/list-1/segments') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/v2/contacts') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              data: [],
              pagination: {
                total: 0,
                page: 1,
                limit: 100,
                total_pages: 0,
              },
            },
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    mockedApi.post.mockResolvedValue({ data: { ok: true } });
    mockedApi.patch.mockResolvedValue({ data: { ok: true } });
  });

  it('keeps the campaign title input stable while typing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    const newCampaignButton = await screen.findByRole('button', { name: /new campaign/i });
    await waitFor(() => {
      expect(newCampaignButton).not.toBeDisabled();
    });

    await user.click(newCampaignButton);

    const modalTitle = await screen.findByText('Create Email Campaign');
    const modalRoot = modalTitle.closest('div.fixed') as HTMLElement;
    expect(modalRoot).toBeTruthy();

    const titleInput = modalRoot.querySelector('input[type="text"]') as HTMLInputElement;
    await user.type(titleInput, 'Spring Appeal');

    expect(titleInput.value).toBe('Spring Appeal');
  });

  it('marks the campaign creation modal as a dialog and returns focus after Escape', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    const newCampaignButton = await screen.findByRole('button', { name: /new campaign/i });
    await user.click(newCampaignButton);

    const dialog = await screen.findByRole('dialog', { name: /create email campaign/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(
      screen.getByRole('button', { name: /close campaign creation dialog/i })
    ).toHaveFocus();
    expect(screen.getByRole('button', { name: /all eligible contacts/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(screen.getByRole('button', { name: /^saved audience$/i }));
    expect(screen.getByRole('button', { name: /^saved audience$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /create email campaign/i })
      ).not.toBeInTheDocument();
    });
    expect(newCampaignButton).toHaveFocus();
  });

  it('uses the communications title on the canonical settings route', async () => {
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    expect(await screen.findByRole('heading', { name: /communications/i })).toBeInTheDocument();
  });

  it('keeps the communications route local-first with a CRM audience and SMTP-gated live actions', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/communications/status') {
        return Promise.resolve({
          data: {
            configured: true,
            provider: 'local_email',
            defaultProvider: 'local_email',
            providers: {
              local_email: {
                provider: 'local_email',
                configured: true,
                ready: false,
                message: 'SMTP setup required before delivery.',
              },
              mailchimp: { provider: 'mailchimp', configured: false },
            },
          },
        });
      }

      if (url === '/communications/audiences?scope=provider') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/communications/campaigns') return Promise.resolve({ data: [] });
      if (url === '/communications/audiences?scope=saved') return Promise.resolve({ data: [] });
      if (url === '/communications/campaign-runs') return Promise.resolve({ data: [] });
      if (url === '/v2/contacts') {
        return Promise.resolve({
          data: {
            success: true,
            data: { data: [], pagination: { total: 0, page: 1, limit: 25, total_pages: 1 } },
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/communications',
    });

    expect(await screen.findByRole('heading', { name: /communications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^local email$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.queryByRole('button', { name: /^mailchimp$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/sync tags/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /new campaign/i }));

    expect(
      screen.getByRole('option', { name: /crm email audience \(0 eligible contacts\)/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /provider segment/i })).not.toBeInTheDocument();
    expect(screen.getByText(/all eligible crm contacts in crm email audience/i)).toBeInTheDocument();
    expect(screen.getAllByText(/smtp setup required/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /send test email/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /send now/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save as draft/i })).not.toBeDisabled();

    fireEvent.change(screen.getByLabelText(/schedule send time/i), {
      target: { value: '2099-05-01T10:00' },
    });
    expect(screen.getByRole('button', { name: /schedule campaign/i })).toBeDisabled();
    expect(mockedApi.post).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/mailchimp/),
      expect.anything()
    );
  });

  it('renders a sandboxed preview for guided-builder campaigns', async () => {
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/communications/campaigns/preview') {
        return Promise.resolve({
          data: {
            subject: 'Spring Appeal',
            previewText: 'Support our spring programs',
            html: '<!doctype html><html><body><h1>Preview body</h1></body></html>',
            plainText: 'Preview body',
            warnings: [],
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    const newCampaignButton = await screen.findByRole('button', { name: /new campaign/i });
    await user.click(newCampaignButton);

    fireEvent.change(screen.getByLabelText(/campaign title/i), {
      target: { value: 'Spring Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/subject line/i), {
      target: { value: 'Spring Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/from name/i), {
      target: { value: 'Community Org' },
    });
    fireEvent.change(screen.getByLabelText(/reply-to email/i), {
      target: { value: 'hello@example.org' },
    });
    await user.click(screen.getByRole('button', { name: /^preview$/i }));

    expect(await screen.findByRole('heading', { name: /campaign preview/i })).toBeInTheDocument();
    expect(screen.getByTitle('Campaign Preview')).toHaveAttribute('sandbox', '');
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/communications/campaigns/preview',
      expect.objectContaining({
        title: 'Spring Appeal',
        subject: 'Spring Appeal',
        fromName: 'Community Org',
        replyTo: 'hello@example.org',
        builderContent: expect.objectContaining({
          blocks: expect.any(Array),
        }),
      })
    );
  });

  it('passes guided-builder content through campaign creation', async () => {
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/communications/campaigns') {
        return Promise.resolve({
          data: {
            id: 'campaign-1',
            type: 'regular',
            status: 'save',
            title: 'Spring Appeal',
            subject: 'Spring Appeal',
            listId: 'list-1',
            createdAt: '2026-04-24T12:00:00Z',
          },
        });
      }

      if (url === '/communications/audiences') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/communications/campaign-runs') {
        return Promise.resolve({ data: [] });
      }

      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    const newCampaignButton = await screen.findByRole('button', { name: /new campaign/i });
    await user.click(newCampaignButton);

    fireEvent.change(screen.getByLabelText(/campaign title/i), {
      target: { value: 'Spring Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/subject line/i), {
      target: { value: 'Spring Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/from name/i), {
      target: { value: 'Community Org' },
    });
    fireEvent.change(screen.getByLabelText(/reply-to email/i), {
      target: { value: 'hello@example.org' },
    });
    await user.click(screen.getByRole('button', { name: /save as draft/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/communications/campaigns',
        expect.objectContaining({
          title: 'Spring Appeal',
          subject: 'Spring Appeal',
          fromName: 'Community Org',
          replyTo: 'hello@example.org',
          htmlContent: undefined,
          plainTextContent: undefined,
          builderContent: expect.objectContaining({
            blocks: expect.arrayContaining([
              expect.objectContaining({
                type: 'heading',
                content: 'Campaign headline',
              }),
            ]),
          }),
        })
      );
    });
  });

  it('disables campaign action buttons while draft creation is in flight', async () => {
    let resolveCampaign: (value: {
      data: {
        id: string;
        type: string;
        status: string;
        title: string;
        subject: string;
        listId: string;
        createdAt: string;
      };
    }) => void = () => undefined;

    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/communications/campaigns') {
        return new Promise((resolve) => {
          resolveCampaign = resolve;
        });
      }

      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    const newCampaignButton = await screen.findByRole('button', { name: /new campaign/i });
    await user.click(newCampaignButton);

    fireEvent.change(screen.getByLabelText(/campaign title/i), {
      target: { value: 'Spring Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/subject line/i), {
      target: { value: 'Spring Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/from name/i), {
      target: { value: 'Community Org' },
    });
    fireEvent.change(screen.getByLabelText(/reply-to email/i), {
      target: { value: 'hello@example.org' },
    });
    await user.click(screen.getByRole('button', { name: /save as draft/i }));

    expect(await screen.findByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^preview$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /send now/i })).toBeDisabled();

    resolveCampaign({
      data: {
        id: 'campaign-1',
        type: 'regular',
        status: 'save',
        title: 'Spring Appeal',
        subject: 'Spring Appeal',
        listId: 'list-1',
        createdAt: '2026-04-24T12:00:00Z',
      },
    });
  });

  it('saves selected contacts as a list-tied saved audience with success feedback', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/communications/status') {
        return Promise.resolve({
          data: {
            configured: true,
            provider: 'local_email',
            defaultProvider: 'local_email',
            providers: {
              local_email: { provider: 'local_email', configured: true, ready: true },
              mailchimp: { provider: 'mailchimp', configured: false },
            },
          },
        });
      }
      if (url === '/communications/audiences?scope=provider') {
        return Promise.resolve({
          data: [
            {
              id: 'list-1',
              name: 'Main Audience',
              memberCount: 42,
              doubleOptIn: false,
              provider: 'local_email',
            },
          ],
        });
      }
      if (url === '/communications/campaigns') return Promise.resolve({ data: [] });
      if (url === '/communications/audiences?scope=saved') return Promise.resolve({ data: [] });
      if (url === '/communications/campaign-runs') {
        return Promise.resolve({
          data: [
            {
              id: 'run-previous',
              provider: 'mailchimp',
              providerCampaignId: 'campaign-previous',
              title: 'Already mailed',
              listId: 'list-1',
              includeAudienceId: 'audience-2',
              exclusionAudienceIds: [],
              suppressionSnapshot: [],
              testRecipients: [],
              audienceSnapshot: {
                targetContactIds: ['contact-2'],
              },
              requestedSendTime: null,
              status: 'sent',
              counts: { targetContactCount: 1 },
              createdAt: '2026-04-24T00:00:00Z',
              updatedAt: '2026-04-24T00:00:00Z',
            },
          ],
        });
      }
      if (url === '/mailchimp/lists/list-1/tags') return Promise.resolve({ data: [] });
      if (url === '/v2/contacts') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              data: [
                {
                  contact_id: 'contact-1',
                  first_name: 'Ada',
                  last_name: 'Lovelace',
                  email: 'ada@example.org',
                  do_not_email: false,
                },
              ],
              pagination: { total: 1, page: 1, limit: 100, total_pages: 1 },
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
    mockedApi.post.mockImplementation((url: string, body: unknown) => {
      if (url === '/communications/audiences') {
        return Promise.resolve({
          data: {
            id: 'audience-1',
            name: (body as { name: string }).name,
            filters: (body as { filters: Record<string, unknown> }).filters,
            sourceCount: 1,
            status: 'active',
            createdAt: '2026-04-25T00:00:00Z',
            updatedAt: '2026-04-25T00:00:00Z',
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    const mainAudience = { id: 'list-1', name: 'Main Audience', memberCount: 42, doubleOptIn: false };
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
      preloadedState: {
        mailchimp: {
          status: { configured: true, provider: 'local_email', defaultProvider: 'local_email' },
          lists: [mainAudience],
          selectedList: mainAudience,
          tags: [],
          campaigns: [],
          savedAudiences: [],
          campaignRuns: [],
          segments: [],
          segmentsListId: null,
          syncResult: null,
          isLoading: false,
          isSyncing: false,
          isLoadingSavedAudiences: false,
          isCreatingSavedAudience: false,
          isArchivingSavedAudience: false,
          savedAudienceMessage: null,
          savedAudienceError: null,
          savedAudienceLoadError: null,
          savedAudienceCreateError: null,
          isLoadingCampaignRuns: false,
          campaignRunsError: null,
          campaignRunActionMessage: null,
          campaignRunActionError: null,
          isCreatingCampaign: false,
          isSendingCampaign: false,
          isTestingCampaign: false,
          error: null,
        },
        contacts: {
          list: {
            contacts: [
              {
                contact_id: 'contact-1',
                first_name: 'Ada',
                last_name: 'Lovelace',
                email: 'ada@example.org',
                do_not_email: false,
              },
            ],
            loading: false,
            error: null,
            pagination: { total: 1, page: 1, limit: 100, total_pages: 1 },
            filters: {
              search: '',
              account_id: '',
              is_active: null,
              tags: [],
              role: '',
              sort_by: 'created_at',
              sort_order: 'desc',
            },
            availableTags: [],
          },
        },
      } as never,
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /select visible eligible contacts/i }));
    fireEvent.change(screen.getByLabelText(/saved audience name/i), {
      target: { value: 'Spring donors' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save audience/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/communications/audiences',
        expect.objectContaining({
          name: 'Spring donors',
          filters: expect.objectContaining({
            source: 'communications_selected_contacts',
            contactIds: ['contact-1'],
            listId: 'list-1',
          }),
        })
      );
    });
    expect(await screen.findAllByText(/saved "spring donors"/i)).not.toHaveLength(0);
  });

  it('searches paginated CRM contacts and sends selected provider tags during sync', async () => {
    mockedApi.get.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
      if (url === '/communications/status') {
        return Promise.resolve({
          data: {
            configured: true,
            provider: 'local_email',
            defaultProvider: 'local_email',
            providers: {
              local_email: { provider: 'local_email', configured: true, ready: true },
              mailchimp: { provider: 'mailchimp', configured: true, accountName: 'Mailchimp Account' },
            },
          },
        });
      }
      if (url === '/communications/audiences?scope=provider') {
        return Promise.resolve({
          data: [
            {
              id: 'list-1',
              name: 'Main Audience',
              memberCount: 42,
              doubleOptIn: false,
              provider: 'mailchimp',
            },
          ],
        });
      }
      if (url === '/communications/campaigns') return Promise.resolve({ data: [] });
      if (url === '/communications/audiences?scope=saved') return Promise.resolve({ data: [] });
      if (url === '/communications/campaign-runs') return Promise.resolve({ data: [] });
      if (url === '/mailchimp/lists/list-1/tags') {
        return Promise.resolve({ data: [{ id: 1, name: 'newsletter', memberCount: 12 }] });
      }
      if (url === '/v2/contacts') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              data: [
                {
                  contact_id: 'contact-1',
                  first_name: 'Ada',
                  last_name: 'Lovelace',
                  email: 'ada@example.org',
                  do_not_email: false,
                },
                {
                  contact_id: 'contact-2',
                  first_name: 'Grace',
                  last_name: 'Hopper',
                  email: 'grace@example.org',
                  do_not_email: true,
                },
              ],
              pagination: {
                total: config?.params?.search === 'Ada' ? 1 : 52,
                page: Number(config?.params?.page || 1),
                limit: Number(config?.params?.limit || 25),
                total_pages: config?.params?.search === 'Ada' ? 1 : 3,
              },
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
    mockedApi.post.mockResolvedValue({
      data: { total: 1, added: 1, updated: 0, skipped: 0, errors: 0, results: [] },
    });

    const user = userEvent.setup();
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    expect(await screen.findByRole('button', { name: /^local email$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.queryByText(/sync tags/i)).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /^mailchimp$/i }));
    expect(screen.getByRole('button', { name: /^mailchimp$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await user.click(await screen.findByText('Main Audience'));
    await user.type(screen.getByLabelText(/search crm contacts/i), 'Ada');

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/v2/contacts',
        expect.objectContaining({
          params: expect.objectContaining({ page: 1, limit: 25, search: 'Ada' }),
        })
      );
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /ada lovelace/i }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /newsletter/i }));
    fireEvent.click(screen.getByRole('button', { name: /sync 1 contact with 1 tag/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/mailchimp/sync/bulk',
        expect.objectContaining({
          contactIds: ['contact-1'],
          listId: 'list-1',
          tags: ['newsletter'],
        })
      );
    });
    expect(screen.getByText(/do-not-email contacts stay excluded/i)).toBeInTheDocument();
  });

  it('archives saved audiences from the communications workspace', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/communications/status') return Promise.resolve({ data: { configured: true, provider: 'local_email', defaultProvider: 'local_email', providers: { local_email: { provider: 'local_email', configured: true, ready: true }, mailchimp: { provider: 'mailchimp', configured: false } } } });
      if (url === '/communications/audiences?scope=provider') {
        return Promise.resolve({
          data: [{ id: 'list-1', name: 'Main Audience', memberCount: 42, doubleOptIn: false }],
        });
      }
      if (url === '/communications/campaigns') return Promise.resolve({ data: [] });
      if (url === '/communications/audiences?scope=saved') {
        return Promise.resolve({
          data: [
            {
              id: 'audience-1',
              name: 'Spring donors',
              filters: {
                source: 'communications_selected_contacts',
                contactIds: ['contact-1'],
                listId: 'list-1',
              },
              sourceCount: 1,
              status: 'active',
              createdAt: '2026-04-25T00:00:00Z',
              updatedAt: '2026-04-25T00:00:00Z',
            },
          ],
        });
      }
      if (url === '/communications/campaign-runs') {
        return Promise.resolve({
          data: [
            {
              id: 'run-previous',
              provider: 'mailchimp',
              providerCampaignId: 'campaign-previous',
              title: 'Already mailed',
              listId: 'list-1',
              includeAudienceId: 'audience-2',
              exclusionAudienceIds: [],
              suppressionSnapshot: [],
              testRecipients: [],
              audienceSnapshot: {
                targetContactIds: ['contact-2'],
              },
              requestedSendTime: null,
              status: 'sent',
              counts: { targetContactCount: 1 },
              createdAt: '2026-04-24T00:00:00Z',
              updatedAt: '2026-04-24T00:00:00Z',
            },
          ],
        });
      }
      if (url === '/v2/contacts') {
        return Promise.resolve({
          data: {
            success: true,
            data: { data: [], pagination: { total: 0, page: 1, limit: 100, total_pages: 0 } },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
    mockedApi.patch.mockResolvedValue({
      data: {
        id: 'audience-1',
        name: 'Spring donors',
        filters: {
          source: 'communications_selected_contacts',
          contactIds: ['contact-1'],
          listId: 'list-1',
        },
        sourceCount: 1,
        status: 'archived',
        createdAt: '2026-04-25T00:00:00Z',
        updatedAt: '2026-04-25T00:00:00Z',
      },
    });

    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    expect(await screen.findByText('Spring donors')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /archive/i }));

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith('/communications/audiences/audience-1/archive');
    });
    expect(await screen.findAllByText(/archived "spring donors"/i)).not.toHaveLength(0);
    expect(screen.queryByText('Spring donors')).not.toBeInTheDocument();
  });

  it('sends saved-audience targeting metadata through campaign creation', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/communications/status') return Promise.resolve({ data: { configured: true, provider: 'local_email', defaultProvider: 'local_email', providers: { local_email: { provider: 'local_email', configured: true, ready: true }, mailchimp: { provider: 'mailchimp', configured: false } } } });
      if (url === '/communications/audiences?scope=provider') {
        return Promise.resolve({
          data: [{ id: 'list-1', name: 'Main Audience', memberCount: 42, doubleOptIn: false }],
        });
      }
      if (url === '/communications/campaigns') return Promise.resolve({ data: [] });
      if (url === '/communications/audiences?scope=saved') {
        return Promise.resolve({
          data: [
            {
              id: 'audience-1',
              name: 'Spring donors',
              filters: {
                source: 'communications_selected_contacts',
                contactIds: ['contact-1'],
                listId: 'list-1',
              },
              sourceCount: 1,
              status: 'active',
              createdAt: '2026-04-25T00:00:00Z',
              updatedAt: '2026-04-25T00:00:00Z',
            },
            {
              id: 'audience-2',
              name: 'Already mailed',
              filters: {
                source: 'communications_selected_contacts',
                contactIds: ['contact-2'],
                listId: 'list-1',
              },
              sourceCount: 1,
              status: 'active',
              createdAt: '2026-04-25T00:00:00Z',
              updatedAt: '2026-04-25T00:00:00Z',
            },
          ],
        });
      }
      if (url === '/communications/campaign-runs') {
        return Promise.resolve({
          data: [
            {
              id: 'run-previous',
              provider: 'mailchimp',
              providerCampaignId: 'campaign-previous',
              title: 'Already mailed',
              listId: 'list-1',
              includeAudienceId: 'audience-2',
              exclusionAudienceIds: [],
              suppressionSnapshot: [],
              testRecipients: [],
              audienceSnapshot: {
                targetContactIds: ['contact-2'],
              },
              requestedSendTime: null,
              status: 'sent',
              counts: { targetContactCount: 1 },
              createdAt: '2026-04-24T00:00:00Z',
              updatedAt: '2026-04-24T00:00:00Z',
            },
          ],
        });
      }
      if (url === '/mailchimp/lists/list-1/segments') return Promise.resolve({ data: [] });
      if (url === '/v2/contacts') {
        return Promise.resolve({
          data: {
            success: true,
            data: { data: [], pagination: { total: 0, page: 1, limit: 100, total_pages: 0 } },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/communications/campaigns') {
        return Promise.resolve({
          data: {
            id: 'campaign-1',
            type: 'regular',
            status: 'save',
            title: 'Spring Appeal',
            subject: 'Spring Appeal',
            listId: 'list-1',
            createdAt: '2026-04-25T00:00:00Z',
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    const newCampaignButton = await screen.findByRole('button', { name: /new campaign/i });
    await user.click(newCampaignButton);
    await user.click(screen.getByRole('button', { name: /^saved audience$/i }));
    await user.selectOptions(screen.getByLabelText(/^saved audience$/i), 'audience-1');
    await user.selectOptions(screen.getByLabelText(/suppress saved audience/i), 'audience-2');
    const priorRunsSelect = screen.getByLabelText(/suppress prior campaign runs/i);
    await waitFor(() => {
      expect(priorRunsSelect).not.toBeDisabled();
    });
    const priorRunOption = Array.from((priorRunsSelect as HTMLSelectElement).options).find(
      (option) => option.value === 'run-previous'
    );
    expect(priorRunOption).toBeTruthy();
    if (priorRunOption) {
      priorRunOption.selected = true;
    }
    fireEvent.change(priorRunsSelect);
    fireEvent.change(screen.getByLabelText(/campaign title/i), {
      target: { value: 'Spring Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/subject line/i), {
      target: { value: 'Spring Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/from name/i), {
      target: { value: 'Community Org' },
    });
    fireEvent.change(screen.getByLabelText(/reply-to email/i), {
      target: { value: 'hello@example.org' },
    });
    fireEvent.change(screen.getByLabelText(/test recipients/i), {
      target: { value: 'review@example.org' },
    });
    await user.click(screen.getByRole('button', { name: /save as draft/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/communications/campaigns',
        expect.objectContaining({
          includeAudienceId: 'audience-1',
          exclusionAudienceIds: ['audience-2'],
          priorRunSuppressionIds: ['run-previous'],
          suppressionSnapshot: [
            expect.objectContaining({
              id: 'audience-2',
              name: 'Already mailed',
            }),
          ],
          testRecipients: ['review@example.org'],
          segmentId: undefined,
          audienceSnapshot: expect.objectContaining({
            savedAudienceId: 'audience-1',
            savedAudienceName: 'Spring donors',
            testRecipientCount: 1,
          }),
        })
      );
    });
  });

  it('runs campaign preflight review and calls the pending real test-send hook', async () => {
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/communications/campaigns/test-send') {
        return Promise.resolve({
          data: {
            delivered: true,
            recipients: ['review@example.org'],
            message: 'Test sent',
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    const newCampaignButton = await screen.findByRole('button', { name: /new campaign/i });
    await user.click(newCampaignButton);

    fireEvent.change(screen.getByLabelText(/campaign title/i), {
      target: { value: 'Spring Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/subject line/i), {
      target: { value: 'Spring Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/from name/i), {
      target: { value: 'Community Org' },
    });
    fireEvent.change(screen.getByLabelText(/reply-to email/i), {
      target: { value: 'hello@example.org' },
    });
    fireEvent.change(screen.getByLabelText(/test recipients/i), {
      target: { value: 'review@example.org' },
    });

    expect(screen.getByText(/preflight review/i)).toBeInTheDocument();
    expect(screen.getByText(/all eligible crm contacts in main audience/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /send test email/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/communications/campaigns/test-send',
        expect.objectContaining({
          title: 'Spring Appeal',
          testRecipients: ['review@example.org'],
        })
      );
    });
    expect(await screen.findByText(/test email sent for review@example.org/i)).toBeInTheDocument();
  });

  it('shows campaign-run provider segment, suppression, and test-recipient evidence', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/communications/status') return Promise.resolve({ data: { configured: true, provider: 'local_email', defaultProvider: 'local_email', providers: { local_email: { provider: 'local_email', configured: true, ready: true }, mailchimp: { provider: 'mailchimp', configured: false } } } });
      if (url === '/communications/audiences?scope=provider') {
        return Promise.resolve({
          data: [{ id: 'list-1', name: 'Main Audience', memberCount: 42, doubleOptIn: false }],
        });
      }
      if (url === '/communications/campaigns') return Promise.resolve({ data: [] });
      if (url === '/communications/audiences?scope=saved') return Promise.resolve({ data: [] });
      if (url === '/communications/campaign-runs') {
        return Promise.resolve({
          data: [
            {
              id: 'run-1',
              provider: 'mailchimp',
              providerCampaignId: 'campaign-1',
              title: 'Spring Appeal',
              listId: 'list-1',
              includeAudienceId: 'audience-1',
              exclusionAudienceIds: ['audience-2'],
              suppressionSnapshot: [{ id: 'audience-2', name: 'Already mailed', sourceCount: 3 }],
              testRecipients: ['review@example.org'],
              audienceSnapshot: {
                savedAudienceName: 'Spring donors',
                providerSegmentId: 789,
                providerSegmentName: 'NPM 2026-04-25T00:00:00 run',
                targetContactIds: ['contact-1', 'contact-2'],
              },
              requestedSendTime: null,
              status: 'draft',
              counts: {
                requestedContactCount: 12,
                targetContactCount: 2,
                syncedContactCount: 9,
                skippedContactCount: 1,
                suppressionSourceCount: 3,
                providerLifecycle: {
                  lastWebhookStatus: 'sent',
                },
                providerReportSummary: {
                  emailsSent: 8,
                  openRate: 0.5,
                  clickRate: 0.125,
                  unsubscribes: 1,
                  bounces: 0,
                  lastReportedAt: '2026-04-25T02:00:00Z',
                },
              },
              createdAt: '2026-04-25T00:00:00Z',
              updatedAt: '2026-04-25T00:00:00Z',
            },
          ],
        });
      }
      if (url === '/v2/contacts') {
        return Promise.resolve({
          data: {
            success: true,
            data: { data: [], pagination: { total: 0, page: 1, limit: 100, total_pages: 0 } },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    expect(await screen.findByText('Spring Appeal')).toBeInTheDocument();
    expect(screen.getByText(/Run segment: NPM 2026-04-25T00:00:00 run \(#789\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Contacts: 9 synced from 12 requested, 1 skipped/i)).toBeInTheDocument();
    expect(screen.getByText(/Target snapshot: 2 contacts/i)).toBeInTheDocument();
    expect(screen.getByText(/3 contacts suppressed/i)).toBeInTheDocument();
    expect(screen.getByText(/Provider lifecycle: sent/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Provider summary: 8 sent, 50.0% opens, 12.5% clicks, 1 unsubscribed, 0 bounced/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Test recipients: review@example.org/i)).toBeInTheDocument();
  });

  it('shows campaign-run actions and explicit unsupported cancel and reschedule states', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/communications/status') return Promise.resolve({ data: { configured: true, provider: 'local_email', defaultProvider: 'local_email', providers: { local_email: { provider: 'local_email', configured: true, ready: true }, mailchimp: { provider: 'mailchimp', configured: false } } } });
      if (url === '/communications/audiences?scope=provider') {
        return Promise.resolve({
          data: [{ id: 'list-1', name: 'Main Audience', memberCount: 42, doubleOptIn: false }],
        });
      }
      if (url === '/communications/campaigns') return Promise.resolve({ data: [] });
      if (url === '/communications/audiences?scope=saved') return Promise.resolve({ data: [] });
      if (url === '/communications/campaign-runs') {
        return Promise.resolve({
          data: [
            {
              id: 'run-1',
              provider: 'mailchimp',
              providerCampaignId: 'campaign-1',
              title: 'Draft Appeal',
              listId: 'list-1',
              includeAudienceId: null,
              exclusionAudienceIds: [],
              suppressionSnapshot: [],
              testRecipients: [],
              audienceSnapshot: {},
              requestedSendTime: null,
              status: 'draft',
              counts: {},
              createdAt: '2026-04-25T00:00:00Z',
              updatedAt: '2026-04-25T00:00:00Z',
            },
          ],
        });
      }
      if (url === '/v2/contacts') {
        return Promise.resolve({
          data: {
            success: true,
            data: { data: [], pagination: { total: 0, page: 1, limit: 25, total_pages: 1 } },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
    mockedApi.post.mockImplementation((url: string) => {
      if (
        url === '/communications/campaign-runs/run-1/send' ||
        url === '/communications/campaign-runs/run-1/status'
      ) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              run: {
                id: 'run-1',
                provider: 'mailchimp',
                providerCampaignId: 'campaign-1',
                title: 'Draft Appeal',
                listId: 'list-1',
                includeAudienceId: null,
                exclusionAudienceIds: [],
                suppressionSnapshot: [],
                testRecipients: [],
                audienceSnapshot: {},
                requestedSendTime: null,
                status: 'draft',
                counts: {},
                createdAt: '2026-04-25T00:00:00Z',
                updatedAt: '2026-04-25T00:00:00Z',
              },
              action: url.endsWith('/send') ? 'sent' : 'refreshed',
              message: url.endsWith('/send')
                ? 'Campaign run sent'
                : 'Campaign run status refreshed',
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    expect(await screen.findByText('Draft Appeal')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /refresh run status/i }));
    await user.click(screen.getByRole('button', { name: /send run now/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/communications/campaign-runs/run-1/status');
      expect(mockedApi.post).toHaveBeenCalledWith('/communications/campaign-runs/run-1/send');
    });
    expect(screen.getByRole('button', { name: /cancel unsupported/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reschedule unsupported/i })).toBeDisabled();
  });

  it('schedules guided-builder campaigns without calling the immediate send endpoint', async () => {
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/communications/campaigns') {
        return Promise.resolve({
          data: {
            id: 'campaign-1',
            type: 'regular',
            status: 'schedule',
            title: 'Scheduled Appeal',
            subject: 'Scheduled Appeal',
            listId: 'list-1',
            createdAt: '2026-04-24T12:00:00Z',
            sendTime: '2026-05-01T10:00',
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    const newCampaignButton = await screen.findByRole('button', { name: /new campaign/i });
    await user.click(newCampaignButton);

    fireEvent.change(screen.getByLabelText(/campaign title/i), {
      target: { value: 'Scheduled Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/subject line/i), {
      target: { value: 'Scheduled Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/from name/i), {
      target: { value: 'Community Org' },
    });
    fireEvent.change(screen.getByLabelText(/reply-to email/i), {
      target: { value: 'hello@example.org' },
    });
    fireEvent.change(screen.getByLabelText(/schedule send time/i), {
      target: { value: '2026-05-01T10:00' },
    });

    const scheduleButton = screen.getByRole('button', { name: /schedule campaign/i });
    await user.click(scheduleButton);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/communications/campaigns',
        expect.objectContaining({
          title: 'Scheduled Appeal',
          subject: 'Scheduled Appeal',
          fromName: 'Community Org',
          replyTo: 'hello@example.org',
          sendTime: '2026-05-01T10:00',
          builderContent: expect.objectContaining({
            blocks: expect.arrayContaining([
              expect.objectContaining({
                type: 'heading',
                content: 'Campaign headline',
              }),
            ]),
          }),
        })
      );
    });

    expect(
      mockedApi.post.mock.calls.some(([url]) => url === '/communications/campaign-runs/campaign-1/send')
    ).toBe(false);
  });

  it('strips scheduled time when sending now and calls the immediate send endpoint', async () => {
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/communications/campaigns') {
        return Promise.resolve({
          data: {
            id: 'campaign-1',
            type: 'regular',
            status: 'save',
            title: 'Immediate Appeal',
            subject: 'Immediate Appeal',
            listId: 'list-1',
            createdAt: '2026-04-24T12:00:00Z',
          },
        });
      }

      if (url === '/communications/campaign-runs/campaign-1/send') {
        return Promise.resolve({ data: { ok: true } });
      }

      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    const newCampaignButton = await screen.findByRole('button', { name: /new campaign/i });
    await user.click(newCampaignButton);

    fireEvent.change(screen.getByLabelText(/campaign title/i), {
      target: { value: 'Immediate Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/subject line/i), {
      target: { value: 'Immediate Appeal' },
    });
    fireEvent.change(screen.getByLabelText(/from name/i), {
      target: { value: 'Community Org' },
    });
    fireEvent.change(screen.getByLabelText(/reply-to email/i), {
      target: { value: 'hello@example.org' },
    });
    fireEvent.change(screen.getByLabelText(/schedule send time/i), {
      target: { value: '2026-05-01T10:00' },
    });
    await user.click(screen.getByRole('button', { name: /send now/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/communications/campaign-runs/campaign-1/send');
    });

    const createCall = mockedApi.post.mock.calls.find(([url]) => url === '/communications/campaigns');
    expect(createCall?.[1]).toEqual(
      expect.objectContaining({
        title: 'Immediate Appeal',
        subject: 'Immediate Appeal',
        fromName: 'Community Org',
        replyTo: 'hello@example.org',
        sendTime: undefined,
        builderContent: expect.objectContaining({
          blocks: expect.any(Array),
        }),
      })
    );
  });

  it('labels scheduled campaigns as scheduled instead of sent', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/communications/status') {
        return Promise.resolve({ data: { configured: true, provider: 'local_email', defaultProvider: 'local_email', providers: { local_email: { provider: 'local_email', configured: true, ready: true }, mailchimp: { provider: 'mailchimp', configured: false } } } });
      }

      if (url === '/communications/audiences?scope=provider') {
        return Promise.resolve({
          data: [
            {
              id: 'list-1',
              name: 'Main Audience',
              memberCount: 42,
              doubleOptIn: false,
            },
          ],
        });
      }

      if (url === '/communications/campaigns') {
        return Promise.resolve({
          data: [
            {
              id: 'campaign-1',
              type: 'regular',
              status: 'schedule',
              title: 'Spring Appeal',
              subject: 'Spring Appeal',
              listId: 'list-1',
              createdAt: '2026-04-24T12:00:00Z',
              sendTime: '2026-05-01T10:00:00Z',
            },
          ],
        });
      }

      if (url === '/mailchimp/lists/list-1/segments') {
        return Promise.resolve({ data: [] });
      }

      return Promise.resolve({ data: {} });
    });

    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    expect(await screen.findByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText(/Scheduled:/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sent:/i)).not.toBeInTheDocument();
  });
});
