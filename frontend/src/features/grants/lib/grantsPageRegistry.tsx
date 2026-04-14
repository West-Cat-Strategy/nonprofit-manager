import { DangerButton, SecondaryButton } from '../../../components/ui';
import { formatCurrency, formatDate, formatDateOnly, formatDateSmart, toDateInputValue } from '../../../utils/format';
import {
  GRANT_APPLICATION_STATUSES,
  GRANT_AWARD_STATUSES,
  GRANT_DISBURSEMENT_STATUSES,
  GRANT_FUNDING_FREQUENCIES,
  GRANT_JURISDICTIONS,
  GRANT_PROGRAM_STATUSES,
  GRANT_RECIPIENT_STATUSES,
  GRANT_REPORT_STATUSES,
} from '../../../types/grant';
import type {
  FundedProgram,
  GrantActivityLog,
  GrantApplication,
  GrantApplicationStatusUpdateDTO,
  GrantAward,
  GrantCalendarItem,
  GrantDisbursement,
  GrantDocument,
  GrantFunder,
  GrantProgram,
  GrantReport,
  RecipientOrganization,
} from '../types/contracts';
import type {
  EditableGrantRecord,
  FieldDescriptor,
  GrantsLookupState,
  GrantsSectionId,
  GrantsTableRow,
  SelectOption,
  TableColumn,
} from './grantsPageTypes';

export const SECTION_DEFINITIONS: ReadonlyArray<{
  id: GrantsSectionId;
  label: string;
  path: string;
  description: string;
  primaryActionLabel: string;
}> = [
  {
    id: 'funders',
    label: 'Funders',
    path: '/grants/funders',
    description: 'Track federal, provincial, and private funders with contacts and totals.',
    primaryActionLabel: 'New funder',
  },
  {
    id: 'programs',
    label: 'Programs',
    path: '/grants/programs',
    description: 'Manage grant programs, application windows, and award timelines.',
    primaryActionLabel: 'New program',
  },
  {
    id: 'recipients',
    label: 'Recipients',
    path: '/grants/recipients',
    description: 'Keep recipient organizations, contacts, and geographies organized.',
    primaryActionLabel: 'New recipient',
  },
  {
    id: 'funded-programs',
    label: 'Funded Programs',
    path: '/grants/funded-programs',
    description: 'Track the internal programs and initiatives funded by grants.',
    primaryActionLabel: 'New funded program',
  },
  {
    id: 'applications',
    label: 'Applications',
    path: '/grants/applications',
    description: 'Review applications, status changes, and award conversions.',
    primaryActionLabel: 'New application',
  },
  {
    id: 'awards',
    label: 'Awards',
    path: '/grants/awards',
    description: 'Track award records, commitments, and outstanding balances.',
    primaryActionLabel: 'New award',
  },
  {
    id: 'disbursements',
    label: 'Disbursements',
    path: '/grants/disbursements',
    description: 'Manage the payment schedule and payout status for each grant.',
    primaryActionLabel: 'New disbursement',
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/grants/reports',
    description: 'Follow reporting deadlines, submissions, and review outcomes.',
    primaryActionLabel: 'New report',
  },
  {
    id: 'documents',
    label: 'Documents',
    path: '/grants/documents',
    description: 'Attach grant agreements, submissions, and supporting documents.',
    primaryActionLabel: 'New document',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    path: '/grants/calendar',
    description: 'Monitor upcoming due dates, milestones, and payment events.',
    primaryActionLabel: 'Refresh calendar',
  },
  {
    id: 'activities',
    label: 'Activity Log',
    path: '/grants/activities',
    description: 'Review the audit trail for grants, applications, and related records.',
    primaryActionLabel: 'Refresh activity',
  },
] as const;

export const EMPTY_LOOKUPS: GrantsLookupState = {
  funders: [],
  programs: [],
  recipients: [],
  fundedPrograms: [],
  applications: [],
  awards: [],
  reports: [],
  documents: [],
};

export const GRANT_JURISDICTION_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select jurisdiction' },
  ...GRANT_JURISDICTIONS.map((jurisdiction) => ({
    value: jurisdiction,
    label: jurisdiction.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
  })),
];

