import { rawPool } from '@config/database';
import { loadCbisImportBundle, type CbisImportRow } from '@modules/cbisImport';
import {
  loadDuplicateContactDecisions,
  type DuplicateContactDecision,
} from '@modules/cbisImport/cbisImportDuplicateContactDecisions';
import { normalizePhone, normalizeText } from '@modules/cbisImport/cbisImportRowUtils';
import { getMergeableResolutionFieldNames } from '@modules/contacts/shared/contactMerge';
import { ContactMergeService } from '@modules/contacts/services/contactMergeService';
import type { ContactMergeRequest, ContactMergeResult } from '@app-types/contact';

type MergeMode = 'dry-run' | 'apply';

interface CliOptions {
  decisionAudit?: string;
  organizationId?: string;
  actorId?: string;
  expectedBundleFingerprint?: string;
  expectedSchemaVersion?: string;
  mode?: MergeMode;
  bundleDir?: string;
}

interface RunOptions {
  decisionAudit: string;
  organizationId: string;
  actorId: string;
  expectedBundleFingerprint: string;
  expectedSchemaVersion: string;
  mode: MergeMode;
  bundleDir?: string;
}

interface QueryablePool {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

interface MergeService {
  mergeContacts(
    contactId: string,
    payload: ContactMergeRequest,
    userId: string,
    viewerRole?: string
  ): Promise<ContactMergeResult | null>;
}

interface ContactState {
  id: string;
  is_active: boolean;
  account_id: string | null;
}

interface AnchorCandidate extends ContactState {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  birth_date: string | Date | null;
  phone: string | null;
  mobile_phone: string | null;
  link_count: string | number;
}

interface ImportApplyProof {
  run_id: string;
  contact_provenance_rows: number;
}

interface ValidationSummary {
  merge_active_contact_ids: string[];
  merge_inactive_contact_ids: string[];
  keep_held_contact_ids: string[];
  anchor_contact_id_by_held_contact_id: Map<string, string>;
  resolved_missing_anchors: number;
}

export interface MergeDuplicateContactsResult {
  mode: MergeMode;
  import_run_id: string;
  bundle_fingerprint: string;
  schema_bundle_version: string;
  contact_provenance_rows: number;
  decisions: {
    total: number;
    merge_to_anchor: number;
    keep_held: number;
    unique_merge_anchors: number;
  };
  validation: {
    active_merge_candidates: number;
    inactive_held_skips: number;
    keep_held_contacts: number;
    resolved_missing_anchors: number;
  };
  applied_merges: number;
  provenance_retargets: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (!arg.startsWith('--')) {
      continue;
    }

    const readValue = (): string => {
      if (!next || next.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return next;
    };

    if (arg === '--decision-audit') {
      options.decisionAudit = readValue();
    } else if (arg === '--organization-id') {
      options.organizationId = readValue();
    } else if (arg === '--actor-id') {
      options.actorId = readValue();
    } else if (arg === '--expected-bundle-fingerprint') {
      options.expectedBundleFingerprint = readValue();
    } else if (arg === '--expected-schema-version') {
      options.expectedSchemaVersion = readValue();
    } else if (arg === '--mode') {
      const mode = readValue();
      if (mode !== 'dry-run' && mode !== 'apply') {
        throw new Error('--mode must be dry-run or apply');
      }
      options.mode = mode;
    } else if (arg === '--bundle') {
      options.bundleDir = readValue();
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return options;
};

const requireOption = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required option ${name}`);
  }
  return value;
};

const requireUuid = (value: string, label: string): void => {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be a UUID: ${value}`);
  }
};

export { loadDuplicateContactDecisions };

const findImportApplyProof = async (
  db: QueryablePool,
  organizationId: string,
  expectedBundleFingerprint: string,
  expectedSchemaVersion: string
): Promise<ImportApplyProof> => {
  const runResult = await db.query<{ id: string }>(
    `
      SELECT id::text
      FROM cbis_import_runs
      WHERE organization_id = $1::uuid
        AND bundle_fingerprint = $2
        AND schema_bundle_version = $3
        AND mode = 'apply'
        AND status = 'succeeded'
      ORDER BY completed_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `,
    [organizationId, expectedBundleFingerprint, expectedSchemaVersion]
  );
  const runId = runResult.rows[0]?.id;
  if (!runId) {
    throw new Error('No successful apply run exists for the exact expected bundle fingerprint and schema version');
  }

  const provenanceResult = await db.query<{ count: string | number }>(
    `
      SELECT COUNT(*) AS count
      FROM cbis_import_target_provenance
      WHERE organization_id = $1::uuid
        AND bundle_fingerprint = $2
        AND schema_bundle_version = $3
        AND target_entity_type = 'contacts'
    `,
    [organizationId, expectedBundleFingerprint, expectedSchemaVersion]
  );
  const contactProvenanceRows = Number(provenanceResult.rows[0]?.count ?? 0);
  if (contactProvenanceRows <= 0) {
    throw new Error('Exact successful apply run has no contact provenance rows');
  }

  return {
    run_id: runId,
    contact_provenance_rows: contactProvenanceRows,
  };
};

