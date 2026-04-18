import { getExistingOccurrenceRegistration } from '../eventRegistrationService.helpers';

describe('getExistingOccurrenceRegistration', () => {
  it('uses a lock-safe base registration query when FOR UPDATE is requested', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    await getExistingOccurrenceRegistration('occ-1', 'contact-1', { query }, true);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, string[]];

    expect(sql).toContain('FROM event_registrations er');
    expect(sql).not.toContain('LEFT JOIN LATERAL');
    expect(sql).toContain('LIMIT 1');
    expect(sql).toContain('FOR UPDATE');
    expect(params).toEqual(['occ-1', 'contact-1']);
  });
});
