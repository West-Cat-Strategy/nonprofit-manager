import type { PoolClient } from 'pg';
import { CBIS_IMPORT_ENTITY_ORDER, type CbisImportEntityType, type CbisImportRow, type LoadedCbisImportBundle } from './cbisImportBundle';
import type { CbisImportEntityResult, DuplicateIssue, DuplicateSafetyPlan, ExistingProvenanceRow, ImportProvenanceSource } from './cbisImportTypes';
import { collectBundleTargetKeys, collectTargetKeys, findBlockedDependency } from './cbisImportDependencies';
import {
  entitySourceKey,
  normalizePhone,
  normalizeText,
  numberValue,
  provenanceEntityAliases,
  requiredText,
  rowKey,
  sourceHashKey,
  sourceKey,
  statusFor,
  targetIdColumnFor,
  text,
  uuid,
} from './cbisImportRowUtils';

const buildProvenanceByTarget = (bundle: LoadedCbisImportBundle): Map<string, ImportProvenanceSource[]> => {
  const provenance = new Map<string, ImportProvenanceSource[]>();
  for (const row of bundle.entityMapRows) {
    if (text(row, 'target_row_status') !== 'ready') {
      continue;
    }
    const targetId = uuid(row, 'target_entity_id');
    const targetEntityType = normalizeText(text(row, 'target_entity_type'));
    if (!targetId || !targetEntityType) {
      continue;
    }

    for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
      if (!provenanceEntityAliases(entityType).includes(targetEntityType)) {
        continue;
      }
      const key = rowKey(entityType, targetId);
      const rows = provenance.get(key) ?? [];
      rows.push({
        source_file: requiredText(row, 'source_file'),
        source_table: requiredText(row, 'source_table'),
        source_row_id: requiredText(row, 'source_row_id'),
        source_row_hash: text(row, 'source_row_hash'),
      });
      provenance.set(key, rows);
    }
  }
  return provenance;
};

const addDuplicateIssue = (
  issues: DuplicateIssue[],
  heldKeys: Set<string>,
  issue: DuplicateIssue
): void => {
  const key = rowKey(issue.entityType, issue.targetEntityId);
  heldKeys.add(key);
  if (
    issues.some(
      (existing) =>
        existing.entityType === issue.entityType &&
        existing.targetEntityId === issue.targetEntityId &&
        existing.reason === issue.reason &&
        existing.details === issue.details
    )
  ) {
    return;
  }
  issues.push(issue);
};

const holdDependentRowsForReview = (
  bundle: LoadedCbisImportBundle,
  safetyPlan: DuplicateSafetyPlan
): void => {
  const bundleTargetKeys = collectBundleTargetKeys(bundle);
  let changed = true;

  while (changed) {
    changed = false;
    const safeTargetKeys = collectTargetKeys(safetyPlan.safeRows);

    for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
      const nextRows: CbisImportRow[] = [];
      for (const row of safetyPlan.safeRows[entityType]) {
        const targetEntityId = uuid(row, targetIdColumnFor(entityType));
        const blockedDependency = findBlockedDependency(
          row,
          entityType,
          bundleTargetKeys,
          safeTargetKeys,
          safetyPlan.heldKeys
        );

        if (!targetEntityId || !blockedDependency) {
          nextRows.push(row);
          continue;
        }

        const key = rowKey(entityType, targetEntityId);
        const provenance = safetyPlan.safeProvenance.get(key) ?? [];
        addDuplicateIssue(safetyPlan.duplicateIssues, safetyPlan.heldKeys, {
          entityType,
          targetEntityId,
          source: provenance[0] ?? null,
          reason: 'dependent_row_held',
          details: `Prepared ${entityType} row depends on held ${blockedDependency.entityType}:${blockedDependency.targetEntityId} via ${blockedDependency.label}`,
          provenanceConflict: false,
        });
        safetyPlan.safeProvenance.delete(key);
        changed = true;
      }
      safetyPlan.safeRows[entityType] = nextRows;
    }
  }
};

