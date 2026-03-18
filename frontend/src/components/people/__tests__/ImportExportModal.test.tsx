import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ImportExportModal } from '../../../features/people/components/ImportExportModal';
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

vi.mock('../../../features/people/hooks/useImportExport', () => ({
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
  const buildPreview = (
    overrides: Partial<{
      mapping: Record<string, string>;
      detected_columns: string[];
      field_options: Array<{ field: string; label: string }>;
      mapping_candidates: Record<string, Array<{ field: string; score: number; reasons: string[] }>>;
      to_create: number;
      to_update: number;
    }> = {}
  ) => ({
    detected_columns: overrides.detected_columns || ['email', 'first_name'],
    mapping: overrides.mapping || { email: 'email', first_name: 'first_name' },
    mapping_candidates: overrides.mapping_candidates || {
      email: [{ field: 'email', score: 1, reasons: ['exact'] }],
      first_name: [{ field: 'first_name', score: 1, reasons: ['exact'] }],
    },
    field_options: overrides.field_options || [
      { field: 'email', label: 'email' },
      { field: 'first_name', label: 'first_name' },
      { field: 'preferred_name', label: 'preferred_name' },
    ],
    to_create: overrides.to_create ?? 1,
    to_update: overrides.to_update ?? 0,
    total_rows: 1,
    row_errors: [],
    warnings: [],
  });

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

  it('downloads both import templates through the backend endpoint', async () => {
    const user = userEvent.setup();
    downloadImportTemplateMock.mockResolvedValue(undefined);

    renderWithProviders(
      <ImportExportModal
        isOpen
        onClose={vi.fn()}
        entityType="volunteers"
        exportRequest={{}}
      />
    );

    await user.click(screen.getByRole('button', { name: /^import$/i }));
    await user.click(screen.getByRole('button', { name: /csv template/i }));
    await user.click(screen.getByRole('button', { name: /xlsx template/i }));

    expect(downloadImportTemplateMock).toHaveBeenNthCalledWith(1, 'volunteers', 'csv');
    expect(downloadImportTemplateMock).toHaveBeenNthCalledWith(2, 'volunteers', 'xlsx');
  });

  it('previews and commits an import file', async () => {
    const user = userEvent.setup();
    const onImportComplete = vi.fn();
    const preview = buildPreview();

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
    expect(screen.queryByRole('button', { name: /commit import/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/current file:/i)).not.toBeInTheDocument();
  });

  it('retries the same file after a failed preview by clearing the file input', async () => {
    const user = userEvent.setup();
    const preview = buildPreview();

    previewImportMock
      .mockRejectedValueOnce(new Error('Preview failed'))
      .mockResolvedValueOnce(preview);

    const { container } = renderWithProviders(
      <ImportExportModal
        isOpen
        onClose={vi.fn()}
        entityType="contacts"
        exportRequest={{}}
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

    await waitFor(() => {
      expect(previewImportMock).toHaveBeenCalledTimes(1);
    });
    expect(input.value).toBe('');

    await user.upload(input, file);

    await waitFor(() => {
      expect(previewImportMock).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText(/1 create, 0 update, 1 total row/i)).toBeInTheDocument();
  });

  it('commits the canonicalized mapping returned by the latest preview', async () => {
    const user = userEvent.setup();
    const initialPreview = buildPreview();
    const canonicalPreview = buildPreview({
      mapping: { email: 'email', first_name: 'first_name' },
    });

    previewImportMock
      .mockResolvedValueOnce(initialPreview)
      .mockResolvedValueOnce(canonicalPreview);
    commitImportMock.mockResolvedValue({
      created: 0,
      updated: 1,
      total_processed: 1,
      affected_ids: ['contact-1'],
    });

    const { container } = renderWithProviders(
      <ImportExportModal
        isOpen
        onClose={vi.fn()}
        entityType="contacts"
        exportRequest={{}}
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
    expect(await screen.findByText(/1 create, 0 update, 1 total row/i)).toBeInTheDocument();

    const mappingSelects = screen.getAllByRole('combobox');
    const firstNameSelect = mappingSelects[1];
    if (!(firstNameSelect instanceof HTMLSelectElement)) {
      throw new Error('Expected first-name mapping select');
    }

    await user.selectOptions(firstNameSelect, 'preferred_name');

    await user.click(screen.getByRole('button', { name: /commit import/i }));

    expect(previewImportMock).toHaveBeenNthCalledWith(2, 'contacts', file, {
      email: 'email',
      first_name: 'preferred_name',
    });
    expect(commitImportMock).toHaveBeenCalledWith('contacts', file, canonicalPreview.mapping);
  });
});
