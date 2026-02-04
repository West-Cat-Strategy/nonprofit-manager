import { validateWebhookUrl } from '../../services/webhookService';
import * as dns from 'dns/promises';

jest.mock('dns/promises', () => ({
  lookup: jest.fn(),
}));

const mockLookup = dns.lookup as jest.Mock;

describe('webhookService.validateWebhookUrl', () => {
  beforeEach(() => {
    mockLookup.mockReset();
  });

  it('blocks localhost and local TLDs', async () => {
    await expect(validateWebhookUrl('http://localhost/webhook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
    await expect(validateWebhookUrl('https://service.local/webhook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
    await expect(validateWebhookUrl('https://service.localhost/webhook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
  });

  it('blocks URLs with credentials', async () => {
    await expect(validateWebhookUrl('https://user:pass@example.com/hook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
  });

  it('blocks private IPv4 literals', async () => {
    await expect(validateWebhookUrl('http://127.0.0.1/hook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
    await expect(validateWebhookUrl('http://10.0.0.5/hook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
    await expect(validateWebhookUrl('http://192.168.1.10/hook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
  });

  it('blocks private IPv6 literals', async () => {
    await expect(validateWebhookUrl('http://[::1]/hook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
    await expect(validateWebhookUrl('http://[fd00::1]/hook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
    await expect(validateWebhookUrl('http://[fe80::1]/hook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
  });

  it('blocks IPv4-mapped IPv6 private addresses', async () => {
    await expect(validateWebhookUrl('http://[::ffff:127.0.0.1]/hook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
    await expect(validateWebhookUrl('http://[::ffff:10.0.0.5]/hook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
  });

  it('allows public IPv4 literals', async () => {
    await expect(validateWebhookUrl('https://8.8.8.8/hook')).resolves.toEqual(
      expect.objectContaining({ ok: true })
    );
  });

  it('blocks hostnames resolving to private IPs', async () => {
    mockLookup.mockResolvedValueOnce([{ address: '10.0.0.10', family: 4 }]);
    await expect(validateWebhookUrl('https://internal.example.com/hook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
  });

  it('allows hostnames resolving to public IPs', async () => {
    mockLookup.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]);
    await expect(validateWebhookUrl('https://example.com/hook')).resolves.toEqual(
      expect.objectContaining({ ok: true })
    );
  });

  it('blocks when DNS lookup fails', async () => {
    mockLookup.mockRejectedValueOnce(new Error('DNS failure'));
    await expect(validateWebhookUrl('https://example.com/hook')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
  });

  it('blocks invalid URLs', async () => {
    await expect(validateWebhookUrl('not-a-url')).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
  });
});
