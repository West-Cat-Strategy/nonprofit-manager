import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import PortalCaseDetailPage from '../PortalCaseDetailPage';

const getCaseMock = vi.fn();
const getCaseTimelineMock = vi.fn();
const listCaseDocumentsMock = vi.fn();
const uploadCaseDocumentMock = vi.fn();
const createCaseEscalationMock = vi.fn();
const portalGetMock = vi.fn();
const setSelectedCaseIdMock = vi.fn();
const showSuccessMock = vi.fn();
const showErrorMock = vi.fn();

vi.mock('../../api/portalApiClient', () => ({
  portalV2ApiClient: {
    getCase: (...args: unknown[]) => getCaseMock(...args),
    getCaseTimeline: (...args: unknown[]) => getCaseTimelineMock(...args),
    listCaseDocuments: (...args: unknown[]) => listCaseDocumentsMock(...args),
    uploadCaseDocument: (...args: unknown[]) => uploadCaseDocumentMock(...args),
    createCaseEscalation: (...args: unknown[]) => createCaseEscalationMock(...args),
    getCaseDocumentDownloadUrl: (caseId: string, documentId: string) =>
      `/api/v2/portal/cases/${caseId}/documents/${documentId}/download`,
  },
}));

vi.mock('../../../../services/portalApi', () => ({
  default: {
    get: (...args: unknown[]) => portalGetMock(...args),
  },
}));

vi.mock('../../../../hooks/usePersistentPortalCaseContext', () => ({
  usePersistentPortalCaseContext: () => ({
    setSelectedCaseId: setSelectedCaseIdMock,
  }),
}));

