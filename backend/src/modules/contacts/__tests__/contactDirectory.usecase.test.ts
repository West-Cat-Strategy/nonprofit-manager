import { setCurrentUserId } from '@config/database';
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

const createMockClient = (): MockClient => ({
  query: jest.fn(async (sql: string) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return { rows: [] };
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

  it('binds the current user before updating a contact inside a transaction', async () => {
    const client = createMockClient();
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
});
