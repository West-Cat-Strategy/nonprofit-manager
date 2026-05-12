import {
  type DuplicateContactDecision,
} from '@modules/cbisImport/cbisImportDuplicateContactDecisions';
import { normalizeText } from '@modules/cbisImport/cbisImportRowUtils';

interface QueryablePool {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

interface ValidationSummary {
  anchor_contact_id_by_held_contact_id: Map<string, string>;
}

export interface LegacyProductionMergeCandidate {
  contact_id: string;
  duplicate_name_key: string;
  anchor_contact_id: string;
}

const duplicateNameParts = (duplicateNameKey: string): { firstName: string; lastName: string } | null => {
  const normalized = normalizeText(duplicateNameKey);
  if (!normalized) {
    return null;
  }
  const [firstName, ...lastNameParts] = normalized.split(' ');
  const lastName = lastNameParts.join(' ').trim();
  if (!firstName || !lastName) {
    return null;
  }
  return { firstName, lastName };
};

const resolveAnchorsByDuplicateName = (
  mergeDecisions: DuplicateContactDecision[],
  validation: ValidationSummary
): Map<string, string> => {
  const anchorsByName = new Map<string, string>();
  for (const decision of mergeDecisions) {
    const anchorContactId =
      validation.anchor_contact_id_by_held_contact_id.get(decision.held_contact_id) ?? decision.anchor_contact_id;
    const existing = anchorsByName.get(decision.duplicate_name_key);
    if (existing && existing !== anchorContactId) {
      throw new Error(`Duplicate name ${decision.duplicate_name_key} resolves to multiple anchors`);
    }
    anchorsByName.set(decision.duplicate_name_key, anchorContactId);
  }
  return anchorsByName;
};

export const loadLegacyProductionMergeCandidates = async (
  db: QueryablePool,
  organizationId: string,
  mergeDecisions: DuplicateContactDecision[],
  keepHeldDecisions: DuplicateContactDecision[],
  validation: ValidationSummary
): Promise<LegacyProductionMergeCandidate[]> => {
  const anchorsByName = resolveAnchorsByDuplicateName(mergeDecisions, validation);
  const keepHeldNames = new Set(keepHeldDecisions.map((decision) => decision.duplicate_name_key));
  const mergeNames = [...anchorsByName.entries()].flatMap(([duplicateNameKey, anchorContactId]) => {
    if (keepHeldNames.has(duplicateNameKey)) {
      return [];
    }
    const parts = duplicateNameParts(duplicateNameKey);
    return parts
      ? [
          {
            duplicate_name_key: duplicateNameKey,
            first_name: parts.firstName,
            last_name: parts.lastName,
            anchor_contact_id: anchorContactId,
          },
        ]
      : [];
  });

  if (mergeNames.length === 0) {
    return [];
  }

  const excludedContactIds = [
    ...new Set([
      ...mergeDecisions.map((decision) => decision.held_contact_id),
      ...mergeDecisions.map((decision) => decision.anchor_contact_id),
      ...keepHeldDecisions.map((decision) => decision.held_contact_id),
      ...keepHeldDecisions.map((decision) => decision.anchor_contact_id),
      ...validation.anchor_contact_id_by_held_contact_id.values(),
    ]),
  ];

  const result = await db.query<LegacyProductionMergeCandidate>(
    `
      WITH merge_names AS (
        SELECT *
        FROM jsonb_to_recordset($2::jsonb) AS x(
          duplicate_name_key text,
          first_name text,
          last_name text,
          anchor_contact_id uuid
        )
      )
      SELECT
        c.id::text AS contact_id,
        mn.duplicate_name_key,
        mn.anchor_contact_id::text
      FROM merge_names mn
      JOIN contacts c
        ON btrim(lower(regexp_replace(coalesce(c.first_name, ''), '[^[:alnum:] ]+', ' ', 'g'))) = mn.first_name
       AND (
         btrim(lower(regexp_replace(regexp_replace(coalesce(c.last_name, ''), '[^[:alnum:] ]+', ' ', 'g'), '\\s+', ' ', 'g'))) = mn.last_name
         OR btrim(lower(regexp_replace(regexp_replace(coalesce(c.last_name, ''), '[^[:alnum:] ]+', ' ', 'g'), '\\s+', ' ', 'g'))) LIKE mn.last_name || ' %'
         OR btrim(lower(regexp_replace(regexp_replace(coalesce(c.last_name, ''), '[^[:alnum:] ]+', ' ', 'g'), '\\s+', ' ', 'g'))) LIKE '% ' || mn.last_name
       )
      LEFT JOIN cbis_import_target_provenance p
        ON p.organization_id = $1::uuid
       AND p.target_entity_type = 'contacts'
       AND p.target_entity_id = c.id
      WHERE c.is_active = true
        AND c.account_id IS NULL
        AND c.id <> mn.anchor_contact_id
        AND c.id <> ALL($3::uuid[])
        AND p.id IS NULL
      GROUP BY c.id, mn.duplicate_name_key, mn.anchor_contact_id
      ORDER BY mn.duplicate_name_key, c.updated_at DESC, c.id ASC
    `,
    [organizationId, JSON.stringify(mergeNames), excludedContactIds]
  );

  return result.rows;
};