const loadContactStates = async (
  db: QueryablePool,
  contactIds: string[]
): Promise<Map<string, ContactState>> => {
  const uniqueIds = [...new Set(contactIds)];
  const result = await db.query<ContactState>(
    `
      SELECT id::text, is_active, account_id::text
      FROM contacts
      WHERE id = ANY($1::uuid[])
    `,
    [uniqueIds]
  );
  return new Map(result.rows.map((row) => [row.id, row]));
};

const compact = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const loadBundleContactRows = async (
  bundleDir: string | undefined,
  expectedBundleFingerprint: string,
  expectedSchemaVersion: string
): Promise<Map<string, CbisImportRow>> => {
  if (!bundleDir) {
    return new Map();
  }
  const bundle = await loadCbisImportBundle(bundleDir);
  if (bundle.fingerprint !== expectedBundleFingerprint) {
    throw new Error(`Bundle fingerprint mismatch: expected ${expectedBundleFingerprint}, got ${bundle.fingerprint}`);
  }
  const schemaVersion = bundle.schemaBundle.version ?? bundle.summary.schema_bundle_version ?? 'unknown';
  if (schemaVersion !== expectedSchemaVersion) {
    throw new Error(`Bundle schema mismatch: expected ${expectedSchemaVersion}, got ${schemaVersion}`);
  }
  return new Map(bundle.entities.contacts.map((row) => [row.contact_id, row]));
};

const querySingleAnchorCandidate = async (
  db: QueryablePool,
  sql: string,
  params: unknown[],
  label: string
): Promise<ContactState | null> => {
  const result = await db.query<ContactState>(sql, params);
  if (result.rows.length > 1) {
    throw new Error(`Multiple active contacts match missing anchor by ${label}`);
  }
  return result.rows[0] ?? null;
};

const candidateIdentitySelect = `
  SELECT
    c.id::text,
    c.is_active,
    c.account_id::text,
    c.first_name,
    c.middle_name,
    c.last_name,
    c.birth_date,
    c.phone,
    c.mobile_phone,
    (
      (SELECT COUNT(*) FROM contact_notes cn WHERE cn.contact_id = c.id)
      + (SELECT COUNT(*) FROM cases ca WHERE ca.contact_id = c.id)
      + (SELECT COUNT(*) FROM event_registrations er WHERE er.contact_id = c.id)
      + (SELECT COUNT(*) FROM contact_role_assignments cra WHERE cra.contact_id = c.id)
      + (SELECT COUNT(*) FROM contact_email_addresses cea WHERE cea.contact_id = c.id)
      + (SELECT COUNT(*) FROM contact_phone_numbers cpn WHERE cpn.contact_id = c.id)
      + (SELECT COUNT(*) FROM contact_relationships cr WHERE cr.contact_id = c.id OR cr.related_contact_id = c.id)
      + (SELECT COUNT(*) FROM activities a WHERE a.regarding_type = 'contact' AND a.regarding_id = c.id)
    ) AS link_count
  FROM contacts c
`;

const normalizedCandidateName = (value: string | null | undefined): string | null =>
  normalizeText(value ?? null);

const candidateMatchesAnchorName = (
  candidate: AnchorCandidate,
  anchorRow: CbisImportRow
): boolean => {
  const firstName = normalizeText(compact(anchorRow.first_name));
  const middleName = normalizeText(compact(anchorRow.middle_name));
  const lastName = normalizeText(compact(anchorRow.last_name));
  if (!firstName || !lastName) {
    return false;
  }

  const candidateFirstName = normalizedCandidateName(candidate.first_name);
  const candidateLastName = normalizedCandidateName(candidate.last_name);
  if (candidateFirstName !== firstName || !candidateLastName) {
    return false;
  }

  if (candidateLastName === lastName) {
    return true;
  }

  return Boolean(middleName && candidateLastName === `${middleName} ${lastName}`);
};

const candidateBirthDate = (candidate: AnchorCandidate): string | null => {
  if (!candidate.birth_date) {
    return null;
  }
  return candidate.birth_date instanceof Date
    ? candidate.birth_date.toISOString().slice(0, 10)
    : String(candidate.birth_date).slice(0, 10);
};

