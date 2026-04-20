import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import PortalFormsPage from '../PortalFormsPage';

const listFormsMock = vi.fn();
const getFormMock = vi.fn();
const getResponsePacketDownloadUrlMock = vi.fn(
  (assignmentId: string) => `/api/v2/portal/forms/assignments/${assignmentId}/response-packet`
);

vi.mock('../../api/portalCaseFormsApiClient', () => ({
  portalCaseFormsApiClient: {
    listForms: (...args: unknown[]) => listFormsMock(...args),
    getForm: (...args: unknown[]) => getFormMock(...args),
    uploadAsset: vi.fn(),
    saveDraft: vi.fn(),
    submit: vi.fn(),
    getResponsePacketDownloadUrl: (...args: unknown[]) => getResponsePacketDownloadUrlMock(...args),
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
        latest_submission: {
          id: 'submission-1',
          assignment_id: 'assignment-portal',
          case_id: 'case-1',
          contact_id: 'contact-1',
          submission_number: 1,
          answers: {},
          mapping_audit: [],
          asset_refs: [],
          signature_refs: [],
          submitted_by_actor_type: 'portal',
          created_at: '2026-04-16T12:30:00.000Z',
          response_packet_download_url:
            '/api/v2/portal/forms/assignments/assignment-portal/response-packet',
        },
        delivery_target: 'portal',
        sent_at: '2026-04-16T12:00:00.000Z',
        submitted_at: '2026-04-16T12:30:00.000Z',
        created_at: '2026-04-16T12:00:00.000Z',
        updated_at: '2026-04-16T12:30:00.000Z',
      },
      submissions: [
        {
          id: 'submission-1',
          assignment_id: 'assignment-portal',
          case_id: 'case-1',
          contact_id: 'contact-1',
          submission_number: 1,
          answers: {},
          mapping_audit: [],
          asset_refs: [],
          signature_refs: [],
          submitted_by_actor_type: 'portal',
          created_at: '2026-04-16T12:30:00.000Z',
          response_packet_download_url:
            '/api/v2/portal/forms/assignments/assignment-portal/response-packet',
        },
      ],
    });
  });

  it('renders assignment results and uses the assignment packet download routes', async () => {
    renderWithProviders(<PortalFormsPage />);

    expect(await screen.findByText('Portal Delivery Form')).toBeInTheDocument();
    expect(screen.getAllByText('Available in the portal').length).toBeGreaterThan(0);
    expect(await screen.findByRole('link', { name: /download response packet/i })).toHaveAttribute(
      'href',
      '/api/v2/portal/forms/assignments/assignment-portal/response-packet'
    );
    expect(await screen.findByRole('link', { name: /^packet$/i })).toHaveAttribute(
      'href',
      '/api/v2/portal/forms/assignments/assignment-portal/response-packet'
    );
    expect(getResponsePacketDownloadUrlMock).toHaveBeenCalledWith('assignment-portal');
  });
});
