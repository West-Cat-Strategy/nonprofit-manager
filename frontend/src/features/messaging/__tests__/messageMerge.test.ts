import { describe, expect, it } from 'vitest';
import { pickPreferredMessageVersion } from '../messageMerge';

describe('pickPreferredMessageVersion', () => {
  it('prefers sent messages over optimistic states', () => {
    expect(
      pickPreferredMessageVersion(
        { id: 'failed', send_state: 'failed', optimistic: true },
        { id: 'sent', send_state: 'sent', optimistic: false }
      )
    ).toMatchObject({ id: 'sent' });
  });

  it('prefers sending messages over failed retries', () => {
    expect(
      pickPreferredMessageVersion(
        { id: 'failed', send_state: 'failed', optimistic: true },
        { id: 'sending', send_state: 'sending', optimistic: true }
      )
    ).toMatchObject({ id: 'sending' });
  });
});
