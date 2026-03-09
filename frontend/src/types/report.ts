/**
 * Report Types
 * Frontend type definitions for custom report generation
 */

export const REPORT_ENTITIES = [
  'accounts',
  'contacts',
  'donations',
  'events',
  'appointments',
  'follow_ups',
  'attendance',
  'volunteers',
  'tasks',
  'cases',
  'opportunities',
  'expenses',
  'grants',
  'programs',
] as const;

export type ReportEntity = (typeof REPORT_ENTITIES)[number];

export type ReportFormat = 'json' | 'csv' | 'pdf' | 'xlsx';

export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';

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
  operator: FilterOperator;
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
  fields?: string[];
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

export type WorkflowCoverageMissingFilter = 'note' | 'outcome' | 'reminder' | 'attendance';

export interface WorkflowCoverageFilters {
  ownerId?: string;
  statusType?: 'intake' | 'active' | 'review' | 'closed' | 'cancelled';
  missing?: WorkflowCoverageMissingFilter;
}

export interface WorkflowCoverageItem {
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  contactName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  statusName: string | null;
  statusType: 'intake' | 'active' | 'review' | 'closed' | 'cancelled' | null;
  missingConversationResolutionCount: number;
  missingAppointmentNoteCount: number;
  missingAppointmentOutcomeCount: number;
  missingFollowUpNoteCount: number;
  missingFollowUpOutcomeCount: number;
  missingReminderOfferCount: number;
  missingAttendanceLinkageCount: number;
  missingCaseStatusOutcomeCount: number;
  totalGaps: number;
}

export interface WorkflowCoverageReportResult {
  items: WorkflowCoverageItem[];
  summary: {
    casesWithGaps: number;
    missingConversationResolutionCount: number;
    missingAppointmentNoteCount: number;
    missingAppointmentOutcomeCount: number;
    missingFollowUpNoteCount: number;
    missingFollowUpOutcomeCount: number;
    missingReminderOfferCount: number;
    missingAttendanceLinkageCount: number;
    missingCaseStatusOutcomeCount: number;
    totalGaps: number;
  };
}

export type ReportExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ReportExportJobSource = 'manual' | 'scheduled' | 'snapshot';

export interface ReportExportJob {
  id: string;
  organizationId: string;
  savedReportId: string | null;
  scheduledReportId: string | null;
  requestedBy: string | null;
  source: ReportExportJobSource;
  name: string;
  entity: ReportEntity;
  format: 'csv' | 'xlsx';
  status: ReportExportJobStatus;
  definition: ReportDefinition;
  filterHash: string;
  idempotencyKey: string | null;
  rowsCount: number | null;
  runtimeMs: number | null;
  failureMessage: string | null;
  artifactPath: string | null;
  artifactContentType: string | null;
  artifactFileName: string | null;
  artifactSizeBytes: number | null;
  artifactExpiresAt: string | null;
  retentionUntil: string | null;
  metadata: Record<string, unknown>;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportExportJobRequest {
  definition: ReportDefinition;
  format: 'csv' | 'xlsx';
  savedReportId?: string;
  scheduledReportId?: string;
  idempotencyKey?: string;
}

export interface AvailableFields {
  entity: ReportEntity;
  fields: ReportField[];
}
