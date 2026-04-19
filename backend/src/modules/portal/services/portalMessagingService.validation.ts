import { resolvePortalCaseSelection, ensureCaseIsPortalAccessible } from '@services/portalPointpersonService';
import type { PortalThreadSummary } from './portalMessagingService.types';
import type { PoolClient } from 'pg';

export const resolveCaseForPortalMessage = async (
  contactId: string,
  caseId: string | null | undefined
) => resolvePortalCaseSelection(contactId, caseId);

export const ensurePortalCaseMessageable = async (
  contactId: string,
  caseId: string
): Promise<void> => {
  const context = await ensureCaseIsPortalAccessible(contactId, caseId);
  if (!context) {
    throw new Error('Case not found for portal contact');
  }
  if (!context.is_messageable) {
    throw new Error('Selected case does not have an assigned pointperson');
  }
};

export const ensureThreadForPortal = async (
  client: { query: PoolClient['query'] },
  portalUserId: string,
  threadId: string
): Promise<PortalThreadSummary> => {
  const result = await client.query(
    `SELECT
         t.id,
         t.contact_id,
         t.case_id,
         t.portal_user_id,
         t.pointperson_user_id,
         t.subject,
         t.status,
         t.last_message_at,
         t.last_message_preview,
         t.created_at,
         t.updated_at,
         t.closed_at,
         t.closed_by,
         c.case_number,
         c.title AS case_title,
         u.first_name AS pointperson_first_name,
         u.last_name AS pointperson_last_name,
         u.email AS pointperson_email,
         pu.email AS portal_email
       FROM portal_threads t
       LEFT JOIN cases c ON c.id = t.case_id
       LEFT JOIN users u ON u.id = t.pointperson_user_id
       LEFT JOIN portal_users pu ON pu.id = t.portal_user_id
       WHERE t.id = $1 AND t.portal_user_id = $2`,
    [threadId, portalUserId]
  );

  if (!result.rows[0]) {
    throw new Error('Thread not found');
  }

  return {
    ...(result.rows[0] as PortalThreadSummary),
    unread_count: 0,
  };
};
