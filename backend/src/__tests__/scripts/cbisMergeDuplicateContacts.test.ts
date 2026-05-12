import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  loadDuplicateContactDecisions,
  parseArgs,
  runMergeDuplicateContacts,
} from '../../scripts/cbisMergeDuplicateContacts';

const ORGANIZATION_ID = '17417103-4ff7-4a72-a869-82b03da25456';
const ACTOR_ID = 'bd195ae2-6922-4ec4-9cdc-60add1f1dd78';
const FINGERPRINT = 'sha256:ed4eaa4444711fc6db9244909e6a2c767b1521f1061037a83a94ee14d0272961';
const SCHEMA_VERSION = '2026-05-12.generated-from-schemaRegistry-through-129_cbis_import_duplicate_guards';
const HELD_MERGE_ID = '7a56e26a-d31d-5123-8b65-48fccf375d3c';
const INACTIVE_HELD_MERGE_ID = 'cbf226b4-0d15-5aa8-b685-2b8c19377d9a';
const ANCHOR_ID = 'c0fab8ea-8b15-5835-83b8-40ec21d5b70d';
const KEEP_HELD_ID = 'a3aeb9e8-a48f-5c5e-bb44-cb2222de6300';
const KEEP_ANCHOR_ID = '12bfe68a-b98e-537d-bdda-65b8fa113534';
const LEGACY_DUPLICATE_ID = 'ba282bc4-ea47-4498-ab65-63c6f92a56de';
const EMPTY_SOURCE_ID = 'd8c9553d-4cf0-42a5-9341-1a1c3b112df0';
const EMPTY_ANCHOR_ID = '8ce813bb-1392-4f0c-b82e-c6c751ab68cf';

type ContactState = {
  id: string;
  is_active: boolean;
  account_id: string | null;
};

const decisionHeader =
  'duplicate_name_key,held_cluster_id,held_contact_id,anchor_cluster_id,anchor_contact_id,decision,result,reviewer,evidence_summary';

const decisionRow = (
  heldContactId: string,
  anchorContactId: string,
  decision: 'merge_to_anchor' | 'keep_held',
  name = 'adele arseneau'
): string =>
  [
    name,
    `cluster:${heldContactId.slice(0, 12)}`,
    heldContactId,
    `cluster:${anchorContactId.slice(0, 12)}`,
    anchorContactId,
    decision,
    decision === 'merge_to_anchor' ? 'merged_to_anchor' : 'kept_held',
    'test-reviewer',
    'single ready anchor with no conflicting identifiers',
  ].join(',');

const writeDecisionAudit = async (rows: string[]): Promise<{ dir: string; file: string }> => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cbis-merge-decisions-'));
  const file = path.join(dir, 'cbis_duplicate_contact_decision_audit.csv');
  await writeFile(file, `${decisionHeader}\n${rows.join('\n')}\n`);
  return { dir, file };
};

const optionsFor = (decisionAudit: string, mode: 'dry-run' | 'apply' = 'dry-run') => ({
  decisionAudit,
  organizationId: ORGANIZATION_ID,
  actorId: ACTOR_ID,
  expectedBundleFingerprint: FINGERPRINT,
  expectedSchemaVersion: SCHEMA_VERSION,
  mode,
});

