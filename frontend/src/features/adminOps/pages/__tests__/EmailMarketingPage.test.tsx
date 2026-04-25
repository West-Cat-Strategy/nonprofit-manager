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
      if (url === '/mailchimp/status') {
        return Promise.resolve({ data: { configured: true } });
      }

      if (url === '/mailchimp/lists') {
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

      if (url === '/mailchimp/campaigns') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/mailchimp/audiences') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/mailchimp/campaign-runs') {
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
    expect(screen.getByRole('button', { name: /all subscribers/i })).toHaveAttribute(
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

  it('uses the email marketing title on the canonical settings route', async () => {
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    expect(await screen.findByRole('heading', { name: /newsletter campaigns/i })).toBeInTheDocument();
  });

  it('renders a sandboxed preview for guided-builder campaigns', async () => {
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/mailchimp/campaigns/preview') {
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
      '/mailchimp/campaigns/preview',
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
      if (url === '/mailchimp/campaigns') {
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

      if (url === '/mailchimp/audiences') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/mailchimp/campaign-runs') {
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
        '/mailchimp/campaigns',
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
      if (url === '/mailchimp/campaigns') {
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
      if (url === '/mailchimp/status') return Promise.resolve({ data: { configured: true } });
      if (url === '/mailchimp/lists') {
        return Promise.resolve({
          data: [{ id: 'list-1', name: 'Main Audience', memberCount: 42, doubleOptIn: false }],
        });
      }
      if (url === '/mailchimp/campaigns') return Promise.resolve({ data: [] });
      if (url === '/mailchimp/audiences') return Promise.resolve({ data: [] });
      if (url === '/mailchimp/campaign-runs') {
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
      if (url === '/mailchimp/audiences') {
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
          status: { configured: true },
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
          isCreatingCampaign: false,
          isSendingCampaign: false,
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

    fireEvent.click(screen.getByRole('checkbox', { name: /select all/i }));
    fireEvent.change(screen.getByLabelText(/saved audience name/i), {
      target: { value: 'Spring donors' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save audience/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/mailchimp/audiences',
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

  it('archives saved audiences from the communications workspace', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/mailchimp/status') return Promise.resolve({ data: { configured: true } });
      if (url === '/mailchimp/lists') {
        return Promise.resolve({
          data: [{ id: 'list-1', name: 'Main Audience', memberCount: 42, doubleOptIn: false }],
        });
      }
      if (url === '/mailchimp/campaigns') return Promise.resolve({ data: [] });
      if (url === '/mailchimp/audiences') {
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
      if (url === '/mailchimp/campaign-runs') {
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
      expect(mockedApi.patch).toHaveBeenCalledWith('/mailchimp/audiences/audience-1/archive');
    });
    expect(await screen.findByText(/archived "spring donors"/i)).toBeInTheDocument();
    expect(screen.queryByText('Spring donors')).not.toBeInTheDocument();
  });

  it('sends saved-audience targeting metadata through campaign creation', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/mailchimp/status') return Promise.resolve({ data: { configured: true } });
      if (url === '/mailchimp/lists') {
        return Promise.resolve({
          data: [{ id: 'list-1', name: 'Main Audience', memberCount: 42, doubleOptIn: false }],
        });
      }
      if (url === '/mailchimp/campaigns') return Promise.resolve({ data: [] });
      if (url === '/mailchimp/audiences') {
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
      if (url === '/mailchimp/campaign-runs') {
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
      if (url === '/mailchimp/campaigns') {
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
        '/mailchimp/campaigns',
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

  it('shows campaign-run provider segment, suppression, and test-recipient evidence', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/mailchimp/status') return Promise.resolve({ data: { configured: true } });
      if (url === '/mailchimp/lists') {
        return Promise.resolve({
          data: [{ id: 'list-1', name: 'Main Audience', memberCount: 42, doubleOptIn: false }],
        });
      }
      if (url === '/mailchimp/campaigns') return Promise.resolve({ data: [] });
      if (url === '/mailchimp/audiences') return Promise.resolve({ data: [] });
      if (url === '/mailchimp/campaign-runs') {
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
    expect(screen.getByText(/Test recipients: review@example.org/i)).toBeInTheDocument();
  });

  it('schedules guided-builder campaigns without calling the immediate send endpoint', async () => {
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/mailchimp/campaigns') {
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
        '/mailchimp/campaigns',
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
      mockedApi.post.mock.calls.some(([url]) => url === '/mailchimp/campaigns/campaign-1/send')
    ).toBe(false);
  });

  it('strips scheduled time when sending now and calls the immediate send endpoint', async () => {
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/mailchimp/campaigns') {
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

      if (url === '/mailchimp/campaigns/campaign-1/send') {
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
      expect(mockedApi.post).toHaveBeenCalledWith('/mailchimp/campaigns/campaign-1/send');
    });

    const createCall = mockedApi.post.mock.calls.find(([url]) => url === '/mailchimp/campaigns');
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
      if (url === '/mailchimp/status') {
        return Promise.resolve({ data: { configured: true } });
      }

      if (url === '/mailchimp/lists') {
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

      if (url === '/mailchimp/campaigns') {
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
