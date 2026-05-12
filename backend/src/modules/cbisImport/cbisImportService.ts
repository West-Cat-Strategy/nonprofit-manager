import type { Pool } from 'pg';
import { rawPool, setCurrentUserId } from '@config/database';
import {
  getSchemaBundleVersion,
  loadCbisImportBundle,
  type CbisImportEntityType,
  type LoadedCbisImportBundle,
} from './cbisImportBundle';
import {
  buildAllowedContactRetargets,
  loadDuplicateContactDecisions,
} from './cbisImportDuplicateContactDecisions';
import { applyDuplicatePlanToResults, buildDuplicateSafetyPlan } from './cbisImportDuplicateSafety';
import { importReadyRows, persistTargetProvenance } from './cbisImportEntityWriters';
import { buildInitialEntityResults, findSuccessfulDryRun, finishRun, insertRun, persistAudit } from './cbisImportRunStore';
import type { CbisImportEntityResult, CbisImportRunResult, DuplicateSafetyPlan, RunCbisImportOptions } from './cbisImportTypes';

const buildResult = (
  runId: string,
  options: RunCbisImportOptions,
  bundle: LoadedCbisImportBundle,
  results: Record<CbisImportEntityType, CbisImportEntityResult>,
  issueCount: number,
  safetyPlan: DuplicateSafetyPlan,
  status: 'succeeded' | 'failed'
): CbisImportRunResult => {
  const readyRows = Object.values(results).reduce((sum, item) => sum + item.ready, 0);
  const importedRows = Object.values(results).reduce((sum, item) => sum + item.imported, 0);
  const heldOutRows = Object.values(results).reduce(
    (sum, item) => sum + item.invalid + item.review_required + item.skipped,
    0
  );

  return {
    run_id: runId,
    mode: options.mode,
    status,
    bundle_fingerprint: bundle.fingerprint,
    schema_bundle_version: getSchemaBundleVersion(bundle),
    per_entity: results,
    issue_count: issueCount,
    duplicate_safety: {
      duplicate_conflicts: safetyPlan.duplicateIssues.length,
      held_for_review: safetyPlan.heldKeys.size,
      idempotent_updates: safetyPlan.idempotentUpdates,
      provenance_conflicts: safetyPlan.provenanceConflicts,
    },
    reconciliation: {
      ready_rows: readyRows,
      imported_rows: importedRows,
      held_out_rows: heldOutRows,
      mapping_rows: bundle.entityMapRows.length,
      gap_rows: bundle.gapRows.length,
    },
  };
};

export class CbisImportService {
  constructor(private readonly pool: Pool = rawPool) {}

  async run(options: RunCbisImportOptions): Promise<CbisImportRunResult> {
    const bundle = await loadCbisImportBundle(options.bundleDir);
    const allowedContactRetargets = options.duplicateContactDecisionAuditPath
      ? buildAllowedContactRetargets(await loadDuplicateContactDecisions(options.duplicateContactDecisionAuditPath))
      : undefined;
    const results = buildInitialEntityResults(bundle);
    const client = await this.pool.connect();
    let runId = '';
    let dryRunRequiredRunId: string | null = null;

    try {
      if (options.mode === 'apply') {
        if (!options.rollbackArtifactPath) {
          throw new Error('Apply mode requires --backup-path pointing at the pre-import backup artifact');
        }
        dryRunRequiredRunId = await findSuccessfulDryRun(client, bundle, options.organizationId);
        if (!dryRunRequiredRunId) {
          throw new Error('Apply mode requires a successful dry-run for the same bundle fingerprint and schema version');
        }
      }

      runId = await insertRun(client, bundle, options, 'started', dryRunRequiredRunId ?? undefined);

      await client.query('BEGIN');
      await setCurrentUserId(client, options.actorId, { local: true });
      const safetyPlan = await buildDuplicateSafetyPlan(client, bundle, options.organizationId, {
        allowedContactRetargets,
      });
      applyDuplicatePlanToResults(results, safetyPlan);
      await importReadyRows(client, options, results, safetyPlan);

      if (options.mode === 'dry-run') {
        await client.query('ROLLBACK');
        const issueCount = await persistAudit(client, runId, bundle, results, safetyPlan);
        await finishRun(client, runId, 'succeeded');
        return buildResult(runId, options, bundle, results, issueCount, safetyPlan, 'succeeded');
      }

      await persistTargetProvenance(client, runId, bundle, options.organizationId, safetyPlan);
      const issueCount = await persistAudit(client, runId, bundle, results, safetyPlan);
      await client.query('COMMIT');
      await finishRun(client, runId, 'succeeded');
      return buildResult(runId, options, bundle, results, issueCount, safetyPlan, 'succeeded');
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback failures; the original error is more useful.
      }

      if (runId) {
        await finishRun(client, runId, 'failed', error instanceof Error ? error.message : String(error));
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
