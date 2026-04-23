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

import { logger } from '@config/logger';
import type { ReportDefinition } from '@app-types/report';
import { ReportTemplateService } from '@modules/reports/services/reportTemplateService';
import { getSystemReportTemplates } from '@modules/reports/services/reportTemplateSystemTemplates';
import * as systemTemplatesModule from '@modules/reports/services/reportTemplateSystemTemplates';
import { validateReportTemplateDefinition } from '@modules/reports/services/reportTemplateValidation';
import type { CreateTemplateRequest } from '../../../src/types/reportTemplate';

const getInsertCalls = (): jest.Mock['mock']['calls'] =>
  query.mock.calls.filter(
    ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO report_templates')
  );

const getSelectCalls = (): jest.Mock['mock']['calls'] =>
  query.mock.calls.filter(
    ([sql]) => typeof sql === 'string' && sql.includes('SELECT * FROM report_templates')
  );

const buildDefinition = (): ReportDefinition => ({
  name: 'Donor Summary Export',
  entity: 'donations',
  fields: ['donor_name'],
});

describe('ReportTemplateService', () => {
  let service: ReportTemplateService;

  beforeEach(() => {
    query.mockReset();
    jest.clearAllMocks();
    service = new ReportTemplateService({ query } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const buildCreateRequest = (): CreateTemplateRequest => ({
    name: 'Donor Summary Export',
    description: 'Exports donor summary rows',
    category: 'fundraising',
    tags: ['donations'],
    entity: 'donations',
    template_definition: buildDefinition(),
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

  it.each([
    {
      name: 'invalid entity',
      template_definition: {
        name: 'Broken Template',
        entity: 'invalid_entity',
        fields: ['donor_name'],
      },
      expectedMessage: 'Invalid template entity: invalid_entity',
    },
    {
      name: 'invalid field',
      template_definition: {
        name: 'Broken Template',
        entity: 'donations',
        fields: ['not_a_field'],
      },
      expectedMessage: 'Invalid template field: not_a_field',
    },
    {
      name: 'invalid groupBy field',
      template_definition: {
        name: 'Broken Template',
        entity: 'donations',
        fields: ['donor_name'],
        groupBy: ['not_a_group_field'],
      },
      expectedMessage: 'Invalid template groupBy field: not_a_group_field',
    },
    {
      name: 'invalid filter field',
      template_definition: {
        name: 'Broken Template',
        entity: 'donations',
        fields: ['donor_name'],
        filters: [{ field: 'not_a_filter_field', operator: 'eq', value: 'value' }],
      },
      expectedMessage: 'Invalid template filter field: not_a_filter_field',
    },
    {
      name: 'invalid aggregation field',
      template_definition: {
        name: 'Broken Template',
        entity: 'donations',
        fields: ['donor_name'],
        aggregations: [{ field: 'not_an_aggregation_field', function: 'sum', alias: 'total' }],
      },
      expectedMessage: 'Invalid template aggregation field: not_an_aggregation_field',
    },
    {
      name: 'invalid sort field',
      template_definition: {
        name: 'Broken Template',
        entity: 'donations',
        fields: ['donor_name'],
        sort: [{ field: 'not_a_sort_field', direction: 'asc' }],
      },
      expectedMessage: 'Invalid template sort field: not_a_sort_field',
    },
    {
      name: 'no fields or aggregations',
      template_definition: {
        name: 'Broken Template',
        entity: 'donations',
        fields: [],
        aggregations: [],
      },
      expectedMessage: 'Template must include at least one field or aggregation',
    },
  ])('rejects createTemplate for $name', async ({ template_definition, expectedMessage }) => {
    const request = {
      ...buildCreateRequest(),
      template_definition,
    } as CreateTemplateRequest;

    await expect(service.createTemplate(request)).rejects.toMatchObject({
      message: 'Failed to create template',
      cause: expect.objectContaining({
        message: expectedMessage,
      }),
    });
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'unknown filter fields',
      definition: {
        ...buildDefinition(),
        filters: [{ field: 'not_a_filter_field', operator: 'eq', value: 'value' }],
      },
      expectedMessage: 'Invalid template filter field: not_a_filter_field',
    },
    {
      name: 'unknown sort aliases',
      definition: {
        ...buildDefinition(),
        aggregations: [{ field: 'amount', function: 'sum', alias: 'total_amount' }],
        sort: [{ field: 'missing_alias', direction: 'desc' }],
      },
      expectedMessage: 'Invalid template sort field: missing_alias',
    },
    {
      name: 'empty field and aggregation selections',
      definition: {
        ...buildDefinition(),
        fields: [],
        aggregations: [],
      },
      expectedMessage: 'Template must include at least one field or aggregation',
    },
  ])('rejects the extracted validator for $name', ({ definition, expectedMessage }) => {
    expect(() => validateReportTemplateDefinition(definition)).toThrow(expectedMessage);
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

  it('wraps instantiateTemplate failures when the template does not exist', async () => {
    query.mockImplementation(async () => ({ rows: [] }));

    await expect(
      service.instantiateTemplate({
        template_id: 'missing-template',
      })
    ).rejects.toMatchObject({
      message: 'Failed to instantiate template',
      cause: expect.objectContaining({
        message: 'Template not found',
      }),
    });
  });

  it('wraps missing required instantiateTemplate parameters and preserves the root cause', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT * FROM report_templates WHERE id = $1')) {
        return {
          rows: [
            {
              id: 'template-1',
              name: 'Board Pack',
              description: 'Board-ready giving snapshot',
              category: 'fundraising',
              tags: ['board-pack'],
              entity: 'donations',
              template_definition: {
                name: 'Board Pack',
                entity: 'donations',
                fields: ['donor_name', 'donation_date'],
                filters: [
                  {
                    field: 'donation_date',
                    operator: 'gte',
                    value: '{{start_date}}',
                  },
                ],
              },
              parameters: [
                {
                  name: 'start_date',
                  label: 'Start Date',
                  type: 'date',
                  required: true,
                },
              ],
              is_system: false,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          ],
        };
      }

      return { rows: [] };
    });

    await expect(
      service.instantiateTemplate({
        template_id: 'template-1',
        parameter_values: {},
      })
    ).rejects.toMatchObject({
      message: 'Failed to instantiate template',
      cause: expect.objectContaining({
        message: 'Required parameter missing: start_date',
      }),
    });
  });

  it('seeds system templates on read, memoizes concurrent list requests, and avoids reseeding later reads', async () => {
    const systemTemplateCount = getSystemReportTemplates().length;

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
    const systemTemplateCount = getSystemReportTemplates().length;

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

  it('retries seeding on the next read after the seed catalog bootstrap fails once', async () => {
    const validTemplates = getSystemReportTemplates();
    const seedCatalogError = new Error('Template seed catalog unavailable');

    jest
      .spyOn(systemTemplatesModule, 'getSystemReportTemplates')
      .mockImplementationOnce(() => {
        throw seedCatalogError;
      })
      .mockReturnValue(validTemplates);

    query.mockResolvedValue({ rows: [] });

    await expect(service.getTemplates()).rejects.toMatchObject({
      message: 'Failed to fetch templates',
      cause: expect.objectContaining({
        message: seedCatalogError.message,
      }),
    });

    const result = await service.getTemplates('fundraising');

    expect(result).toEqual([]);
    expect(systemTemplatesModule.getSystemReportTemplates).toHaveBeenCalledTimes(2);
    expect(getInsertCalls()).toHaveLength(validTemplates.length);
    expect(getSelectCalls()).toHaveLength(1);
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

  it('wraps deleteTemplate failures when no non-system row is deleted', async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });

    await expect(service.deleteTemplate('missing-template')).rejects.toMatchObject({
      message: 'Failed to delete template',
      cause: expect.objectContaining({
        message: 'Template not found or cannot delete system template',
      }),
    });
  });

  it('logs and skips malformed system templates without aborting the rest of the seed pass', async () => {
    const validTemplates = getSystemReportTemplates();
    const malformedTemplate = {
      ...validTemplates[0],
      name: 'Malformed Seed Template',
      template_definition: {
        ...validTemplates[0].template_definition,
        fields: ['not_a_real_field'],
      },
    };

    jest
      .spyOn(systemTemplatesModule, 'getSystemReportTemplates')
      .mockReturnValue([validTemplates[0], malformedTemplate as never, validTemplates[1]]);

    query.mockResolvedValue({ rows: [] });

    await service.seedSystemTemplates();

    expect(getInsertCalls()).toHaveLength(2);
    expect(getInsertCalls().map(([, params]) => params?.[0])).toEqual([
      validTemplates[0].name,
      validTemplates[1].name,
    ]);
    expect(logger.error).toHaveBeenCalledWith(
      'Error seeding template',
      expect.objectContaining({
        template: 'Malformed Seed Template',
        error: expect.any(Error),
      })
    );
  });

  it('logs and skips seed insert failures without aborting later system templates', async () => {
    const validTemplates = getSystemReportTemplates();
    const failingTemplate = validTemplates[1];

    query.mockImplementation(async (_sql: string, params?: unknown[]) => {
      if (params?.[0] === failingTemplate.name) {
        throw new Error('insert failed');
      }

      return { rows: [] };
    });

    await service.seedSystemTemplates();

    expect(getInsertCalls().map(([, params]) => params?.[0])).toEqual(
      validTemplates.map((template) => template.name)
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error seeding template',
      expect.objectContaining({
        template: failingTemplate.name,
        error: expect.any(Error),
      })
    );
  });
});
