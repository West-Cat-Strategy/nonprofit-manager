/**
 * Report Types
 * Type definitions for custom report generation
 */

export type ReportEntity =
  | 'cases'
  | 'accounts'
  | 'contacts'
  | 'donations'
  | 'events'
  | 'volunteers'
  | 'tasks'
  | 'expenses'
  | 'grants'
  | 'programs';

export type ReportFormat = 'json' | 'csv' | 'pdf' | 'xlsx';

export type AggregateFunction = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface ReportAggregation {
  field: string;
  function: AggregateFunction;
  alias?: string;
}

export interface ReportField {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  is_aggregate?: boolean;
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
  value: string | number | boolean | string[] | number[];
}

export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReportDefinition {
  name: string;
  description?: string;
  entity: ReportEntity;
  fields: string[];
  aggregations?: ReportAggregation[];
  groupBy?: string[];
  filters?: ReportFilter[];
  sort?: ReportSort[];
  limit?: number;
}

export interface ReportResult {
  definition: ReportDefinition;
  data: Record<string, unknown>[];
  total_count: number;
  generated_at: string;
}

// Available fields for each entity type
export const AVAILABLE_FIELDS: Record<ReportEntity, ReportField[]> = {
  cases: [
    { field: 'id', label: 'Case ID', type: 'string' },
    { field: 'case_number', label: 'Case Number', type: 'string' },
    { field: 'title', label: 'Title', type: 'string' },
    { field: 'priority', label: 'Priority', type: 'string' },
    { field: 'outcome', label: 'Outcome', type: 'string' },
    { field: 'status_name', label: 'Status', type: 'string' },
    { field: 'status_type', label: 'Status Type', type: 'string' },
    { field: 'case_type_name', label: 'Case Type', type: 'string' },
    { field: 'is_urgent', label: 'Urgent', type: 'boolean' },
    { field: 'due_date', label: 'Due Date', type: 'date' },
    { field: 'opened_date', label: 'Opened Date', type: 'date' },
    { field: 'closed_date', label: 'Closed Date', type: 'date' },
    { field: 'created_at', label: 'Created Date', type: 'date' },
    { field: 'service_outcome', label: 'Service/Event Outcome', type: 'string' },
  ],
  accounts: [
    { field: 'id', label: 'Account ID', type: 'string' },
    { field: 'account_name', label: 'Account Name', type: 'string' },
    { field: 'account_type', label: 'Type', type: 'string' },
    { field: 'category', label: 'Category', type: 'string' },
    { field: 'website', label: 'Website', type: 'string' },
    { field: 'phone', label: 'Phone', type: 'string' },
    { field: 'email', label: 'Email', type: 'string' },
    { field: 'is_active', label: 'Active', type: 'boolean' },
    { field: 'created_at', label: 'Created Date', type: 'date' },
    { field: 'updated_at', label: 'Updated Date', type: 'date' },
  ],
  contacts: [
    { field: 'id', label: 'Contact ID', type: 'string' },
    { field: 'first_name', label: 'First Name', type: 'string' },
    { field: 'last_name', label: 'Last Name', type: 'string' },
    { field: 'email', label: 'Email', type: 'string' },
    { field: 'phone', label: 'Phone', type: 'string' },
    { field: 'mobile_phone', label: 'Mobile Phone', type: 'string' },
    { field: 'job_title', label: 'Job Title', type: 'string' },
    { field: 'department', label: 'Department', type: 'string' },
    { field: 'preferred_contact_method', label: 'Preferred Contact Method', type: 'string' },
    { field: 'account_name', label: 'Account', type: 'string' },
    { field: 'is_active', label: 'Active', type: 'boolean' },
    { field: 'created_at', label: 'Created Date', type: 'date' },
    { field: 'updated_at', label: 'Updated Date', type: 'date' },
  ],
  donations: [
    { field: 'id', label: 'Donation ID', type: 'string' },
    { field: 'donation_number', label: 'Donation Number', type: 'string' },
    { field: 'amount', label: 'Amount', type: 'currency' },
    { field: 'payment_method', label: 'Payment Method', type: 'string' },
    { field: 'payment_status', label: 'Payment Status', type: 'string' },
    { field: 'campaign_name', label: 'Campaign', type: 'string' },
    { field: 'designation', label: 'Designation', type: 'string' },
    { field: 'is_recurring', label: 'Recurring', type: 'boolean' },
    { field: 'donation_date', label: 'Donation Date', type: 'date' },
    { field: 'created_at', label: 'Created Date', type: 'date' },
  ],
  events: [
    { field: 'id', label: 'Event ID', type: 'string' },
    { field: 'name', label: 'Event Name', type: 'string' },
    { field: 'event_type', label: 'Type', type: 'string' },
    { field: 'status', label: 'Status', type: 'string' },
    { field: 'location_name', label: 'Location', type: 'string' },
    { field: 'capacity', label: 'Capacity', type: 'number' },
    { field: 'start_date', label: 'Start Date', type: 'date' },
    { field: 'end_date', label: 'End Date', type: 'date' },
    { field: 'created_at', label: 'Created Date', type: 'date' },
  ],
  volunteers: [
    { field: 'id', label: 'Volunteer ID', type: 'string' },
    { field: 'first_name', label: 'First Name', type: 'string' },
    { field: 'last_name', label: 'Last Name', type: 'string' },
    { field: 'email', label: 'Email', type: 'string' },
    { field: 'phone', label: 'Phone', type: 'string' },
    { field: 'volunteer_status', label: 'Status', type: 'string' },
    { field: 'skills', label: 'Skills', type: 'string' },
    { field: 'availability', label: 'Availability', type: 'string' },
    { field: 'created_at', label: 'Created Date', type: 'date' },
  ],
  tasks: [
    { field: 'id', label: 'Task ID', type: 'string' },
    { field: 'subject', label: 'Subject', type: 'string' },
    { field: 'status', label: 'Status', type: 'string' },
    { field: 'priority', label: 'Priority', type: 'string' },
    { field: 'due_date', label: 'Due Date', type: 'date' },
    { field: 'completed_date', label: 'Completed Date', type: 'date' },
    { field: 'related_to_type', label: 'Related To', type: 'string' },
    { field: 'created_at', label: 'Created Date', type: 'date' },
  ],
  expenses: [
    { field: 'id', label: 'Expense ID', type: 'string' },
    { field: 'amount', label: 'Amount', type: 'currency' },
    { field: 'category', label: 'Category', type: 'string' },
    { field: 'description', label: 'Description', type: 'string' },
    { field: 'expense_date', label: 'Expense Date', type: 'date' },
    { field: 'payment_method', label: 'Payment Method', type: 'string' },
    { field: 'status', label: 'Status', type: 'string' },
    { field: 'created_at', label: 'Created Date', type: 'date' },
  ],
  grants: [
    { field: 'id', label: 'Grant ID', type: 'string' },
    { field: 'name', label: 'Grant Name', type: 'string' },
    { field: 'funder', label: 'Funder', type: 'string' },
    { field: 'amount', label: 'Amount', type: 'currency' },
    { field: 'status', label: 'Status', type: 'string' },
    { field: 'award_date', label: 'Award Date', type: 'date' },
    { field: 'expiry_date', label: 'Expiry Date', type: 'date' },
    { field: 'created_at', label: 'Created Date', type: 'date' },
  ],
  programs: [
    { field: 'id', label: 'Program ID', type: 'string' },
    { field: 'name', label: 'Program Name', type: 'string' },
    { field: 'description', label: 'Description', type: 'string' },
    { field: 'status', label: 'Status', type: 'string' },
    { field: 'start_date', label: 'Start Date', type: 'date' },
    { field: 'end_date', label: 'End Date', type: 'date' },
    { field: 'budget', label: 'Budget', type: 'currency' },
    { field: 'created_at', label: 'Created Date', type: 'date' },
  ],
};

export default {
  ReportEntity: {} as ReportEntity,
  ReportFormat: {} as ReportFormat,
  ReportField: {} as ReportField,
  ReportFilter: {} as ReportFilter,
  ReportSort: {} as ReportSort,
  ReportDefinition: {} as ReportDefinition,
  ReportResult: {} as ReportResult,
  AVAILABLE_FIELDS,
};
