import { describe, expect, it } from '@jest/globals';
import { teamChatMessagesQuerySchema } from '@validations/teamChat';

describe('teamChatMessagesQuerySchema', () => {
  it('accepts initial history query without a cursor', () => {
    const result = teamChatMessagesQuerySchema.safeParse({ limit: 50 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.after_message_id).toBeUndefined();
      expect(result.data.before_message_id).toBeUndefined();
      expect(result.data.limit).toBe(50);
    }
  });

  it('accepts polling cursor query with after_message_id', () => {
    const result = teamChatMessagesQuerySchema.safeParse({
      limit: 100,
      after_message_id: '11111111-1111-4111-8111-111111111111',
    });

    expect(result.success).toBe(true);
  });

  it('rejects queries that provide both cursors', () => {
    const result = teamChatMessagesQuerySchema.safeParse({
      after_message_id: '11111111-1111-4111-8111-111111111111',
      before_message_id: '22222222-2222-4222-8222-222222222222',
    });

    expect(result.success).toBe(false);
  });
});
