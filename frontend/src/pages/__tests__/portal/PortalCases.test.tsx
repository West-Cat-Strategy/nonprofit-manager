import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PortalCases from '../../PortalCases';
import PortalCaseDetail from '../../PortalCaseDetail';
import { renderWithProviders } from '../../../test/testUtils';

const listCasesMock = vi.fn();
const getCaseMock = vi.fn();
const getCaseTimelineMock = vi.fn();
const listCaseDocumentsMock = vi.fn();
const getCaseDocumentDownloadUrlMock = vi.fn(() => '/api/v2/portal/cases/case-1/documents/doc-1/download');

vi.mock('../../../features/portal/api/portalApiClient', () => ({
  portalV2ApiClient: {
    listCases: (...args: unknown[]) => listCasesMock(...args),
    getCase: (...args: unknown[]) => getCaseMock(...args),
    getCaseTimeline: (...args: unknown[]) => getCaseTimelineMock(...args),
    listCaseDocuments: (...args: unknown[]) => listCaseDocumentsMock(...args),
    getCaseDocumentDownloadUrl: (...args: unknown[]) => getCaseDocumentDownloadUrlMock(...args),
  },
}));

describe('Portal cases pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shared cases list from API', async () => {
    listCasesMock.mockResolvedValue([
      {
        id: 'case-1',
        case_number: 'CASE-001',
        title: 'Housing Support Plan',
        updated_at: new Date().toISOString(),
      },
    ]);

    renderWithProviders(<PortalCases />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /my cases/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Housing Support Plan')).toBeInTheDocument();
    expect(listCasesMock).toHaveBeenCalledTimes(1);
  });

  it('renders only the timeline items returned by portal visibility filters', async () => {
    getCaseMock.mockResolvedValue({
      id: 'case-1',
      case_number: 'CASE-001',
      title: 'Housing Support Plan',
      updated_at: new Date().toISOString(),
      status_name: 'Open',
    });
    getCaseTimelineMock.mockResolvedValue([
      {
        id: 'note-visible',
        type: 'note',
        created_at: new Date().toISOString(),
        title: 'Progress Update',
        content: 'Visible client note content',
      },
    ]);
    listCaseDocumentsMock.mockResolvedValue([
      {
        id: 'doc-1',
        original_filename: 'care-plan.pdf',
        document_name: 'Care Plan',
        created_at: new Date().toISOString(),
        mime_type: 'application/pdf',
      },
    ]);

    renderWithProviders(
      <Routes>
        <Route path="/portal/cases/:id" element={<PortalCaseDetail />} />
      </Routes>,
      { route: '/portal/cases/case-1' }
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /timeline/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Visible client note content')).toBeInTheDocument();
    expect(screen.queryByText('Internal-only note content')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument();
  });
});
