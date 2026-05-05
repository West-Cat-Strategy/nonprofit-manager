import { outcomesReportQuerySchema } from '@validations/outcomeImpact';

const uuid = '11111111-1111-4111-8111-111111111111';

describe('outcomesReportQuerySchema', () => {
  it('accepts the supported outcomes report filters', () => {
    const result = outcomesReportQuerySchema.safeParse({
      from: '2026-01-01',
      to: '2026-01-31',
      staffId: uuid,
      source: 'interaction',
      interactionType: 'meeting',
      bucket: 'month',
      includeNonReportable: 'true',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        from: '2026-01-01',
        to: '2026-01-31',
        staffId: uuid,
        source: 'interaction',
        interactionType: 'meeting',
        bucket: 'month',
        includeNonReportable: true,
      });
    }
  });

  it('rejects programId instead of accepting then rejecting it in the controller', () => {
    const result = outcomesReportQuerySchema.safeParse({
      from: '2026-01-01',
      to: '2026-01-31',
      programId: uuid,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'unrecognized_keys',
            keys: expect.arrayContaining(['programId']),
          }),
        ])
      );
    }
  });
});
