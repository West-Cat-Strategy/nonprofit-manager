import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import {
  type DuplicateContactDecision,
} from '@modules/cbisImport/cbisImportDuplicateContactDecisions';

interface QueryablePool {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

interface ValidationSummary {
  anchor_contact_id_by_held_contact_id: Map<string, string>;
}

export interface EmptySamePersonMergeCandidate {
  contact_id: string;
  duplicate_name_key: string;
  anchor_contact_id: string;
  is_active: boolean;
  source_link_count: number;
  anchor_evidence_score: number;
  evidence_summary: string;
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const csvEscape = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value);
  if (!/[",\n\r]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
};

const writeCsv = async (path: string, rows: Array<Record<string, unknown>>): Promise<void> => {
  const columns = rows[0] ? Object.keys(rows[0]) : ['candidate_kind', 'candidate_count'];
  const lines = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
  ];
  await fs.writeFile(path, `${lines.join('\n')}\n`, 'utf8');
};

const toNumber = (value: string | number | null | undefined): number => Number(value ?? 0);

export const loadEmptySamePersonMergeCandidates = async (
  db: QueryablePool,
  organizationId: string,
  mergeDecisions: DuplicateContactDecision[],
  keepHeldDecisions: DuplicateContactDecision[],
  validation: ValidationSummary,
  includeInactiveSources: boolean
): Promise<EmptySamePersonMergeCandidate[]> => {
  const keepHeldNames = new Set(keepHeldDecisions.map((decision) => decision.duplicate_name_key));
  const excludedContactIds = [
    ...new Set([
      ...mergeDecisions.map((decision) => decision.held_contact_id),
      ...mergeDecisions.map((decision) => decision.anchor_contact_id),
      ...keepHeldDecisions.map((decision) => decision.held_contact_id),
      ...keepHeldDecisions.map((decision) => decision.anchor_contact_id),
      ...validation.anchor_contact_id_by_held_contact_id.values(),
    ]),
  ];

  const result = await db.query<
    Omit<EmptySamePersonMergeCandidate, 'source_link_count' | 'anchor_evidence_score'> & {
      source_link_count: string | number;
      anchor_evidence_score: string | number;
    }
  >(
    `
      WITH contact_metrics AS (
        SELECT
          c.id,
          c.account_id,
          c.is_active,
          c.first_name,
          c.last_name,
          c.birth_date,
          c.email,
          c.phone,
          c.mobile_phone,
          c.phn_encrypted,
          c.preferred_name,
          c.middle_name,
          c.salutation,
          c.suffix,
          c.gender,
          c.pronouns,
          c.job_title,
          c.department,
          c.address_line1,
          c.address_line2,
          c.city,
          c.state_province,
          c.postal_code,
          c.notes,
          c.do_not_email,
          c.do_not_phone,
          c.do_not_text,
          c.do_not_voicemail,
          c.no_fixed_address,
          c.tags,
          btrim(lower(regexp_replace(coalesce(c.first_name, ''), '[^[:alnum:] ]+', ' ', 'g'))) AS normalized_first_name,
          btrim(lower(regexp_replace(regexp_replace(coalesce(c.last_name, ''), '[^[:alnum:] ]+', ' ', 'g'), '\\s+', ' ', 'g'))) AS normalized_last_name,
          regexp_replace(coalesce(nullif(c.phone, ''), nullif(c.mobile_phone, ''), ''), '\\D', '', 'g') AS normalized_phone,
          (
            (SELECT COUNT(*) FROM contact_notes cn WHERE cn.contact_id = c.id)
            + (SELECT COUNT(*) FROM contact_documents cd WHERE cd.contact_id = c.id)
            + (SELECT COUNT(*) FROM cases ca WHERE ca.contact_id = c.id)
            + (SELECT COUNT(*) FROM event_registrations er WHERE er.contact_id = c.id)
            + (SELECT COUNT(*) FROM volunteers v WHERE v.contact_id = c.id)
            + (SELECT COUNT(*) FROM donations d WHERE d.contact_id = c.id)
            + (SELECT COUNT(*) FROM opportunities o WHERE o.contact_id = c.id)
            + (SELECT COUNT(*) FROM recurring_donation_plans rdp WHERE rdp.contact_id = c.id)
            + (SELECT COUNT(*) FROM contact_role_assignments cra WHERE cra.contact_id = c.id)
            + (SELECT COUNT(*) FROM contact_email_addresses cea WHERE cea.contact_id = c.id)
            + (SELECT COUNT(*) FROM contact_phone_numbers cpn WHERE cpn.contact_id = c.id)
            + (SELECT COUNT(*) FROM contact_relationships cr WHERE cr.contact_id = c.id OR cr.related_contact_id = c.id)
            + (SELECT COUNT(*) FROM activities a WHERE a.regarding_type = 'contact' AND a.regarding_id = c.id)
            + (SELECT COUNT(*) FROM activity_events ae WHERE (ae.entity_type = 'contact' AND ae.entity_id = c.id) OR (ae.related_entity_type = 'contact' AND ae.related_entity_id = c.id))
            + (SELECT COUNT(*) FROM follow_ups fu WHERE fu.entity_type = 'contact' AND fu.entity_id = c.id)
            + (SELECT COUNT(*) FROM website_public_action_submissions wpas WHERE wpas.contact_id = c.id OR (wpas.source_entity_type = 'contact' AND wpas.source_entity_id = c.id))
            + (SELECT COUNT(*) FROM website_public_pledges wpp WHERE wpp.contact_id = c.id)
            + (SELECT COUNT(*) FROM website_support_letters wsl WHERE wsl.contact_id = c.id)
          ) AS link_count,
          (
            SELECT COUNT(*)
            FROM cbis_import_target_provenance p
            WHERE p.organization_id = $1::uuid
              AND p.target_entity_type IN ('contacts', 'contact')
              AND p.target_entity_id = c.id
          ) AS provenance_count
        FROM contacts c
      ),
      possible_sources AS (
        SELECT *
        FROM contact_metrics
        WHERE normalized_first_name <> ''
          AND normalized_last_name <> ''
          AND account_id IS NULL
          AND ($4::boolean OR is_active = true)
          AND id <> ALL($2::uuid[])
          AND concat_ws(' ', normalized_first_name, normalized_last_name) <> ALL($3::text[])
          AND link_count = 0
          AND coalesce(nullif(email, ''), '') = ''
          AND coalesce(normalized_phone, '') = ''
          AND birth_date IS NULL
          AND phn_encrypted IS NULL
          AND coalesce(nullif(preferred_name, ''), '') = ''
          AND coalesce(nullif(middle_name, ''), '') = ''
          AND coalesce(nullif(salutation, ''), '') = ''
          AND coalesce(nullif(suffix, ''), '') = ''
          AND coalesce(nullif(gender, ''), '') = ''
          AND coalesce(nullif(pronouns, ''), '') = ''
          AND coalesce(nullif(job_title, ''), '') = ''
          AND coalesce(nullif(department, ''), '') = ''
          AND coalesce(nullif(address_line1, ''), '') = ''
          AND coalesce(nullif(address_line2, ''), '') = ''
          AND coalesce(nullif(city, ''), '') = ''
          AND coalesce(nullif(state_province, ''), '') = ''
          AND coalesce(nullif(postal_code, ''), '') = ''
          AND coalesce(nullif(notes, ''), '') = ''
          AND coalesce(do_not_email, false) = false
          AND coalesce(do_not_phone, false) = false
          AND coalesce(do_not_text, false) = false
          AND coalesce(do_not_voicemail, false) = false
          AND coalesce(no_fixed_address, false) = false
          AND coalesce(array_length(tags, 1), 0) = 0
      ),
      anchor_candidates AS (
        SELECT
          source.id AS source_id,
          anchor.id AS anchor_id,
          source.is_active AS source_is_active,
          concat_ws(' ', source.normalized_first_name, source.normalized_last_name) AS duplicate_name_key,
          source.link_count AS source_link_count,
          (
            CASE WHEN coalesce(nullif(anchor.email, ''), '') <> '' THEN 4 ELSE 0 END
            + CASE WHEN coalesce(anchor.normalized_phone, '') <> '' THEN 3 ELSE 0 END
            + CASE WHEN anchor.birth_date IS NOT NULL THEN 3 ELSE 0 END
            + CASE WHEN anchor.phn_encrypted IS NOT NULL THEN 4 ELSE 0 END
            + CASE WHEN anchor.provenance_count > 0 THEN 2 ELSE 0 END
            + CASE WHEN anchor.link_count > 0 THEN 1 ELSE 0 END
          ) AS anchor_evidence_score,
          concat_ws(
            '|',
            CASE WHEN coalesce(nullif(anchor.email, ''), '') <> '' THEN 'anchor_email' END,
            CASE WHEN coalesce(anchor.normalized_phone, '') <> '' THEN 'anchor_phone' END,
            CASE WHEN anchor.birth_date IS NOT NULL THEN 'anchor_birth_date' END,
            CASE WHEN anchor.phn_encrypted IS NOT NULL THEN 'anchor_phn' END,
            CASE WHEN anchor.provenance_count > 0 THEN 'anchor_cbis_provenance' END,
            CASE WHEN anchor.link_count > 0 THEN 'anchor_linked_records' END
          ) AS evidence_summary,
          COUNT(*) OVER (PARTITION BY source.id) AS candidate_count
        FROM possible_sources source
        JOIN contact_metrics anchor
          ON anchor.normalized_first_name = source.normalized_first_name
         AND anchor.normalized_last_name = source.normalized_last_name
         AND anchor.id <> source.id
         AND anchor.is_active = true
         AND anchor.id <> ALL($2::uuid[])
        WHERE (
          CASE WHEN coalesce(nullif(anchor.email, ''), '') <> '' THEN 4 ELSE 0 END
          + CASE WHEN coalesce(anchor.normalized_phone, '') <> '' THEN 3 ELSE 0 END
          + CASE WHEN anchor.birth_date IS NOT NULL THEN 3 ELSE 0 END
          + CASE WHEN anchor.phn_encrypted IS NOT NULL THEN 4 ELSE 0 END
          + CASE WHEN anchor.provenance_count > 0 THEN 2 ELSE 0 END
          + CASE WHEN anchor.link_count > 0 THEN 1 ELSE 0 END
        ) > 0
      )
      SELECT
        source_id::text AS contact_id,
        duplicate_name_key,
        anchor_id::text AS anchor_contact_id,
        source_is_active AS is_active,
        source_link_count,
        anchor_evidence_score,
        evidence_summary
      FROM anchor_candidates
      WHERE candidate_count = 1
      ORDER BY duplicate_name_key, source_id
    `,
    [organizationId, excludedContactIds, [...keepHeldNames], includeInactiveSources]
  );

  return result.rows.map((row) => ({
    ...row,
    source_link_count: toNumber(row.source_link_count),
    anchor_evidence_score: toNumber(row.anchor_evidence_score),
  }));
};

export const writeEmptyContactAudit = async (
  path: string | undefined,
  candidates: EmptySamePersonMergeCandidate[],
  expectedBundleFingerprint: string
): Promise<void> => {
  if (!path) {
    return;
  }
  const salt = expectedBundleFingerprint;
  await writeCsv(
    path,
    candidates.map((candidate) => ({
      candidate_kind: 'empty_same_person',
      source_contact_ref: sha256(`${candidate.contact_id}:${salt}`),
      survivor_contact_ref: sha256(`${candidate.anchor_contact_id}:${salt}`),
      duplicate_name_ref: sha256(`${candidate.duplicate_name_key}:${salt}`),
      source_is_active: candidate.is_active,
      source_link_count: candidate.source_link_count,
      survivor_evidence_score: candidate.anchor_evidence_score,
      evidence_summary: candidate.evidence_summary,
    }))
  );
};
