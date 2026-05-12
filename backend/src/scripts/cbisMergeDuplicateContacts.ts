import { rawPool } from '@config/database';
import { loadDuplicateContactDecisions, type DuplicateContactDecision } from '@modules/cbisImport/cbisImportDuplicateContactDecisions';
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

interface ImportApplyProof {
  run_id: string;
  contact_provenance_rows: number;
}

interface ValidationSummary {
  merge_active_contact_ids: string[];
  merge_inactive_contact_ids: string[];
  keep_held_contact_ids: string[];
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
  };
  applied_merges: number;
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

const assertValidContactStates = async (
  db: QueryablePool,
  decisions: DuplicateContactDecision[]
): Promise<ValidationSummary> => {
  const contactStates = await loadContactStates(
    db,
    decisions.flatMap((decision) => [decision.held_contact_id, decision.anchor_contact_id])
  );
  const issues: string[] = [];
  const mergeActiveContactIds: string[] = [];
  const mergeInactiveContactIds: string[] = [];
  const keepHeldContactIds: string[] = [];

  for (const decision of decisions) {
    const held = contactStates.get(decision.held_contact_id);
    const anchor = contactStates.get(decision.anchor_contact_id);
    if (!held) {
      issues.push(`missing held contact ${decision.held_contact_id} (${decision.duplicate_name_key})`);
      continue;
    }
    if (!anchor) {
      issues.push(`missing anchor contact ${decision.anchor_contact_id} (${decision.duplicate_name_key})`);
      continue;
    }
    if (!anchor.is_active) {
      issues.push(`inactive anchor contact ${decision.anchor_contact_id} (${decision.duplicate_name_key})`);
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

export const runMergeDuplicateContacts = async (
  db: QueryablePool,
  mergeService: MergeService,
  options: Required<CliOptions>
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
  const validation = await assertValidContactStates(db, decisions);

  let appliedMerges = 0;
  if (options.mode === 'apply') {
    const resolutions = anchorPreferredResolutions();
    for (const decision of mergeDecisions) {
      if (!validation.merge_active_contact_ids.includes(decision.held_contact_id)) {
        continue;
      }
      const result = await mergeService.mergeContacts(
        decision.held_contact_id,
        {
          target_contact_id: decision.anchor_contact_id,
          resolutions,
        },
        options.actorId,
        'admin'
      );
      if (!result) {
        throw new Error(`Merge returned no result for held contact ${decision.held_contact_id}`);
      }
      appliedMerges += 1;
    }

    await assertValidContactStates(db, decisions);
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
    },
    applied_merges: appliedMerges,
  };
};

const buildRequiredOptions = (options: CliOptions): Required<CliOptions> => ({
  decisionAudit: requireOption(options.decisionAudit, '--decision-audit'),
  organizationId: requireOption(options.organizationId, '--organization-id'),
  actorId: requireOption(options.actorId, '--actor-id'),
  expectedBundleFingerprint: requireOption(
    options.expectedBundleFingerprint,
    '--expected-bundle-fingerprint'
  ),
  expectedSchemaVersion: requireOption(options.expectedSchemaVersion, '--expected-schema-version'),
  mode: options.mode ?? 'dry-run',
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
