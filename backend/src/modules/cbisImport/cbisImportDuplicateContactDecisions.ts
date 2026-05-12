import { promises as fs } from 'fs';
import { parseCsv } from './cbisImportBundle';

export type DuplicateContactDecisionValue = 'merge_to_anchor' | 'keep_held';

export interface DuplicateContactDecision {
  duplicate_name_key: string;
  held_cluster_id: string;
  held_contact_id: string;
  anchor_cluster_id: string;
  anchor_contact_id: string;
  decision: DuplicateContactDecisionValue;
  reviewer: string;
  evidence_summary: string;
}

const REQUIRED_COLUMNS = [
  'duplicate_name_key',
  'held_cluster_id',
  'held_contact_id',
  'anchor_cluster_id',
  'anchor_contact_id',
  'decision',
  'reviewer',
  'evidence_summary',
] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const contactRetargetKey = (heldContactId: string, anchorContactId: string): string =>
  `${heldContactId}\0${anchorContactId}`;

const requireUuid = (value: string, label: string): void => {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be a UUID: ${value}`);
  }
};

const normalizeDecisionRow = (
  row: Record<string, string>,
  rowNumber: number
): DuplicateContactDecision => {
  for (const column of REQUIRED_COLUMNS) {
    if (!(column in row)) {
      throw new Error(`Decision audit row ${rowNumber} is missing column ${column}`);
    }
    if (!row[column]?.trim()) {
      throw new Error(`Decision audit row ${rowNumber} has an empty ${column}`);
    }
  }

  const decision = row.decision.trim();
  if (decision !== 'merge_to_anchor' && decision !== 'keep_held') {
    throw new Error(`Decision audit row ${rowNumber} has invalid decision ${decision}`);
  }

  const heldContactId = row.held_contact_id.trim();
  const anchorContactId = row.anchor_contact_id.trim();
  requireUuid(heldContactId, `Decision audit row ${rowNumber} held_contact_id`);
  requireUuid(anchorContactId, `Decision audit row ${rowNumber} anchor_contact_id`);
  if (heldContactId === anchorContactId) {
    throw new Error(`Decision audit row ${rowNumber} cannot merge a contact into itself`);
  }

  return {
    duplicate_name_key: row.duplicate_name_key.trim(),
    held_cluster_id: row.held_cluster_id.trim(),
    held_contact_id: heldContactId,
    anchor_cluster_id: row.anchor_cluster_id.trim(),
    anchor_contact_id: anchorContactId,
    decision,
    reviewer: row.reviewer.trim(),
    evidence_summary: row.evidence_summary.trim(),
  };
};

export const parseDuplicateContactDecisions = (content: string): DuplicateContactDecision[] => {
  const rows = parseCsv(content);
  if (rows.length === 0) {
    throw new Error('Decision audit contains no rows');
  }

  const decisionsByHeldContact = new Map<string, DuplicateContactDecision>();
  rows.forEach((row, index) => {
    const decision = normalizeDecisionRow(row, index + 2);
    const existing = decisionsByHeldContact.get(decision.held_contact_id);
    if (!existing) {
      decisionsByHeldContact.set(decision.held_contact_id, decision);
      return;
    }

    if (
      existing.decision !== decision.decision ||
      existing.anchor_contact_id !== decision.anchor_contact_id ||
      existing.held_cluster_id !== decision.held_cluster_id ||
      existing.anchor_cluster_id !== decision.anchor_cluster_id
    ) {
      throw new Error(`Decision audit has conflicting duplicate rows for held contact ${decision.held_contact_id}`);
    }
  });

  return [...decisionsByHeldContact.values()];
};

export const loadDuplicateContactDecisions = async (
  decisionAuditPath: string
): Promise<DuplicateContactDecision[]> =>
  parseDuplicateContactDecisions(await fs.readFile(decisionAuditPath, 'utf8'));

export const buildAllowedContactRetargets = (
  decisions: DuplicateContactDecision[]
): Set<string> =>
  new Set(
    decisions
      .filter((decision) => decision.decision === 'merge_to_anchor')
      .map((decision) => contactRetargetKey(decision.held_contact_id, decision.anchor_contact_id))
  );
