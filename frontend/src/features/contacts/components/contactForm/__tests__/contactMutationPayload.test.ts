import { describe, expect, it } from 'vitest';
import { buildContactMutationPayload } from '../contactMutationPayload';
import type { ContactFormValues } from '../types';

const makeFormData = (overrides: Partial<ContactFormValues> = {}): ContactFormValues => ({
  first_name: 'Ana',
  account_id: '',
  preferred_name: '',
  last_name: 'Bell',
  middle_name: '',
  salutation: '',
  suffix: '',
  birth_date: '',
  gender: '',
  pronouns: '',
  phn: '',
  email: '',
  phone: '',
  mobile_phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state_province: '',
  postal_code: '',
  country: '',
  no_fixed_address: false,
  job_title: '',
  department: '',
  preferred_contact_method: 'email',
  do_not_email: false,
  do_not_phone: false,
  do_not_text: false,
  do_not_voicemail: false,
  notes: '',
  tags: [],
  is_active: true,
  roles: [],
  ...overrides,
});

describe('buildContactMutationPayload', () => {
  it('omits malformed account ids from create payloads', () => {
    const payload = buildContactMutationPayload(
      makeFormData({
        account_id: 'not-a-uuid',
      }),
      'create'
    );

    expect(payload).not.toHaveProperty('account_id');
  });

  it('trims and preserves valid account ids from create payloads', () => {
    const payload = buildContactMutationPayload(
      makeFormData({
        account_id: ' 00000000-0000-4000-8000-000000000123 ',
        email: '  ana@example.com  ',
      }),
      'create'
    );

    expect(payload).toMatchObject({
      account_id: '00000000-0000-4000-8000-000000000123',
      email: 'ana@example.com',
    });
  });
});
