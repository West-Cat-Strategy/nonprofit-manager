import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { CaseFormAssignment, CaseFormAssignmentDetail } from '../../../../types/caseForms';
import { renderWithProviders } from '../../../../test/testUtils';
import PortalFormsPage from '../PortalFormsPage';

const listFormsMock = vi.fn();
const getFormMock = vi.fn();
const showSuccessMock = vi.fn();
const showErrorMock = vi.fn();
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
    showSuccess: showSuccessMock,
    showError: showErrorMock,
  }),
}));

vi.mock('../../../cases/components/CaseFormRenderer', () => ({
  default: () => <div data-testid="portal-form-renderer">Portal Form Renderer</div>,
}));

const buildAssignment = (
  overrides: Partial<CaseFormAssignment> & Pick<CaseFormAssignment, 'id' | 'title' | 'status'>,
): CaseFormAssignment => ({
  id: overrides.id,
  case_id: overrides.case_id ?? 'case-1',
  contact_id: overrides.contact_id ?? 'contact-1',
  title: overrides.title,
  description: overrides.description ?? `${overrides.title} description`,
  status: overrides.status,
  schema: overrides.schema ?? {
    version: 1,
    title: overrides.title,
    sections: [
      {
        id: 'section-1',
        title: 'Details',
        questions: [],
      },
    ],
  },
  current_draft_answers: overrides.current_draft_answers,
  draft_assets: overrides.draft_assets,
  latest_submission: overrides.latest_submission,
  delivery_target: overrides.delivery_target ?? 'portal',
  sent_at: overrides.sent_at ?? '2026-04-16T12:00:00.000Z',
  submitted_at: overrides.submitted_at,
  created_at: overrides.created_at ?? '2026-04-16T12:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-04-16T12:00:00.000Z',
});

const buildDetail = (
  overrides: Partial<CaseFormAssignment> & Pick<CaseFormAssignment, 'id' | 'title' | 'status'>,
): CaseFormAssignmentDetail => {
  const assignment = buildAssignment(overrides);
  const latestSubmission =
    assignment.latest_submission === undefined
      ? {
          id: `submission-${assignment.id}`,
          assignment_id: assignment.id,
          case_id: assignment.case_id,
          contact_id: assignment.contact_id,
          submission_number: 1,
          answers: {},
          mapping_audit: [],
          asset_refs: [],
          signature_refs: [],
          submitted_by_actor_type: 'portal' as const,
          created_at: assignment.submitted_at ?? '2026-04-16T12:30:00.000Z',
          response_packet_download_url: `/api/v2/portal/forms/assignments/${assignment.id}/response-packet`,
        }
      : assignment.latest_submission;

  return {
    assignment: {
      ...assignment,
      current_draft_answers: assignment.current_draft_answers ?? {},
      draft_assets: assignment.draft_assets ?? [],
      latest_submission: latestSubmission,
      submitted_at: assignment.submitted_at ?? latestSubmission?.created_at ?? null,
    },
    submissions: latestSubmission ? [latestSubmission] : [],
  };
};

