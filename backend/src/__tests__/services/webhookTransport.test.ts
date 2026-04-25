import * as dns from 'dns/promises';
import {
  createPinnedWebhookLookup,
  validateWebhookUrl,
} from '@modules/webhooks/services/webhookTransport';

jest.mock('dns/promises', () => ({
  lookup: jest.fn(),
}));

const mockLookup = dns.lookup as jest.Mock;

describe('webhookTransport DNS pinning', () => {
  beforeEach(() => {
    mockLookup.mockReset();
  });

  it('pins delivery to the validated DNS result instead of re-resolving at connect time', async () => {
    mockLookup.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]);

    const validation = await validateWebhookUrl('https://example.com/webhook');

    expect(validation).toEqual(
      expect.objectContaining({
        ok: true,
        addresses: ['93.184.216.34'],
      })
    );

    mockLookup.mockResolvedValueOnce([{ address: '10.0.0.5', family: 4 }]);

    const lookup = createPinnedWebhookLookup(validation.addresses ?? []);

    await new Promise<void>((resolve, reject) => {
      lookup({ hostname: 'example.com' } as never, {} as never, (error, addresses) => {
        try {
          expect(error).toBeNull();
          expect(addresses).toEqual([
            { address: '93.184.216.34', family: 4, ttl: 0 },
          ]);
          resolve();
        } catch (assertionError) {
          reject(assertionError);
        }
      });
    });

    expect(mockLookup).toHaveBeenCalledTimes(1);
  });
});
