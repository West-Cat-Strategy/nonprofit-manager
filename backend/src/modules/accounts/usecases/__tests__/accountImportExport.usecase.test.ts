import { AccountImportExportUseCase } from '../accountImportExport.usecase';
import type { AccountTaxIdPolicy } from '../accountFieldAccess.usecase';

const staffTaxIdPolicy: AccountTaxIdPolicy = {
  canRead: true,
  canWrite: false,
  maskOnRead: true,
  maskType: 'partial',
  source: 'field_access_rules',
};

const viewerTaxIdPolicy: AccountTaxIdPolicy = {
  canRead: false,
  canWrite: false,
  maskOnRead: false,
  maskType: null,
  source: 'field_access_rules',
};

describe('AccountImportExportUseCase field policy', () => {
  const query = jest.fn();
  const useCase = new AccountImportExportUseCase({ query } as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('omits tax_id from import templates when the user cannot write it', async () => {
    const file = await useCase.getImportTemplate('csv', viewerTaxIdPolicy);
    const header = file.buffer.toString('utf8').split('\n')[0];

    expect(header).toContain('account_id');
    expect(header).not.toContain('tax_id');
  });

  it('masks tax_id in exports when the user has masked read access', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          account_id: 'account-1',
          account_number: 'ACC-1',
          account_name: 'Policy Account',
          tax_id: '12-3456789',
        },
      ],
    });

    const file = await useCase.exportAccounts(
      {
        format: 'csv',
        ids: ['account-1'],
        columns: ['account_name', 'tax_id'],
      },
      undefined,
      staffTaxIdPolicy
    );
    const text = file.buffer.toString('utf8');

    expect(text.split('\n')[0]).toContain('tax_id');
    expect(text).not.toContain('12-3456789');
    expect(text).toMatch(/\*+6789/);
  });

  it('omits tax_id from exports when the user cannot read it', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          account_id: 'account-1',
          account_number: 'ACC-1',
          account_name: 'Policy Account',
          tax_id: '12-3456789',
        },
      ],
    });

    const file = await useCase.exportAccounts(
      {
        format: 'csv',
        ids: ['account-1'],
        columns: ['account_name', 'tax_id'],
      },
      undefined,
      viewerTaxIdPolicy
    );

    expect(file.buffer.toString('utf8').split('\n')[0]).not.toContain('tax_id');
  });
});
