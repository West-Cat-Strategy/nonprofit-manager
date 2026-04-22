import { setCurrentUserId } from '@config/database';
import { runWithRequestContext } from '@config/requestContext';
import { services } from '@container/services';
import { ContactDirectoryUseCase } from '../usecases/contactDirectory.usecase';

jest.mock('@config/database', () => ({
  __esModule: true,
  setCurrentUserId: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@container/services', () => ({
  __esModule: true,
  services: {
    pool: {
      connect: jest.fn(),
    },
  },
}));

jest.mock('@services/domains/integration', () => ({
  __esModule: true,
  invitationService: {
    createInvitation: jest.fn(),
  },
  syncUserRole: jest.fn().mockResolvedValue(undefined),
}));

type MockClient = {
  query: jest.Mock;
  release: jest.Mock;
};

const createMockClient = (
  options: {
    accountRows?: Array<{ id: string; is_active: boolean }>;
    accessRows?: Array<{ account_id: string }>;
  } = {}
): MockClient => ({
  query: jest.fn(async (sql: string, params?: unknown[]) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return { rows: [] };
    }

    if (sql.includes('FROM user_account_access')) {
      const requestedAccountId = String(params?.[1] ?? 'org-1');
      return {
        rows:
          options.accessRows
          ?? (requestedAccountId === 'org-1' ? [{ account_id: requestedAccountId }] : []),
      };
    }

    if (sql.includes('FROM accounts')) {
      return {
        rows: options.accountRows ?? [{ id: String(params?.[0] ?? 'org-1'), is_active: true }],
      };
    }

    return { rows: [] };
  }),
  release: jest.fn(),
});

const createRepository = () => ({
  getContacts: jest.fn(),
  lookupContacts: jest.fn(),
  getContactTags: jest.fn(),
  getContactRoles: jest.fn(),
  getRolesForContact: jest.fn(),
  setRolesForContact: jest.fn(),
  getContactById: jest.fn(),
  getContactByIdWithScope: jest.fn(),
  createContact: jest.fn(),
  updateContact: jest.fn(),
  bulkUpdateContacts: jest.fn(),
  deleteContact: jest.fn(),
  mergeContacts: jest.fn(),
  findContactIdentity: jest.fn(),
  findUserByEmail: jest.fn(),
  updateUserRole: jest.fn(),
});