const candidateMatchesAnchorBirthDate = (
  candidate: AnchorCandidate,
  anchorRow: CbisImportRow
): boolean => {
  const birthDate = compact(anchorRow.birth_date);
  return Boolean(birthDate && candidateBirthDate(candidate) === birthDate);
};

const candidateMatchesAnchorPhone = (
  candidate: AnchorCandidate,
  anchorRow: CbisImportRow
): boolean => {
  const anchorPhone = normalizePhone(compact(anchorRow.phone) ?? compact(anchorRow.mobile_phone));
  const candidatePhone = normalizePhone(candidate.phone ?? candidate.mobile_phone);
  return Boolean(anchorPhone && candidatePhone === anchorPhone);
};

const pickRichestCandidate = (
  candidates: AnchorCandidate[],
  label: string
): AnchorCandidate | null => {
  if (candidates.length === 0) {
    return null;
  }
  const sorted = [...candidates].sort((left, right) => {
    const rightLinks = Number(right.link_count ?? 0);
    const leftLinks = Number(left.link_count ?? 0);
    if (rightLinks !== leftLinks) {
      return rightLinks - leftLinks;
    }
    return left.id.localeCompare(right.id);
  });
  const top = sorted[0];
  const second = sorted[1];
  if (second && Number(second.link_count ?? 0) === Number(top.link_count ?? 0)) {
    throw new Error(`Multiple active contacts match missing anchor by ${label}`);
  }
  return top;
};

const queryEmailAnchorCandidates = async (
  db: QueryablePool,
  email: string
): Promise<AnchorCandidate[]> => {
  const result = await db.query<AnchorCandidate>(
    `
      ${candidateIdentitySelect}
      WHERE c.is_active = true
        AND lower(c.email) = $1
      ORDER BY c.created_at ASC, c.id ASC
    `,
    [email]
  );
  return result.rows;
};

const resolveEmailAnchorCandidate = async (
  db: QueryablePool,
  anchorRow: CbisImportRow,
  email: string
): Promise<AnchorCandidate | null> => {
  const candidates = await queryEmailAnchorCandidates(db, email);
  if (candidates.length <= 1) {
    return candidates[0] ?? null;
  }

  const nameMatches = candidates.filter((candidate) => candidateMatchesAnchorName(candidate, anchorRow));
  const birthDateMatches = nameMatches.filter((candidate) =>
    candidateMatchesAnchorBirthDate(candidate, anchorRow)
  );
  const birthDateMatch = pickRichestCandidate(birthDateMatches, `email/name/birth date ${email}`);
  if (birthDateMatch) {
    return birthDateMatch;
  }

  const phoneMatches = nameMatches.filter((candidate) => candidateMatchesAnchorPhone(candidate, anchorRow));
  const phoneMatch = pickRichestCandidate(phoneMatches, `email/name/phone ${email}`);
  if (phoneMatch) {
    return phoneMatch;
  }

  const nameMatch = pickRichestCandidate(nameMatches, `email/name ${email}`);
  if (nameMatch) {
    return nameMatch;
  }

  return pickRichestCandidate(candidates, `email ${email}`);
};

const resolveMissingAnchor = async (
  db: QueryablePool,
  anchorRow: CbisImportRow | undefined
): Promise<ContactState | null> => {
  if (!anchorRow) {
    return null;
  }

  const email = normalizeText(compact(anchorRow.email));
  if (email) {
    const byEmail = await resolveEmailAnchorCandidate(db, anchorRow, email);
    if (byEmail) {
      return byEmail;
    }
  }

  const firstName = normalizeText(compact(anchorRow.first_name));
  const lastName = normalizeText(compact(anchorRow.last_name));
  const birthDate = compact(anchorRow.birth_date);
  if (firstName && lastName && birthDate) {
    const byBirthDate = await querySingleAnchorCandidate(
      db,
      `
        SELECT id::text, is_active, account_id::text
        FROM contacts
        WHERE is_active = true
          AND lower(first_name) = $1
          AND lower(last_name) = $2
          AND birth_date = $3::date
        ORDER BY created_at ASC, id ASC
      `,
      [firstName, lastName, birthDate],
      `name and birth date ${firstName} ${lastName}`
    );
    if (byBirthDate) {
      return byBirthDate;
    }
  }

  const phone = normalizePhone(compact(anchorRow.phone) ?? compact(anchorRow.mobile_phone));
  if (firstName && lastName && phone) {
    return querySingleAnchorCandidate(
      db,
      `
        SELECT id::text, is_active, account_id::text
        FROM contacts
        WHERE is_active = true
          AND lower(first_name) = $1
          AND lower(last_name) = $2
          AND regexp_replace(coalesce(nullif(phone, ''), nullif(mobile_phone, ''), ''), '\\D', '', 'g') = $3
        ORDER BY created_at ASC, id ASC
      `,
      [firstName, lastName, phone],
      `name and phone ${firstName} ${lastName}`
    );
  }

  return null;
};

