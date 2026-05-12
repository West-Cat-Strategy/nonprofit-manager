import { mkdtemp, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Pool, PoolClient, QueryResult } from 'pg';
import { CBIS_IMPORT_FILES } from '../cbisImportBundle';
import { CbisImportService } from '../cbisImportService';

type QueryCall = [string, unknown[] | undefined];
type QueryResponder = (sql: string, values?: unknown[]) => QueryResult<object> | undefined;

const queryResult = <T extends object>(rows: T[] = []): QueryResult<T> =>
  ({
    rows,
    rowCount: rows.length,
  }) as QueryResult<T>;

const createPoolMock = (
  selectDryRunId?: string,
  respond?: QueryResponder
): { pool: Pool; queryCalls: QueryCall[] } => {
  const queryCalls: QueryCall[] = [];
  const client = {
    query: jest.fn(async (sql: string, values?: unknown[]) => {
      queryCalls.push([sql, values]);
      const response = respond?.(sql, values);
      if (response) {
        return response;
      }
      if (sql.includes('FROM cbis_import_runs') && sql.includes("mode = 'dry-run'")) {
        return queryResult(selectDryRunId ? [{ id: selectDryRunId }] : []);
      }
      if (sql.includes('INSERT INTO cbis_import_runs') && sql.includes('RETURNING id')) {
        return queryResult([{ id: '11111111-1111-4111-8111-111111111111' }]);
      }
      return queryResult();
    }),
    release: jest.fn(),
  } as unknown as PoolClient;

  return {
    pool: {
      connect: jest.fn(async () => client),
    } as unknown as Pool,
    queryCalls,
  };
};

const writeCsv = async (dir: string, filename: string, header: string, rows: string[] = []): Promise<void> => {
  await writeFile(path.join(dir, filename), `${header}\n${rows.join('\n')}${rows.length ? '\n' : ''}`);
};

const writeBundle = async (dir: string): Promise<void> => {
  await writeFile(
    path.join(dir, 'cbis_import_summary.json'),
    JSON.stringify({ schema_bundle_version: 'test-schema', entity_status_counts: {} })
  );
  await writeFile(path.join(dir, 'nonprofit_manager_schema_bundle.json'), JSON.stringify({ version: 'test-schema' }));
  await writeFile(path.join(dir, 'cbis_import_readiness_report.md'), '# ready\n');
  await writeCsv(
    dir,
    'cbis_import_entity_map.csv',
    'source_file,source_table,source_row_id,source_row_number,source_row_hash,cluster_id,cluster_record_type,target_entity_type,target_entity_id,target_row_status,derivation_reason,validation_errors,validation_warnings',
    [
      'Participant.csv,Participant,p1,2,sha256:abc,c1,participant,contact,22222222-2222-4222-8222-222222222222,ready,contact_from_cluster,,',
      'Organization.csv,Organization,o1,3,sha256:org,c2,organization,account,33333333-3333-4333-8333-333333333333,ready,account_from_cluster,,',
      'Legacy.csv,Legacy,l1,4,sha256:legacy,c3,legacy,,,skipped,legacy_skip,,',
    ]
  );
  await writeCsv(
    dir,
    'cbis_import_gap_report.csv',
    'scope,gap_category,entity_type,entity_id,cluster_id,source_table,source_file,source_row_id,source_row_number,source_row_hash,reason,details',
    ['source_row,manual_mapping_required,event,,c2,Class Attendance,Class Attendance.csv,a1,4,sha256:def,attendance_without_resolved_event_title,Needs title']
  );

  await Promise.all(
    Object.entries(CBIS_IMPORT_FILES).map(([entity, filename]) => {
      if (entity === 'accounts') {
        return writeCsv(
          dir,
          filename,
          'account_id,account_number,account_name,account_type,category,email,phone,website,description,address_line1,address_line2,city,state_province,postal_code,country,tax_id,is_active,row_status,validation_errors,validation_warnings',
          ['33333333-3333-4333-8333-333333333333,CBIS-1,CBIS,organization,other,,,,,,,,,,Canada,,true,ready,,']
        );
      }
      return writeCsv(dir, filename, 'row_status,validation_errors,validation_warnings');
    })
  );
};