vi.mock('../../client/usePortalMessageThreads', () => ({
  default: () => ({
    threads: [
      {
        id: 'thread-1',
        subject: 'Need help with documents',
        status: 'open',
        case_number: 'CASE-001',
        unread_count: 1,
        last_message_at: '2026-03-15T18:00:00.000Z',
        last_message_preview: 'Please upload your documents here.',
      },
    ],
    loading: false,
    loadingMore: false,
    hasMore: false,
    error: null,
    streamStatus: 'connected',
    refresh: vi.fn().mockResolvedValue(undefined),
    loadMore: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../client/usePortalAppointments', () => ({
  default: () => ({
    appointments: [
      {
        id: 'appointment-1',
        title: 'Case check-in',
        description: 'Bring intake papers',
        start_time: '2026-03-16T18:00:00.000Z',
        status: 'confirmed',
        request_type: 'manual_request',
      },
    ],
    loading: false,
    loadingMore: false,
    hasMore: false,
    error: null,
    streamStatus: 'connected',
    refresh: vi.fn().mockResolvedValue(undefined),
    loadMore: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showSuccess: showSuccessMock,
    showError: showErrorMock,
  }),
}));

describe('PortalCaseDetailPage', () => {
  beforeEach(() => {
    getCaseMock.mockResolvedValue({
      id: 'case-1',
      case_number: 'CASE-001',
      title: 'Housing Support',
      description: 'Shared case workspace',
      priority: 'high',
      status_name: 'Open',
      case_type_name: 'Housing',
      updated_at: '2026-03-15T18:00:00.000Z',
      opened_date: '2026-03-10T18:00:00.000Z',
      due_date: '2026-03-20T18:00:00.000Z',
      provenance: {
        system: 'imported',
        primary_label: 'Westcat Intake Cluster',
        record_type: 'case_note',
        source_tables: ['contact_log', 'case_note'],
        source_role_breakdown: [
          {
            source_role: 'primary_case',
            source_tables: ['contact_log'],
            source_row_count: 1,
          },
        ],
        source_row_count: 1,
        source_table_count: 2,
        source_file_count: 1,
        source_type_breakdown: ['contact_log', 'case_note'],
        link_confidence: 0.91,
        confidence_label: 'high',
        is_low_confidence: false,
      },
    });
    getCaseTimelineMock.mockResolvedValue({
      items: [
        {
          id: 'timeline-1',
          type: 'note',
          title: 'Visible note',
          content: 'Shared timeline note',
          created_at: '2026-03-15T17:00:00.000Z',
        },
      ],
      page: { limit: 50, has_more: false, next_cursor: null },
    });
    listCaseDocumentsMock.mockResolvedValue([
      {
        id: 'doc-1',
        document_name: 'Welcome Packet',
        original_filename: 'welcome.pdf',
        document_type: 'report',
        description: 'Shared packet',
        file_size: 512,
        mime_type: 'application/pdf',
        created_at: '2026-03-15T16:00:00.000Z',
      },
    ]);
    portalGetMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          default_case_id: 'case-1',
          default_pointperson_user_id: 'staff-1',
          selected_case_id: 'case-1',
          cases: [
            {
              case_id: 'case-1',
              case_number: 'CASE-001',
              case_title: 'Housing Support',
              assigned_to: 'staff-1',
              pointperson_first_name: 'Alex',
              pointperson_last_name: 'Rivera',
              is_messageable: true,
              is_default: true,
            },
          ],
        },
      },
    });
    uploadCaseDocumentMock.mockResolvedValue({
      id: 'doc-2',
      document_name: 'Client intake package',
      original_filename: 'client-intake.pdf',
      document_type: 'supporting_document',
      description: 'Uploaded from the portal workspace',
      file_size: 1024,
      mime_type: 'application/pdf',
      created_at: '2026-03-15T19:00:00.000Z',
    });
    createCaseEscalationMock.mockResolvedValue({
      id: 'escalation-1',
      caseId: 'case-1',
      contactId: 'contact-1',
      accountId: null,
      portalUserId: 'portal-user-1',
      createdByPortalUserId: 'portal-user-1',
      category: 'case_review',
      reason: 'Please review my housing eligibility update.',
      severity: 'high',
      sensitivity: 'standard',
      assigneeUserId: 'staff-1',
      slaDueAt: null,
      status: 'open',
      resolutionSummary: null,
      createdAt: '2026-03-15T20:00:00.000Z',
      updatedAt: '2026-03-15T20:00:00.000Z',
    });
  });

  it('renders the case workspace and uploads a new document', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/portal/cases/:id" element={<PortalCaseDetailPage />} />
      </Routes>,
      { route: '/portal/cases/case-1' }
    );

    expect(await screen.findByText('Case Conversations')).toBeInTheDocument();
    expect(screen.getByText(/Pointperson: Alex Rivera/)).toBeInTheDocument();
    expect(screen.getByText('Need help with documents')).toBeInTheDocument();
    expect(screen.getByText('Imported source summary')).toBeInTheDocument();
    expect(screen.getAllByText('1 role').length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Cluster$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/row ids/i)).not.toBeInTheDocument();

    const file = new File(['portal pdf'], 'client-intake.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/upload a document/i), {
      target: { files: [file] },
    });
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Client intake package' },
    });

    fireEvent.click(screen.getByRole('button', { name: /upload document/i }));

    await waitFor(() => {
      expect(uploadCaseDocumentMock).toHaveBeenCalled();
      expect(showSuccessMock).toHaveBeenCalledWith('Document uploaded to your case workspace.');
    });

    expect(await screen.findByText('Client intake package')).toBeInTheDocument();
  });

  it('submits a focused staff review request for the portal case', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/portal/cases/:id" element={<PortalCaseDetailPage />} />
      </Routes>,
      { route: '/portal/cases/case-1' }
    );

    expect(await screen.findByText('Request Staff Review')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('What should staff review?'), {
      target: { value: 'Please review my housing eligibility update.' },
    });
    fireEvent.change(screen.getByLabelText('Priority'), {
      target: { value: 'high' },
    });

    fireEvent.click(screen.getByRole('button', { name: /request review/i }));

    await waitFor(() => {
      expect(createCaseEscalationMock).toHaveBeenCalledWith('case-1', {
        category: 'case_review',
        reason: 'Please review my housing eligibility update.',
        severity: 'high',
        sensitivity: 'standard',
      });
      expect(showSuccessMock).toHaveBeenCalledWith('Review request sent to staff.');
    });

    expect(await screen.findByText(/Sent/)).toBeInTheDocument();
  });
});