const assertValidContactStates = async (
  db: QueryablePool,
  decisions: DuplicateContactDecision[],
  anchorRows: Map<string, CbisImportRow>
): Promise<ValidationSummary> => {
  const contactStates = await loadContactStates(
    db,
    decisions.flatMap((decision) => [decision.held_contact_id, decision.anchor_contact_id])
  );
  const issues: string[] = [];
  const mergeActiveContactIds: string[] = [];
  const mergeInactiveContactIds: string[] = [];
  const keepHeldContactIds: string[] = [];
  const anchorContactIdByHeldContactId = new Map<string, string>();
  let resolvedMissingAnchors = 0;

  for (const decision of decisions) {
    const held = contactStates.get(decision.held_contact_id);
    let anchor = contactStates.get(decision.anchor_contact_id) ?? null;
    if (!held) {
      issues.push(`missing held contact ${decision.held_contact_id} (${decision.duplicate_name_key})`);
      continue;
    }
    if (!anchor) {
      try {
        anchor = await resolveMissingAnchor(db, anchorRows.get(decision.anchor_contact_id));
      } catch (error) {
        issues.push(
          `${error instanceof Error ? error.message : String(error)} (${decision.duplicate_name_key})`
        );
        continue;
      }
      if (!anchor) {
        issues.push(`missing anchor contact ${decision.anchor_contact_id} (${decision.duplicate_name_key})`);
        continue;
      }
      resolvedMissingAnchors += 1;
    }
    anchorContactIdByHeldContactId.set(decision.held_contact_id, anchor.id);
    if (!anchor.is_active) {
      issues.push(`inactive anchor contact ${anchor.id} (${decision.duplicate_name_key})`);
    }

    if (decision.decision === 'keep_held') {
      if (!held.is_active) {
        issues.push(`keep-held contact is inactive ${decision.held_contact_id} (${decision.duplicate_name_key})`);
      }
      keepHeldContactIds.push(decision.held_contact_id);
      continue;
    }

    if (held.account_id && anchor.account_id && held.account_id !== anchor.account_id) {
      issues.push(`account mismatch for held ${decision.held_contact_id} and anchor ${decision.anchor_contact_id}`);
    }
    if (held.is_active) {
      mergeActiveContactIds.push(decision.held_contact_id);
    } else {
      mergeInactiveContactIds.push(decision.held_contact_id);
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `Duplicate contact merge validation failed with ${issues.length} issue(s): ${issues.slice(0, 10).join('; ')}`
    );
  }

  return {
    merge_active_contact_ids: mergeActiveContactIds,
    merge_inactive_contact_ids: mergeInactiveContactIds,
    keep_held_contact_ids: keepHeldContactIds,
    anchor_contact_id_by_held_contact_id: anchorContactIdByHeldContactId,
    resolved_missing_anchors: resolvedMissingAnchors,
  };
};

const assertAppliedMergeState = async (
  db: QueryablePool,
  mergeDecisions: DuplicateContactDecision[]
): Promise<void> => {
  const contactStates = await loadContactStates(
    db,
    mergeDecisions.map((decision) => decision.held_contact_id)
  );
  const issues: string[] = [];
  for (const decision of mergeDecisions) {
    const held = contactStates.get(decision.held_contact_id);
    if (!held) {
      issues.push(`missing merged held contact ${decision.held_contact_id}`);
    } else if (held.is_active) {
      issues.push(`merged held contact is still active ${decision.held_contact_id}`);
    }
  }
  if (issues.length > 0) {
    throw new Error(
      `Post-merge validation failed with ${issues.length} issue(s): ${issues.slice(0, 10).join('; ')}`
    );
  }
};

const anchorPreferredResolutions = (): ContactMergeRequest['resolutions'] =>
  Object.fromEntries(getMergeableResolutionFieldNames().map((field) => [field, 'target']));

