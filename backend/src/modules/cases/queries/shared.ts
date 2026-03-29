import { randomInt } from 'crypto';
import { Pool, PoolClient } from 'pg';
import type { CaseTimelineEvent } from '@app-types/case';
import { getRequestContext } from '@config/requestContext';

type PgExecutor = Pool | PoolClient;

const resolveOrganizationId = (organizationId?: string): string | undefined =>
  organizationId || getRequestContext()?.organizationId || getRequestContext()?.accountId || getRequestContext()?.tenantId;

export const DEFAULT_TIMELINE_LIMIT = 50;
export const MAX_TIMELINE_LIMIT = 200;

export const decodeTimelineCursor = (
  cursor?: string
): { createdAt: string; id: string } | null => {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as { createdAt?: string; id?: string };
    if (!parsed.createdAt || !parsed.id) {
      return null;
    }

    const timestamp = Date.parse(parsed.createdAt);
    if (Number.isNaN(timestamp)) {
      return null;
    }

    return {
      createdAt: new Date(timestamp).toISOString(),
      id: parsed.id,
    };
  } catch {
    return null;
  }
};

export const encodeTimelineCursor = (item: Pick<CaseTimelineEvent, 'id' | 'created_at'>): string => {
  const createdAtIso =
    item.created_at instanceof Date
      ? item.created_at.toISOString()
      : new Date(item.created_at).toISOString();
  return Buffer.from(JSON.stringify({ createdAt: createdAtIso, id: item.id }), 'utf8').toString(
    'base64url'
  );
};

export const normalizeCasePriority = (priority?: string | null): string | null | undefined => {
  if (priority === undefined) return undefined;
  if (priority === null) return null;
  if (priority === 'critical') return 'urgent';
  return priority;
};

export const normalizeCaseNoteType = (noteType?: string): string | undefined => {
  if (!noteType) return noteType;
  if (noteType === 'case_note') return 'note';
  return noteType;
};

export const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return undefined;
};

export const resolveVisibleToClient = (input: {
  visible_to_client?: unknown;
  is_portal_visible?: unknown;
  is_internal?: unknown;
}): boolean => {
  const explicitVisible = toBoolean(input.visible_to_client);
  if (explicitVisible !== undefined) return explicitVisible;

  const portalVisible = toBoolean(input.is_portal_visible);
  if (portalVisible !== undefined) return portalVisible;

  const isInternal = toBoolean(input.is_internal);
  if (isInternal !== undefined) return !isInternal;

  return false;
};

export const getCaseOwnership = async (
  db: PgExecutor,
  caseId: string,
  organizationId?: string
): Promise<{ case_id: string; contact_id: string; account_id: string | null } | null> => {
  const resolvedOrganizationId = resolveOrganizationId(organizationId);
  const result = await db.query(
    `
    SELECT c.id AS case_id, c.contact_id, c.account_id
    FROM cases c
    LEFT JOIN contacts con ON con.id = c.contact_id
    WHERE c.id = $1
      AND (
        $2::uuid IS NULL
        OR COALESCE(c.account_id, con.account_id) = $2::uuid
      )
    LIMIT 1
  `,
    [caseId, resolvedOrganizationId || null]
  );

  return result.rows[0] || null;
};

export const requireCaseOwnership = async (
  db: PgExecutor,
  caseId: string,
  organizationId?: string
): Promise<{ case_id: string; contact_id: string; account_id: string | null }> => {
  const ownership = await getCaseOwnership(db, caseId, organizationId);
  if (!ownership) {
    throw Object.assign(new Error('Case not found'), {
      statusCode: 404,
      code: 'not_found',
    });
  }

  return ownership;
};

export const requireCaseIdForNote = async (db: PgExecutor, noteId: string): Promise<string> => {
  const organizationId = resolveOrganizationId();
  const result = await db.query(
    `
    SELECT cn.case_id
    FROM case_notes cn
    INNER JOIN cases c ON c.id = cn.case_id
    LEFT JOIN contacts con ON con.id = c.contact_id
    WHERE cn.id = $1
      AND (
        $2::uuid IS NULL
        OR COALESCE(c.account_id, con.account_id) = $2::uuid
      )
    LIMIT 1
  `,
    [noteId, organizationId || null]
  );

  const caseId = result.rows[0]?.case_id as string | undefined;
  if (!caseId) {
    throw new Error('Case note not found');
  }
  return caseId;
};

export const requireCaseIdForOutcome = async (db: PgExecutor, outcomeId: string): Promise<string> => {
  const organizationId = resolveOrganizationId();
  const result = await db.query(
    `
    SELECT co.case_id
    FROM case_outcomes co
    INNER JOIN cases c ON c.id = co.case_id
    LEFT JOIN contacts con ON con.id = c.contact_id
    WHERE co.id = $1
      AND (
        $2::uuid IS NULL
        OR COALESCE(c.account_id, con.account_id) = $2::uuid
      )
    LIMIT 1
  `,
    [outcomeId, organizationId || null]
  );

  const caseId = result.rows[0]?.case_id as string | undefined;
  if (!caseId) {
    throw new Error('Case outcome not found');
  }
  return caseId;
};

export const requireCaseIdForTopicEvent = async (db: PgExecutor, topicEventId: string): Promise<string> => {
  const organizationId = resolveOrganizationId();
  const result = await db.query(
    `
    SELECT cte.case_id
    FROM case_topic_events cte
    INNER JOIN cases c ON c.id = cte.case_id
    LEFT JOIN contacts con ON con.id = c.contact_id
    WHERE cte.id = $1
      AND (
        $2::uuid IS NULL
        OR COALESCE(c.account_id, con.account_id) = $2::uuid
      )
    LIMIT 1
  `,
    [topicEventId, organizationId || null]
  );

  const caseId = result.rows[0]?.case_id as string | undefined;
  if (!caseId) {
    throw new Error('Case topic event not found');
  }
  return caseId;
};

export const requireCaseIdForDocument = async (db: PgExecutor, documentId: string): Promise<string> => {
  const organizationId = resolveOrganizationId();
  const result = await db.query(
    `
    SELECT cd.case_id
    FROM case_documents cd
    INNER JOIN cases c ON c.id = cd.case_id
    LEFT JOIN contacts con ON con.id = c.contact_id
    WHERE cd.id = $1
      AND (
        $2::uuid IS NULL
        OR COALESCE(c.account_id, con.account_id) = $2::uuid
      )
    LIMIT 1
  `,
    [documentId, organizationId || null]
  );

  const caseId = result.rows[0]?.case_id as string | undefined;
  if (!caseId) {
    throw new Error('Case document not found');
  }
  return caseId;
};

export const generateCaseNumber = async (db: PgExecutor): Promise<string> => {
  void db;
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prefix = `CASE-${year}${month}${day}`;
  const timestampPart = String(Date.now()).slice(-6);
  const randomPart = String(randomInt(0, 100)).padStart(2, '0');
  return `${prefix}-${timestampPart}${randomPart}`;
};