export const STATUS_OPTIONS_BY_SECTION: Record<GrantsSectionId, SelectOption[]> = {
  funders: [{ value: '', label: 'Any status' }],
  programs: [
    { value: '', label: 'Any status' },
    ...GRANT_PROGRAM_STATUSES.map((status) => ({
      value: status,
      label: status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    })),
  ],
  recipients: [
    { value: '', label: 'Any status' },
    ...GRANT_RECIPIENT_STATUSES.map((status) => ({
      value: status,
      label: status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    })),
  ],
  'funded-programs': [{ value: '', label: 'Any status' }],
  applications: [
    { value: '', label: 'Any status' },
    ...GRANT_APPLICATION_STATUSES.map((status) => ({
      value: status,
      label: status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    })),
  ],
  awards: [
    { value: '', label: 'Any status' },
    ...GRANT_AWARD_STATUSES.map((status) => ({
      value: status,
      label: status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    })),
  ],
  disbursements: [
    { value: '', label: 'Any status' },
    ...GRANT_DISBURSEMENT_STATUSES.map((status) => ({
      value: status,
      label: status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    })),
  ],
  reports: [
    { value: '', label: 'Any status' },
    ...GRANT_REPORT_STATUSES.map((status) => ({
      value: status,
      label: status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    })),
  ],
  documents: [{ value: '', label: 'Any status' }],
  calendar: [{ value: '', label: 'Any status' }],
  activities: [{ value: '', label: 'Any status' }],
};

const REPORTING_FREQUENCY_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select frequency' },
  ...GRANT_FUNDING_FREQUENCIES.map((value) => ({
    value,
    label: value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
  })),
];

const FUNDING_STATUS_OPTIONS: SelectOption[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'complete', label: 'Complete' },
  { value: 'archived', label: 'Archived' },
];

const BOOLEAN_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select option' },
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

export const toOptions = <T,>(
  items: T[],
  getValue: (item: T) => string,
  getLabel: (item: T) => string
): SelectOption[] => items.map((item) => ({ value: getValue(item), label: getLabel(item) }));

const formatMaybeDate = (value: string | null | undefined): string => (value ? formatDateOnly(value) : '—');

const formatMoney = (value: number | null | undefined, currency = 'CAD'): string =>
  value === null || value === undefined ? '—' : formatCurrency(value, currency);

const formatNumberOrDash = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : String(value);

export const sectionLabelById = (sectionId: GrantsSectionId): string =>
  SECTION_DEFINITIONS.find((definition) => definition.id === sectionId)?.label ?? 'Grants';

export const sectionDescriptionById = (sectionId: GrantsSectionId): string =>
  SECTION_DEFINITIONS.find((definition) => definition.id === sectionId)?.description ??
  'Internal grants tracking.';

export const sectionPrimaryActionLabelById = (sectionId: GrantsSectionId): string =>
  SECTION_DEFINITIONS.find((definition) => definition.id === sectionId)?.primaryActionLabel ??
  'New record';

export const getSectionFromPath = (pathname: string): GrantsSectionId => {
  const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  const match = SECTION_DEFINITIONS.find((definition) => normalizedPath === definition.path);
  return match?.id ?? 'funders';
};

export const getRowKey = (section: GrantsSectionId, row: GrantsTableRow): string => {
  switch (section) {
    case 'funders':
    case 'programs':
    case 'recipients':
    case 'funded-programs':
    case 'applications':
    case 'awards':
    case 'disbursements':
    case 'reports':
    case 'documents':
    case 'activities':
    case 'calendar':
      return row.id;
    default:
      return row.id;
  }
};