const createDb = (
  states: Map<string, ContactState>,
  overrides: {
    hasApplyRun?: boolean;
    contactProvenanceRows?: number;
    legacyCandidates?: Array<{
      contact_id: string;
      duplicate_name_key: string;
      anchor_contact_id: string;
    }>;
    emptyCandidates?: Array<{
      contact_id: string;
      duplicate_name_key: string;
      anchor_contact_id: string;
      is_active: boolean;
      source_link_count: number;
      anchor_evidence_score: number;
      evidence_summary: string;
    }>;
    fkRows?: Array<{
      schema_name: string;
      table_name: string;
      column_name: string;
    }>;
    remainingReferenceCount?: number;
  } = {}
) => ({
  query: jest.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes('FROM cbis_import_runs')) {
      return { rows: overrides.hasApplyRun === false ? [] : [{ id: 'run-1' }] };
    }
    if (sql.includes('WITH contact_metrics')) {
      return { rows: overrides.emptyCandidates ?? [] };
    }
    if (sql.includes('jsonb_to_recordset')) {
      return { rows: overrides.legacyCandidates ?? [] };
    }
    if (sql.includes('UPDATE cbis_import_target_provenance')) {
      return { rows: [{ id: 'provenance-row' }] };
    }
    if (sql.includes('FROM pg_constraint')) {
      return { rows: overrides.fkRows ?? [] };
    }
    if (sql.includes('DELETE FROM contacts')) {
      const state = states.get(params?.[0] as string);
      if (!state || state.is_active) {
        return { rows: [] };
      }
      states.delete(state.id);
      return { rows: [{ id: state.id }] };
    }
    if (sql.includes('FROM cbis_import_target_provenance')) {
      return { rows: [{ count: overrides.contactProvenanceRows ?? 10 }] };
    }
    if (sql.includes('FROM contacts')) {
      const ids = (params?.[0] as string[]) ?? [];
      return {
        rows: ids
          .map((id) => states.get(id))
          .filter((state): state is ContactState => Boolean(state)),
      };
    }
    if (sql.includes('SELECT COUNT(*) AS count')) {
      return { rows: [{ count: overrides.remainingReferenceCount ?? 0 }] };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }),
});

const baseStates = (): Map<string, ContactState> =>
  new Map(
    [HELD_MERGE_ID, INACTIVE_HELD_MERGE_ID, ANCHOR_ID, KEEP_HELD_ID, KEEP_ANCHOR_ID].map((id) => [
      id,
      {
        id,
        is_active: id !== INACTIVE_HELD_MERGE_ID,
        account_id: null,
      },
    ])
  );

