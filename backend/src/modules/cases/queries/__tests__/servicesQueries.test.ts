jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import type { Pool } from 'pg';
import {
  createCaseServiceQuery,
  deleteCaseServiceQuery,
  getCaseServicesQuery,
  updateCaseServiceQuery,
} from '../servicesQueries';

describe('servicesQueries', () => {
  const query = jest.fn();
  const db = { query } as unknown as Pool;

  beforeEach(() => {
    query.mockReset();
  });

  it('lists case services with provider details', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'service-1' }] });

    const result = await getCaseServicesQuery(db, 'case-1');

    expect(result).toEqual([{ id: 'service-1' }]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM case_services cs'), ['case-1']);
  });

  it('creates a case service using an existing provider match', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'provider-1', provider_name: 'Acme Support' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'service-1' }] })
      .mockResolvedValueOnce({
        rows: [{ id: 'service-1', external_service_provider_name: 'Acme Support' }],
      });

    const result = await createCaseServiceQuery(
      db,
      'case-1',
      {
        service_name: 'Assessment',
        service_type: 'housing',
        service_provider: 'Acme Support',
        service_date: '2026-04-05',
        notes: 'check-in',
      },
      'user-1'
    );

    expect(result).toEqual({
      id: 'service-1',
      external_service_provider_name: 'Acme Support',
    });
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM external_service_providers'),
      ['Acme Support']
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE external_service_providers'),
      ['housing', 'user-1', 'provider-1']
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO case_services'),
      [
        'case-1',
        'Assessment',
        'housing',
        'Acme Support',
        'provider-1',
        '2026-04-05',
        null,
        null,
        null,
        'scheduled',
        null,
        null,
        'CAD',
        'check-in',
        'user-1',
      ]
    );
  });

  it('updates a case service and preserves provider resolution', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'provider-2', provider_name: 'Bridge Health' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'service-1' }] })
      .mockResolvedValueOnce({
        rows: [{ id: 'service-1', external_service_provider_name: 'Bridge Health' }],
      });

    const result = await updateCaseServiceQuery(
      db,
      'service-1',
      {
        service_provider: 'Bridge Health',
        service_type: 'medical',
        status: 'completed',
      },
      'user-2'
    );

    expect(result).toEqual({
      id: 'service-1',
      external_service_provider_name: 'Bridge Health',
    });
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE external_service_providers'),
      ['medical', 'user-2', 'provider-2']
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('UPDATE case_services SET'),
      ['Bridge Health', 'medical', 'completed', 'provider-2', 'service-1']
    );
  });

  it('deletes a case service', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await deleteCaseServiceQuery(db, 'service-1');

    expect(query).toHaveBeenCalledWith('DELETE FROM case_services WHERE id = $1', ['service-1']);
  });
});