describe('ContactDirectoryUseCase transaction context', () => {
  const mockConnect = services.pool.connect as jest.Mock;
  const setCurrentUserIdMock = setCurrentUserId as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('binds the current user before creating a contact inside a transaction', async () => {
    const client = createMockClient();
    mockConnect.mockResolvedValue(client);
    const repository = createRepository();
    repository.createContact.mockResolvedValue({
      contact_id: 'contact-1',
      account_id: 'org-1',
      first_name: 'Casey',
      last_name: 'Create',
    });

    const useCase = new ContactDirectoryUseCase(repository);

    await useCase.create(
      {
        account_id: 'org-1',
        first_name: 'Casey',
        last_name: 'Create',
      },
      'user-1'
    );

    expect(client.query.mock.calls[0]).toEqual(['BEGIN']);
    expect(setCurrentUserIdMock).toHaveBeenCalledWith(client, 'user-1', { local: true });
    expect(repository.createContact).toHaveBeenCalledWith(
      {
        account_id: 'org-1',
        first_name: 'Casey',
        last_name: 'Create',
        roles: undefined,
      },
      'user-1',
      undefined,
      client
    );
    expect(client.query).toHaveBeenLastCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('allows admin callers to create contacts for existing accounts without scoped account filters', async () => {
    const client = createMockClient({ accessRows: [] });
    mockConnect.mockResolvedValue(client);
    const repository = createRepository();
    repository.createContact.mockResolvedValue({
      contact_id: 'contact-admin-1',
      account_id: 'org-1',
      first_name: 'Admin',
      last_name: 'Create',
    });

    const useCase = new ContactDirectoryUseCase(repository);

    await expect(
      useCase.create(
        {
          account_id: 'org-1',
          first_name: 'Admin',
          last_name: 'Create',
        },
        'user-admin',
        'admin'
      )
    ).resolves.toMatchObject({
      contact_id: 'contact-admin-1',
      account_id: 'org-1',
    });

    expect(repository.createContact).toHaveBeenCalledWith(
      {
        account_id: 'org-1',
        first_name: 'Admin',
        last_name: 'Create',
        roles: undefined,
      },
      'user-admin',
      'admin',
      client
    );
    expect(client.release).toHaveBeenCalled();
  });

  it('binds the current user before updating a contact inside a transaction', async () => {
    const client = createMockClient({ accessRows: [] });
    mockConnect.mockResolvedValue(client);
    const repository = createRepository();
    repository.updateContact.mockResolvedValue({
      contact_id: 'contact-1',
      account_id: 'org-1',
      first_name: 'Casey',
      last_name: 'Updated',
    });
    repository.getRolesForContact.mockResolvedValue([]);

    const useCase = new ContactDirectoryUseCase(repository);

    await useCase.update(
      'contact-1',
      {
        first_name: 'Casey',
        last_name: 'Updated',
      },
      'user-2'
    );

    expect(client.query.mock.calls[0]).toEqual(['BEGIN']);
    expect(setCurrentUserIdMock).toHaveBeenCalledWith(client, 'user-2', { local: true });
    expect(repository.updateContact).toHaveBeenCalledWith(
      'contact-1',
      {
        first_name: 'Casey',
        last_name: 'Updated',
        roles: undefined,
      },
      'user-2',
      undefined,
      client
    );
    expect(client.query).toHaveBeenLastCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('rejects create requests when the account is outside the active organization context', async () => {
    const client = createMockClient({ accessRows: [] });
    mockConnect.mockResolvedValue(client);
    const repository = createRepository();
    const useCase = new ContactDirectoryUseCase(repository);

    await expect(
      runWithRequestContext(
        {
          organizationId: 'org-1',
          accountId: 'org-1',
          tenantId: 'org-1',
        },
        () =>
          useCase.create(
            {
              account_id: 'org-2',
              first_name: 'Casey',
              last_name: 'Create',
            },
            'user-1'
          )
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'validation_error',
      message: 'Selected account is outside the current request scope',
    });

    expect(repository.createContact).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('rejects create requests when the account does not exist before insert', async () => {
    const client = createMockClient({
      accountRows: [],
      accessRows: [{ account_id: 'org-missing' }],
    });
    mockConnect.mockResolvedValue(client);
    const repository = createRepository();
    const useCase = new ContactDirectoryUseCase(repository);

    await expect(
      useCase.create(
        {
          account_id: 'org-missing',
          first_name: 'Casey',
          last_name: 'Create',
        },
        'user-1'
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'validation_error',
      message: 'Selected account was not found',
    });

    expect(repository.createContact).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('rejects create requests with invalid role names before insert', async () => {
    const repository = createRepository();
    repository.getContactRoles.mockResolvedValue([
      {
        id: 'role-board',
        name: 'Board Member',
        description: 'Board Member',
        is_system: true,
      },
    ]);

    const useCase = new ContactDirectoryUseCase(repository);

    await expect(
      useCase.create(
        {
          first_name: 'Casey',
          last_name: 'Create',
          roles: ['Unknown Role'],
        },
        'user-1'
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'validation_error',
      message: 'Invalid contact roles: Unknown Role',
    });

    expect(mockConnect).not.toHaveBeenCalled();
    expect(repository.createContact).not.toHaveBeenCalled();
  });

  it('rejects create requests when staff roles are assigned without an email', async () => {
    const repository = createRepository();
    repository.getContactRoles.mockResolvedValue([
      {
        id: 'role-staff',
        name: 'Staff',
        description: 'Internal team member',
        is_system: true,
      },
    ]);

    const useCase = new ContactDirectoryUseCase(repository);

    await expect(
      useCase.create(
        {
          account_id: 'org-1',
          first_name: 'Casey',
          last_name: 'Create',
          roles: ['Staff'],
        },
        'user-1'
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'validation_error',
      message: 'Staff roles require a contact email to create an account',
    });

    expect(mockConnect).not.toHaveBeenCalled();
    expect(repository.createContact).not.toHaveBeenCalled();
  });
});
