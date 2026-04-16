import { buildCaseProvenance, buildImportedCaseProvenance } from '../importProvenance';

describe('importProvenance', () => {
  it('builds a nested imported provenance payload from imported source rows', () => {
    const provenance = buildImportedCaseProvenance({
      clusterId: 'cluster-123',
      primaryLabel: 'Housing support',
      recordType: 'client',
      sourceTables: ['client', 'services'],
      sourceFiles: ['client.csv', 'services.csv'],
      sourceRowIds: ['row-1', 'row-2'],
      participantIds: ['person-1', 'person-2'],
      sourceTypeBreakdown: ['client', 'services'],
      linkConfidence: 0.94,
      sourceRows: [
        { sourceTable: 'client', sourceRowId: 'row-1', recordType: 'client' },
        { sourceTable: 'services', sourceRowId: 'row-2', recordType: 'services' },
      ],
    });

    expect(provenance).toEqual(
      expect.objectContaining({
        system: 'imported',
        cluster_id: 'cluster-123',
        primary_label: 'Housing support',
        record_type: 'client',
        source_tables: ['client', 'services'],
        source_files: ['client.csv', 'services.csv'],
        participant_ids: ['person-1', 'person-2'],
        source_row_ids: ['row-1', 'row-2'],
        source_row_count: 2,
        source_table_count: 2,
        source_file_count: 2,
        source_type_breakdown: ['client', 'services'],
        confidence_label: 'high',
        is_low_confidence: false,
      })
    );

    expect(provenance.source_role_breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_role: 'client',
          source_tables: ['client'],
          source_row_count: 1,
          source_row_ids: ['row-1'],
        }),
        expect.objectContaining({
          source_role: 'services',
          source_tables: ['services'],
          source_row_count: 1,
          source_row_ids: ['row-2'],
        }),
      ])
    );

    expect(buildCaseProvenance({ import_provenance: provenance })).toEqual(provenance);
  });
});
