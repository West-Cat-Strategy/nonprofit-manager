import type { Pool } from 'pg';
import { ExternalServiceProviderService } from '@services/externalServiceProviderService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ExternalServiceProviderService', () => {
  const mockQuery = jest.fn();
  let service: ExternalServiceProviderService;

  beforeEach(() => {
    mockQuery.mockReset();
    service = new ExternalServiceProviderService({ query: mockQuery } as unknown as Pool);
  });

  it('lists only active providers by default and clamps the query limit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'provider-1' }] });

    const result = await service.listProviders({
      search: '  Alpha  ',
      provider_type: ' clinical ',
      limit: 999,
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('esp.is_active = true'),
      ['%Alpha%', 'clinical', 200]
    );
    expect(result).toEqual([{ id: 'provider-1' }]);
  });

  it('rejects duplicate provider names after normalization', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'provider-1' }] });

    await expect(
      service.createProvider({
        provider_name: '  Alpha   Health  ',
      })
    ).rejects.toThrow('External service provider already exists');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM external_service_providers'),
      ['Alpha Health']
    );
  });

  it('creates providers with trimmed values and default active status', async () => {
    const createdRow = {
      id: 'provider-2',
      provider_name: 'Alpha Health',
      provider_type: 'clinical',
      notes: 'Referral partner',
      is_active: true,
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [createdRow] });

    const result = await service.createProvider(
      {
        provider_name: '  Alpha   Health  ',
        provider_type: ' clinical ',
        notes: '  Referral partner  ',
      },
      'user-1'
    );

    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO external_service_providers'),
      ['Alpha Health', 'clinical', 'Referral partner', true, 'user-1', 'user-1']
    );
    expect(result).toEqual(createdRow);
  });

  it('normalizes update fields before persisting them', async () => {
    const updatedRow = {
      id: 'provider-3',
      provider_name: 'Alpha Health',
      provider_type: null,
      notes: 'Updated note',
      is_active: false,
    };

    mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

    const result = await service.updateProvider(
      'provider-3',
      {
        provider_name: '  Alpha   Health  ',
        provider_type: '   ',
        notes: '  Updated note  ',
        is_active: false,
      },
      'user-2'
    );

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE external_service_providers SET'),
      ['Alpha Health', null, 'Updated note', false, 'user-2', 'provider-3']
    );
    expect(result).toEqual(updatedRow);
  });

  it('returns whether the provider archive update affected a row', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'provider-4' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(service.deleteProvider('provider-4')).resolves.toBe(true);
    await expect(service.deleteProvider('missing-provider')).resolves.toBe(false);
  });
});
