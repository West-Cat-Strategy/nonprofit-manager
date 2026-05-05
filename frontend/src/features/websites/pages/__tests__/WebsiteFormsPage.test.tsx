import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type * as WebsitesStateModule from '../../state';
import WebsiteFormsPage from '../WebsiteFormsPage';

const dispatchMock = vi.fn();

const thunkMocks = vi.hoisted(() => {
  const createAction = (type: string) =>
    Object.assign((payload?: unknown) => ({ type, payload }), {
      fulfilled: {
        match: (action: { type?: string }) => action?.type === `${type}/fulfilled`,
      },
    });

  return {
    clearWebsitesError: vi.fn(() => ({ type: 'websites/clearError' })),
    fetchWebsiteForms: vi.fn((payload?: unknown) => ({ type: 'websites/fetchForms', payload })),
    updateWebsiteForm: createAction('websites/updateForm'),
  };
});

const apiMocks = vi.hoisted(() => ({
  listPublicActions: vi.fn(),
  createPublicAction: vi.fn(),
  updatePublicAction: vi.fn(),
  listPublicActionSubmissions: vi.fn(),
  getPublicActionSupportLetterArtifact: vi.fn(),
  getPublicActionSubmissionsExportUrl: vi.fn(
    (siteId: string, actionId: string) => `/api/v2/sites/${siteId}/actions/${actionId}/export`
  ),
}));

const overview = {
  site: {
    id: 'site-1',
    name: 'Neighborhood Mutual Aid',
    status: 'published',
    blocked: false,
  },
};

const buildState = (donationProvider: 'stripe' | 'paypal' | 'square' = 'stripe') => ({
  websites: {
    overview: null,
    currentSiteData: {
      siteId: 'site-1',
      forms: [
        {
          formKey: 'contact-form-1',
          componentId: 'contact-form-1',
          formType: 'contact-form',
          title: 'Contact form',
          pageId: 'page-1',
          pageName: 'Home',
          pageSlug: 'home',
          pageType: 'static',
          routePattern: '/',
          path: '/',
          live: true,
          blocked: false,
          sourceConfig: {},
          operationalSettings: {
            heading: 'Talk to us',
            successMessage: 'Old success',
            defaultTags: ['supporter'],
          },
        },
        {
          formKey: 'donation-form-1',
          componentId: 'donation-form-1',
          formType: 'donation-form',
          title: 'Donation form',
          pageId: 'page-1',
          pageName: 'Home',
          pageSlug: 'home',
          pageType: 'static',
          routePattern: '/',
          path: '/',
          live: true,
          blocked: false,
          sourceConfig: {},
          operationalSettings: {
            heading: 'Support the work',
            currency: 'cad',
            provider: donationProvider,
            recurringDefault: true,
            suggestedAmounts: [25, 50, 100],
          },
        },
      ],
      integrations: {
        blocked: false,
        publishStatus: 'published',
        newsletter: {
          provider: 'mautic',
          configured: true,
          selectedAudienceId: 'seg-1',
          selectedAudienceName: 'Supporters',
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
          configured: true,
          availableAudiences: [],
          lastSyncAt: null,
        },
        stripe: {
          provider: donationProvider,
          configured: true,
          publishableKeyConfigured: true,
        },
        social: {
          facebook: {
            lastSyncAt: null,
            lastSyncError: null,
          },
        },
      },
      analytics: null,
    },
    isLoading: false,
    isSaving: false,
    error: null,
  },
});

let currentState = buildState();

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof currentState) => unknown) => selector(currentState),
}));

vi.mock('../../hooks/useWebsiteOverviewLoader', () => ({
  __esModule: true,
  default: () => overview,
}));

vi.mock('../../state', async () => {
  const actual = await vi.importActual<typeof WebsitesStateModule>('../../state');
  return {
    ...actual,
    clearWebsitesError: thunkMocks.clearWebsitesError,
    fetchWebsiteForms: thunkMocks.fetchWebsiteForms,
    updateWebsiteForm: thunkMocks.updateWebsiteForm,
  };
});

vi.mock('../../api/websitesApiClient', () => ({
  websitesApiClient: apiMocks,
}));

