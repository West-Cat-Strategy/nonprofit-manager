import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import PortalFormsPage from '../PortalFormsPage';

const listFormsMock = vi.fn();
const getFormMock = vi.fn();

vi.mock('../../api/portalCaseFormsApiClient', () => ({
  portalCaseFormsApiClient: {
    listForms: (...args: unknown[]) => listFormsMock(...args),
    getForm: (...args: unknown[]) => getFormMock(...args),
    uploadAsset: vi.fn(),
    saveDraft: vi.fn(),
    submit: vi.fn(),
    getResponsePacketDownloadUrl: vi.fn(() => '/api/v2/portal/forms/assignment-portal/response-packet'),
  },
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../../../cases/components/CaseFormRenderer', () => ({
  default: () => <div data-testid="portal-form-renderer">Portal Form Renderer</div>,
}));

describe('PortalFormsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFormsMock.mockResolvedValue([
      {
        id: 'assignment-portal',
        case_id: 'case-1',
        contact_id: 'contact-1',
        title: 'Portal Delivery Form',
        description: 'Available in the portal',
        status: 'sent',
        schema: {
          version: 1,
          title: 'Portal Delivery Form',
          sections: [
            {
              id: 'section-1',
              title: 'Details',
              questions: [],
            },
          ],
        },
        delivery_target: 'portal',
        sent_at: '2026-04-16T12:00:00.000Z',
        created_at: '2026-04-16T12:00:00.000Z',
        updated_at: '2026-04-16T12:00:00.000Z',
      },
    ]);
    getFormMock.mockResolvedValue({
      assignment: {
        id: 'assignment-portal',
        case_id: 'case-1',
        contact_id: 'contact-1',
        title: 'Portal Delivery Form',
        description: 'Available in the portal',
        status: 'sent',
        schema: {
          version: 1,
          title: 'Portal Delivery Form',
          sections: [
            {
              id: 'section-1',
              title: 'Details',
              questions: [],
            },
          ],
        },
        current_draft_answers: {},
        draft_assets: [],
        latest_submission: null,
        delivery_target: 'portal',
        sent_at: '2026-04-16T12:00:00.000Z',
        created_at: '2026-04-16T12:00:00.000Z',
        updated_at: '2026-04-16T12:00:00.000Z',
      },
      submissions: [],
    });
  });

  it('renders only the portal-delivered assignments returned by the portal API', async () => {
    renderWithProviders(<PortalFormsPage />);

    expect(await screen.findByText('Portal Delivery Form')).toBeInTheDocument();
    expect(screen.getByText('Available in the portal')).toBeInTheDocument();
    expect(screen.queryByText('Email Only Form')).not.toBeInTheDocument();
  });
});