describe('CBIS import service', () => {
  it('dry-runs ready rows, rolls back live writes, and persists audit metadata', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cbis-service-'));
    await writeBundle(dir);
    const { pool, queryCalls } = createPoolMock();

    const result = await new CbisImportService(pool).run({
      bundleDir: dir,
      organizationId: '44444444-4444-4444-8444-444444444444',
      actorId: '55555555-5555-4555-8555-555555555555',
      mode: 'dry-run',
    });

    expect(result.mode).toBe('dry-run');
    expect(result.status).toBe('succeeded');
    expect(result.per_entity.accounts.imported).toBe(1);
    expect(result.issue_count).toBe(1);
    expect(queryCalls.some(([sql]) => sql === 'BEGIN')).toBe(true);
    expect(queryCalls.some(([sql]) => sql === 'ROLLBACK')).toBe(true);
    expect(queryCalls.some(([sql]) => sql === 'COMMIT')).toBe(false);
    expect(queryCalls.some(([sql]) => sql.includes('INSERT INTO accounts'))).toBe(true);
    expect(queryCalls.some(([sql]) => sql.includes('INSERT INTO cbis_import_issues'))).toBe(true);
    expect(
      queryCalls.some(
        ([sql, values]) => sql.includes('INSERT INTO cbis_import_source_rows') && values?.includes('review_required')
      )
    ).toBe(true);
  });

  it('requires a matching successful dry-run before apply mode', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cbis-service-apply-'));
    await writeBundle(dir);
    const { pool } = createPoolMock();

    await expect(
      new CbisImportService(pool).run({
        bundleDir: dir,
        organizationId: '44444444-4444-4444-8444-444444444444',
        actorId: '55555555-5555-4555-8555-555555555555',
        mode: 'apply',
        rollbackArtifactPath: '/tmp/pre-import.sql.gz',
      })
    ).rejects.toThrow('successful dry-run');
  });

  it('holds natural-key duplicate rows for review instead of writing them live', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cbis-service-duplicate-'));
    await writeBundle(dir);
    const { pool, queryCalls } = createPoolMock(undefined, (sql) => {
      if (sql.includes('FROM accounts WHERE account_number')) {
        return queryResult([{ id: '99999999-9999-4999-8999-999999999999' }]);
      }
      return undefined;
    });

    const result = await new CbisImportService(pool).run({
      bundleDir: dir,
      organizationId: '44444444-4444-4444-8444-444444444444',
      actorId: '55555555-5555-4555-8555-555555555555',
      mode: 'dry-run',
    });

    expect(result.per_entity.accounts.imported).toBe(0);
    expect(result.per_entity.accounts.review_required).toBe(1);
    expect(result.duplicate_safety.duplicate_conflicts).toBe(1);
    expect(result.duplicate_safety.held_for_review).toBe(1);
    expect(queryCalls.some(([sql]) => sql.includes('INSERT INTO accounts'))).toBe(false);
    const beginIndex = queryCalls.findIndex(([sql]) => sql === 'BEGIN');
    const rlsIndex = queryCalls.findIndex(([sql]) => sql.includes("set_config('app.current_user_id'"));
    const duplicateCheckIndex = queryCalls.findIndex(([sql]) => sql.includes('FROM accounts WHERE account_number'));
    expect(beginIndex).toBeGreaterThanOrEqual(0);
    expect(rlsIndex).toBeGreaterThan(beginIndex);
    expect(duplicateCheckIndex).toBeGreaterThan(rlsIndex);
    expect(
      queryCalls.some(
        ([sql, values]) => sql.includes('INSERT INTO cbis_import_issues') && values?.includes('duplicate_conflict')
      )
    ).toBe(true);
  });

  it('holds dependent ready rows when their prepared parent is held for review', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cbis-service-dependent-hold-'));
    await writeBundle(dir);
    await writeCsv(
      dir,
      CBIS_IMPORT_FILES.contacts,
      'contact_id,account_id,first_name,last_name,row_status,validation_errors,validation_warnings',
      [
        '22222222-2222-4222-8222-222222222222,33333333-3333-4333-8333-333333333333,Casey,Client,ready,,',
      ]
    );
    const { pool, queryCalls } = createPoolMock(undefined, (sql) => {
      if (sql.includes('FROM accounts WHERE account_number')) {
        return queryResult([{ id: '99999999-9999-4999-8999-999999999999' }]);
      }
      return undefined;
    });

    const result = await new CbisImportService(pool).run({
      bundleDir: dir,
      organizationId: '44444444-4444-4444-8444-444444444444',
      actorId: '55555555-5555-4555-8555-555555555555',
      mode: 'dry-run',
    });

    expect(result.per_entity.accounts.imported).toBe(0);
    expect(result.per_entity.contacts.imported).toBe(0);
    expect(result.per_entity.contacts.review_required).toBe(1);
    expect(result.duplicate_safety.held_for_review).toBe(2);
    expect(queryCalls.some(([sql]) => sql.includes('INSERT INTO contacts'))).toBe(false);
    expect(
      queryCalls.some(
        ([sql, values]) => sql.includes('INSERT INTO cbis_import_issues') && values?.includes('dependent_row_held')
      )
    ).toBe(true);
  });

  it('reuses existing case lookup rows by name before importing cases', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cbis-service-case-lookups-'));
    await writeBundle(dir);
    await writeCsv(
      dir,
      CBIS_IMPORT_FILES.cases,
      'case_id,case_number,contact_id,account_id,case_type_id,case_type_name,status_id,status_name,priority,title,row_status,validation_errors,validation_warnings',
      [
        '44444444-4444-4444-8444-444444444444,CASE-1,22222222-2222-4222-8222-222222222222,,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,General Support,bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb,Active,medium,Case One,ready,,',
      ]
    );
    await writeCsv(
      dir,
      CBIS_IMPORT_FILES.case_type_assignments,
      'assignment_id,case_id,case_type_id,case_type_name,is_primary,sort_order,row_status,validation_errors,validation_warnings',
      [
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc,44444444-4444-4444-8444-444444444444,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,General Support,true,0,ready,,',
      ]
    );
    const existingCaseTypeId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const existingStatusId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    const { pool, queryCalls } = createPoolMock(undefined, (sql) => {
      if (sql.includes('FROM case_types')) {
        return queryResult([{ id: existingCaseTypeId, name: 'General Support' }]);
      }
      if (sql.includes('FROM case_statuses')) {
        return queryResult([{ id: existingStatusId, name: 'Active', status_type: 'active' }]);
      }
      return undefined;
    });

    const result = await new CbisImportService(pool).run({
      bundleDir: dir,
      organizationId: '44444444-4444-4444-8444-444444444444',
      actorId: '55555555-5555-4555-8555-555555555555',
      mode: 'dry-run',
    });

    expect(result.per_entity.cases.imported).toBe(1);
    expect(queryCalls.some(([sql]) => sql.includes('INSERT INTO case_types'))).toBe(false);
    expect(queryCalls.some(([sql]) => sql.includes('INSERT INTO case_statuses'))).toBe(false);
    expect(
      queryCalls.some(
        ([sql, values]) =>
          sql.includes('INSERT INTO cases') &&
          values?.includes(existingCaseTypeId) &&
          values?.includes(existingStatusId)
      )
    ).toBe(true);
    expect(
      queryCalls.some(
        ([sql, values]) => sql.includes('INSERT INTO case_type_assignments') && values?.includes(existingCaseTypeId)
      )
    ).toBe(true);
  });

  it('truncates long label fields while keeping long descriptions importable', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cbis-service-long-labels-'));
    await writeBundle(dir);
    const longLabel = 'x'.repeat(300);
    const truncatedLabel = `${'x'.repeat(252)}...`;
    await writeCsv(
      dir,
      CBIS_IMPORT_FILES.activities,
      'activity_id,activity_type,subject,description,activity_date,row_status,validation_errors,validation_warnings',
      [
        `66666666-6666-4666-8666-666666666666,note,${longLabel},${'d'.repeat(300)},2026-01-01T00:00:00Z,ready,,`,
      ]
    );
    await writeCsv(
      dir,
      CBIS_IMPORT_FILES.activity_events,
      'activity_event_id,activity_type,title,description,entity_type,entity_id,occurred_at,source_record_id,row_status,validation_errors,validation_warnings',
      [
        `77777777-7777-4777-8777-777777777777,note,${longLabel},${'d'.repeat(300)},account,33333333-3333-4333-8333-333333333333,2026-01-01T00:00:00Z,88888888-8888-4888-8888-888888888888,ready,,`,
      ]
    );
    const { pool, queryCalls } = createPoolMock();

    const result = await new CbisImportService(pool).run({
      bundleDir: dir,
      organizationId: '44444444-4444-4444-8444-444444444444',
      actorId: '55555555-5555-4555-8555-555555555555',
      mode: 'dry-run',
    });

    expect(result.per_entity.activities.imported).toBe(1);
    expect(result.per_entity.activity_events.imported).toBe(1);
    expect(
      queryCalls.some(([sql, values]) => sql.includes('INSERT INTO activities') && values?.includes(truncatedLabel))
    ).toBe(true);
    expect(
      queryCalls.some(([sql, values]) => sql.includes('INSERT INTO activity_events') && values?.includes(truncatedLabel))
    ).toBe(true);
  });

  it('holds rows when existing CBIS provenance points the source at a different target', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cbis-service-provenance-conflict-'));
    await writeBundle(dir);
    const { pool, queryCalls } = createPoolMock(undefined, (sql) => {
      if (sql.includes('FROM cbis_import_target_provenance')) {
        return queryResult([
          {
            target_entity_type: 'accounts',
            target_entity_id: '99999999-9999-4999-8999-999999999999',
            source_file: 'Organization.csv',
            source_table: 'Organization',
            source_row_id: 'o1',
            source_row_hash: 'sha256:org',
          },
        ]);
      }
      return undefined;
    });

    const result = await new CbisImportService(pool).run({
      bundleDir: dir,
      organizationId: '44444444-4444-4444-8444-444444444444',
      actorId: '55555555-5555-4555-8555-555555555555',
      mode: 'dry-run',
    });

    expect(result.per_entity.accounts.imported).toBe(0);
    expect(result.duplicate_safety.provenance_conflicts).toBe(1);
    expect(result.duplicate_safety.held_for_review).toBe(1);
    expect(queryCalls.some(([sql]) => sql.includes('INSERT INTO accounts'))).toBe(false);
  });

  it('allows same-source same-target apply reruns as idempotent updates', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cbis-service-idempotent-'));
    await writeBundle(dir);
    const { pool, queryCalls } = createPoolMock(
      '66666666-6666-4666-8666-666666666666',
      (sql) => {
        if (sql.includes('FROM cbis_import_target_provenance')) {
          return queryResult([
            {
              target_entity_type: 'accounts',
              target_entity_id: '33333333-3333-4333-8333-333333333333',
              source_file: 'Organization.csv',
              source_table: 'Organization',
              source_row_id: 'o1',
              source_row_hash: 'sha256:org',
            },
          ]);
        }
        return undefined;
      }
    );

    const result = await new CbisImportService(pool).run({
      bundleDir: dir,
      organizationId: '44444444-4444-4444-8444-444444444444',
      actorId: '55555555-5555-4555-8555-555555555555',
      mode: 'apply',
      rollbackArtifactPath: '/tmp/pre-import.sql.gz',
    });

    expect(result.per_entity.accounts.imported).toBe(1);
    expect(result.duplicate_safety.idempotent_updates).toBe(1);
    expect(result.duplicate_safety.held_for_review).toBe(0);
    expect(queryCalls.some(([sql]) => sql.includes('INSERT INTO accounts'))).toBe(true);
    expect(queryCalls.some(([sql]) => sql.includes('INSERT INTO cbis_import_target_provenance'))).toBe(true);
    expect(queryCalls.some(([sql]) => sql === 'COMMIT')).toBe(true);
  });
});