const findExistingProvenance = async (
  client: PoolClient,
  organizationId: string,
  entityType: CbisImportEntityType,
  targetIds: string[],
  sources: ImportProvenanceSource[]
): Promise<ExistingProvenanceRow[]> => {
  const sourceFiles = sources.map((source) => source.source_file);
  const sourceTables = sources.map((source) => source.source_table);
  const sourceRowIds = sources.map((source) => source.source_row_id);
  const sourceHashes = sources.map((source) => source.source_row_hash).filter((hash): hash is string => Boolean(hash));

  if (targetIds.length === 0 && sources.length === 0 && sourceHashes.length === 0) {
    return [];
  }

  const result = await client.query<ExistingProvenanceRow>(
    `
      WITH requested_sources AS (
        SELECT *
        FROM UNNEST($4::text[], $5::text[], $6::text[]) AS source_rows(source_file, source_table, source_row_id)
      )
      SELECT DISTINCT
        p.target_entity_type,
        p.target_entity_id::text,
        p.source_file,
        p.source_table,
        p.source_row_id,
        p.source_row_hash
      FROM cbis_import_target_provenance p
      LEFT JOIN requested_sources requested
        ON requested.source_file = p.source_file
       AND requested.source_table = p.source_table
       AND requested.source_row_id = p.source_row_id
      WHERE p.organization_id = $1
        AND p.target_entity_type = $2
        AND (
          p.target_entity_id = ANY($3::uuid[])
          OR requested.source_row_id IS NOT NULL
          OR (p.source_row_hash IS NOT NULL AND p.source_row_hash = ANY($7::text[]))
        )
    `,
    [
      organizationId,
      entityType,
      targetIds,
      sourceFiles,
      sourceTables,
      sourceRowIds,
      sourceHashes,
    ]
  );
  return result.rows;
};

