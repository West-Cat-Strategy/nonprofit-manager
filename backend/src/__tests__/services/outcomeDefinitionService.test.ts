import { Pool } from 'pg';

const mockQuery = jest.fn();
const mockConnect = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: mockQuery,
    connect: mockConnect,
  },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { OutcomeDefinitionService } from '../../services/outcomeDefinitionService';

describe('OutcomeDefinitionService', () => {
  let service: OutcomeDefinitionService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    service = new OutcomeDefinitionService({
      query: mockQuery,
      connect: mockConnect,
    } as unknown as Pool);
  });

  it('creates and updates outcome definitions', async () => {
    const created = {
      id: 'outcome-1',
      key: 'maintained_employment',
      name: 'Maintained employment',
      is_active: true,
      is_reportable: true,
      sort_order: 10,
    };

    const updated = {
      ...created,
      name: 'Maintained Employment (Updated)',
    };

    mockQuery.mockResolvedValueOnce({ rows: [created] });
    const createResult = await service.createOutcomeDefinition({
      key: 'maintained employment',
      name: 'Maintained employment',
      sortOrder: 10,
    });

    expect(createResult.key).toBe('maintained_employment');

    mockQuery.mockResolvedValueOnce({ rows: [updated] });
    const updateResult = await service.updateOutcomeDefinition('outcome-1', {
      name: 'Maintained Employment (Updated)',
      isActive: true,
    });

    expect(updateResult?.name).toBe('Maintained Employment (Updated)');
  });

  it('enables and disables outcomes', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'outcome-1', is_active: false }] });
    const disabled = await service.setOutcomeDefinitionActive('outcome-1', false);
    expect(disabled?.is_active).toBe(false);

    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'outcome-1', is_active: true }] });
    const enabled = await service.setOutcomeDefinitionActive('outcome-1', true);
    expect(enabled?.is_active).toBe(true);
  });

  it('reorders outcomes in a transaction', async () => {
    const clientQuery = jest.fn();
    const release = jest.fn();

    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    mockConnect.mockResolvedValue({ query: clientQuery, release });
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'a', sort_order: 1, name: 'A' },
        { id: 'b', sort_order: 2, name: 'B' },
      ],
    });

    const result = await service.reorderOutcomeDefinitions({ orderedIds: ['a', 'b'] });

    expect(clientQuery).toHaveBeenCalledWith('BEGIN');
    expect(clientQuery).toHaveBeenCalledWith(expect.stringContaining('SET sort_order = $1'), [1, 'a']);
    expect(clientQuery).toHaveBeenCalledWith(expect.stringContaining('SET sort_order = $1'), [2, 'b']);
    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it('upserts seed definitions by key', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await service.upsertOutcomeDefinitionsByKey([
      {
        key: 'reduced_criminal_justice_involvement',
        name: 'Reduced criminal justice involvement',
        sortOrder: 10,
      },
      {
        key: 'obtained_employment',
        name: 'Obtained employment',
        sortOrder: 20,
      },
    ]);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[0][0]).toContain('ON CONFLICT (key) DO UPDATE');
    expect(mockQuery.mock.calls[0][1][0]).toBe('reduced_criminal_justice_involvement');
    expect(mockQuery.mock.calls[1][1][0]).toBe('obtained_employment');
  });
});
