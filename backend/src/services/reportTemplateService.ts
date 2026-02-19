/**
 * Report Template Service
 * Manages report templates and instantiation
 */

import { Pool } from 'pg';
import { logger } from '@config/logger';
import type {
    ReportTemplate,
    CreateTemplateRequest,
    InstantiateTemplateRequest,
    TemplateCategory,
} from '@app-types/reportTemplate';
import type { ReportDefinition } from '@app-types/report';

export class ReportTemplateService {
    constructor(private pool: Pool) { }

    /**
     * Seed system templates
     */
    async seedSystemTemplates(): Promise<void> {
        const templates = this.getSystemTemplates();

        for (const template of templates) {
            try {
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

    /**
     * Get all templates
     */
    async getTemplates(category?: TemplateCategory): Promise<ReportTemplate[]> {
        try {
            const query = category
                ? `SELECT * FROM report_templates WHERE category = $1 ORDER BY is_system DESC, name ASC`
                : `SELECT * FROM report_templates ORDER BY is_system DESC, name ASC`;

            const params = category ? [category] : [];
            const result = await this.pool.query(query, params);

            return result.rows.map(row => ({
                ...row,
                template_definition: row.template_definition,
                parameters: row.parameters || [],
                tags: row.tags || [],
            }));
        } catch (error) {
            logger.error('Error fetching templates', { error });
            throw Object.assign(new Error('Failed to fetch templates'), { cause: error });
        }
    }

    /**
     * Get template by ID
     */
    async getTemplateById(id: string): Promise<ReportTemplate | null> {
        try {
            const result = await this.pool.query(
                'SELECT * FROM report_templates WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                ...row,
                template_definition: row.template_definition,
                parameters: row.parameters || [],
                tags: row.tags || [],
            };
        } catch (error) {
            logger.error('Error fetching template', { id, error });
            throw Object.assign(new Error('Failed to fetch template'), { cause: error });
        }
    }

    /**
     * Create custom template
     */
    async createTemplate(request: CreateTemplateRequest): Promise<ReportTemplate> {
        try {
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

            const row = result.rows[0];
            return {
                ...row,
                template_definition: row.template_definition,
                parameters: row.parameters || [],
                tags: row.tags || [],
            };
        } catch (error) {
            logger.error('Error creating template', { error });
            throw Object.assign(new Error('Failed to create template'), { cause: error });
        }
    }

    /**
     * Instantiate template with parameters
     */
    async instantiateTemplate(request: InstantiateTemplateRequest): Promise<ReportDefinition> {
        try {
            const template = await this.getTemplateById(request.template_id);
            if (!template) {
                throw new Error('Template not found');
            }

            let definition = { ...template.template_definition };

            // Substitute parameters
            if (template.parameters && request.parameter_values) {
                definition = this.substituteParameters(
                    definition,
                    template.parameters,
                    request.parameter_values
                );
            }

            // Override name if provided
            if (request.save_as_name) {
                definition.name = request.save_as_name;
            }

            return definition;
        } catch (error) {
            logger.error('Error instantiating template', { error });
            throw Object.assign(new Error('Failed to instantiate template'), { cause: error });
        }
    }

    /**
     * Delete custom template
     */
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

    /**
     * Substitute parameters in template definition
     */
    private substituteParameters(
        definition: ReportDefinition,
        parameters: any[],
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

    /**
     * Get system template definitions
     */
    private getSystemTemplates(): Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at' | 'is_system'>[] {
        return [
            {
                name: 'Monthly Donor Summary',
                description: 'Summary of all donations received in a specific month',
                category: 'fundraising',
                tags: ['donations', 'monthly', 'summary'],
                entity: 'donations',
                template_definition: {
                    name: 'Monthly Donor Summary',
                    entity: 'donations',
                    fields: ['donor_name', 'donation_date', 'amount', 'payment_method'],
                    groupBy: ['donor_name'],
                    aggregations: [
                        { field: 'amount', function: 'sum', alias: 'total_donated' },
                        { field: 'amount', function: 'count', alias: 'donation_count' },
                    ],
                    filters: [
                        {
                            field: 'donation_date',
                            operator: 'gte',
                            value: '{{start_date}}',
                        },
                        {
                            field: 'donation_date',
                            operator: 'lte',
                            value: '{{end_date}}',
                        },
                    ],
                    sort: [{ field: 'total_donated', direction: 'desc' }],
                },
                parameters: [
                    {
                        name: 'start_date',
                        label: 'Start Date',
                        type: 'date',
                        required: true,
                        description: 'First day of the month',
                    },
                    {
                        name: 'end_date',
                        label: 'End Date',
                        type: 'date',
                        required: true,
                        description: 'Last day of the month',
                    },
                ],
            },
            {
                name: 'Event Attendance Report',
                description: 'List of volunteers who attended events',
                category: 'engagement',
                tags: ['events', 'volunteers', 'attendance'],
                entity: 'volunteers',
                template_definition: {
                    name: 'Event Attendance Report',
                    entity: 'volunteers',
                    fields: ['first_name', 'last_name', 'email', 'status'],
                    filters: [
                        {
                            field: 'status',
                            operator: 'eq',
                            value: 'active',
                        },
                    ],
                    sort: [{ field: 'last_name', direction: 'asc' }],
                },
            },
            {
                name: 'Volunteer Hours Summary',
                description: 'Total hours contributed by volunteers in a time period',
                category: 'operations',
                tags: ['volunteers', 'hours', 'summary'],
                entity: 'volunteers',
                template_definition: {
                    name: 'Volunteer Hours Summary',
                    entity: 'volunteers',
                    fields: ['first_name', 'last_name', 'total_hours'],
                    sort: [{ field: 'total_hours', direction: 'desc' }],
                },
            },
            {
                name: 'Active Accounts by Type',
                description: 'Breakdown of active accounts by account type',
                category: 'operations',
                tags: ['accounts', 'active', 'breakdown'],
                entity: 'accounts',
                template_definition: {
                    name: 'Active Accounts by Type',
                    entity: 'accounts',
                    fields: ['account_type'],
                    groupBy: ['account_type'],
                    aggregations: [
                        { field: 'id', function: 'count', alias: 'account_count' },
                    ],
                    filters: [
                        {
                            field: 'is_active',
                            operator: 'eq',
                            value: true,
                        },
                    ],
                    sort: [{ field: 'account_count', direction: 'desc' }],
                },
            },
            {
                name: 'Expense Report by Category',
                description: 'Total expenses grouped by category',
                category: 'finance',
                tags: ['expenses', 'category', 'summary'],
                entity: 'expenses',
                template_definition: {
                    name: 'Expense Report by Category',
                    entity: 'expenses',
                    fields: ['category'],
                    groupBy: ['category'],
                    aggregations: [
                        { field: 'amount', function: 'sum', alias: 'total_amount' },
                        { field: 'amount', function: 'count', alias: 'expense_count' },
                    ],
                    sort: [{ field: 'total_amount', direction: 'desc' }],
                },
            },
            {
                name: 'Grant Status Overview',
                description: 'Overview of all grants by status',
                category: 'finance',
                tags: ['grants', 'status', 'overview'],
                entity: 'grants',
                template_definition: {
                    name: 'Grant Status Overview',
                    entity: 'grants',
                    fields: ['name', 'amount', 'start_date', 'end_date', 'status'],
                    sort: [{ field: 'start_date', direction: 'desc' }],
                },
            },
        ];
    }
}
