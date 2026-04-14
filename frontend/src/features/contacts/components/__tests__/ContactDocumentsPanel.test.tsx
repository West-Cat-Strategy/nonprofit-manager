import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ContactDocumentsPanel from '../ContactDocumentsPanel';

const dispatchMock = vi.fn(() => ({
  unwrap: vi.fn().mockResolvedValue(undefined),
}));

const uploadContactDocumentMock = vi.fn((payload: unknown) => ({
  type: 'contacts/uploadDocument',
  payload,
}));

const fetchContactDocumentsMock = vi.fn((contactId: string) => ({
  type: 'contacts/fetchContactDocuments',
  payload: contactId,
}));

const updateContactDocumentMock = vi.fn((payload: unknown) => ({
  type: 'contacts/updateDocument',
  payload,
}));

const deleteContactDocumentMock = vi.fn((documentId: string) => ({
  type: 'contacts/deleteDocument',
  payload: documentId,
}));

const contactCases = [
  {
    id: 'case-1',
    case_number: 'CASE-001',
    title: 'Housing support',
  },
];

const mockState = {
  contacts: {
    documents: {
      documents: [],
      documentsLoading: false,
    },
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../state', () => ({
  fetchContactDocuments: (...args: [string]) => fetchContactDocumentsMock(...args),
  uploadContactDocument: (...args: [unknown]) => uploadContactDocumentMock(...args),
  updateContactDocument: (...args: [unknown]) => updateContactDocumentMock(...args),
  deleteContactDocument: (...args: [string]) => deleteContactDocumentMock(...args),
}));

vi.mock('../../state/contactCases', () => ({
  selectContactCasesByContact: () => contactCases,
}));

vi.mock('../../../../components/ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('../../../../hooks/useConfirmDialog', () => ({
  default: () => ({
    dialogState: {
      isOpen: false,
      title: '',
      message: '',
      confirmLabel: '',
      cancelLabel: '',
      variant: 'danger',
    },
    confirm: vi.fn().mockResolvedValue(true),
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
  }),
  confirmPresets: {
    delete: (entity: string) => ({
      title: `Delete ${entity}`,
      message: `Delete ${entity}?`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    }),
  },
}));

describe('ContactDocumentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps case association in the feature-owned contacts panel and includes the case in uploads', async () => {
    const file = new File(['hello'], 'support-letter.pdf', { type: 'application/pdf' });

    render(
      <MemoryRouter>
        <ContactDocumentsPanel contactId="contact-1" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetchContactDocumentsMock).toHaveBeenCalledWith('contact-1');
    });

    fireEvent.change(screen.getByLabelText(/select file/i), {
      target: { files: [file] },
    });

    expect(screen.getByLabelText(/associate with case/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/associate with case/i), {
      target: { value: 'case-1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /upload document/i }));

    await waitFor(() => {
      expect(uploadContactDocumentMock).toHaveBeenCalledWith({
        contactId: 'contact-1',
        file,
        data: expect.objectContaining({
          title: 'support-letter',
          case_id: 'case-1',
        }),
      });
    });
  });
});
