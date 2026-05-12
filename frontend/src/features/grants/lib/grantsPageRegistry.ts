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
  FieldDescriptor,
  GrantsLookupState,
  GrantsSectionId,
  GrantsTableRow,
  SelectOption,
} from './grantsPageTypes';
export {
  SECTION_DEFINITIONS,
  getSectionFromPath,
  sectionDescriptionById,
  sectionLabelById,
  sectionPrimaryActionLabelById,
} from './grantsSectionAdapters';

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

export { getSectionColumns } from './grantsSectionColumns';

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
    ...toOptions(
      lookups.funders,
      (item) => item.id,
      (item) => item.name
    ),
  ];
  const recipientOptions = [
    { value: '', label: 'Select recipient' },
    ...toOptions(
      lookups.recipients,
      (item) => item.id,
      (item) => item.name
    ),
  ];
  const fundedProgramOptions = [
    { value: '', label: 'Select funded program' },
    ...toOptions(
      lookups.fundedPrograms,
      (item) => item.id,
      (item) => item.name
    ),
  ];
  const applicationOptions = [
    { value: '', label: 'Select application' },
    ...toOptions(
      lookups.applications,
      (item) => item.id,
      (item) => `${item.application_number} • ${item.title}`
    ),
  ];
  const awardOptions = [
    { value: '', label: 'Select award' },
    ...toOptions(
      lookups.awards,
      (item) => item.id,
      (item) => `${item.grant_number} • ${item.title}`
    ),
  ];
  const reportOptions = [
    { value: '', label: 'Select report' },
    ...toOptions(
      lookups.reports,
      (item) => item.id,
      (item) => `${item.grant_number ?? item.grant_id} • ${item.report_type}`
    ),
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
        {
          name: 'jurisdiction',
          label: 'Jurisdiction',
          kind: 'select',
          options: GRANT_JURISDICTION_OPTIONS,
          required: true,
        },
        {
          name: 'funder_type',
          label: 'Funder Type',
          kind: 'text',
          placeholder: 'Foundation, ministry, agency',
        },
        { name: 'contact_name', label: 'Contact Name', kind: 'text' },
        { name: 'contact_email', label: 'Contact Email', kind: 'text' },
        { name: 'contact_phone', label: 'Contact Phone', kind: 'text' },
        { name: 'website', label: 'Website', kind: 'text', placeholder: 'https://example.org' },
        {
          name: 'active',
          label: 'Active',
          kind: 'select',
          options: BOOLEAN_OPTIONS,
          required: true,
        },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'programs':
      return [
        {
          name: 'funder_id',
          label: 'Funder',
          kind: 'select',
          options: funderOptions,
          required: true,
          colSpan: 'md:col-span-2',
        },
        {
          name: 'name',
          label: 'Program Name',
          kind: 'text',
          required: true,
          colSpan: 'md:col-span-2',
        },
        { name: 'program_code', label: 'Program Code', kind: 'text' },
        { name: 'fiscal_year', label: 'Fiscal Year', kind: 'text', placeholder: '2026' },
        {
          name: 'jurisdiction',
          label: 'Jurisdiction',
          kind: 'select',
          options: GRANT_JURISDICTION_OPTIONS,
          required: true,
        },
        {
          name: 'status',
          label: 'Status',
          kind: 'select',
          options: STATUS_OPTIONS_BY_SECTION.programs,
          required: true,
        },
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
        {
          name: 'jurisdiction',
          label: 'Jurisdiction',
          kind: 'select',
          options: GRANT_JURISDICTION_OPTIONS,
        },
        { name: 'province', label: 'Province / State', kind: 'text' },
        { name: 'city', label: 'City', kind: 'text' },
        { name: 'contact_name', label: 'Contact Name', kind: 'text' },
        { name: 'contact_email', label: 'Contact Email', kind: 'text' },
        { name: 'contact_phone', label: 'Contact Phone', kind: 'text' },
        { name: 'website', label: 'Website', kind: 'text' },
        {
          name: 'status',
          label: 'Status',
          kind: 'select',
          options: STATUS_OPTIONS_BY_SECTION.recipients,
          required: true,
        },
        {
          name: 'active',
          label: 'Active',
          kind: 'select',
          options: BOOLEAN_OPTIONS,
          required: true,
        },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'funded-programs':
      return [
        {
          name: 'recipient_organization_id',
          label: 'Recipient',
          kind: 'select',
          options: recipientOptions,
          required: true,
          colSpan: 'md:col-span-2',
        },
        {
          name: 'name',
          label: 'Program Name',
          kind: 'text',
          required: true,
          colSpan: 'md:col-span-2',
        },
        { name: 'description', label: 'Description', kind: 'textarea', colSpan: 'md:col-span-2' },
        {
          name: 'owner_user_id',
          label: 'Owner User ID',
          kind: 'text',
          placeholder: 'Internal staff owner',
        },
        {
          name: 'status',
          label: 'Status',
          kind: 'select',
          options: FUNDING_STATUS_OPTIONS,
          required: true,
        },
        { name: 'start_date', label: 'Start Date', kind: 'date' },
        { name: 'end_date', label: 'End Date', kind: 'date' },
        { name: 'budget', label: 'Budget', kind: 'number', step: '0.01' },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'applications':
      return [
        { name: 'application_number', label: 'Application Number', kind: 'text' },
        { name: 'title', label: 'Title', kind: 'text', required: true, colSpan: 'md:col-span-2' },
        {
          name: 'funder_id',
          label: 'Funder',
          kind: 'select',
          options: funderOptions,
          required: true,
          colSpan: 'md:col-span-2',
        },
        {
          name: 'program_id',
          label: 'Program',
          kind: 'select',
          options: [
            { value: '', label: 'Select program' },
            ...toOptions(
              lookups.programs,
              (item) => item.id,
              (item) => item.name
            ),
          ],
        },
        {
          name: 'recipient_organization_id',
          label: 'Recipient',
          kind: 'select',
          options: recipientOptions,
        },
        {
          name: 'funded_program_id',
          label: 'Funded Program',
          kind: 'select',
          options: fundedProgramOptions,
        },
        {
          name: 'status',
          label: 'Status',
          kind: 'select',
          options: STATUS_OPTIONS_BY_SECTION.applications,
          required: true,
        },
        {
          name: 'requested_amount',
          label: 'Requested Amount',
          kind: 'number',
          required: true,
          step: '0.01',
        },
        { name: 'approved_amount', label: 'Approved Amount', kind: 'number', step: '0.01' },
        {
          name: 'currency',
          label: 'Currency',
          kind: 'select',
          options: currencyOptions,
          required: true,
        },
        { name: 'submitted_at', label: 'Submitted At', kind: 'date' },
        { name: 'reviewed_at', label: 'Reviewed At', kind: 'date' },
        { name: 'decision_at', label: 'Decision At', kind: 'date' },
        { name: 'due_at', label: 'Due At', kind: 'date' },
        {
          name: 'outcome_reason',
          label: 'Outcome Reason',
          kind: 'textarea',
          colSpan: 'md:col-span-2',
        },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'awards':
      return [
        { name: 'grant_number', label: 'Grant Number', kind: 'text' },
        { name: 'title', label: 'Title', kind: 'text', required: true, colSpan: 'md:col-span-2' },
        {
          name: 'application_id',
          label: 'Application',
          kind: 'select',
          options: applicationOptions,
          colSpan: 'md:col-span-2',
        },
        {
          name: 'funder_id',
          label: 'Funder',
          kind: 'select',
          options: funderOptions,
          required: true,
          colSpan: 'md:col-span-2',
        },
        {
          name: 'program_id',
          label: 'Program',
          kind: 'select',
          options: [
            { value: '', label: 'Select program' },
            ...toOptions(
              lookups.programs,
              (item) => item.id,
              (item) => item.name
            ),
          ],
        },
        {
          name: 'recipient_organization_id',
          label: 'Recipient',
          kind: 'select',
          options: recipientOptions,
        },
        {
          name: 'funded_program_id',
          label: 'Funded Program',
          kind: 'select',
          options: fundedProgramOptions,
        },
        {
          name: 'status',
          label: 'Status',
          kind: 'select',
          options: STATUS_OPTIONS_BY_SECTION.awards,
          required: true,
        },
        { name: 'amount', label: 'Amount', kind: 'number', required: true, step: '0.01' },
        { name: 'committed_amount', label: 'Committed Amount', kind: 'number', step: '0.01' },
        {
          name: 'currency',
          label: 'Currency',
          kind: 'select',
          options: currencyOptions,
          required: true,
        },
        { name: 'fiscal_year', label: 'Fiscal Year', kind: 'text' },
        {
          name: 'jurisdiction',
          label: 'Jurisdiction',
          kind: 'select',
          options: GRANT_JURISDICTION_OPTIONS,
          required: true,
        },
        { name: 'award_date', label: 'Award Date', kind: 'date' },
        { name: 'reviewed_at', label: 'Reviewed At', kind: 'date' },
        { name: 'decision_at', label: 'Decision At', kind: 'date' },
        { name: 'start_date', label: 'Start Date', kind: 'date' },
        { name: 'end_date', label: 'End Date', kind: 'date' },
        { name: 'expiry_date', label: 'Expiry Date', kind: 'date' },
        {
          name: 'reporting_frequency',
          label: 'Reporting Frequency',
          kind: 'select',
          options: REPORTING_FREQUENCY_OPTIONS,
        },
        { name: 'next_report_due_at', label: 'Next Report Due', kind: 'date' },
        { name: 'closeout_due_at', label: 'Closeout Due', kind: 'date' },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'disbursements':
      return [
        {
          name: 'grant_id',
          label: 'Award',
          kind: 'select',
          options: awardOptions,
          required: true,
          colSpan: 'md:col-span-2',
        },
        { name: 'tranche_label', label: 'Tranche Label', kind: 'text' },
        { name: 'scheduled_date', label: 'Scheduled Date', kind: 'date' },
        { name: 'paid_at', label: 'Paid At', kind: 'date' },
        { name: 'amount', label: 'Amount', kind: 'number', required: true, step: '0.01' },
        {
          name: 'currency',
          label: 'Currency',
          kind: 'select',
          options: currencyOptions,
          required: true,
        },
        {
          name: 'status',
          label: 'Status',
          kind: 'select',
          options: STATUS_OPTIONS_BY_SECTION.disbursements,
          required: true,
        },
        { name: 'method', label: 'Method', kind: 'text' },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'reports':
      return [
        {
          name: 'grant_id',
          label: 'Award',
          kind: 'select',
          options: awardOptions,
          required: true,
          colSpan: 'md:col-span-2',
        },
        { name: 'report_type', label: 'Report Type', kind: 'text', required: true },
        { name: 'period_start', label: 'Period Start', kind: 'date' },
        { name: 'period_end', label: 'Period End', kind: 'date' },
        { name: 'due_at', label: 'Due At', kind: 'date', required: true },
        { name: 'submitted_at', label: 'Submitted At', kind: 'date' },
        {
          name: 'status',
          label: 'Status',
          kind: 'select',
          options: STATUS_OPTIONS_BY_SECTION.reports,
          required: true,
        },
        { name: 'summary', label: 'Summary', kind: 'textarea', colSpan: 'md:col-span-2' },
        {
          name: 'outstanding_items',
          label: 'Outstanding Items',
          kind: 'textarea',
          colSpan: 'md:col-span-2',
        },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
      ];
    case 'documents':
      return [
        {
          name: 'grant_id',
          label: 'Award',
          kind: 'select',
          options: awardOptions,
          colSpan: 'md:col-span-2',
        },
        {
          name: 'application_id',
          label: 'Application',
          kind: 'select',
          options: applicationOptions,
        },
        { name: 'report_id', label: 'Report', kind: 'select', options: reportOptions },
        { name: 'document_type', label: 'Document Type', kind: 'text', required: true },
        {
          name: 'file_name',
          label: 'File Name',
          kind: 'text',
          required: true,
          colSpan: 'md:col-span-2',
        },
        {
          name: 'file_url',
          label: 'File URL',
          kind: 'text',
          required: true,
          colSpan: 'md:col-span-2',
          placeholder: 'https://...',
        },
        {
          name: 'mime_type',
          label: 'Mime Type',
          kind: 'text',
          required: true,
          placeholder: 'application/pdf',
        },
        {
          name: 'file_size',
          label: 'File Size (bytes)',
          kind: 'number',
          required: true,
          step: '1',
        },
        { name: 'notes', label: 'Notes', kind: 'textarea', colSpan: 'md:col-span-2' },
        { name: 'uploaded_by', label: 'Uploaded By', kind: 'text' },
      ];
    case 'calendar':
    case 'activities':
    default:
      return [];
  }
}