export function getFieldDescriptors(
  section: GrantsSectionId,
  lookups: GrantsLookupState
): FieldDescriptor[] {
  const funderOptions = [
    { value: '', label: 'Select funder' },
    ...toOptions(lookups.funders, (item) => item.id, (item) => item.name),
  ];
  const recipientOptions = [
    { value: '', label: 'Select recipient' },
    ...toOptions(lookups.recipients, (item) => item.id, (item) => item.name),
  ];
  const fundedProgramOptions = [
    { value: '', label: 'Select funded program' },
    ...toOptions(lookups.fundedPrograms, (item) => item.id, (item) => item.name),
  ];
  const applicationOptions = [
    { value: '', label: 'Select application' },
    ...toOptions(lookups.applications, (item) => item.id, (item) => `${item.application_number} • ${item.title}`),
  ];
  const awardOptions = [
    { value: '', label: 'Select award' },
    ...toOptions(lookups.awards, (item) => item.id, (item) => `${item.grant_number} • ${item.title}`),
  ];
  const reportOptions = [
    { value: '', label: 'Select report' },
    ...toOptions(lookups.reports, (item) => item.id, (item) => `${item.grant_number ?? item.grant_id} • ${item.report_type}`),
  ];
  const currencyOptions: SelectOption[] = [
    { value: 'CAD', label: 'CAD' },
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'GBP', label: 'GBP' },
  ];

  switch (section) {
    case 'funders':
      return [
        { name: 'name', label: 'Name', kind: 'text', required: true, colSpan: 'md:col-span-2' },
        { name: 'jurisdiction', label: 'Jurisdiction', kind: 'select', options: GRANT_JURISDICTION_OPTIONS, required: true },
        { name: 'funder_type', label: 'Funder Type', kind: 'text', placeholder: 'Foundation, ministry, agency' },
        { name: 'contact_name', label: 'Contact Name', kind: 'text' },
        { name: 'contact_email', label: 'Contact Email', kind: 'text' },
        { name: 'contact_phone', label: 'Contact Phone', kind: 'text' },
        { name: 'website', label: 'Website', kind: 'text', placeholder: 'https://example.org' },
        { name: 'active', label: 'Active', kind: 'select', options: BOOLEAN_OPTIONS, required: true },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'programs':
      return [
        { name: 'funder_id', label: 'Funder', kind: 'select', options: funderOptions, required: true, colSpan: 'md:col-span-2' },
        { name: 'name', label: 'Program Name', kind: 'text', required: true, colSpan: 'md:col-span-2' },
        { name: 'program_code', label: 'Program Code', kind: 'text' },
        { name: 'fiscal_year', label: 'Fiscal Year', kind: 'text', placeholder: '2026' },
        { name: 'jurisdiction', label: 'Jurisdiction', kind: 'select', options: GRANT_JURISDICTION_OPTIONS, required: true },
        { name: 'status', label: 'Status', kind: 'select', options: STATUS_OPTIONS_BY_SECTION.programs, required: true },
        { name: 'application_open_at', label: 'Application Open', kind: 'date' },
        { name: 'application_due_at', label: 'Application Due', kind: 'date' },
        { name: 'award_date', label: 'Award Date', kind: 'date' },
        { name: 'expiry_date', label: 'Expiry Date', kind: 'date' },
        { name: 'total_budget', label: 'Total Budget', kind: 'number', step: '0.01' },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'recipients':
      return [
        { name: 'name', label: 'Name', kind: 'text', required: true, colSpan: 'md:col-span-2' },
        { name: 'legal_name', label: 'Legal Name', kind: 'text', colSpan: 'md:col-span-2' },
        { name: 'jurisdiction', label: 'Jurisdiction', kind: 'select', options: GRANT_JURISDICTION_OPTIONS },
        { name: 'province', label: 'Province / State', kind: 'text' },
        { name: 'city', label: 'City', kind: 'text' },
        { name: 'contact_name', label: 'Contact Name', kind: 'text' },
        { name: 'contact_email', label: 'Contact Email', kind: 'text' },
        { name: 'contact_phone', label: 'Contact Phone', kind: 'text' },
        { name: 'website', label: 'Website', kind: 'text' },
        { name: 'status', label: 'Status', kind: 'select', options: STATUS_OPTIONS_BY_SECTION.recipients, required: true },
        { name: 'active', label: 'Active', kind: 'select', options: BOOLEAN_OPTIONS, required: true },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'funded-programs':
      return [
        { name: 'recipient_organization_id', label: 'Recipient', kind: 'select', options: recipientOptions, required: true, colSpan: 'md:col-span-2' },
        { name: 'name', label: 'Program Name', kind: 'text', required: true, colSpan: 'md:col-span-2' },
        { name: 'description', label: 'Description', kind: 'textarea', colSpan: 'md:col-span-2' },
        { name: 'owner_user_id', label: 'Owner User ID', kind: 'text', placeholder: 'Internal staff owner' },
        { name: 'status', label: 'Status', kind: 'select', options: FUNDING_STATUS_OPTIONS, required: true },
        { name: 'start_date', label: 'Start Date', kind: 'date' },
        { name: 'end_date', label: 'End Date', kind: 'date' },
        { name: 'budget', label: 'Budget', kind: 'number', step: '0.01' },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'applications':
      return [
        { name: 'application_number', label: 'Application Number', kind: 'text' },
        { name: 'title', label: 'Title', kind: 'text', required: true, colSpan: 'md:col-span-2' },
        { name: 'funder_id', label: 'Funder', kind: 'select', options: funderOptions, required: true, colSpan: 'md:col-span-2' },
        { name: 'program_id', label: 'Program', kind: 'select', options: [{ value: '', label: 'Select program' }, ...toOptions(lookups.programs, (item) => item.id, (item) => item.name)] },
        { name: 'recipient_organization_id', label: 'Recipient', kind: 'select', options: recipientOptions },
        { name: 'funded_program_id', label: 'Funded Program', kind: 'select', options: fundedProgramOptions },
        { name: 'status', label: 'Status', kind: 'select', options: STATUS_OPTIONS_BY_SECTION.applications, required: true },
        { name: 'requested_amount', label: 'Requested Amount', kind: 'number', required: true, step: '0.01' },
        { name: 'approved_amount', label: 'Approved Amount', kind: 'number', step: '0.01' },
        { name: 'currency', label: 'Currency', kind: 'select', options: currencyOptions, required: true },
        { name: 'submitted_at', label: 'Submitted At', kind: 'date' },
        { name: 'reviewed_at', label: 'Reviewed At', kind: 'date' },
        { name: 'decision_at', label: 'Decision At', kind: 'date' },
        { name: 'due_at', label: 'Due At', kind: 'date' },
        { name: 'outcome_reason', label: 'Outcome Reason', kind: 'textarea', colSpan: 'md:col-span-2' },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'awards':
      return [
        { name: 'grant_number', label: 'Grant Number', kind: 'text' },
        { name: 'title', label: 'Title', kind: 'text', required: true, colSpan: 'md:col-span-2' },
        { name: 'application_id', label: 'Application', kind: 'select', options: applicationOptions, colSpan: 'md:col-span-2' },
        { name: 'funder_id', label: 'Funder', kind: 'select', options: funderOptions, required: true, colSpan: 'md:col-span-2' },
        { name: 'program_id', label: 'Program', kind: 'select', options: [{ value: '', label: 'Select program' }, ...toOptions(lookups.programs, (item) => item.id, (item) => item.name)] },
        { name: 'recipient_organization_id', label: 'Recipient', kind: 'select', options: recipientOptions },
        { name: 'funded_program_id', label: 'Funded Program', kind: 'select', options: fundedProgramOptions },
        { name: 'status', label: 'Status', kind: 'select', options: STATUS_OPTIONS_BY_SECTION.awards, required: true },
        { name: 'amount', label: 'Amount', kind: 'number', required: true, step: '0.01' },
        { name: 'committed_amount', label: 'Committed Amount', kind: 'number', step: '0.01' },
        { name: 'currency', label: 'Currency', kind: 'select', options: currencyOptions, required: true },
        { name: 'fiscal_year', label: 'Fiscal Year', kind: 'text' },
        { name: 'jurisdiction', label: 'Jurisdiction', kind: 'select', options: GRANT_JURISDICTION_OPTIONS, required: true },
        { name: 'award_date', label: 'Award Date', kind: 'date' },
        { name: 'reviewed_at', label: 'Reviewed At', kind: 'date' },
        { name: 'decision_at', label: 'Decision At', kind: 'date' },
        { name: 'start_date', label: 'Start Date', kind: 'date' },
        { name: 'end_date', label: 'End Date', kind: 'date' },
        { name: 'expiry_date', label: 'Expiry Date', kind: 'date' },
        { name: 'reporting_frequency', label: 'Reporting Frequency', kind: 'select', options: REPORTING_FREQUENCY_OPTIONS },
        { name: 'next_report_due_at', label: 'Next Report Due', kind: 'date' },
        { name: 'closeout_due_at', label: 'Closeout Due', kind: 'date' },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'disbursements':
      return [
        { name: 'grant_id', label: 'Award', kind: 'select', options: awardOptions, required: true, colSpan: 'md:col-span-2' },
        { name: 'tranche_label', label: 'Tranche Label', kind: 'text' },
        { name: 'scheduled_date', label: 'Scheduled Date', kind: 'date' },
        { name: 'paid_at', label: 'Paid At', kind: 'date' },
        { name: 'amount', label: 'Amount', kind: 'number', required: true, step: '0.01' },
        { name: 'currency', label: 'Currency', kind: 'select', options: currencyOptions, required: true },
        { name: 'status', label: 'Status', kind: 'select', options: STATUS_OPTIONS_BY_SECTION.disbursements, required: true },
        { name: 'method', label: 'Method', kind: 'text' },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'reports':
      return [
        { name: 'grant_id', label: 'Award', kind: 'select', options: awardOptions, required: true, colSpan: 'md:col-span-2' },
        { name: 'report_type', label: 'Report Type', kind: 'text', required: true },
        { name: 'period_start', label: 'Period Start', kind: 'date' },
        { name: 'period_end', label: 'Period End', kind: 'date' },
        { name: 'due_at', label: 'Due At', kind: 'date', required: true },
        { name: 'submitted_at', label: 'Submitted At', kind: 'date' },
        { name: 'status', label: 'Status', kind: 'select', options: STATUS_OPTIONS_BY_SECTION.reports, required: true },
        { name: 'summary', label: 'Summary', kind: 'textarea', colSpan: 'md:col-span-2' },
        { name: 'outstanding_items', label: 'Outstanding Items', kind: 'textarea', colSpan: 'md:col-span-2' },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'documents':
      return [
        { name: 'grant_id', label: 'Award', kind: 'select', options: awardOptions, colSpan: 'md:col-span-2' },
        { name: 'application_id', label: 'Application', kind: 'select', options: applicationOptions },
        { name: 'report_id', label: 'Report', kind: 'select', options: reportOptions },
        { name: 'document_type', label: 'Document Type', kind: 'text', required: true },
        { name: 'file_name', label: 'File Name', kind: 'text', required: true, colSpan: 'md:col-span-2' },
        { name: 'file_url', label: 'File URL', kind: 'text', required: true, colSpan: 'md:col-span-2', placeholder: 'https://...' },
        { name: 'mime_type', label: 'Mime Type', kind: 'text', required: true, placeholder: 'application/pdf' },
        { name: 'file_size', label: 'File Size (bytes)', kind: 'number', required: true, step: '1' },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
        { name: 'uploaded_by', label: 'Uploaded By', kind: 'text' },
      ];
    case 'calendar':
    case 'activities':
    default:
      return [];
  }
}

export function getSectionColumns(
  section: GrantsSectionId,
  lookups: GrantsLookupState,
  handlers: {
    onSelect: (record: EditableGrantRecord) => void;
    onDelete: (recordId: string) => Promise<void> | void;
    onStatusChange: (applicationId: string, payload: GrantApplicationStatusUpdateDTO) => Promise<void>;
    onAwardApplication: (application: GrantApplication) => Promise<void>;
  }
): TableColumn<GrantsTableRow>[] {
  const funderName = (id: string | null | undefined) =>
    id ? lookups.funders.find((item) => item.id === id)?.name ?? '—' : '—';
  const programName = (id: string | null | undefined) =>
    id ? lookups.programs.find((item) => item.id === id)?.name ?? '—' : '—';
  const recipientName = (id: string | null | undefined) =>
    id ? lookups.recipients.find((item) => item.id === id)?.name ?? '—' : '—';
  const fundedProgramName = (id: string | null | undefined) =>
    id ? lookups.fundedPrograms.find((item) => item.id === id)?.name ?? '—' : '—';
  const awardNumber = (id: string | null | undefined) =>
    id ? lookups.awards.find((item) => item.id === id)?.grant_number ?? '—' : '—';

  switch (section) {
    case 'funders':
      return [
        { key: 'name', label: 'Name', render: (row: GrantFunder) => row.name },
        { key: 'jurisdiction', label: 'Jurisdiction', render: (row: GrantFunder) => row.jurisdiction },
        { key: 'grant_count', label: 'Awards', render: (row: GrantFunder) => formatNumberOrDash(row.grant_count ?? null) },
        { key: 'total_amount', label: 'Total', render: (row: GrantFunder) => formatMoney(row.total_amount ?? null) },
        { key: 'active', label: 'Active', render: (row: GrantFunder) => (row.active ? 'Yes' : 'No') },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: GrantFunder) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton className="px-3 py-1 text-xs" onClick={() => void handlers.onDelete(row.id)}>
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'programs':
      return [
        { key: 'name', label: 'Program', render: (row: GrantProgram) => row.name },
        { key: 'funder', label: 'Funder', render: (row: GrantProgram) => row.funder_name ?? funderName(row.funder_id) },
        { key: 'status', label: 'Status', render: (row: GrantProgram) => row.status },
        { key: 'due', label: 'Due', render: (row: GrantProgram) => formatMaybeDate(row.application_due_at) },
        { key: 'budget', label: 'Budget', render: (row: GrantProgram) => formatMoney(row.total_budget) },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: GrantProgram) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton className="px-3 py-1 text-xs" onClick={() => void handlers.onDelete(row.id)}>
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'recipients':
      return [
        { key: 'name', label: 'Recipient', render: (row: RecipientOrganization) => row.name },
        { key: 'jurisdiction', label: 'Jurisdiction', render: (row: RecipientOrganization) => row.jurisdiction ?? '—' },
        { key: 'grant_count', label: 'Awards', render: (row: RecipientOrganization) => formatNumberOrDash(row.grant_count ?? null) },
        { key: 'total_amount', label: 'Total', render: (row: RecipientOrganization) => formatMoney(row.total_amount ?? null) },
        { key: 'active', label: 'Active', render: (row: RecipientOrganization) => (row.active ? 'Yes' : 'No') },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: RecipientOrganization) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton className="px-3 py-1 text-xs" onClick={() => void handlers.onDelete(row.id)}>
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'funded-programs':
      return [
        { key: 'name', label: 'Program', render: (row: FundedProgram) => row.name },
        { key: 'recipient', label: 'Recipient', render: (row: FundedProgram) => row.recipient_name ?? recipientName(row.recipient_organization_id) },
        { key: 'status', label: 'Status', render: (row: FundedProgram) => row.status },
        { key: 'budget', label: 'Budget', render: (row: FundedProgram) => formatMoney(row.budget) },
        { key: 'owner', label: 'Owner', render: (row: FundedProgram) => row.owner_name ?? row.owner_user_id ?? '—' },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: FundedProgram) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton className="px-3 py-1 text-xs" onClick={() => void handlers.onDelete(row.id)}>
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'applications':
      return [
        { key: 'application_number', label: 'Number', render: (row: GrantApplication) => row.application_number },
        { key: 'title', label: 'Title', render: (row: GrantApplication) => row.title },
        { key: 'funder', label: 'Funder', render: (row: GrantApplication) => row.funder_name ?? funderName(row.funder_id) },
        { key: 'program', label: 'Program', render: (row: GrantApplication) => row.program_name ?? programName(row.program_id) },
        { key: 'recipient', label: 'Recipient', render: (row: GrantApplication) => row.recipient_name ?? recipientName(row.recipient_organization_id) },
        {
          key: 'funded_program',
          label: 'Funded Program',
          render: (row: GrantApplication) => row.funded_program_name ?? fundedProgramName(row.funded_program_id),
        },
        { key: 'status', label: 'Status', render: (row: GrantApplication) => row.status },
        { key: 'requested', label: 'Requested', render: (row: GrantApplication) => formatMoney(row.requested_amount, row.currency) },
        { key: 'approved', label: 'Approved', render: (row: GrantApplication) => formatMoney(row.approved_amount, row.currency) },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: GrantApplication) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <SecondaryButton
                className="px-3 py-1 text-xs"
                onClick={() =>
                  void handlers.onStatusChange(row.id, {
                    status: 'under_review',
                    reviewed_at: toDateInputValue(new Date()),
                    notes: row.notes,
                  })
                }
              >
                Review
              </SecondaryButton>
              <SecondaryButton
                className="px-3 py-1 text-xs"
                onClick={() =>
                  void handlers.onStatusChange(row.id, {
                    status: 'approved',
                    decision_at: toDateInputValue(new Date()),
                    approved_amount: row.approved_amount ?? row.requested_amount,
                    notes: row.notes,
                  })
                }
              >
                Approve
              </SecondaryButton>
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => void handlers.onAwardApplication(row)}>
                Award
              </SecondaryButton>
              <DangerButton className="px-3 py-1 text-xs" onClick={() => void handlers.onDelete(row.id)}>
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'awards':
      return [
        { key: 'grant_number', label: 'Number', render: (row: GrantAward) => row.grant_number },
        { key: 'title', label: 'Title', render: (row: GrantAward) => row.title },
        { key: 'program', label: 'Program', render: (row: GrantAward) => row.program_name ?? programName(row.program_id) },
        { key: 'recipient', label: 'Recipient', render: (row: GrantAward) => row.recipient_name ?? recipientName(row.recipient_organization_id) },
        { key: 'status', label: 'Status', render: (row: GrantAward) => row.status },
        { key: 'amount', label: 'Amount', render: (row: GrantAward) => formatMoney(row.amount, row.currency) },
        { key: 'outstanding', label: 'Outstanding', render: (row: GrantAward) => formatMoney(row.outstanding_amount ?? null, row.currency) },
        { key: 'report', label: 'Next report', render: (row: GrantAward) => formatMaybeDate(row.next_report_due_at) },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: GrantAward) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton className="px-3 py-1 text-xs" onClick={() => void handlers.onDelete(row.id)}>
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'disbursements':
      return [
        { key: 'grant', label: 'Grant', render: (row: GrantDisbursement) => row.grant_number ?? awardNumber(row.grant_id) },
        { key: 'label', label: 'Tranche', render: (row: GrantDisbursement) => row.tranche_label ?? '—' },
        { key: 'status', label: 'Status', render: (row: GrantDisbursement) => row.status },
        { key: 'scheduled', label: 'Scheduled', render: (row: GrantDisbursement) => formatMaybeDate(row.scheduled_date) },
        { key: 'paid', label: 'Paid', render: (row: GrantDisbursement) => formatMaybeDate(row.paid_at) },
        { key: 'amount', label: 'Amount', render: (row: GrantDisbursement) => formatMoney(row.amount, row.currency) },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: GrantDisbursement) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton className="px-3 py-1 text-xs" onClick={() => void handlers.onDelete(row.id)}>
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'reports':
      return [
        { key: 'grant', label: 'Grant', render: (row: GrantReport) => row.grant_number ?? awardNumber(row.grant_id) },
        { key: 'type', label: 'Type', render: (row: GrantReport) => row.report_type },
        { key: 'status', label: 'Status', render: (row: GrantReport) => row.status },
        { key: 'due', label: 'Due', render: (row: GrantReport) => formatMaybeDate(row.due_at) },
        { key: 'submitted', label: 'Submitted', render: (row: GrantReport) => formatMaybeDate(row.submitted_at) },
        { key: 'summary', label: 'Summary', render: (row: GrantReport) => row.summary ?? '—' },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: GrantReport) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton className="px-3 py-1 text-xs" onClick={() => void handlers.onDelete(row.id)}>
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'documents':
      return [
        { key: 'file_name', label: 'File', render: (row: GrantDocument) => row.file_name },
        { key: 'document_type', label: 'Type', render: (row: GrantDocument) => row.document_type },
        {
          key: 'linked',
          label: 'Linked To',
          render: (row: GrantDocument) => row.grant_id ?? row.application_id ?? row.report_id ?? '—',
        },
        { key: 'size', label: 'Size', render: (row: GrantDocument) => formatNumberOrDash(row.file_size) },
        { key: 'mime', label: 'Mime Type', render: (row: GrantDocument) => row.mime_type },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: GrantDocument) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton className="px-3 py-1 text-xs" onClick={() => void handlers.onDelete(row.id)}>
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'calendar':
      return [
        { key: 'grant_number', label: 'Grant', render: (row: GrantCalendarItem) => row.grant_number },
        { key: 'grant_title', label: 'Title', render: (row: GrantCalendarItem) => row.grant_title },
        { key: 'item_type', label: 'Type', render: (row: GrantCalendarItem) => row.item_type },
        { key: 'status', label: 'Status', render: (row: GrantCalendarItem) => row.status },
        { key: 'due', label: 'Due', render: (row: GrantCalendarItem) => formatDateSmart(row.due_at) },
        { key: 'amount', label: 'Amount', render: (row: GrantCalendarItem) => formatMoney(row.amount) },
      ];
    case 'activities':
      return [
        { key: 'created_at', label: 'Created', render: (row: GrantActivityLog) => formatDate(row.created_at) },
        { key: 'entity_type', label: 'Entity', render: (row: GrantActivityLog) => row.entity_type },
        { key: 'action', label: 'Action', render: (row: GrantActivityLog) => row.action },
        { key: 'notes', label: 'Notes', render: (row: GrantActivityLog) => row.notes ?? '—' },
        { key: 'metadata', label: 'Metadata', render: (row: GrantActivityLog) => JSON.stringify(row.metadata) },
      ];
    default:
      return [];
  }
}
