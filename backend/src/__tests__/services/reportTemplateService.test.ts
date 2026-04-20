/**
 * ReportTemplateService Tests
 * Validates report templates accept the case alignment field catalog.
 */

const query = jest.fn();

jest.mock('../../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { ReportTemplateService } from '../../../src/services/reportTemplateService';
import type { CreateTemplateRequest, ReportTemplate } from '../../../src/types/reportTemplate';

type SystemTemplateSeed = Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at' | 'is_system'>;

const getSystemTemplates = (service: ReportTemplateService): SystemTemplateSeed[] =>
  (
    service as unknown as {
      getSystemTemplates: () => SystemTemplateSeed[];
    }
  ).getSystemTemplates();

const getInsertCalls = (): jest.Mock['mock']['calls'] =>
  query.mock.calls.filter(
    ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO report_templates')
  );

const getSelectCalls = (): jest.Mock['mock']['calls'] =>
  query.mock.calls.filter(
    ([sql]) => typeof sql === 'string' && sql.includes('SELECT * FROM report_templates')
  );

describe('ReportTemplateService', () => {
  let service: ReportTemplateService;

  beforeEach(() => {
    query.mockReset();
    service = new ReportTemplateService({ query } as never);
  });

  it('creates a cases template with the new multi-value case fields', async () => {
    const request: CreateTemplateRequest = {
      name: 'Case Variants Export',
      description: 'Exports case label variants',
      category: 'operations',
      tags: ['cases'],
      entity: 'cases',
      template_definition: {
        name: 'Case Variants Export',
        entity: 'cases',
        fields: ['case_type_names', 'case_outcome_values'],
      },
    };

    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'template-1',
          name: request.name,
          description: request.description,
          category: request.category,
          tags: request.tags,
          entity: request.entity,
          template_definition: request.template_definition,
          parameters: [],
          is_system: false,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    });

    const result = await service.createTemplate(request);

    expect(result.template_definition.fields).toEqual(['case_type_names', 'case_outcome_values']);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO report_templates'),
      expect.any(Array)
    );
  });

  it('instantiates a cases template with the new multi-value case fields intact', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT * FROM report_templates WHERE id = $1')) {
        return {
          rows: [
            {
              id: 'template-1',
              name: 'Case Variants Export',
              description: 'Exports case label variants',
              category: 'operations',
              tags: ['cases'],
              entity: 'cases',
              template_definition: {
                name: 'Case Variants Export',
                entity: 'cases',
                fields: ['case_type_names', 'case_outcome_values'],
              },
              parameters: [],
              is_system: false,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          ],
        };
      }

      return { rows: [] };
    });

    const result = await service.instantiateTemplate({
      template_id: 'template-1',
      save_as_name: 'Renamed Case Variants Export',
    });

    expect(result.name).toBe('Renamed Case Variants Export');
    expect(result.fields).toEqual(['case_type_names', 'case_outcome_values']);
  });

  it('seeds system templates on read, memoizes concurrent list requests, and avoids reseeding later reads', async () => {
    const systemTemplateCount = getSystemTemplates(service).length;

    let releaseFirstInsert: (() => void) | null = null;
    const firstInsertGate = new Promise<void>((resolve) => {
      releaseFirstInsert = resolve;
    });

    let insertCount = 0;
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO report_templates')) {
        insertCount += 1;
        if (insertCount === 1) {
          await firstInsertGate;
        }
      }

      return { rows: [] };
    });

    const firstRead = service.getTemplates();
    const secondRead = service.getTemplates('fundraising');

    await Promise.resolve();
    releaseFirstInsert?.();

    await Promise.all([firstRead, secondRead]);
    await service.getTemplateById('template-1');

    expect(getInsertCalls()).toHaveLength(systemTemplateCount);
    expect(getSelectCalls()).toHaveLength(3);
    expect(query.mock.calls[0]?.[0]).toContain('INSERT INTO report_templates');
    expect(query.mock.calls[systemTemplateCount]?.[0]).toContain('SELECT * FROM report_templates');
  });

  it('seeds system templates before fetching a template by id on a fresh service', async () => {
    const systemTemplateCount = getSystemTemplates(service).length;

    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT * FROM report_templates WHERE id = $1')) {
        return { rows: [] };
      }

      return { rows: [] };
    });

    const result = await service.getTemplateById('missing-template');

    expect(result).toBeNull();
    expect(getInsertCalls()).toHaveLength(systemTemplateCount);
    expect(query.mock.calls[systemTemplateCount]?.[0]).toContain(
      'SELECT * FROM report_templates WHERE id = $1'
    );
  });

  it('seeds the new board-pack and fundraiser workflow templates with the required tags', async () => {
    query.mockResolvedValue({ rows: [] });

    await service.seedSystemTemplates();

    const seedPayloads = getInsertCalls().map(([, params]) => ({
      name: params?.[0],
      category: params?.[2],
      tags: params?.[3],
      entity: params?.[4],
    }));

    expect(seedPayloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Executive Board Pack Fundraising Snapshot',
          category: 'fundraising',
          entity: 'donations',
          tags: expect.arrayContaining(['board-pack', 'executive', 'board']),
        }),
        expect.objectContaining({
          name: 'Board Reporting Calendar',
          category: 'compliance',
          entity: 'grants',
          tags: expect.arrayContaining(['board-pack', 'executive', 'board']),
        }),
        expect.objectContaining({
          name: 'Fundraiser Stewardship Cadence Queue',
          category: 'fundraising',
          entity: 'follow_ups',
          tags: expect.arrayContaining(['fundraising-cadence', 'stewardship']),
        }),
        expect.objectContaining({
          name: 'Fundraiser Impact Update Gifts',
          category: 'fundraising',
          entity: 'donations',
          tags: expect.arrayContaining(['fundraising-cadence', 'stewardship', 'impact']),
        }),
      ])
    );
  });
});