const hasNaturalDuplicate = async (
  client: PoolClient,
  entityType: CbisImportEntityType,
  row: CbisImportRow,
  targetEntityId: string,
  organizationId: string
): Promise<string | null> => {
  if (entityType === 'accounts') {
    const accountNumber = text(row, 'account_number');
    if (accountNumber) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM accounts WHERE account_number = $1 AND id <> $2::uuid LIMIT 1',
        [accountNumber, targetEntityId]
      );
      if (result.rows.length > 0) return `account_number ${accountNumber}`;
    }
    const accountName = normalizeText(text(row, 'account_name'));
    const email = normalizeText(text(row, 'email'));
    if (accountName && email) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM accounts WHERE lower(account_name) = $1 AND lower(email) = $2 AND id <> $3::uuid LIMIT 1',
        [accountName, email, targetEntityId]
      );
      if (result.rows.length > 0) return `account_name/email ${accountName}/${email}`;
    }
  }

  if (entityType === 'contacts') {
    const email = normalizeText(text(row, 'email'));
    if (email) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM contacts WHERE lower(email) = $1 AND id <> $2::uuid LIMIT 1',
        [email, targetEntityId]
      );
      if (result.rows.length > 0) return `contact email ${email}`;
    }
    const firstName = normalizeText(text(row, 'first_name'));
    const lastName = normalizeText(text(row, 'last_name'));
    const birthDate = text(row, 'birth_date');
    const phone = normalizePhone(text(row, 'phone') ?? text(row, 'mobile_phone'));
    if (firstName && lastName && (birthDate || phone)) {
      const result = await client.query<{ id: string }>(
        `
          SELECT id::text
          FROM contacts
          WHERE lower(first_name) = $1
            AND lower(last_name) = $2
            AND id <> $3::uuid
            AND (
              ($4::date IS NOT NULL AND birth_date = $4::date)
              OR ($5::text IS NOT NULL AND regexp_replace(coalesce(nullif(phone, ''), nullif(mobile_phone, ''), ''), '\\D', '', 'g') = $5)
            )
          LIMIT 1
        `,
        [firstName, lastName, targetEntityId, birthDate, phone]
      );
      if (result.rows.length > 0) return 'contact name plus birth date or phone';
    }
  }

  if (entityType === 'cases') {
    const caseNumber = text(row, 'case_number');
    if (caseNumber) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM cases WHERE case_number = $1 AND id <> $2::uuid LIMIT 1',
        [caseNumber, targetEntityId]
      );
      if (result.rows.length > 0) return `case_number ${caseNumber}`;
    }
  }

  if (entityType === 'events') {
    const name = normalizeText(text(row, 'event_name'));
    const startDate = text(row, 'start_date');
    const endDate = text(row, 'end_date');
    if (name && startDate && endDate) {
      const result = await client.query<{ id: string }>(
        `
          SELECT id::text
          FROM events
          WHERE organization_id = $1::uuid
            AND lower(name) = $2
            AND start_date = $3::timestamptz
            AND end_date = $4::timestamptz
            AND id <> $5::uuid
          LIMIT 1
        `,
        [organizationId, name, startDate, endDate, targetEntityId]
      );
      if (result.rows.length > 0) return 'event organization/name/start/end';
    }
  }

  if (entityType === 'event_occurrences') {
    const eventId = uuid(row, 'event_id');
    const scheduledStartDate = text(row, 'scheduled_start_date');
    if (eventId && scheduledStartDate) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM event_occurrences WHERE event_id = $1::uuid AND scheduled_start_date = $2::timestamptz AND id <> $3::uuid LIMIT 1',
        [eventId, scheduledStartDate, targetEntityId]
      );
      if (result.rows.length > 0) return 'event occurrence event/scheduled start';
    }
  }

  if (entityType === 'event_registrations') {
    const occurrenceId = uuid(row, 'occurrence_id');
    const contactId = uuid(row, 'contact_id');
    if (occurrenceId && contactId) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM event_registrations WHERE occurrence_id = $1::uuid AND contact_id = $2::uuid AND id <> $3::uuid LIMIT 1',
        [occurrenceId, contactId, targetEntityId]
      );
      if (result.rows.length > 0) return 'event registration occurrence/contact';
    }
  }

  if (entityType === 'donations') {
    const donationNumber = text(row, 'donation_number');
    if (donationNumber) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM donations WHERE donation_number = $1 AND id <> $2::uuid LIMIT 1',
        [donationNumber, targetEntityId]
      );
      if (result.rows.length > 0) return `donation_number ${donationNumber}`;
    }
    const transactionId = text(row, 'transaction_id');
    if (transactionId) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM donations WHERE transaction_id = $1 AND id <> $2::uuid LIMIT 1',
        [transactionId, targetEntityId]
      );
      if (result.rows.length > 0) return `transaction_id ${transactionId}`;
    }
  }

  if (entityType === 'volunteers') {
    const contactId = uuid(row, 'contact_id');
    if (contactId) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM volunteers WHERE contact_id = $1::uuid AND id <> $2::uuid LIMIT 1',
        [contactId, targetEntityId]
      );
      if (result.rows.length > 0) return 'volunteer contact';
    }
  }

  if (entityType === 'volunteer_hours') {
    const volunteerId = uuid(row, 'volunteer_id');
    const activityDate = text(row, 'activity_date');
    const hoursLogged = numberValue(row, 'hours_logged');
    const activityType = normalizeText(text(row, 'activity_type'));
    if (volunteerId && activityDate && hoursLogged !== null) {
      const result = await client.query<{ id: string }>(
        `
          SELECT id::text
          FROM volunteer_hours
          WHERE volunteer_id = $1::uuid
            AND activity_date = $2::date
            AND hours_logged = $3
            AND coalesce(lower(activity_type), '') = coalesce($4, '')
            AND id <> $5::uuid
          LIMIT 1
        `,
        [volunteerId, activityDate, hoursLogged, activityType, targetEntityId]
      );
      if (result.rows.length > 0) return 'volunteer hours volunteer/date/hours/type';
    }
  }

  if (entityType === 'follow_ups') {
    const entityId = uuid(row, 'entity_id');
    const entityKind = text(row, 'entity_type');
    const title = normalizeText(text(row, 'title'));
    const scheduledDate = text(row, 'scheduled_date');
    if (entityId && entityKind && title && scheduledDate) {
      const result = await client.query<{ id: string }>(
        `
          SELECT id::text
          FROM follow_ups
          WHERE organization_id = $1::uuid
            AND entity_type = $2
            AND entity_id = $3::uuid
            AND lower(title) = $4
            AND scheduled_date = $5::date
            AND id <> $6::uuid
          LIMIT 1
        `,
        [organizationId, entityKind, entityId, title, scheduledDate, targetEntityId]
      );
      if (result.rows.length > 0) return 'follow-up entity/title/scheduled date';
    }
  }

  if (entityType === 'activity_events') {
    const sourceTable = text(row, 'source_table');
    const sourceRecordId = uuid(row, 'source_record_id');
    const activityType = text(row, 'activity_type');
    if (sourceTable && sourceRecordId && activityType) {
      const result = await client.query<{ id: string }>(
        'SELECT id::text FROM activity_events WHERE source_table = $1 AND source_record_id = $2::uuid AND activity_type = $3 AND id <> $4::uuid LIMIT 1',
        [sourceTable, sourceRecordId, activityType, targetEntityId]
      );
      if (result.rows.length > 0) return 'activity event source/activity type';
    }
    const entityId = uuid(row, 'entity_id');
    const entityKind = text(row, 'entity_type');
    const title = normalizeText(text(row, 'title'));
    const occurredAt = text(row, 'occurred_at');
    if (entityId && entityKind && title && activityType && occurredAt) {
      const result = await client.query<{ id: string }>(
        `
          SELECT id::text
          FROM activity_events
          WHERE organization_id = $1::uuid
            AND entity_type = $2
            AND entity_id = $3::uuid
            AND activity_type = $4
            AND lower(title) = $5
            AND occurred_at = $6::timestamptz
            AND id <> $7::uuid
          LIMIT 1
        `,
        [organizationId, entityKind, entityId, activityType, title, occurredAt, targetEntityId]
      );
      if (result.rows.length > 0) return 'activity event entity/type/title/time';
    }
  }

  return null;
};

