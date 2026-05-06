import { createAccountsController } from '../accounts.controller';
import type { DataScopeFilter } from '@app-types/dataScope';

const createResponse = () => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    getHeader: jest.fn(),
  };
  return response;
};

describe('accounts controller', () => {
  const createController = () => {
    const catalogUseCase = {
      list: jest.fn(),
      getByIdWithScope: jest.fn(),
      listContacts: jest.fn().mockResolvedValue({ contacts: [], total: 0 }),
    };
    const lifecycleUseCase = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const importExportUseCase = {
      exportAccounts: jest.fn(),
      getImportTemplate: jest.fn(),
      previewImport: jest.fn(),
      commitImport: jest.fn(),
    };

    return {
      controller: createAccountsController(
        catalogUseCase as never,
        lifecycleUseCase as never,
        importExportUseCase as never
      ),
      catalogUseCase,
    };
  };

  it('returns 404 for account contacts when accountIds scope excludes the account', async () => {
    const { controller, catalogUseCase } = createController();
    const response = createResponse();
    const next = jest.fn();

    await controller.getAccountContacts(
      {
        params: { id: 'account-2' },
        dataScope: { filter: { accountIds: ['account-1'] } },
      } as never,
      response as never,
      next
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'not_found' }),
      })
    );
    expect(catalogUseCase.listContacts).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('passes the full data scope into account contacts lookup', async () => {
    const { controller, catalogUseCase } = createController();
    const response = createResponse();
    const next = jest.fn();
    const scope: DataScopeFilter = {
      accountIds: ['account-1'],
      contactIds: ['contact-1'],
      createdByUserIds: ['user-1'],
      accountTypes: ['organization'],
    };

    await controller.getAccountContacts(
      {
        params: { id: 'account-1' },
        dataScope: { filter: scope },
      } as never,
      response as never,
      next
    );

    expect(catalogUseCase.listContacts).toHaveBeenCalledWith('account-1', scope);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});
