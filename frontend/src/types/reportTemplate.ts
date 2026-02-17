/**
 * Report Template Types (Frontend)
 * Type definitions for report template management
 */

import type { ReportDefinition, ReportEntity } from './report';

export type TemplateCategory =
    | 'fundraising'
    | 'engagement'
    | 'operations'
    | 'finance'
    | 'compliance'
    | 'custom';

export interface TemplateParameter {
    name: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'select';
    required: boolean;
    defaultValue?: string | number;
    options?: { value: string; label: string }[];
    description?: string;
}

export interface ReportTemplate {
    id: string;
    name: string;
    description: string;
    category: TemplateCategory;
    tags: string[];
    entity: ReportEntity;
    template_definition: ReportDefinition;
    parameters?: TemplateParameter[];
    is_system: boolean;
    preview_image?: string;
    created_at: string;
    updated_at: string;
}

export interface InstantiateTemplateRequest {
    parameter_values?: Record<string, string | number>;
    save_as_name?: string;
}
