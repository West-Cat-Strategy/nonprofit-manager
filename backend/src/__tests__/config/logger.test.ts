import { maskSensitiveData } from '@config/logger';

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
});
