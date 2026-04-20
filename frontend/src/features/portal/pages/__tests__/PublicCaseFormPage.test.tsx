import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import PublicCaseFormPage from '../PublicCaseFormPage';

const getFormMock = vi.fn();
const saveDraftMock = vi.fn();
const submitMock = vi.fn();
const showSuccessMock = vi.fn();
const showErrorMock = vi.fn();

vi.mock('../../api/publicCaseFormsApiClient', () => ({
  publicCaseFormsApiClient: {
    getForm: (...args: unknown[]) => getFormMock(...args),
    uploadAsset: vi.fn(),
    saveDraft: (...args: unknown[]) => saveDraftMock(...args),
    submit: (...args: unknown[]) => submitMock(...args),
    getResponsePacketDownloadUrl: vi.fn((token: string) => `/api/v2/public/case-forms/${token}/response-packet`),
  },
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showSuccess: showSuccessMock,
    showError: showErrorMock,
  }),
}));

vi.mock('../../../cases/components/CaseFormRenderer', () => ({
  default: () => <div data-testid="public-form-renderer">Public Form Renderer</div>,
}));

const renderPage = (route = '/public/case-forms/token-1') =>
  renderWithProviders(
    <Routes>
      <Route path="/public/case-forms/:token" element={<PublicCaseFormPage />} />
    </Routes>,
    { route }
  );

const buildSentDetail = (overrides: Record<string, unknown> = {}) => ({
  assignment: {
    id: 'assignment-1',
    case_id: 'case-1',
    contact_id: 'contact-1',
    title: 'Email Intake Form',
    description: 'Complete the intake details',
    status: 'sent',
    schema: {
      version: 1,
      title: 'Email Intake Form',
      sections: [
        {
          id: 'section-1',
          title: 'Details',
          questions: [],
        },
      ],
    },
    current_draft_answers: {
      email: 'client@example.com',
      household_size: 2,
    },
    draft_assets: [],
    latest_submission: null,
    delivery_target: 'email',
    sent_at: '2026-04-16T12:00:00.000Z',
    created_at: '2026-04-16T12:00:00.000Z',
    updated_at: '2026-04-16T12:00:00.000Z',
    ...overrides,
  },
  submissions: [],
});

const buildSubmittedDetail = () => ({
  assignment: {
    ...buildSentDetail().assignment,
    status: 'submitted',
    latest_submission: {
      id: 'submission-1',
      assignment_id: 'assignment-1',
      case_id: 'case-1',
      contact_id: 'contact-1',
      submission_number: 1,
      answers: {
        email: 'client@example.com',
        household_size: 2,
      },
      mapping_audit: [],
      asset_refs: [],
      signature_refs: [],
      submitted_by_actor_type: 'public',
      created_at: '2026-04-16T12:30:00.000Z',
      response_packet_download_url: '/api/v2/public/case-forms/token-1/response-packet',
    },
    submitted_at: '2026-04-16T12:30:00.000Z',
    updated_at: '2026-04-16T12:30:00.000Z',
  },
  submissions: [],
});

describe('PublicCaseFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFormMock.mockImplementation(async () => buildSentDetail());
  });

  it('submits the secure-link form and shows the receipt state afterward', async () => {
    submitMock.mockImplementation(async () => buildSubmittedDetail());

    renderPage();

    expect(await screen.findByText('Email Intake Form')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit form/i }));
    });

    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledWith('token-1', {
        answers: {
          email: 'client@example.com',
          household_size: 2,
        },
        client_submission_id: expect.any(String),
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/submission received/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /download submission packet/i })).toHaveAttribute(
      'href',
      '/api/v2/public/case-forms/token-1/response-packet'
    );
    expect(
      screen.getByText(/you can still update this secure form and resubmit it until staff finish reviewing the submission/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resubmit form/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
  });

  it('offers retry recovery when the secure form fails to load', async () => {
    const user = userEvent.setup();
    let attemptCount = 0;
    getFormMock.mockImplementation(async () => {
      attemptCount += 1;
      if (attemptCount === 1) {
        throw new Error('Failed to load secure form');
      }
      return buildSentDetail({
        current_draft_answers: {},
      });
    });

    renderPage();

    expect(await screen.findByText(/failed to load secure form/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry loading form/i }));

    expect(await screen.findByText('Email Intake Form')).toBeInTheDocument();
    expect(screen.getByText(/need support/i)).toBeInTheDocument();
  });

  it('shows an expired-link recovery state for inactive assignments', async () => {
    getFormMock.mockImplementation(async () =>
      buildSentDetail({
        status: 'expired',
        current_draft_answers: {},
      })
    );

    renderPage();

    expect(await screen.findByText(/this secure form link has expired/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit form/i })).not.toBeInTheDocument();
  });
});
