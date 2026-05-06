import type { Pool, PoolClient } from 'pg';
import type {
  CaseFormDeliveryChannel,
  CaseFormDeliveryTarget,
  SendCaseFormAssignmentDTO,
} from '@app-types/caseForms';

type Db = Pool | PoolClient;

const DELIVERY_CHANNEL_ORDER: CaseFormDeliveryChannel[] = ['portal', 'email', 'sms'];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const normalizeDeliveryChannels = (
  payload: SendCaseFormAssignmentDTO
): CaseFormDeliveryChannel[] => {
  const channels = new Set<CaseFormDeliveryChannel>();
  const requested = payload.delivery_channels?.length
    ? payload.delivery_channels
    : payload.delivery_target === 'portal_and_email'
      ? (['portal', 'email'] satisfies CaseFormDeliveryChannel[])
      : payload.delivery_target
        ? ([payload.delivery_target] satisfies CaseFormDeliveryChannel[])
        : [];

  for (const channel of requested) {
    channels.add(channel);
  }

  return DELIVERY_CHANNEL_ORDER.filter((channel) => channels.has(channel));
};

export const deriveLegacyDeliveryTarget = (
  channels: CaseFormDeliveryChannel[]
): CaseFormDeliveryTarget | null => {
  const channelSet = new Set(channels);
  if (channelSet.has('portal') && channelSet.has('email')) {
    return 'portal_and_email';
  }
  if (channelSet.has('portal')) {
    return 'portal';
  }
  if (channelSet.has('email')) {
    return 'email';
  }
  return null;
};

export const formatDeliveryChannelsLabel = (channels: CaseFormDeliveryChannel[]): string =>
  channels.map((channel) => (channel === 'sms' ? 'SMS' : channel)).join(', ');

export const getContactDeliveryFallbacks = async (
  db: Db,
  contactId: string
): Promise<{ email: string | null; phone: string | null }> => {
  if (!UUID_PATTERN.test(contactId)) {
    return { email: null, phone: null };
  }

  const result = await db.query<{
    email: string | null;
    phone: string | null;
    mobile_phone: string | null;
  }>(
    `SELECT email, phone, mobile_phone
     FROM contacts
     WHERE id = $1
     LIMIT 1`,
    [contactId]
  );
  const row = result.rows[0];
  return {
    email: row?.email?.trim() || null,
    phone: row?.mobile_phone?.trim() || row?.phone?.trim() || null,
  };
};

export const hasActivePortalAccount = async (db: Db, contactId: string): Promise<boolean> => {
  if (!UUID_PATTERN.test(contactId)) {
    return false;
  }

  const result = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM portal_users
       WHERE contact_id = $1
         AND status = 'active'
       LIMIT 1
     ) AS exists`,
    [contactId]
  );
  return result.rows[0]?.exists === true;
};
