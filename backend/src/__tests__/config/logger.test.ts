import { createLogFormat, maskSensitiveData } from '@config/logger';

const SPLAT_SYMBOL = Symbol.for('splat');
const MESSAGE_SYMBOL = Symbol.for('message');

describe('logger redaction', () => {
  it('redacts common personal data keys recursively', () => {
    const input = {
      email: 'ada@example.com',
      profile: {
        first_name: 'Ada',
        last_name: 'Lovelace',
        address_line1: '123 Main St',
        postal_code: 'V6B 1A1',
        nested: [
          {
            phone: '(604) 555-1212',
            public_note: 'keep me',
          },
        ],
      },
      audit: {
        full_name: 'Ada Lovelace',
        birth_date: '1815-12-10',
        public: 'safe',
      },
    };

    expect(maskSensitiveData(input)).toEqual({
      email: '[REDACTED]',
      profile: {
        first_name: '[REDACTED]',
        last_name: '[REDACTED]',
        address_line1: '[REDACTED]',
        postal_code: '[REDACTED]',
        nested: [
          {
            phone: '[REDACTED]',
            public_note: 'keep me',
          },
        ],
      },
      audit: {
        full_name: '[REDACTED]',
        birth_date: '[REDACTED]',
        public: 'safe',
      },
    });
  });

  it('redacts interpolated %s payloads before the final log line is rendered', () => {
    const format = createLogFormat();
    const transformed = format.transform(
      {
        level: 'info',
        message: 'Token %s',
        [SPLAT_SYMBOL]: ['super-secret-token'],
      } as any,
      format.options
    );

    expect(transformed).toBeDefined();
    expect(transformed?.message).toBe('Token [REDACTED]');
    expect(String(transformed?.[MESSAGE_SYMBOL])).not.toContain('super-secret-token');
  });

  it('redacts interpolated %o payloads before the final log line is rendered', () => {
    const format = createLogFormat();
    const transformed = format.transform(
      {
        level: 'info',
        message: 'Payload %o',
        [SPLAT_SYMBOL]: [
          {
            secret: 'top-secret',
            nested: {
              token: 'nested-secret',
            },
          },
        ],
      } as any,
      format.options
    );

    expect(transformed).toBeDefined();
    expect(String(transformed?.message)).not.toContain('top-secret');
    expect(String(transformed?.message)).not.toContain('nested-secret');
    expect(String(transformed?.message)).toContain('[REDACTED]');
    expect(String(transformed?.[MESSAGE_SYMBOL])).not.toContain('top-secret');
    expect(String(transformed?.[MESSAGE_SYMBOL])).not.toContain('nested-secret');
  });
});
