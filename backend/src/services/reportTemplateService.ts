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
import { AVAILABLE_FIELDS, REPORT_ENTITIES, type ReportDefinition } from '@app-types/report';

export class ReportTemplateService {
    constructor(private pool: Pool) { }

    private validateTemplateDefinition(definition: ReportDefinition): void {
        if (!REPORT_ENTITIES.includes(definition.entity)) {
            throw new Error(`Invalid template entity: ${definition.entity}`);
        }

        const validFields = new Set(AVAILABLE_FIELDS[definition.entity].map((field) => field.field));
        const aggregationAliases = new Set<string>();

        for (const field of definition.fields || []) {
            if (!validFields.has(field)) {
                throw new Error(`Invalid template field: ${field}`);
            }
        }

        for (const field of definition.groupBy || []) {
            if (!validFields.has(field)) {
                throw new Error(`Invalid template groupBy field: ${field}`);
            }
        }

        for (const filter of definition.filters || []) {
            if (!validFields.has(filter.field)) {
                throw new Error(`Invalid template filter field: ${filter.field}`);
            }
        }

        for (const aggregation of definition.aggregations || []) {
            if (!validFields.has(aggregation.field)) {
                throw new Error(`Invalid template aggregation field: ${aggregation.field}`);
            }
            aggregationAliases.add(aggregation.alias || `${aggregation.function}_${aggregation.field}`);
        }

        for (const sort of definition.sort || []) {
            if (!validFields.has(sort.field) && !aggregationAliases.has(sort.field)) {
                throw new Error(`Invalid template sort field: ${sort.field}`);
            }
        }

        const hasFields = (definition.fields || []).length > 0;
        const hasAggregations = (definition.aggregations || []).length > 0;
        if (!hasFields && !hasAggregations) {
            throw new Error('Template must include at least one field or aggregation');
        }
    }

    /**
     * Seed system templates
     */
    async seedSystemTemplates(): Promise<void> {
        const templates = this.getSystemTemplates();

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

            this.validateTemplateDefinition(definition as ReportDefinition);
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
                description: 'Overview of grants with funder, program, recipient, and balance details',
                category: 'finance',
                tags: ['grants', 'status', 'overview'],
                entity: 'grants',
                template_definition: {
                    name: 'Grant Status Overview',
                    entity: 'grants',
                    fields: [
                        'grant_number',
                        'title',
                        'funder_name',
                        'program_name',
                        'recipient_name',
                        'status',
                        'amount',
                        'disbursed_amount',
                        'outstanding_amount',
                        'next_report_due_at',
                    ],
                    sort: [{ field: 'next_report_due_at', direction: 'asc' }],
                },
            },
            {
                name: 'Case Workload Core KPI',
                description: 'Case workload split by assignee, status, and aging bucket',
                category: 'operations',
                tags: ['cases', 'kpi', 'workload'],
                entity: 'cases',
                template_definition: {
                    name: 'Case Workload Core KPI',
                    entity: 'cases',
                    fields: ['assigned_to_name', 'status_name', 'age_bucket', 'open_flag', 'overdue_flag', 'unassigned_flag'],
                    groupBy: ['assigned_to_name', 'status_name', 'age_bucket', 'open_flag', 'overdue_flag', 'unassigned_flag'],
                    aggregations: [
                        { field: 'id', function: 'count', alias: 'case_count' },
                    ],
                    sort: [{ field: 'assigned_to_name', direction: 'asc' }],
                },
            },
            {
                name: 'Opportunity Pipeline Core KPI',
                description: 'Pipeline volume and weighted value by stage',
                category: 'fundraising',
                tags: ['opportunities', 'pipeline', 'kpi'],
                entity: 'opportunities',
                template_definition: {
                    name: 'Opportunity Pipeline Core KPI',
                    entity: 'opportunities',
                    fields: ['stage_name', 'stage_order'],
                    groupBy: ['stage_name', 'stage_order'],
                    aggregations: [
                        { field: 'id', function: 'count', alias: 'opportunity_count' },
                        { field: 'amount', function: 'sum', alias: 'pipeline_amount' },
                        { field: 'weighted_amount', function: 'sum', alias: 'pipeline_weighted_amount' },
                    ],
                    sort: [{ field: 'stage_order', direction: 'asc' }],
                },
            },
            {
                name: 'Opportunity Closed Win-Rate KPI',
                description: 'Closed pipeline split for win-rate tracking',
                category: 'fundraising',
                tags: ['opportunities', 'win-rate', 'kpi'],
                entity: 'opportunities',
                template_definition: {
                    name: 'Opportunity Closed Win-Rate KPI',
                    entity: 'opportunities',
                    fields: ['status', 'won_flag', 'lost_flag', 'closed_flag'],
                    groupBy: ['status', 'won_flag', 'lost_flag', 'closed_flag'],
                    aggregations: [
                        { field: 'id', function: 'count', alias: 'closed_count' },
                        { field: 'amount', function: 'sum', alias: 'closed_amount' },
                    ],
                    filters: [
                        {
                            field: 'closed_flag',
                            operator: 'eq',
                            value: true,
                        },
                    ],
                    sort: [{ field: 'status', direction: 'asc' }],
                },
            },
        ];
    }
}