const retargetContactProvenance = async (
  db: QueryablePool,
  organizationId: string,
  heldContactId: string,
  anchorContactId: string,
  proof: ImportApplyProof,
  expectedBundleFingerprint: string,
  expectedSchemaVersion: string
): Promise<number> => {
  const result = await db.query<{ id: string }>(
    `
      UPDATE cbis_import_target_provenance
      SET target_entity_id = $3::uuid,
          bundle_fingerprint = $4,
          schema_bundle_version = $5,
          last_import_run_id = $6::uuid,
          updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $1::uuid
        AND target_entity_type = 'contacts'
        AND target_entity_id = $2::uuid
      RETURNING id::text
    `,
    [
      organizationId,
      heldContactId,
      anchorContactId,
      expectedBundleFingerprint,
      expectedSchemaVersion,
      proof.run_id,
    ]
  );
  return result.rows.length;
};

export const runMergeDuplicateContacts = async (
  db: QueryablePool,
  mergeService: MergeService,
  options: RunOptions
): Promise<MergeDuplicateContactsResult> => {
  requireUuid(options.organizationId, '--organization-id');
  requireUuid(options.actorId, '--actor-id');

  const decisions = await loadDuplicateContactDecisions(options.decisionAudit);
  const mergeDecisions = decisions.filter((decision) => decision.decision === 'merge_to_anchor');
  const keepHeldDecisions = decisions.filter((decision) => decision.decision === 'keep_held');
  const proof = await findImportApplyProof(
    db,
    options.organizationId,
    options.expectedBundleFingerprint,
    options.expectedSchemaVersion
  );
  const anchorRows = await loadBundleContactRows(
    options.bundleDir,
    options.expectedBundleFingerprint,
    options.expectedSchemaVersion
  );
  const validation = await assertValidContactStates(db, decisions, anchorRows);

  let appliedMerges = 0;
  let provenanceRetargets = 0;
  if (options.mode === 'apply') {
    const resolutions = anchorPreferredResolutions();
    for (const decision of mergeDecisions) {
      const anchorContactId =
        validation.anchor_contact_id_by_held_contact_id.get(decision.held_contact_id) ?? decision.anchor_contact_id;
      if (!validation.merge_active_contact_ids.includes(decision.held_contact_id)) {
        provenanceRetargets += await retargetContactProvenance(
          db,
          options.organizationId,
          decision.held_contact_id,
          anchorContactId,
          proof,
          options.expectedBundleFingerprint,
          options.expectedSchemaVersion
        );
        continue;
      }
      const result = await mergeService.mergeContacts(
        decision.held_contact_id,
        {
          target_contact_id: anchorContactId,
          resolutions,
        },
        options.actorId,
        'admin'
      );
      if (!result) {
        throw new Error(`Merge returned no result for held contact ${decision.held_contact_id}`);
      }
      appliedMerges += 1;
      provenanceRetargets += await retargetContactProvenance(
        db,
        options.organizationId,
        decision.held_contact_id,
        anchorContactId,
        proof,
        options.expectedBundleFingerprint,
        options.expectedSchemaVersion
      );
    }

    await assertValidContactStates(db, decisions, anchorRows);
    await assertAppliedMergeState(db, mergeDecisions);
  }

  return {
    mode: options.mode,
    import_run_id: proof.run_id,
    bundle_fingerprint: options.expectedBundleFingerprint,
    schema_bundle_version: options.expectedSchemaVersion,
    contact_provenance_rows: proof.contact_provenance_rows,
    decisions: {
      total: decisions.length,
      merge_to_anchor: mergeDecisions.length,
      keep_held: keepHeldDecisions.length,
      unique_merge_anchors: new Set(mergeDecisions.map((decision) => decision.anchor_contact_id)).size,
    },
    validation: {
      active_merge_candidates: validation.merge_active_contact_ids.length,
      inactive_held_skips: validation.merge_inactive_contact_ids.length,
      keep_held_contacts: validation.keep_held_contact_ids.length,
      resolved_missing_anchors: validation.resolved_missing_anchors,
    },
    applied_merges: appliedMerges,
    provenance_retargets: provenanceRetargets,
  };
};

const buildRequiredOptions = (options: CliOptions): RunOptions => ({
  decisionAudit: requireOption(options.decisionAudit, '--decision-audit'),
  organizationId: requireOption(options.organizationId, '--organization-id'),
  actorId: requireOption(options.actorId, '--actor-id'),
  expectedBundleFingerprint: requireOption(
    options.expectedBundleFingerprint,
    '--expected-bundle-fingerprint'
  ),
  expectedSchemaVersion: requireOption(options.expectedSchemaVersion, '--expected-schema-version'),
  mode: options.mode ?? 'dry-run',
  bundleDir: options.bundleDir,
});

async function main(): Promise<void> {
  const options = buildRequiredOptions(parseArgs(process.argv.slice(2)));
  const result = await runMergeDuplicateContacts(
    rawPool,
    new ContactMergeService(rawPool),
    options
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main()
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await rawPool.end();
    });
}
