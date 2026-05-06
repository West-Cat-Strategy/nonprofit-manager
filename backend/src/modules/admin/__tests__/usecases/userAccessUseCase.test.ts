const mockPoolQuery = jest.fn();
const mockTransactionClient = {
  query: jest.fn(),
};
const mockWithUserContextTransaction = jest.fn(
  async (_userId: string, handler: (client: typeof mockTransactionClient) => Promise<unknown>) =>
    handler(mockTransactionClient)
);

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: mockPoolQuery,
  },
  withUserContextTransaction: mockWithUserContextTransaction,
}));

const mockGetUserAccessOverview = jest.fn();
const mockReplaceUserOrganizationAccess = jest.fn();

jest.mock('@services/accountAccessService', () => ({
  getUserAccessOverview: mockGetUserAccessOverview,
  listOrganizationAccounts: jest.fn(),
  replaceUserOrganizationAccess: mockReplaceUserOrganizationAccess,
}));

const mockHasPolicyGroupTables = jest.fn();
const mockGetPolicyGroupsByIds = jest.fn();
const mockReplaceUserPolicyGroups = jest.fn();

jest.mock('../../repositories/policyGroupRepository', () => ({
  hasPolicyGroupTables: mockHasPolicyGroupTables,
  getPolicyGroupsByIds: mockGetPolicyGroupsByIds,
  replaceUserPolicyGroups: mockReplaceUserPolicyGroups,
}));

import { updateUserAccess } from '../../usecases/userAccessUseCase';

describe('userAccessUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionClient.query.mockResolvedValue({ rows: [{ id: 'target-user', role: 'staff' }] });
    mockHasPolicyGroupTables.mockResolvedValue(false);
    mockReplaceUserOrganizationAccess.mockResolvedValue(['account-1']);
    mockGetUserAccessOverview.mockResolvedValue({
      groups: [],
      organizationAccess: ['account-1'],
      mfaTotpEnabled: false,
      passkeyCount: 0,
    });
  });

  it('fails closed when the modifying actor is missing', async () => {
    await expect(
      updateUserAccess('target-user', { groups: [], organizationAccess: ['account-1'] })
    ).rejects.toMatchObject({
      message: 'Authenticated actor is required to update user access',
      statusCode: 401,
      code: 'unauthorized',
    });

    expect(mockWithUserContextTransaction).not.toHaveBeenCalled();
    expect(mockReplaceUserOrganizationAccess).not.toHaveBeenCalled();
  });

  it('runs organization access writes inside a user-context transaction', async () => {
    const result = await updateUserAccess(
      'target-user',
      { groups: [], organizationAccess: ['account-1'] },
      'admin-user'
    );

    expect(mockWithUserContextTransaction).toHaveBeenCalledWith('admin-user', expect.any(Function));
    expect(mockTransactionClient.query).toHaveBeenCalledWith(
      'SELECT id, role FROM users WHERE id = $1',
      ['target-user']
    );
    expect(mockReplaceUserOrganizationAccess).toHaveBeenCalledWith(
      {
        userId: 'target-user',
        role: 'staff',
        organizationAccountIds: ['account-1'],
        grantedBy: 'admin-user',
      },
      mockTransactionClient
    );
    expect(result).toEqual({
      groups: [],
      organizationAccess: ['account-1'],
      mfaTotpEnabled: false,
      passkeyCount: 0,
    });
  });
});
