import { mkdtemp, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  CBIS_IMPORT_FILES,
  loadCbisImportBundle,
  parseCsv,
} from '../cbisImportBundle';

const writeMinimalBundle = async (dir: string): Promise<void> => {
  await writeFile(
    path.join(dir, 'cbis_import_summary.json'),
    JSON.stringify({ schema_bundle_version: 'test-schema', entity_status_counts: {} })
  );
  await writeFile(path.join(dir, 'nonprofit_manager_schema_bundle.json'), JSON.stringify({ version: 'test-schema' }));
  await writeFile(path.join(dir, 'cbis_import_entity_map.csv'), 'source_file,source_table,source_row_id,target_entity_type,target_entity_id,target_row_status\n');
  await writeFile(path.join(dir, 'cbis_import_gap_report.csv'), 'scope,gap_category,reason\n');
  await writeFile(path.join(dir, 'cbis_import_readiness_report.md'), '# ready\n');
  await Promise.all(
    Object.values(CBIS_IMPORT_FILES).map((filename) =>
      writeFile(path.join(dir, filename), 'row_status,validation_errors,validation_warnings\n')
    )
  );
};

describe('CBIS import bundle loader', () => {
  it('parses quoted CSV values without splitting embedded commas', () => {
    const rows = parseCsv('id,name,notes\n1,"Ada, Lovelace","line ""one"""\n');

    expect(rows).toEqual([
      {
        id: '1',
        name: 'Ada, Lovelace',
        notes: 'line "one"',
      },
    ]);
  });

  it('loads the prepared bundle contract and computes a stable fingerprint', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cbis-bundle-'));
    await writeMinimalBundle(dir);

    const bundle = await loadCbisImportBundle(dir);

    expect(bundle.schemaBundle.version).toBe('test-schema');
    expect(bundle.fingerprint).toMatch(/^sha256:/);
    expect(Object.keys(bundle.entities).sort()).toEqual(Object.keys(CBIS_IMPORT_FILES).sort());
  });

  it('rejects incomplete prepared bundles', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cbis-bundle-missing-'));

    await expect(loadCbisImportBundle(dir)).rejects.toThrow('Missing required CBIS import bundle file');
  });
});
