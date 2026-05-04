import { outcomesReportQuerySchema } from '@validations/outcomeImpact';

describe('outcomes report query contract', () => {
  it('rejects programId at route validation instead of passing it to the controller', () => {
    const result = outcomesReportQuerySchema.safeParse({
      from: '2026-01-01',
      to: '2026-01-31',
      programId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'unrecognized_keys',
            keys: ['programId'],
          }),
        ])
      );
    }
  });
});
