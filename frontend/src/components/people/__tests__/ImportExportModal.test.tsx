import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ImportExportModal } from '../ImportExportModal';
import { renderWithProviders } from '../../../test/testUtils';

const {
  exportEntityMock,
  downloadImportTemplateMock,
  previewImportMock,
  commitImportMock,
  clearErrorMock,
} = vi.hoisted(() => ({
  exportEntityMock: vi.fn(),
  downloadImportTemplateMock: vi.fn(),
  previewImportMock: vi.fn(),
  commitImportMock: vi.fn(),
  clearErrorMock: vi.fn(),
}));

vi.mock('../../../hooks', () => ({
  useImportExport: () => ({
    exportEntity: exportEntityMock,
    downloadImportTemplate: downloadImportTemplateMock,
    previewImport: previewImportMock,
    commitImport: commitImportMock,
    isLoading: false,
    error: null,
    clearError: clearErrorMock,
  }),
}));

describe('ImportExportModal', () => {
  beforeEach(() => {
    exportEntityMock.mockReset();
    downloadImportTemplateMock.mockReset();
    previewImportMock.mockReset();
    commitImportMock.mockReset();
    clearErrorMock.mockReset();
  });

  it('exports selected records through the backend endpoint', async () => {
    const user = userEvent.setup();
    exportEntityMock.mockResolvedValue(undefined);

    renderWithProviders(
      <ImportExportModal
        isOpen
        onClose={vi.fn()}
        entityType="contacts"
        exportRequest={{ search: 'alice', sort_by: 'created_at', sort_order: 'desc' }}
        selectedIds={['contact-1', 'contact-2']}
      />
    );

    await user.click(screen.getByRole('button', { name: /download csv/i }));

    expect(exportEntityMock).toHaveBeenCalledWith('contacts', {
      format: 'csv',
      ids: ['contact-1', 'contact-2'],
      search: 'alice',
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  });

  it('previews and commits an import file', async () => {
    const user = userEvent.setup();
    const onImportComplete = vi.fn();
    const preview = {
      detected_columns: ['email', 'first_name'],
      mapping: { email: 'email', first_name: 'first_name' },
      mapping_candidates: {
        email: [{ field: 'email', score: 1, reasons: ['exact'] }],
        first_name: [{ field: 'first_name', score: 1, reasons: ['exact'] }],
      },
      field_options: [
        { field: 'email', label: 'email' },
        { field: 'first_name', label: 'first_name' },
      ],
      to_create: 1,
      to_update: 0,
      total_rows: 1,
      row_errors: [],
      warnings: [],
    };

    previewImportMock.mockResolvedValue(preview);
    commitImportMock.mockResolvedValue({
      created: 1,
      updated: 0,
      total_processed: 1,
      affected_ids: ['contact-1'],
    });

    const { container } = renderWithProviders(
      <ImportExportModal
        isOpen
        onClose={vi.fn()}
        entityType="contacts"
        exportRequest={{}}
        selectedIds={[]}
        onImportComplete={onImportComplete}
      />
    );

    await user.click(screen.getByRole('button', { name: /^import$/i }));

    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('File input not found');
    }

    const file = new File(['email,first_name\nalice@example.com,Alice'], 'contacts.csv', {
      type: 'text/csv',
    });

    await user.upload(input, file);

    expect(previewImportMock).toHaveBeenCalledWith('contacts', file, {});
    expect(await screen.findByText(/1 create, 0 update, 1 total row/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /commit import/i }));

    expect(commitImportMock).toHaveBeenCalledWith('contacts', file, preview.mapping);
    expect(onImportComplete).toHaveBeenCalled();
  });
});