describe('cbisMergeDuplicateContacts operator script', () => {
  it('parses CLI options and rejects unsafe modes', () => {
    expect(
      parseArgs([
        '--decision-audit',
        '/tmp/decisions.csv',
        '--organization-id',
        ORGANIZATION_ID,
        '--actor-id',
        ACTOR_ID,
        '--expected-bundle-fingerprint',
        FINGERPRINT,
        '--expected-schema-version',
        SCHEMA_VERSION,
        '--mode',
        'dry-run',
      ])
    ).toMatchObject({
      decisionAudit: '/tmp/decisions.csv',
      organizationId: ORGANIZATION_ID,
      mode: 'dry-run',
    });
    expect(() => parseArgs(['--mode', 'preview'])).toThrow('--mode must be dry-run or apply');
  });

  it('rejects conflicting duplicate decisions for the same held contact', async () => {
    const { dir, file } = await writeDecisionAudit([
      decisionRow(HELD_MERGE_ID, ANCHOR_ID, 'merge_to_anchor'),
      decisionRow(HELD_MERGE_ID, KEEP_ANCHOR_ID, 'keep_held'),
    ]);
    try {
      await expect(loadDuplicateContactDecisions(file)).rejects.toThrow('conflicting duplicate rows');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('dry-runs without merging and reports active, inactive, and keep-held counts', async () => {
    const { dir, file } = await writeDecisionAudit([
      decisionRow(HELD_MERGE_ID, ANCHOR_ID, 'merge_to_anchor'),
      decisionRow(INACTIVE_HELD_MERGE_ID, ANCHOR_ID, 'merge_to_anchor'),
      decisionRow(KEEP_HELD_ID, KEEP_ANCHOR_ID, 'keep_held', 'david louie'),
    ]);
    const mergeService = { mergeContacts: jest.fn() };
    try {
      const result = await runMergeDuplicateContacts(
        createDb(baseStates()),
        mergeService,
        optionsFor(file)
      );
      expect(result.decisions).toMatchObject({
        total: 3,
        merge_to_anchor: 2,
        keep_held: 1,
        unique_merge_anchors: 1,
      });
      expect(result.validation).toMatchObject({
        active_merge_candidates: 1,
        inactive_held_skips: 1,
        keep_held_contacts: 1,
      });
      expect(result.applied_merges).toBe(0);
      expect(mergeService.mergeContacts).not.toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('allows already hard-deleted merge sources in guarded follow-up dry-runs', async () => {
    const { dir, file } = await writeDecisionAudit([
      decisionRow(HELD_MERGE_ID, ANCHOR_ID, 'merge_to_anchor'),
    ]);
    const states = baseStates();
    states.delete(HELD_MERGE_ID);
    const mergeService = { mergeContacts: jest.fn() };
    try {
      const result = await runMergeDuplicateContacts(
        createDb(states),
        mergeService,
        {
          ...optionsFor(file),
          hardDeleteMergedSources: true,
        }
      );
      expect(result.validation).toMatchObject({
        active_merge_candidates: 0,
        deleted_merge_sources: 1,
      });
      expect(mergeService.mergeContacts).not.toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('skips already hard-deleted merge sources in guarded follow-up apply runs', async () => {
    const { dir, file } = await writeDecisionAudit([
      decisionRow(HELD_MERGE_ID, ANCHOR_ID, 'merge_to_anchor'),
    ]);
    const states = baseStates();
    states.delete(HELD_MERGE_ID);
    const mergeService = { mergeContacts: jest.fn() };
    try {
      const result = await runMergeDuplicateContacts(
        createDb(states),
        mergeService,
        {
          ...optionsFor(file, 'apply'),
          mergeInactiveSources: true,
          hardDeleteMergedSources: true,
        }
      );
      expect(result.validation.deleted_merge_sources).toBe(1);
      expect(result.applied_merges).toBe(0);
      expect(result.hard_deleted_sources).toBe(0);
      expect(mergeService.mergeContacts).not.toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('requires an exact successful import apply run before merging', async () => {
    const { dir, file } = await writeDecisionAudit([
      decisionRow(HELD_MERGE_ID, ANCHOR_ID, 'merge_to_anchor'),
    ]);
    try {
      await expect(
        runMergeDuplicateContacts(
          createDb(baseStates(), { hasApplyRun: false }),
          { mergeContacts: jest.fn() },
          optionsFor(file)
        )
      ).rejects.toThrow('No successful apply run exists');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('applies only active held contacts and prefers anchor conflict resolutions', async () => {
    const { dir, file } = await writeDecisionAudit([
      decisionRow(HELD_MERGE_ID, ANCHOR_ID, 'merge_to_anchor'),
      decisionRow(INACTIVE_HELD_MERGE_ID, ANCHOR_ID, 'merge_to_anchor'),
      decisionRow(KEEP_HELD_ID, KEEP_ANCHOR_ID, 'keep_held', 'david louie'),
    ]);
    const states = baseStates();
    const mergeService = {
      mergeContacts: jest.fn(async (contactId: string) => {
        const state = states.get(contactId);
        if (state) {
          state.is_active = false;
        }
        return { survivor_contact: {}, merge_summary: {} };
      }),
    };
    try {
      const result = await runMergeDuplicateContacts(
        createDb(states),
        mergeService,
        optionsFor(file, 'apply')
      );
      expect(result.applied_merges).toBe(1);
      expect(mergeService.mergeContacts).toHaveBeenCalledTimes(1);
      expect(mergeService.mergeContacts).toHaveBeenCalledWith(
        HELD_MERGE_ID,
        expect.objectContaining({
          target_contact_id: ANCHOR_ID,
          resolutions: expect.objectContaining({
            first_name: 'target',
            phn: 'target',
          }),
        }),
        ACTOR_ID,
        'admin'
      );
      expect(states.get(KEEP_HELD_ID)?.is_active).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('can directly merge inactive reviewed held contacts when requested', async () => {
    const { dir, file } = await writeDecisionAudit([
      decisionRow(INACTIVE_HELD_MERGE_ID, ANCHOR_ID, 'merge_to_anchor'),
    ]);
    const states = baseStates();
    const mergeService = {
      mergeContacts: jest.fn(async (contactId: string) => {
        const state = states.get(contactId);
        if (state) {
          state.is_active = false;
        }
        return { survivor_contact: {}, merge_summary: {} };
      }),
    };
    try {
      const result = await runMergeDuplicateContacts(
        createDb(states),
        mergeService,
        {
          ...optionsFor(file, 'apply'),
          mergeInactiveSources: true,
        }
      );
      expect(result.applied_merges).toBe(1);
      expect(mergeService.mergeContacts).toHaveBeenCalledWith(
        INACTIVE_HELD_MERGE_ID,
        expect.objectContaining({ target_contact_id: ANCHOR_ID }),
        ACTOR_ID,
        'admin'
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('can merge reviewed legacy production contacts with the same name', async () => {
    const { dir, file } = await writeDecisionAudit([
      decisionRow(HELD_MERGE_ID, ANCHOR_ID, 'merge_to_anchor', 'cherie knight'),
    ]);
    const states = baseStates();
    states.set(LEGACY_DUPLICATE_ID, {
      id: LEGACY_DUPLICATE_ID,
      is_active: true,
      account_id: null,
    });
    const mergeService = {
      mergeContacts: jest.fn(async (contactId: string) => {
        const state = states.get(contactId);
        if (state) {
          state.is_active = false;
        }
        return { survivor_contact: {}, merge_summary: {} };
      }),
    };
    try {
      const result = await runMergeDuplicateContacts(
        createDb(states, {
          legacyCandidates: [
            {
              contact_id: LEGACY_DUPLICATE_ID,
              duplicate_name_key: 'cherie knight',
              anchor_contact_id: ANCHOR_ID,
            },
          ],
        }),
        mergeService,
        {
          ...optionsFor(file, 'apply'),
          mergeLegacyProductionMatches: true,
        }
      );
      expect(result.validation.legacy_active_merge_candidates).toBe(1);
      expect(result.legacy_applied_merges).toBe(1);
      expect(mergeService.mergeContacts).toHaveBeenCalledWith(
        LEGACY_DUPLICATE_ID,
        expect.objectContaining({ target_contact_id: ANCHOR_ID }),
        ACTOR_ID,
        'admin'
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('dry-runs empty same-person candidates and writes a redacted audit', async () => {
    const { dir, file } = await writeDecisionAudit([
      decisionRow(KEEP_HELD_ID, KEEP_ANCHOR_ID, 'keep_held', 'david louie'),
    ]);
    const auditPath = path.join(dir, 'empty-contact-audit.csv');
    const mergeService = { mergeContacts: jest.fn() };
    try {
      const result = await runMergeDuplicateContacts(
        createDb(baseStates(), {
          emptyCandidates: [
            {
              contact_id: EMPTY_SOURCE_ID,
              duplicate_name_key: 'ada lovelace',
              anchor_contact_id: EMPTY_ANCHOR_ID,
              is_active: true,
              source_link_count: 0,
              anchor_evidence_score: 3,
              evidence_summary: 'anchor_cbis_provenance|anchor_linked_records',
            },
          ],
        }),
        mergeService,
        {
          ...optionsFor(file),
          mergeEmptySamePerson: true,
          emptyContactAudit: auditPath,
        }
      );
      expect(result.validation.empty_same_person_candidates).toBe(1);
      expect(mergeService.mergeContacts).not.toHaveBeenCalled();
      const audit = await readFile(auditPath, 'utf8');
      expect(audit).toContain('empty_same_person');
      expect(audit).not.toContain('ada lovelace');
      expect(audit).not.toContain(EMPTY_SOURCE_ID);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('hard-deletes empty same-person sources only after merge and reference guard pass', async () => {
    const { dir, file } = await writeDecisionAudit([
      decisionRow(KEEP_HELD_ID, KEEP_ANCHOR_ID, 'keep_held', 'david louie'),
    ]);
    const states = baseStates();
    states.set(EMPTY_SOURCE_ID, { id: EMPTY_SOURCE_ID, is_active: true, account_id: null });
    states.set(EMPTY_ANCHOR_ID, { id: EMPTY_ANCHOR_ID, is_active: true, account_id: null });
    const mergeService = {
      mergeContacts: jest.fn(async (contactId: string) => {
        const state = states.get(contactId);
        if (state) {
          state.is_active = false;
        }
        return { survivor_contact: {}, merge_summary: {} };
      }),
    };
    try {
      const result = await runMergeDuplicateContacts(
        createDb(states, {
          emptyCandidates: [
            {
              contact_id: EMPTY_SOURCE_ID,
              duplicate_name_key: 'ada lovelace',
              anchor_contact_id: EMPTY_ANCHOR_ID,
              is_active: true,
              source_link_count: 0,
              anchor_evidence_score: 3,
              evidence_summary: 'anchor_cbis_provenance|anchor_linked_records',
            },
          ],
        }),
        mergeService,
        {
          ...optionsFor(file, 'apply'),
          mergeEmptySamePerson: true,
          hardDeleteMergedSources: true,
        }
      );
      expect(result.empty_same_person_applied_merges).toBe(1);
      expect(result.hard_deleted_sources).toBe(1);
      expect(states.has(EMPTY_SOURCE_ID)).toBe(false);
      expect(mergeService.mergeContacts).toHaveBeenCalledWith(
        EMPTY_SOURCE_ID,
        expect.objectContaining({ target_contact_id: EMPTY_ANCHOR_ID }),
        ACTOR_ID,
        'admin',
        { retainSourceAuditReference: false }
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('fails hard-delete when the post-merge reference guard finds remaining rows', async () => {
    const { dir, file } = await writeDecisionAudit([
      decisionRow(KEEP_HELD_ID, KEEP_ANCHOR_ID, 'keep_held', 'david louie'),
    ]);
    const states = baseStates();
    states.set(EMPTY_SOURCE_ID, { id: EMPTY_SOURCE_ID, is_active: true, account_id: null });
    states.set(EMPTY_ANCHOR_ID, { id: EMPTY_ANCHOR_ID, is_active: true, account_id: null });
    const mergeService = {
      mergeContacts: jest.fn(async (contactId: string) => {
        const state = states.get(contactId);
        if (state) {
          state.is_active = false;
        }
        return { survivor_contact: {}, merge_summary: {} };
      }),
    };
    try {
      await expect(
        runMergeDuplicateContacts(
          createDb(states, {
            emptyCandidates: [
              {
                contact_id: EMPTY_SOURCE_ID,
                duplicate_name_key: 'ada lovelace',
                anchor_contact_id: EMPTY_ANCHOR_ID,
                is_active: true,
                source_link_count: 0,
                anchor_evidence_score: 3,
                evidence_summary: 'anchor_cbis_provenance|anchor_linked_records',
              },
            ],
            fkRows: [{ schema_name: 'public', table_name: 'contact_notes', column_name: 'contact_id' }],
            remainingReferenceCount: 1,
          }),
          mergeService,
          {
            ...optionsFor(file, 'apply'),
            mergeEmptySamePerson: true,
            hardDeleteMergedSources: true,
          }
        )
      ).rejects.toThrow('Refusing to hard-delete merged contact');
      expect(states.has(EMPTY_SOURCE_ID)).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