export const buildDuplicateSafetyPlan = async (
  client: PoolClient,
  bundle: LoadedCbisImportBundle,
  organizationId: string
): Promise<DuplicateSafetyPlan> => {
  const duplicateIssues: DuplicateIssue[] = [];
  const heldKeys = new Set<string>();
  const safeRows = {} as Record<CbisImportEntityType, CbisImportRow[]>;
  const safeProvenance = new Map<string, ImportProvenanceSource[]>();
  const provenanceByTarget = buildProvenanceByTarget(bundle);
  let idempotentUpdates = 0;
  let provenanceConflicts = 0;

  const sourceClaims = new Map<string, { entityType: CbisImportEntityType; targetEntityId: string }>();
  const sourceHashClaims = new Map<string, { entityType: CbisImportEntityType; targetEntityId: string }>();

  for (const entityType of CBIS_IMPORT_ENTITY_ORDER) {
    const readyRows = bundle.entities[entityType].filter((item) => statusFor(item) === 'ready');
    safeRows[entityType] = [];
    const seenTargets = new Set<string>();
    const targetIds: string[] = [];
    const sources: ImportProvenanceSource[] = [];
    const sourceToPreparedTarget = new Map<string, { targetEntityId: string; source: ImportProvenanceSource }>();
    const hashToPreparedTarget = new Map<string, { targetEntityId: string; source: ImportProvenanceSource }>();

    for (const row of readyRows) {
      const targetEntityId = uuid(row, targetIdColumnFor(entityType));
      const key = rowKey(entityType, targetEntityId);
      if (!targetEntityId) {
        addDuplicateIssue(duplicateIssues, heldKeys, {
          entityType,
          targetEntityId,
          source: null,
          reason: 'missing_target_id',
          details: `Ready ${entityType} row is missing ${targetIdColumnFor(entityType)}`,
          provenanceConflict: true,
        });
        provenanceConflicts += 1;
        continue;
      }

      if (seenTargets.has(targetEntityId)) {
        addDuplicateIssue(duplicateIssues, heldKeys, {
          entityType,
          targetEntityId,
          source: null,
          reason: 'duplicate_target_id_in_bundle',
          details: `Prepared bundle contains multiple ready ${entityType} rows for target id ${targetEntityId}`,
          provenanceConflict: true,
        });
        provenanceConflicts += 1;
      }
      seenTargets.add(targetEntityId);
      targetIds.push(targetEntityId);

      for (const source of provenanceByTarget.get(key) ?? []) {
        sources.push(source);
        sourceToPreparedTarget.set(sourceKey(source), { targetEntityId, source });
        const existingSourceClaim = sourceClaims.get(entitySourceKey(entityType, source));
        if (existingSourceClaim && existingSourceClaim.targetEntityId !== targetEntityId) {
          addDuplicateIssue(duplicateIssues, heldKeys, {
            entityType,
            targetEntityId,
            source,
            reason: 'source_maps_to_multiple_targets_in_bundle',
            details: `Source row is already claimed by ${existingSourceClaim.entityType}:${existingSourceClaim.targetEntityId}`,
            provenanceConflict: true,
          });
          provenanceConflicts += 1;
        } else {
          sourceClaims.set(entitySourceKey(entityType, source), { entityType, targetEntityId });
        }

        if (source.source_row_hash) {
          const hashKey = sourceHashKey(entityType, source.source_row_hash);
          hashToPreparedTarget.set(hashKey, { targetEntityId, source });
          const existingHashClaim = sourceHashClaims.get(hashKey);
          if (existingHashClaim && existingHashClaim.targetEntityId !== targetEntityId) {
            addDuplicateIssue(duplicateIssues, heldKeys, {
              entityType,
              targetEntityId,
              source,
              reason: 'source_hash_maps_to_multiple_targets_in_bundle',
              details: `Source hash is already claimed by ${existingHashClaim.entityType}:${existingHashClaim.targetEntityId}`,
              provenanceConflict: true,
            });
            provenanceConflicts += 1;
          } else {
            sourceHashClaims.set(hashKey, { entityType, targetEntityId });
          }
        }
      }
    }

    const existingProvenance = await findExistingProvenance(client, organizationId, entityType, targetIds, sources);
    for (const existing of existingProvenance) {
      const key = rowKey(entityType, existing.target_entity_id);
      const matchingSources = provenanceByTarget.get(key) ?? [];
      const existingSourceKey = sourceKey(existing);
      const existingHashKey = existing.source_row_hash ? sourceHashKey(entityType, existing.source_row_hash) : null;
      const sameSource = matchingSources.some(
        (source) =>
          source.source_file === existing.source_file &&
          source.source_table === existing.source_table &&
          source.source_row_id === existing.source_row_id &&
          (!source.source_row_hash || !existing.source_row_hash || source.source_row_hash === existing.source_row_hash)
      );

      if (sameSource) {
        idempotentUpdates += 1;
        continue;
      }

      const requestedBySource = sourceToPreparedTarget.get(existingSourceKey);
      const requestedByHash = existingHashKey ? hashToPreparedTarget.get(existingHashKey) : undefined;
      const requestedDifferentTarget =
        requestedBySource?.targetEntityId !== existing.target_entity_id ? requestedBySource : undefined;
      const requestedDifferentHashTarget =
        requestedByHash?.targetEntityId !== existing.target_entity_id ? requestedByHash : undefined;
      const conflictingRequest = requestedDifferentTarget ?? requestedDifferentHashTarget;

      if (conflictingRequest) {
        addDuplicateIssue(duplicateIssues, heldKeys, {
          entityType,
          targetEntityId: conflictingRequest.targetEntityId,
          source: conflictingRequest.source,
          reason: 'source_already_imported_to_different_target',
          details: `Existing CBIS provenance maps this source to ${entityType}:${existing.target_entity_id}`,
          provenanceConflict: true,
        });
        provenanceConflicts += 1;
        continue;
      }

      addDuplicateIssue(duplicateIssues, heldKeys, {
        entityType,
        targetEntityId: existing.target_entity_id,
        source: matchingSources[0] ?? {
          source_file: existing.source_file,
          source_table: existing.source_table,
          source_row_id: existing.source_row_id,
          source_row_hash: existing.source_row_hash,
        },
        reason: 'provenance_conflict',
        details: `Existing CBIS provenance for ${entityType}:${existing.target_entity_id} does not match this prepared row`,
        provenanceConflict: true,
      });
      provenanceConflicts += 1;
    }

    for (const row of readyRows) {
      const targetEntityId = uuid(row, targetIdColumnFor(entityType));
      const key = rowKey(entityType, targetEntityId);
      if (!targetEntityId || heldKeys.has(key)) {
        continue;
      }

      const duplicateReason = await hasNaturalDuplicate(client, entityType, row, targetEntityId, organizationId);
      if (duplicateReason) {
        addDuplicateIssue(duplicateIssues, heldKeys, {
          entityType,
          targetEntityId,
          source: (provenanceByTarget.get(key) ?? [])[0] ?? null,
          reason: 'duplicate_conflict',
          details: `Existing app row matches natural key: ${duplicateReason}`,
          provenanceConflict: false,
        });
        continue;
      }

      safeRows[entityType].push(row);
      safeProvenance.set(key, provenanceByTarget.get(key) ?? []);
    }
  }

  const safetyPlan = {
    duplicateIssues,
    heldKeys,
    safeRows,
    safeProvenance,
    idempotentUpdates,
    provenanceConflicts,
  };
  holdDependentRowsForReview(bundle, safetyPlan);
  return safetyPlan;
};

export const applyDuplicatePlanToResults = (
  results: Record<CbisImportEntityType, CbisImportEntityResult>,
  safetyPlan: DuplicateSafetyPlan
): void => {
  const heldByEntity = new Map<CbisImportEntityType, Set<string>>();
  for (const issue of safetyPlan.duplicateIssues) {
    const held = heldByEntity.get(issue.entityType) ?? new Set<string>();
    held.add(issue.targetEntityId ?? issue.reason);
    heldByEntity.set(issue.entityType, held);
  }

  for (const [entityType, held] of heldByEntity.entries()) {
    results[entityType].review_required += held.size;
  }
};