describe('WebsiteFormsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentState = buildState();
    apiMocks.listPublicActions.mockResolvedValue([
      {
        id: 'action-1',
        organizationId: 'org-1',
        siteId: 'site-1',
        actionType: 'petition_signature',
        status: 'published',
        slug: 'save-the-library',
        title: 'Save the Library',
        description: null,
        settings: {},
        confirmationMessage: null,
        publishedAt: '2026-05-01T00:00:00.000Z',
        closedAt: null,
        submissionCount: 2,
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      },
      {
        id: 'action-3',
        organizationId: 'org-1',
        siteId: 'site-1',
        actionType: 'self_referral',
        status: 'published',
        slug: 'get-help',
        title: 'Get Help',
        description: null,
        settings: {},
        confirmationMessage: null,
        publishedAt: '2026-05-01T00:00:00.000Z',
        closedAt: null,
        submissionCount: 4,
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      },
    ]);
    apiMocks.listPublicActionSubmissions.mockResolvedValue([
      {
        id: 'submission-1',
        organizationId: 'org-1',
        siteId: 'site-1',
        actionId: 'action-1',
        actionType: 'petition_signature',
        reviewStatus: 'new',
        contactId: 'contact-1',
        sourceEntityType: 'contact',
        sourceEntityId: 'contact-1',
        duplicateOfSubmissionId: null,
        consent: {},
        payloadRedacted: {},
        generatedArtifact: {},
        pagePath: '/petition',
        visitorId: null,
        sessionId: null,
        referrer: null,
        submittedAt: '2026-05-01T00:00:00.000Z',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      },
    ]);
    apiMocks.createPublicAction.mockResolvedValue({
      id: 'action-2',
      organizationId: 'org-1',
      siteId: 'site-1',
      actionType: 'donation_pledge',
      status: 'draft',
      slug: 'spring-pledge',
      title: 'Spring Pledge',
      description: null,
      settings: {},
      confirmationMessage: null,
      publishedAt: null,
      closedAt: null,
      submissionCount: 0,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    });
    apiMocks.updatePublicAction.mockImplementation((_siteId, _actionId, payload) =>
      Promise.resolve({
        id: 'action-1',
        organizationId: 'org-1',
        siteId: 'site-1',
        actionType: 'petition_signature',
        status: payload.status,
        slug: 'save-the-library',
        title: 'Save the Library',
        description: null,
        settings: {},
        confirmationMessage: null,
        publishedAt: '2026-05-01T00:00:00.000Z',
        closedAt: null,
        submissionCount: 2,
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      })
    );
    apiMocks.getPublicActionSupportLetterArtifact.mockResolvedValue({
      id: 'letter-1',
      organizationId: 'org-1',
      siteId: 'site-1',
      actionId: 'action-support-letter',
      submissionId: 'submission-support-letter',
      contactId: 'contact-1',
      templateVersion: 'housing-v1',
      letterTitle: 'Housing support letter',
      letterBody: 'Dear reviewer, Sam Rivera needs rental assistance.',
      approvalStatus: 'draft',
      generatedMetadata: { templateVersion: 'housing-v1' },
      approvedAt: null,
      approvedBy: null,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    });
    dispatchMock.mockImplementation((action: { type?: string }) =>
      Promise.resolve({ type: `${action.type}/fulfilled`, payload: action })
    );
  });

  it('loads connected forms and saves operational overrides', async () => {
    renderPage();

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'websites/fetchForms', payload: 'site-1' })
      );
    });

    expect(screen.getByText('Connected forms')).toBeInTheDocument();
    expect(await screen.findByText('Public actions')).toBeInTheDocument();
    expect(screen.getByText('Save the Library')).toBeInTheDocument();
    expect(screen.getByText('Self-referral status')).toBeInTheDocument();
    expect(screen.getByText('reviewable submissions')).toBeInTheDocument();
    expect(screen.getByText('Managed form launch verification')).toBeInTheDocument();
    expect(screen.getByText(/Public form: Contact \/ referral/i)).toBeInTheDocument();
    const homeSection = screen.getByRole('heading', { name: 'Home' }).closest('section');
    expect(homeSection).not.toBeNull();
    const contactCard = within(homeSection as HTMLElement)
      .getByText('Contact form')
      .closest('article');
    expect(contactCard).not.toBeNull();
    fireEvent.change(within(contactCard as HTMLElement).getByPlaceholderText('Success message'), {
      target: { value: 'Thanks for reaching out.' },
    });
    fireEvent.click(
      within(contactCard as HTMLElement).getByRole('button', { name: 'Save form settings' })
    );

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/updateForm',
          payload: {
            siteId: 'site-1',
            formKey: 'contact-form-1',
            data: expect.objectContaining({
              heading: 'Talk to us',
              successMessage: 'Thanks for reaching out.',
              defaultTags: ['supporter'],
            }),
          },
        })
      );
    });
    expect(thunkMocks.fetchWebsiteForms).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Form settings saved.')).toBeInTheDocument();
  });

  it('saves donation form provider defaults alongside the recurring checkout settings', async () => {
    currentState = buildState('paypal');
    renderPage();

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'websites/fetchForms', payload: 'site-1' })
      );
    });

    fireEvent.change(screen.getByLabelText('Donation provider'), {
      target: { value: 'square' },
    });
    const donationCard = screen.getByText('Donation form').closest('article');
    expect(donationCard).not.toBeNull();
    fireEvent.change(
      within(donationCard as HTMLElement).getByPlaceholderText('Currency (CAD, USD)'),
      {
        target: { value: 'usd' },
      }
    );
    fireEvent.click(
      within(donationCard as HTMLElement).getByRole('button', { name: 'Save form settings' })
    );

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/updateForm',
          payload: {
            siteId: 'site-1',
            formKey: 'donation-form-1',
            data: expect.objectContaining({
              heading: 'Support the work',
              currency: 'usd',
              provider: 'square',
              recurringDefault: true,
            }),
          },
        })
      );
    });
  });

  it('creates public action rows from the forms workspace', async () => {
    renderPage();

    await screen.findByText('Save the Library');
    fireEvent.change(screen.getByLabelText('Public action type'), {
      target: { value: 'donation_pledge' },
    });
    fireEvent.change(screen.getByLabelText('Public action title'), {
      target: { value: 'Spring Pledge' },
    });
    fireEvent.change(screen.getByLabelText('Public action slug'), {
      target: { value: 'spring-pledge' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create public action' }));

    await waitFor(() => {
      expect(apiMocks.createPublicAction).toHaveBeenCalledWith('site-1', {
        actionType: 'donation_pledge',
        status: 'draft',
        title: 'Spring Pledge',
        slug: 'spring-pledge',
        description: undefined,
      });
    });
    expect(screen.getByText('Public action created.')).toBeInTheDocument();
  });

  it('previews, copies, and downloads support-letter artifacts without sending email', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:letter');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clickAnchor = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    apiMocks.listPublicActions.mockResolvedValue([
      {
        id: 'action-support-letter',
        organizationId: 'org-1',
        siteId: 'site-1',
        actionType: 'support_letter_request',
        status: 'published',
        slug: 'housing-letter',
        title: 'Housing Letters',
        description: null,
        settings: {},
        confirmationMessage: null,
        publishedAt: '2026-05-01T00:00:00.000Z',
        closedAt: null,
        submissionCount: 1,
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      },
    ]);
    apiMocks.listPublicActionSubmissions.mockResolvedValue([
      {
        id: 'submission-support-letter',
        organizationId: 'org-1',
        siteId: 'site-1',
        actionId: 'action-support-letter',
        actionType: 'support_letter_request',
        reviewStatus: 'new',
        contactId: 'contact-1',
        sourceEntityType: 'submission',
        sourceEntityId: null,
        duplicateOfSubmissionId: null,
        consent: {},
        payloadRedacted: {},
        generatedArtifact: {},
        pagePath: '/letters',
        visitorId: null,
        sessionId: null,
        referrer: null,
        submittedAt: '2026-05-01T00:00:00.000Z',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      },
    ]);

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Preview letter' }));

    expect(apiMocks.getPublicActionSupportLetterArtifact).toHaveBeenCalledWith(
      'site-1',
      'action-support-letter',
      'submission-support-letter'
    );
    expect(await screen.findByText('Housing support letter')).toBeInTheDocument();
    expect(
      screen.getByText('Dear reviewer, Sam Rivera needs rental assistance.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy letter' }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('Dear reviewer, Sam Rivera needs rental assistance.');
    });
    expect(screen.getByText('Letter copied.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(createObjectUrl).toHaveBeenCalled();
    expect(clickAnchor).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:letter');

    createObjectUrl.mockRestore();
    revokeObjectUrl.mockRestore();
    clickAnchor.mockRestore();
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/websites/site-1/forms']}>
      <Routes>
        <Route path="/websites/:siteId/forms" element={<WebsiteFormsPage />} />
      </Routes>
    </MemoryRouter>
  );
}
