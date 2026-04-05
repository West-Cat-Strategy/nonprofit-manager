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
import type { CreateTemplateRequest } from '../../../src/types/reportTemplate';

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
    query.mockResolvedValueOnce({
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
    });

    const result = await service.instantiateTemplate({
      template_id: 'template-1',
      save_as_name: 'Renamed Case Variants Export',
    });

    expect(result.name).toBe('Renamed Case Variants Export');
    expect(result.fields).toEqual(['case_type_names', 'case_outcome_values']);
  });
});
