import crypto from 'crypto';
import { createSquarePaymentProviderAdapter } from '../../services/paymentProviderAdapters/squarePaymentProviderAdapter';

const webhookUrl = 'https://app.example.org/api/v2/payments/webhooks/square';
const signatureKey = 'square-webhook-signature-key';

const signSquareWebhook = (
  rawBody: Buffer,
  notificationUrl = webhookUrl,
  key = signatureKey
): string =>
  crypto
    .createHmac('sha256', key)
    .update(notificationUrl, 'utf8')
    .update(rawBody)
    .digest('base64');

describe('createSquarePaymentProviderAdapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SQUARE_WEBHOOK_SIGNATURE_KEY: signatureKey,
      SQUARE_WEBHOOK_NOTIFICATION_URL: webhookUrl,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('verifies Square webhook signatures over the configured URL and raw body', async () => {
    const adapter = createSquarePaymentProviderAdapter();
    const rawBody = Buffer.from(
      JSON.stringify({
        event_id: 'event-1',
        type: 'payment.created',
        created_at: '2026-06-06T12:00:00.000Z',
        data: { object: { payment: { id: 'payment-1' } } },
      })
    );

    const event = await adapter.verifyWebhook(rawBody, {
      'x-square-hmacsha256-signature': signSquareWebhook(rawBody),
    });

    expect(event).toMatchObject({
      provider: 'square',
      id: 'event-1',
      type: 'payment.created',
      data: { object: { payment: { id: 'payment-1' } } },
    });
    expect(event.created.toISOString()).toBe('2026-06-06T12:00:00.000Z');
  });

  it('rejects signatures generated for the wrong notification URL', async () => {
    const adapter = createSquarePaymentProviderAdapter();
    const rawBody = Buffer.from(JSON.stringify({ event_id: 'event-1', type: 'payment.created' }));

    await expect(
      adapter.verifyWebhook(rawBody, {
        'x-square-hmacsha256-signature': signSquareWebhook(
          rawBody,
          'https://wrong.example.org/api/v2/payments/webhooks/square'
        ),
      })
    ).rejects.toThrow('Square webhook signature verification failed');
  });

  it('rejects tampered raw bodies', async () => {
    const adapter = createSquarePaymentProviderAdapter();
    const rawBody = Buffer.from(JSON.stringify({ event_id: 'event-1', type: 'payment.created' }));
    const tamperedBody = Buffer.from(
      JSON.stringify({ event_id: 'event-1', type: 'payment.updated' })
    );

    await expect(
      adapter.verifyWebhook(tamperedBody, {
        'x-square-hmacsha256-signature': signSquareWebhook(rawBody),
      })
    ).rejects.toThrow('Square webhook signature verification failed');
  });

  it('rejects missing headers, wrong secrets, and missing notification URL config', async () => {
    const adapter = createSquarePaymentProviderAdapter();
    const rawBody = Buffer.from(JSON.stringify({ event_id: 'event-1', type: 'payment.created' }));

    await expect(adapter.verifyWebhook(rawBody, {})).rejects.toThrow('Missing Square signature');
    await expect(
      adapter.verifyWebhook(rawBody, {
        'x-square-hmacsha256-signature': signSquareWebhook(rawBody, webhookUrl, 'wrong-secret'),
      })
    ).rejects.toThrow('Square webhook signature verification failed');

    delete process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;

    await expect(
      adapter.verifyWebhook(rawBody, {
        'x-square-hmacsha256-signature': signSquareWebhook(rawBody),
      })
    ).rejects.toThrow('Square webhook notification URL is not configured');
  });
});
