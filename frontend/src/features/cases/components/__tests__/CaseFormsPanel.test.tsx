import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CaseFormsPanel from '../CaseFormsPanel';
import { renderWithProviders } from '../../../../test/testUtils';

const listRecommendedDefaultsMock = vi.fn();
const listTemplatesMock = vi.fn();
const listAssignmentsMock = vi.fn();
const getAssignmentMock = vi.fn();
const updateAssignmentMock = vi.fn();
const saveDraftMock = vi.fn();
const sendMock = vi.fn();
const reviewMock = vi.fn();
const showSuccessMock = vi.fn();
const showErrorMock = vi.fn();

vi.mock('../../api/caseFormsApiClient', () => ({
  staffCaseFormsApiClient: {
    listTemplates: (...args: unknown[]) => listTemplatesMock(...args),
    listRecommendedDefaults: (...args: unknown[]) => listRecommendedDefaultsMock(...args),
    listAssignments: (...args: unknown[]) => listAssignmentsMock(...args),
    getAssignment: (...args: unknown[]) => getAssignmentMock(...args),
    send: (...args: unknown[]) => sendMock(...args),
    createAssignment: vi.fn(),
    createTemplate: vi.fn(),
    saveAssignmentAsTemplate: vi.fn(),
    instantiateDefault: vi.fn(),
    updateAssignment: (...args: unknown[]) => updateAssignmentMock(...args),
    uploadAsset: vi.fn(),
    saveDraft: (...args: unknown[]) => saveDraftMock(...args),
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
    listTemplatesMock.mockResolvedValue([]);
    listRecommendedDefaultsMock.mockResolvedValue([]);
    listAssignmentsMock.mockResolvedValue([assignment]);
    getAssignmentMock.mockResolvedValue(assignmentDetail);
    updateAssignmentMock.mockResolvedValue(assignment);
    saveDraftMock.mockResolvedValue(assignment);
  });

  it('shows open-form channel controls without blocking direct email when the case is not client-viewable', async () => {
    renderWithProviders(
      <CaseFormsPanel
        caseId="case-1"
        clientEmail="client@example.com"
        clientViewable={false}
      />
    );

    expect(await screen.findByText('Assignment Actions')).toBeInTheDocument();
    expect(screen.getByText('Open Form Channels')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Portal delivery needs a client-visible case or an active portal account. Email and SMS links can still be sent directly.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open form: email/i })).toBeEnabled();
  });

  it('sends selected delivery channels and hides stale secure links after a portal-only send', async () => {
    sendMock.mockResolvedValue({
      ...assignment,
      delivery_target: 'portal',
      delivery_channels: ['portal'],
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

    fireEvent.click(screen.getByLabelText(/^portal$/i));
    fireEvent.click(screen.getByLabelText(/^email$/i));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /open form: portal/i }));
    });

    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledWith('case-1', 'assignment-1', {
        delivery_channels: ['portal'],
        recipient_email: undefined,
        recipient_phone: undefined,
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
