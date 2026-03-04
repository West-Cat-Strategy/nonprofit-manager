import { Pool, PoolClient } from 'pg';
import type { CaseTimelineEvent } from '@app-types/case';

type PgExecutor = Pool | PoolClient;

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
  caseId: string
): Promise<{ case_id: string; contact_id: string; account_id: string | null } | null> => {
  const result = await db.query(
    `
    SELECT id AS case_id, contact_id, account_id
    FROM cases
    WHERE id = $1
    LIMIT 1
  `,
    [caseId]
  );

  return result.rows[0] || null;
};

export const requireCaseOwnership = async (
  db: PgExecutor,
  caseId: string
): Promise<{ case_id: string; contact_id: string; account_id: string | null }> => {
  const ownership = await getCaseOwnership(db, caseId);
  if (!ownership) {
    throw new Error('Case not found');
  }

  return ownership;
};

export const requireCaseIdForNote = async (db: PgExecutor, noteId: string): Promise<string> => {
  const result = await db.query(
    `
    SELECT case_id
    FROM case_notes
    WHERE id = $1
    LIMIT 1
  `,
    [noteId]
  );

  const caseId = result.rows[0]?.case_id as string | undefined;
  if (!caseId) {
    throw new Error('Case note not found');
  }
  return caseId;
};

export const requireCaseIdForOutcome = async (db: PgExecutor, outcomeId: string): Promise<string> => {
  const result = await db.query(
    `
    SELECT case_id
    FROM case_outcomes
    WHERE id = $1
    LIMIT 1
  `,
    [outcomeId]
  );

  const caseId = result.rows[0]?.case_id as string | undefined;
  if (!caseId) {
    throw new Error('Case outcome not found');
  }
  return caseId;
};

export const requireCaseIdForTopicEvent = async (db: PgExecutor, topicEventId: string): Promise<string> => {
  const result = await db.query(
    `
    SELECT case_id
    FROM case_topic_events
    WHERE id = $1
    LIMIT 1
  `,
    [topicEventId]
  );

  const caseId = result.rows[0]?.case_id as string | undefined;
  if (!caseId) {
    throw new Error('Case topic event not found');
  }
  return caseId;
};

export const requireCaseIdForDocument = async (db: PgExecutor, documentId: string): Promise<string> => {
  const result = await db.query(
    `
    SELECT case_id
    FROM case_documents
    WHERE id = $1
    LIMIT 1
  `,
    [documentId]
  );

  const caseId = result.rows[0]?.case_id as string | undefined;
  if (!caseId) {
    throw new Error('Case document not found');
  }
  return caseId;
};

export const generateCaseNumber = async (db: PgExecutor): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prefix = `CASE-${year}${month}${day}`;

  const result = await db.query(`SELECT COUNT(*) FROM cases WHERE case_number LIKE $1`, [`${prefix}-%`]);
  const seq = (parseInt(result.rows[0].count, 10) + 1).toString().padStart(5, '0');
  return `${prefix}-${seq}`;
};
