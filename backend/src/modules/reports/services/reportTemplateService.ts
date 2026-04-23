import { Pool } from 'pg';
import { logger } from '@config/logger';
import type {
  CreateTemplateRequest,
  InstantiateTemplateRequest,
  ReportTemplate,
  TemplateCategory,
} from '@app-types/reportTemplate';
import type { ReportDefinition } from '@app-types/report';
import {
  getSystemReportTemplates,
} from './reportTemplateSystemTemplates';
import { validateReportTemplateDefinition } from './reportTemplateValidation';

type ReportTemplateRow = Omit<ReportTemplate, 'parameters' | 'tags'> & {
  parameters?: ReportTemplate['parameters'];
  tags?: string[] | null;
};

function normalizeTemplateRow(row: ReportTemplateRow): ReportTemplate {
  return {
    ...row,
    template_definition: row.template_definition,
    parameters: row.parameters || [],
    tags: row.tags || [],
  };
}

export class ReportTemplateService {
  private ensureSystemTemplatesSeededPromise: Promise<void> | null = null;

  constructor(private pool: Pool) {}

  private validateTemplateDefinition(definition: ReportDefinition): void {
    validateReportTemplateDefinition(definition);
  }

  async seedSystemTemplates(): Promise<void> {
    const templates = getSystemReportTemplates();

    for (const template of templates) {
      try {
        this.validateTemplateDefinition(template.template_definition);
        await this.pool.query(
          `INSERT INTO report_templates (name, description, category, tags, entity, template_definition, parameters, is_system)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)
           ON CONFLICT (name) WHERE is_system = true DO UPDATE
           SET description = $2, category = $3, tags = $4, entity = $5, template_definition = $6, parameters = $7`,
          [
            template.name,
            template.description,
            template.category,
            template.tags,
            template.entity,
            JSON.stringify(template.template_definition),
            JSON.stringify(template.parameters || []),
          ]
        );
      } catch (error) {
        logger.error('Error seeding template', { template: template.name, error });
      }
    }
  }

  private async ensureSystemTemplatesSeeded(): Promise<void> {
    if (!this.ensureSystemTemplatesSeededPromise) {
      this.ensureSystemTemplatesSeededPromise = this.seedSystemTemplates().catch((error) => {
        this.ensureSystemTemplatesSeededPromise = null;
        throw error;
      });
    }

    await this.ensureSystemTemplatesSeededPromise;
  }

  async getTemplates(category?: TemplateCategory): Promise<ReportTemplate[]> {
    try {
      await this.ensureSystemTemplatesSeeded();

      const query = category
        ? `SELECT * FROM report_templates WHERE category = $1 ORDER BY is_system DESC, name ASC`
        : `SELECT * FROM report_templates ORDER BY is_system DESC, name ASC`;

      const params = category ? [category] : [];
      const result = await this.pool.query(query, params);

      return result.rows.map(normalizeTemplateRow);
    } catch (error) {
      logger.error('Error fetching templates', { error });
      throw Object.assign(new Error('Failed to fetch templates'), { cause: error });
    }
  }

  async getTemplateById(id: string): Promise<ReportTemplate | null> {
    try {
      await this.ensureSystemTemplatesSeeded();

      const result = await this.pool.query('SELECT * FROM report_templates WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return normalizeTemplateRow(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching template', { id, error });
      throw Object.assign(new Error('Failed to fetch template'), { cause: error });
    }
  }

  async createTemplate(request: CreateTemplateRequest): Promise<ReportTemplate> {
    try {
      this.validateTemplateDefinition(request.template_definition as ReportDefinition);

      const result = await this.pool.query(
        `INSERT INTO report_templates (name, description, category, tags, entity, template_definition, parameters, is_system)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false)
         RETURNING *`,
        [
          request.name,
          request.description,
          request.category,
          request.tags || [],
          request.entity,
          JSON.stringify(request.template_definition),
          JSON.stringify(request.parameters || []),
        ]
      );

      return normalizeTemplateRow(result.rows[0]);
    } catch (error) {
      logger.error('Error creating template', { error });
      throw Object.assign(new Error('Failed to create template'), { cause: error });
    }
  }

  async instantiateTemplate(request: InstantiateTemplateRequest): Promise<ReportDefinition> {
    try {
      const template = await this.getTemplateById(request.template_id);
      if (!template) {
        throw new Error('Template not found');
      }

      let definition = { ...template.template_definition };

      if (template.parameters && request.parameter_values) {
        definition = this.substituteParameters(
          definition,
          template.parameters,
          request.parameter_values
        );
      }

      if (request.save_as_name) {
        definition.name = request.save_as_name;
      }

      this.validateTemplateDefinition(definition as ReportDefinition);
      return definition;
    } catch (error) {
      logger.error('Error instantiating template', { error });
      throw Object.assign(new Error('Failed to instantiate template'), { cause: error });
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const result = await this.pool.query(
        'DELETE FROM report_templates WHERE id = $1 AND is_system = false',
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error('Template not found or cannot delete system template');
      }
    } catch (error) {
      logger.error('Error deleting template', { id, error });
      throw Object.assign(new Error('Failed to delete template'), { cause: error });
    }
  }

  private substituteParameters(
    definition: ReportDefinition,
    parameters: NonNullable<ReportTemplate['parameters']>,
    values: Record<string, string | number>
  ): ReportDefinition {
    let definitionStr = JSON.stringify(definition);

    for (const param of parameters) {
      const value = values[param.name];
      if (value !== undefined) {
        const placeholder = `{{${param.name}}}`;
        definitionStr = definitionStr.replace(new RegExp(placeholder, 'g'), String(value));
      } else if (param.required) {
        throw new Error(`Required parameter missing: ${param.name}`);
      }
    }

    return JSON.parse(definitionStr);
  }
}

export default ReportTemplateService;
