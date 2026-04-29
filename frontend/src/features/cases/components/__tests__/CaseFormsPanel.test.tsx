import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CaseFormsPanel from '../CaseFormsPanel';
import { renderWithProviders } from '../../../../test/testUtils';

const listRecommendedDefaultsMock = vi.fn();
const listAssignmentsMock = vi.fn();
const getAssignmentMock = vi.fn();
const sendMock = vi.fn();
const reviewMock = vi.fn();
const showSuccessMock = vi.fn();
const showErrorMock = vi.fn();

vi.mock('../../api/caseFormsApiClient', () => ({
  staffCaseFormsApiClient: {
    listRecommendedDefaults: (...args: unknown[]) => listRecommendedDefaultsMock(...args),
    listAssignments: (...args: unknown[]) => listAssignmentsMock(...args),
    getAssignment: (...args: unknown[]) => getAssignmentMock(...args),
    send: (...args: unknown[]) => sendMock(...args),
    createAssignment: vi.fn(),
    instantiateDefault: vi.fn(),
    updateAssignment: vi.fn(),
    uploadAsset: vi.fn(),
    saveDraft: vi.fn(),
    submit: vi.fn(),
    review: (...args: unknown[]) => reviewMock(...args),
    getResponsePacketDownloadUrl: vi.fn(() => '/api/v2/cases/case-1/forms/assignment-1/response-packet'),
    getAssetDownloadUrl: vi.fn(),
  },
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showSuccess: showSuccessMock,
    showError: showErrorMock,
  }),
}));

vi.mock('../../caseForms/CaseFormRenderer', () => ({
  default: () => <div data-testid="case-form-renderer">Form Renderer</div>,
}));

const assignment = {
  id: 'assignment-1',
  case_id: 'case-1',
  contact_id: 'contact-1',
  title: 'Housing Intake',
  description: 'Collect housing details',
  status: 'sent' as const,
  schema: {
    version: 1,
    title: 'Housing Intake',
    sections: [
      {
        id: 'section-1',
        title: 'Details',
        questions: [
          {
            id: 'question-1',
            key: 'housing_status',
            type: 'text' as const,
            label: 'Housing Status',
          },
        ],
      },
    ],
  },
  current_draft_answers: {
    housing_status: 'Temporary shelter',
  },
  recipient_email: 'client@example.com',
  delivery_target: 'email' as const,
  sent_at: '2026-04-16T12:00:00.000Z',
  revision_requested_at: null,
  revision_notes: null,
  created_at: '2026-04-16T12:00:00.000Z',
  updated_at: '2026-04-16T12:00:00.000Z',
  access_link_url: 'https://example.test/public/case-forms/stale-token',
};

const assignmentDetail = {
  assignment: {
    ...assignment,
    draft_assets: [],
    latest_submission: null,
  },
  submissions: [],
};

describe('CaseFormsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRecommendedDefaultsMock.mockResolvedValue([]);
    listAssignmentsMock.mockResolvedValue([assignment]);
    getAssignmentMock.mockResolvedValue(assignmentDetail);
  });

  it('shows delivery controls and disables sending when the case is not client-viewable', async () => {
    renderWithProviders(
      <CaseFormsPanel
        caseId="case-1"
        clientEmail="client@example.com"
        clientViewable={false}
      />
    );

    expect(await screen.findByText('Assignment Actions')).toBeInTheDocument();
    expect(screen.getByText('Delivery Target')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This case is not shared with the client yet. Turn on client visibility before delivering forms by portal or email.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send by email/i })).toBeDisabled();
  });

  it('sends the selected delivery target and hides stale secure links after a portal-only send', async () => {
    sendMock.mockResolvedValue({
      ...assignment,
      delivery_target: 'portal',
      access_link_url: null,
    });

    renderWithProviders(
      <CaseFormsPanel
        caseId="case-1"
        clientEmail="client@example.com"
        clientViewable
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading forms/i)).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('button', { name: /copy link/i })).toBeInTheDocument();

    const deliveryTargetSelect = screen.getByRole('combobox', { name: /delivery target/i });
    fireEvent.change(deliveryTargetSelect, {
      target: { value: 'portal' },
    });
    expect((deliveryTargetSelect as HTMLSelectElement).value).toBe('portal');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
    });

    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledWith('case-1', 'assignment-1', {
        delivery_target: 'portal',
        recipient_email: undefined,
        expires_in_days: undefined,
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /copy link/i })).not.toBeInTheDocument();
    });
  });

  it('requires review notes and sends a revision request decision', async () => {
    reviewMock.mockResolvedValue({
      ...assignment,
      status: 'revision_requested',
      revision_requested_at: '2026-04-16T13:00:00.000Z',
      revision_notes: 'Please upload the signed consent form.',
    });

    renderWithProviders(
      <CaseFormsPanel
        caseId="case-1"
        clientEmail="client@example.com"
        clientViewable
      />
    );

    expect(await screen.findByText('Assignment Actions')).toBeInTheDocument();
    const requestChangesButton = screen.getByRole('button', { name: /request changes/i });
    expect(requestChangesButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/review notes/i), {
      target: { value: 'Please upload the signed consent form.' },
    });

    expect(requestChangesButton).toBeEnabled();

    await act(async () => {
      fireEvent.click(requestChangesButton);
    });

    await waitFor(() => {
      expect(reviewMock).toHaveBeenCalledWith('case-1', 'assignment-1', {
        decision: 'revision_requested',
        notes: 'Please upload the signed consent form.',
      });
    });
  });
});
