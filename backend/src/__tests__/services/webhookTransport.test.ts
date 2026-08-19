import * as dns from 'dns/promises';
import {
  createPinnedWebhookLookup,
  readWebhookResponseBody,
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

  it.each(['http://[::ffff:7f00:1]/hook', 'http://[64:ff9b::7f00:1]/hook'])(
    'blocks IPv6 forms that encode a private IPv4 destination: %s',
    async (url) => {
      await expect(validateWebhookUrl(url)).resolves.toEqual(
        expect.objectContaining({ ok: false })
      );
      expect(mockLookup).not.toHaveBeenCalled();
    }
  );

  it('reads and cancels webhook response bodies at the capture limit', async () => {
    let cancelled = false;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(new TextEncoder().encode('x'.repeat(2048)));
        },
        cancel() {
          cancelled = true;
        },
      })
    );

    await expect(readWebhookResponseBody(response)).resolves.toHaveLength(1024);
    expect(cancelled).toBe(true);
  });
});