describe('PortalFormsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const assignment = buildAssignment({
      id: 'assignment-portal',
      title: 'Portal Delivery Form',
      status: 'sent',
      description: 'Available in the portal',
    });

    listFormsMock.mockResolvedValue([assignment]);
    getFormMock.mockResolvedValue(
      buildDetail({
        id: assignment.id,
        title: assignment.title,
        status: assignment.status,
        description: assignment.description,
      })
    );
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

  it('defaults the active view to the first active assignment even when completed forms are returned first', async () => {
    listFormsMock.mockResolvedValue([
      buildAssignment({
        id: 'assignment-completed',
        title: 'Completed Intake Form',
        status: 'reviewed',
        description: 'Already submitted',
        submitted_at: '2026-04-16T12:30:00.000Z',
      }),
      buildAssignment({
        id: 'assignment-active',
        title: 'Active Follow-up Form',
        status: 'sent',
        description: 'Needs your response',
      }),
    ]);
    getFormMock.mockImplementation(async (assignmentId: string) =>
      assignmentId === 'assignment-active'
        ? buildDetail({
            id: 'assignment-active',
            title: 'Active Follow-up Form',
            status: 'sent',
            description: 'Needs your response',
            latest_submission: null,
            submitted_at: null,
          })
        : buildDetail({
            id: 'assignment-completed',
            title: 'Completed Intake Form',
            status: 'reviewed',
            description: 'Already submitted',
          })
    );

    renderWithProviders(<PortalFormsPage />);

    expect(await screen.findByText('Active Follow-up Form')).toBeInTheDocument();
    expect(screen.queryByText('Completed Intake Form')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');

    await waitFor(() => {
      expect(getFormMock).toHaveBeenCalledWith('assignment-active');
    });
    expect(getFormMock).not.toHaveBeenCalledWith('assignment-completed');
  });

  it('switches detail panels when the user changes between active and completed filters', async () => {
    const user = userEvent.setup();

    listFormsMock.mockResolvedValue([
      buildAssignment({
        id: 'assignment-completed',
        title: 'Completed Intake Form',
        status: 'reviewed',
        description: 'Already submitted',
        submitted_at: '2026-04-16T12:30:00.000Z',
      }),
      buildAssignment({
        id: 'assignment-active',
        title: 'Active Follow-up Form',
        status: 'sent',
        description: 'Needs your response',
      }),
    ]);
    getFormMock.mockImplementation(async (assignmentId: string) =>
      assignmentId === 'assignment-active'
        ? buildDetail({
            id: 'assignment-active',
            title: 'Active Follow-up Form',
            status: 'sent',
            description: 'Needs your response',
            latest_submission: null,
            submitted_at: null,
          })
        : buildDetail({
            id: 'assignment-completed',
            title: 'Completed Intake Form',
            status: 'reviewed',
            description: 'Already submitted',
          })
    );

    renderWithProviders(<PortalFormsPage />);

    expect(await screen.findByText('Active Follow-up Form')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Completed' }));

    expect(await screen.findAllByText('Completed Intake Form')).toHaveLength(2);
    expect(screen.queryByText('Active Follow-up Form')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Completed' })).toHaveAttribute('aria-pressed', 'true');

    await waitFor(() => {
      expect(getFormMock).toHaveBeenCalledWith('assignment-completed');
    });
  });

  it('shows empty-state guidance when the selected filter bucket has no forms', async () => {
    const user = userEvent.setup();

    listFormsMock.mockResolvedValue([
      buildAssignment({
        id: 'assignment-active',
        title: 'Active Follow-up Form',
        status: 'sent',
        description: 'Needs your response',
      }),
    ]);
    getFormMock.mockResolvedValue(
      buildDetail({
        id: 'assignment-active',
        title: 'Active Follow-up Form',
        status: 'sent',
        description: 'Needs your response',
        latest_submission: null,
        submitted_at: null,
      })
    );

    renderWithProviders(<PortalFormsPage />);

    expect(await screen.findByText('Active Follow-up Form')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Completed' }));

    expect(await screen.findByText('No completed forms.')).toBeInTheDocument();
    expect(screen.getByText('No completed form selected.')).toBeInTheDocument();
    expect(screen.getByText('There are no completed forms to display right now.')).toBeInTheDocument();
    expect(screen.queryByTestId('portal-form-renderer')).not.toBeInTheDocument();
  });

  it('keeps submitted forms in the active bucket until staff review is complete', async () => {
    listFormsMock.mockResolvedValue([
      buildAssignment({
        id: 'assignment-submitted',
        title: 'Submitted Intake Form',
        status: 'submitted',
        description: 'Awaiting staff review',
        submitted_at: '2026-04-16T12:30:00.000Z',
      }),
    ]);
    getFormMock.mockResolvedValue(
      buildDetail({
        id: 'assignment-submitted',
        title: 'Submitted Intake Form',
        status: 'submitted',
        description: 'Awaiting staff review',
      })
    );

    renderWithProviders(<PortalFormsPage />);

    expect(await screen.findByText('Submitted Intake Form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/you can still update this form and resubmit it until staff finish reviewing the submission/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resubmit form/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
  });
});
