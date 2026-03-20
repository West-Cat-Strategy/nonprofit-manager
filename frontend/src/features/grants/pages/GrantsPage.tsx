import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DangerButton,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SectionCard,
  SecondaryButton,
  SelectField,
  StatCard,
  TextareaField,
} from '../../../components/ui';
import { triggerFileDownload } from '../../../services/fileDownload';
import { formatCurrency, formatDate, formatDateOnly, formatDateSmart, toDateInputValue } from '../../../utils/format';
import { grantsApiClient } from '../api/grantsApiClient';
import type {
  CreateFundedProgramDTO,
  CreateGrantApplicationDTO,
  CreateGrantAwardDTO,
  CreateGrantDisbursementDTO,
  CreateGrantDocumentDTO,
  CreateGrantFunderDTO,
  CreateGrantProgramDTO,
  CreateGrantReportDTO,
  CreateRecipientOrganizationDTO,
  FundedProgram,
  GrantActivityLog,
  GrantApplication,
  GrantApplicationAwardResult,
  GrantApplicationStatus,
  GrantApplicationStatusUpdateDTO,
  GrantAward,
  GrantAwardStatus,
  GrantCalendarItem,
  GrantDisbursement,
  GrantDisbursementStatus,
  GrantDocument,
  GrantFunder,
  GrantJurisdiction,
  GrantListFilters,
  GrantPagination,
  GrantProgram,
  GrantProgramStatus,
  GrantRecipientStatus,
  GrantReport,
  GrantReportStatus,
  GrantReportingFrequency,
  GrantSummary,
  RecipientOrganization,
} from '../types/contracts';
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

type GrantsSectionId =
  | 'funders'
  | 'programs'
  | 'recipients'
  | 'funded-programs'
  | 'applications'
  | 'awards'
  | 'disbursements'
  | 'reports'
  | 'documents'
  | 'calendar'
  | 'activities';

type FieldKind = 'text' | 'number' | 'date' | 'textarea' | 'select';

type SelectOption = {
  value: string;
  label: string;
};

type FieldDescriptor = {
  name: string;
  label: string;
  kind: FieldKind;
  options?: SelectOption[];
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  colSpan?: string;
  step?: string;
};

type TableColumn<T> = {
  key: string;
  label: string;
  render(row: T): ReactNode;
  className?: string;
};

type FormState = Record<string, string>;

type GrantsLookupState = {
  funders: GrantFunder[];
  programs: GrantProgram[];
  recipients: RecipientOrganization[];
  fundedPrograms: FundedProgram[];
  applications: GrantApplication[];
  awards: GrantAward[];
  reports: GrantReport[];
  documents: GrantDocument[];
};

type EditableGrantRecord =
  | GrantFunder
  | GrantProgram
  | RecipientOrganization
  | FundedProgram
  | GrantApplication
  | GrantAward
  | GrantDisbursement
  | GrantReport
  | GrantDocument;

type GrantsLoadResult = {
  rows: EditableGrantRecord[] | GrantCalendarItem[] | GrantActivityLog[];
  pagination: GrantPagination | null;
  summary: GrantSummary;
  lookups: GrantsLookupState;
};

const SECTION_DEFINITIONS: ReadonlyArray<{
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

const EMPTY_LOOKUPS: GrantsLookupState = {
  funders: [],
  programs: [],
  recipients: [],
  fundedPrograms: [],
  applications: [],
  awards: [],
  reports: [],
  documents: [],
};

const GRANT_JURISDICTION_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select jurisdiction' },
  ...GRANT_JURISDICTIONS.map((jurisdiction) => ({
    value: jurisdiction,
    label: jurisdiction.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
  })),
];

const STATUS_OPTIONS_BY_SECTION: Record<GrantsSectionId, SelectOption[]> = {
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

const isAwardStatus = (value: string | undefined): value is GrantAwardStatus =>
  Boolean(value && GRANT_AWARD_STATUSES.includes(value as GrantAwardStatus));

const toOptions = <T,>(
  items: T[],
  getValue: (item: T) => string,
  getLabel: (item: T) => string
): SelectOption[] => items.map((item) => ({ value: getValue(item), label: getLabel(item) }));

const toNullableString = (value: string | null | undefined): string => value ?? '';
const toNumberString = (value: number | null | undefined): string => (value === null || value === undefined ? '' : String(value));
const toStringOrDefault = (value: string | null | undefined, fallback: string): string =>
  value && value.trim().length > 0 ? value : fallback;
const toGrantJurisdiction = (value: string | null | undefined): GrantJurisdiction | undefined =>
  value && GRANT_JURISDICTIONS.includes(value as GrantJurisdiction) ? (value as GrantJurisdiction) : undefined;

const sectionLabelById = (sectionId: GrantsSectionId): string =>
  SECTION_DEFINITIONS.find((definition) => definition.id === sectionId)?.label ?? 'Grants';

const sectionDescriptionById = (sectionId: GrantsSectionId): string =>
  SECTION_DEFINITIONS.find((definition) => definition.id === sectionId)?.description ??
  'Internal grants tracking.';

const sectionPrimaryActionLabelById = (sectionId: GrantsSectionId): string =>
  SECTION_DEFINITIONS.find((definition) => definition.id === sectionId)?.primaryActionLabel ??
  'New record';

const getSectionFromPath = (pathname: string): GrantsSectionId => {
  const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  const match = SECTION_DEFINITIONS.find((definition) => normalizedPath === definition.path);
  return match?.id ?? 'funders';
};

const getRowKey = (section: GrantsSectionId, row: GrantFunder | GrantProgram | RecipientOrganization | FundedProgram | GrantApplication | GrantAward | GrantDisbursement | GrantReport | GrantDocument | GrantActivityLog | GrantCalendarItem): string => {
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

const createBlankFormValues = (section: GrantsSectionId): FormState => {
  const today = toDateInputValue(new Date());
  switch (section) {
    case 'funders':
      return {
        name: '',
        jurisdiction: '',
        funder_type: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        website: '',
        notes: '',
        active: 'true',
      };
    case 'programs':
      return {
        funder_id: '',
        name: '',
        program_code: '',
        fiscal_year: '',
        jurisdiction: '',
        status: 'draft',
        application_open_at: '',
        application_due_at: '',
        award_date: '',
        expiry_date: '',
        total_budget: '',
        notes: '',
      };
    case 'recipients':
      return {
        name: '',
        legal_name: '',
        jurisdiction: '',
        province: '',
        city: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        website: '',
        status: 'active',
        notes: '',
        active: 'true',
      };
    case 'funded-programs':
      return {
        recipient_organization_id: '',
        name: '',
        description: '',
        owner_user_id: '',
        status: 'planned',
        start_date: '',
        end_date: '',
        budget: '',
        notes: '',
      };
    case 'applications':
      return {
        application_number: '',
        title: '',
        funder_id: '',
        program_id: '',
        recipient_organization_id: '',
        funded_program_id: '',
        status: 'draft',
        requested_amount: '',
        approved_amount: '',
        currency: 'CAD',
        submitted_at: '',
        reviewed_at: '',
        decision_at: '',
        due_at: '',
        outcome_reason: '',
        notes: '',
      };
    case 'awards':
      return {
        grant_number: '',
        title: '',
        application_id: '',
        funder_id: '',
        program_id: '',
        recipient_organization_id: '',
        funded_program_id: '',
        status: 'active',
        amount: '',
        committed_amount: '',
        currency: 'CAD',
        fiscal_year: '',
        jurisdiction: '',
        award_date: today,
        reviewed_at: '',
        decision_at: '',
        start_date: '',
        end_date: '',
        expiry_date: '',
        reporting_frequency: 'annual',
        next_report_due_at: '',
        closeout_due_at: '',
        notes: '',
      };
    case 'disbursements':
      return {
        grant_id: '',
        tranche_label: '',
        scheduled_date: today,
        paid_at: '',
        amount: '',
        currency: 'CAD',
        status: 'scheduled',
        method: '',
        notes: '',
      };
    case 'reports':
      return {
        grant_id: '',
        report_type: 'quarterly',
        period_start: '',
        period_end: '',
        due_at: '',
        submitted_at: '',
        status: 'draft',
        summary: '',
        outstanding_items: '',
        notes: '',
      };
    case 'documents':
      return {
        grant_id: '',
        application_id: '',
        report_id: '',
        document_type: '',
        file_name: '',
        file_url: '',
        mime_type: '',
        file_size: '',
        notes: '',
        uploaded_by: '',
      };
    case 'calendar':
    case 'activities':
      return {};
    default:
      return {};
  }
};

const formatMaybeDate = (value: string | null | undefined): string => (value ? formatDateOnly(value) : '—');

const formatMoney = (value: number | null | undefined, currency = 'CAD'): string =>
  value === null || value === undefined ? '—' : formatCurrency(value, currency);

const formatNumberOrDash = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : String(value);

const renderTable = <T,>({
  title,
  subtitle,
  rows,
  columns,
  rowKey,
  emptyLabel,
  actions,
}: {
  title: string;
  subtitle?: string;
  rows: T[];
  columns: TableColumn<T>[];
  rowKey: (row: T) => string;
  emptyLabel: string;
  actions?: ReactNode;
}) => (
  <SectionCard title={title} subtitle={subtitle} actions={actions}>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-app-border-muted text-sm">
        <thead className="bg-app-surface-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted ${column.className ?? ''}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-app-border-muted bg-app-surface">
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-app-text-muted" colSpan={columns.length}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-app-hover/30">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 align-top text-app-text ${column.className ?? ''}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </SectionCard>
);

function SectionFormField({
  descriptor,
  value,
  onChange,
}: {
  descriptor: FieldDescriptor;
  value: string;
  onChange: (name: string, nextValue: string) => void;
}) {
  const commonProps = {
    id: descriptor.name,
    name: descriptor.name,
    required: descriptor.required,
    helperText: descriptor.helperText,
  };

  switch (descriptor.kind) {
    case 'number':
      return (
        <FormField
          {...commonProps}
          type="number"
          step={descriptor.step ?? '0.01'}
          label={descriptor.label}
          placeholder={descriptor.placeholder}
          value={value}
          onChange={(event) => onChange(descriptor.name, event.target.value)}
        />
      );
    case 'date':
      return (
        <FormField
          {...commonProps}
          type="date"
          label={descriptor.label}
          placeholder={descriptor.placeholder}
          value={value}
          onChange={(event) => onChange(descriptor.name, event.target.value)}
        />
      );
    case 'textarea':
      return (
        <TextareaField
          {...commonProps}
          label={descriptor.label}
          placeholder={descriptor.placeholder}
          value={value}
          onChange={(event) => onChange(descriptor.name, event.target.value)}
        />
      );
    case 'select':
      return (
        <SelectField
          {...commonProps}
          label={descriptor.label}
          value={value}
          onChange={(event) => onChange(descriptor.name, event.target.value)}
        >
          {descriptor.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      );
    case 'text':
    default:
      return (
        <FormField
          {...commonProps}
          type="text"
          label={descriptor.label}
          placeholder={descriptor.placeholder}
          value={value}
          onChange={(event) => onChange(descriptor.name, event.target.value)}
        />
      );
  }
}

export default function GrantsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<GrantsSectionId>(getSectionFromPath(location.pathname));
  const [summary, setSummary] = useState<GrantSummary | null>(null);
  const [rows, setRows] = useState<EditableGrantRecord[] | GrantCalendarItem[] | GrantActivityLog[]>([]);
  const [pagination, setPagination] = useState<GrantPagination | null>(null);
  const [lookups, setLookups] = useState<GrantsLookupState>(EMPTY_LOOKUPS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormState>(createBlankFormValues(activeSection));
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('');
  const [funderFilter, setFunderFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('');
  const [fundedProgramFilter, setFundedProgramFilter] = useState('');
  const [fiscalYearFilter, setFiscalYearFilter] = useState('');
  const [dueBeforeFilter, setDueBeforeFilter] = useState('');
  const [dueAfterFilter, setDueAfterFilter] = useState('');
  const [minAmountFilter, setMinAmountFilter] = useState('');
  const [maxAmountFilter, setMaxAmountFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const matchedSection = getSectionFromPath(location.pathname);
    setActiveSection(matchedSection);
  }, [location.pathname]);

  useEffect(() => {
    setSelectedId(null);
    setFormValues(createBlankFormValues(activeSection));
    setPage(1);
    setError(null);
    setNotice(null);
  }, [activeSection]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setAppliedSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => {
      window.clearTimeout(handle);
    };
  }, [searchInput]);

  const refreshData = () => {
    setRefreshCount((value) => value + 1);
  };

  const buildListQuery = (): GrantListFilters => ({
    search: appliedSearch || undefined,
    status: statusFilter || undefined,
    funder_id: funderFilter || undefined,
    program_id: programFilter || undefined,
    recipient_organization_id: recipientFilter || undefined,
    funded_program_id: fundedProgramFilter || undefined,
    jurisdiction: toGrantJurisdiction(jurisdictionFilter),
    fiscal_year: fiscalYearFilter || undefined,
    due_before: dueBeforeFilter || undefined,
    due_after: dueAfterFilter || undefined,
    min_amount: minAmountFilter ? Number(minAmountFilter) : undefined,
    max_amount: maxAmountFilter ? Number(maxAmountFilter) : undefined,
    page,
    limit,
  });

  const loadCurrentData = async (): Promise<GrantsLoadResult> => {
    const lookupRequests = await Promise.all([
      grantsApiClient.listFunders({ limit: 250 }),
      grantsApiClient.listPrograms({ limit: 250 }),
      grantsApiClient.listRecipients({ limit: 250 }),
      grantsApiClient.listFundedPrograms({ limit: 250 }),
      grantsApiClient.listApplications({ limit: 250 }),
      grantsApiClient.listAwards({ limit: 250 }),
      grantsApiClient.listReports({ limit: 250 }),
      grantsApiClient.listDocuments({ limit: 250 }),
    ]);

    const nextLookups: GrantsLookupState = {
      funders: lookupRequests[0].data,
      programs: lookupRequests[1].data,
      recipients: lookupRequests[2].data as RecipientOrganization[],
      fundedPrograms: lookupRequests[3].data as FundedProgram[],
      applications: lookupRequests[4].data,
      awards: lookupRequests[5].data,
      reports: lookupRequests[6].data,
      documents: lookupRequests[7].data,
    };

    const summaryPromise = grantsApiClient.getSummary({
      jurisdiction: toGrantJurisdiction(jurisdictionFilter),
      fiscal_year: fiscalYearFilter || undefined,
    });

    let currentRows: GrantsLoadResult['rows'] = [];
    let currentPagination: GrantPagination | null = null;

    if (activeSection === 'calendar') {
      currentRows = await grantsApiClient.getCalendar({
        start_date: dueAfterFilter || undefined,
        end_date: dueBeforeFilter || undefined,
        limit,
      });
    } else if (activeSection === 'activities') {
      const result = await grantsApiClient.listActivities({
        ...buildListQuery(),
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      currentRows = result.data;
      currentPagination = result.pagination;
    } else if (activeSection === 'funders') {
      const result = await grantsApiClient.listFunders(buildListQuery());
      currentRows = result.data;
      currentPagination = result.pagination;
    } else if (activeSection === 'programs') {
      const result = await grantsApiClient.listPrograms(buildListQuery());
      currentRows = result.data;
      currentPagination = result.pagination;
    } else if (activeSection === 'recipients') {
      const result = await grantsApiClient.listRecipients(buildListQuery());
      currentRows = result.data as EditableGrantRecord[];
      currentPagination = result.pagination;
    } else if (activeSection === 'funded-programs') {
      const result = await grantsApiClient.listFundedPrograms(buildListQuery());
      currentRows = result.data as EditableGrantRecord[];
      currentPagination = result.pagination;
    } else if (activeSection === 'applications') {
      const result = await grantsApiClient.listApplications(buildListQuery());
      currentRows = result.data;
      currentPagination = result.pagination;
    } else if (activeSection === 'awards') {
      const result = await grantsApiClient.listAwards(buildListQuery());
      currentRows = result.data;
      currentPagination = result.pagination;
    } else if (activeSection === 'disbursements') {
      const result = await grantsApiClient.listDisbursements(buildListQuery());
      currentRows = result.data;
      currentPagination = result.pagination;
    } else if (activeSection === 'reports') {
      const result = await grantsApiClient.listReports(buildListQuery());
      currentRows = result.data;
      currentPagination = result.pagination;
    } else if (activeSection === 'documents') {
      const result = await grantsApiClient.listDocuments(buildListQuery());
      currentRows = result.data;
      currentPagination = result.pagination;
    }

    const summaryResult = await summaryPromise;

    return {
      rows: currentRows,
      pagination: currentPagination,
      summary: summaryResult,
      lookups: nextLookups,
    };
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await loadCurrentData();
        setRows(result.rows);
        setPagination(result.pagination);
        setSummary(result.summary);
        setLookups(result.lookups);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load grants data.');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [
    activeSection,
    appliedSearch,
    dueAfterFilter,
    dueBeforeFilter,
    fiscalYearFilter,
    funderFilter,
    fundedProgramFilter,
    jurisdictionFilter,
    limit,
    maxAmountFilter,
    minAmountFilter,
    page,
    programFilter,
    recipientFilter,
    refreshCount,
    statusFilter,
  ]);

  useEffect(() => {
    const matched = SECTION_DEFINITIONS.find((definition) => definition.id === activeSection);
    if (matched && location.pathname !== matched.path) {
      navigate(matched.path, { replace: true });
    }
  }, [activeSection, location.pathname, navigate]);

  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setAppliedSearch('');
    setStatusFilter('');
    setJurisdictionFilter('');
    setFunderFilter('');
    setProgramFilter('');
    setRecipientFilter('');
    setFundedProgramFilter('');
    setFiscalYearFilter('');
    setDueBeforeFilter('');
    setDueAfterFilter('');
    setMinAmountFilter('');
    setMaxAmountFilter('');
    setPage(1);
  };

  const hasActiveFilters =
    searchInput.trim().length > 0 ||
    statusFilter.length > 0 ||
    jurisdictionFilter.length > 0 ||
    funderFilter.length > 0 ||
    programFilter.length > 0 ||
    recipientFilter.length > 0 ||
    fundedProgramFilter.length > 0 ||
    fiscalYearFilter.trim().length > 0 ||
    dueBeforeFilter.length > 0 ||
    dueAfterFilter.length > 0 ||
    minAmountFilter.trim().length > 0 ||
    maxAmountFilter.trim().length > 0;

  const handleNewRecord = () => {
    setSelectedId(null);
    setFormValues(createBlankFormValues(activeSection));
    setNotice(null);
  };

  const handleSelectRecord = (record: EditableGrantRecord) => {
    setSelectedId(record.id);
    setFormValues(recordToFormValues(activeSection, record));
    setNotice(null);
  };

  const handleFormChange = (name: string, value: string) => {
    setFormValues((current) => ({ ...current, [name]: value }));
  };

  const updateStatus = async (applicationId: string, payload: GrantApplicationStatusUpdateDTO) => {
    setSaving(true);
    setError(null);
    try {
      await grantsApiClient.updateApplicationStatus(applicationId, payload);
      setNotice('Application status updated.');
      refreshData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update application status.');
    } finally {
      setSaving(false);
    }
  };

  const handleAwardApplication = async (application: GrantApplication) => {
    setSaving(true);
    setError(null);
    try {
      const result: GrantApplicationAwardResult = await grantsApiClient.awardApplication(
        application.id,
        buildAwardPayloadFromApplication(application, lookups, formValues)
      );
      setNotice(`Award created for ${result.application.application_number}.`);
      refreshData();
    } catch (awardError) {
      setError(awardError instanceof Error ? awardError.message : 'Failed to create award.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeSection === 'calendar' || activeSection === 'activities') {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (activeSection === 'applications' && selectedId) {
        await grantsApiClient.updateApplication(selectedId, buildApplicationPayload(formValues));
        setNotice('Application updated.');
      } else if (activeSection === 'applications') {
        await grantsApiClient.createApplication(buildApplicationPayload(formValues));
        setNotice('Application created.');
      } else if (activeSection === 'awards' && selectedId) {
        await grantsApiClient.updateAward(selectedId, buildAwardPayload(formValues, lookups));
        setNotice('Award updated.');
      } else if (activeSection === 'awards') {
        await grantsApiClient.createAward(buildAwardPayload(formValues, lookups));
        setNotice('Award created.');
      } else if (activeSection === 'disbursements' && selectedId) {
        await grantsApiClient.updateDisbursement(selectedId, buildDisbursementPayload(formValues));
        setNotice('Disbursement updated.');
      } else if (activeSection === 'disbursements') {
        await grantsApiClient.createDisbursement(buildDisbursementPayload(formValues));
        setNotice('Disbursement created.');
      } else if (activeSection === 'reports' && selectedId) {
        await grantsApiClient.updateReport(selectedId, buildReportPayload(formValues));
        setNotice('Report updated.');
      } else if (activeSection === 'reports') {
        await grantsApiClient.createReport(buildReportPayload(formValues));
        setNotice('Report created.');
      } else if (activeSection === 'documents' && selectedId) {
        await grantsApiClient.updateDocument(selectedId, buildDocumentPayload(formValues));
        setNotice('Document updated.');
      } else if (activeSection === 'documents') {
        await grantsApiClient.createDocument(buildDocumentPayload(formValues));
        setNotice('Document created.');
      } else if (activeSection === 'funders' && selectedId) {
        await grantsApiClient.updateFunder(selectedId, buildFunderPayload(formValues));
        setNotice('Funder updated.');
      } else if (activeSection === 'funders') {
        await grantsApiClient.createFunder(buildFunderPayload(formValues));
        setNotice('Funder created.');
      } else if (activeSection === 'programs' && selectedId) {
        await grantsApiClient.updateProgram(selectedId, buildProgramPayload(formValues));
        setNotice('Program updated.');
      } else if (activeSection === 'programs') {
        await grantsApiClient.createProgram(buildProgramPayload(formValues));
        setNotice('Program created.');
      } else if (activeSection === 'recipients' && selectedId) {
        await grantsApiClient.updateRecipient(selectedId, buildRecipientPayload(formValues));
        setNotice('Recipient updated.');
      } else if (activeSection === 'recipients') {
        await grantsApiClient.createRecipient(buildRecipientPayload(formValues));
        setNotice('Recipient created.');
      } else if (activeSection === 'funded-programs' && selectedId) {
        await grantsApiClient.updateFundedProgram(selectedId, buildFundedProgramPayload(formValues));
        setNotice('Funded program updated.');
      } else if (activeSection === 'funded-programs') {
        await grantsApiClient.createFundedProgram(buildFundedProgramPayload(formValues));
        setNotice('Funded program created.');
      }

      setSelectedId(null);
      setFormValues(createBlankFormValues(activeSection));
      refreshData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save grant record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (recordId?: string) => {
    const id = recordId ?? selectedId;
    if (!id) {
      return;
    }

    const confirmed = window.confirm(`Delete this ${sectionLabelById(activeSection).toLowerCase()} record?`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (activeSection === 'funders') {
        await grantsApiClient.deleteFunder(id);
      } else if (activeSection === 'programs') {
        await grantsApiClient.deleteProgram(id);
      } else if (activeSection === 'recipients') {
        await grantsApiClient.deleteRecipient(id);
      } else if (activeSection === 'funded-programs') {
        await grantsApiClient.deleteFundedProgram(id);
      } else if (activeSection === 'applications') {
        await grantsApiClient.deleteApplication(id);
      } else if (activeSection === 'awards') {
        await grantsApiClient.deleteAward(id);
      } else if (activeSection === 'disbursements') {
        await grantsApiClient.deleteDisbursement(id);
      } else if (activeSection === 'reports') {
        await grantsApiClient.deleteReport(id);
      } else if (activeSection === 'documents') {
        await grantsApiClient.deleteDocument(id);
      }
      setNotice(`${sectionLabelById(activeSection)} deleted.`);
      setSelectedId(null);
      setFormValues(createBlankFormValues(activeSection));
      refreshData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete grant record.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(true);
    setError(null);
    try {
      const file = await grantsApiClient.exportGrants(buildListQuery(), format);
      triggerFileDownload(file);
      setNotice(`Exported grants as ${file.filename}.`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Failed to export grants.');
    } finally {
      setExporting(false);
    }
  };

  const actionButtons = (
    <>
      <SecondaryButton onClick={() => void handleExport('csv')} disabled={exporting}>
        {exporting ? 'Exporting...' : 'Export CSV'}
      </SecondaryButton>
      <SecondaryButton onClick={() => void handleExport('xlsx')} disabled={exporting}>
        Export Excel
      </SecondaryButton>
      <SecondaryButton onClick={() => refreshData()} disabled={loading || exporting}>
        Refresh
      </SecondaryButton>
      <PrimaryButton
        onClick={activeSection === 'calendar' || activeSection === 'activities' ? refreshData : handleNewRecord}
        disabled={saving || loading}
      >
        {sectionPrimaryActionLabelById(activeSection)}
      </PrimaryButton>
    </>
  );

  const sectionFieldDescriptors = getFieldDescriptors(activeSection, lookups);
  const sectionColumns = getSectionColumns(
    activeSection,
    lookups,
    {
      onSelect: handleSelectRecord,
      onDelete: handleDeleteRecord,
      onStatusChange: updateStatus,
      onAwardApplication: handleAwardApplication,
    }
  );

  const currentPaginationText = pagination
    ? `Page ${pagination.page} of ${pagination.total_pages} • ${pagination.total} records`
    : null;

  const summaryCards = summary
    ? [
        { label: 'Funders', value: summary.total_funders },
        { label: 'Programs', value: summary.total_programs },
        { label: 'Recipients', value: summary.total_recipients },
        { label: 'Funded Programs', value: summary.total_funded_programs },
        { label: 'Applications', value: summary.total_applications },
        { label: 'Awards', value: summary.total_awards },
        { label: 'Disbursed', value: formatCurrency(summary.total_disbursed_amount) },
        { label: 'Outstanding', value: formatCurrency(summary.outstanding_amount) },
      ]
    : [];

  const visibleRows = rows as Array<
    GrantFunder | GrantProgram | RecipientOrganization | FundedProgram | GrantApplication | GrantAward | GrantDisbursement | GrantReport | GrantDocument | GrantActivityLog | GrantCalendarItem
  >;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Grants"
        description="Internal tracking for federal and provincial grants by funder, program, recipient, award, disbursement, and reporting status."
        actions={actionButtons}
      />

      {notice && (
        <div className="rounded-[var(--ui-radius-sm)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={() => refreshData()} retryLabel="Reload grants" />}
      {loading && visibleRows.length === 0 ? <LoadingState label="Loading grants..." /> : null}

      {summaryCards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>
      )}

      {summary && (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="Status Mix" subtitle="Grants and applications by current status.">
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.by_status.map((item) => (
                <div key={item.status} className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">{item.status}</p>
                  <p className="mt-1 text-lg font-semibold text-app-text">{item.count}</p>
                  <p className="text-sm text-app-text-muted">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Jurisdiction Mix" subtitle="Federal and provincial portfolio distribution.">
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.by_jurisdiction.map((item) => (
                <div key={item.status} className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">{item.status}</p>
                  <p className="mt-1 text-lg font-semibold text-app-text">{item.count}</p>
                  <p className="text-sm text-app-text-muted">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      <SectionCard title="Sections" subtitle="Switch between grant workspaces, reporting, and portfolio views.">
        <div className="flex flex-wrap gap-2">
          {SECTION_DEFINITIONS.map((definition) => {
            const isActive = definition.id === activeSection;
            return (
              <button
                key={definition.id}
                type="button"
                onClick={() => navigate(definition.path)}
                className={`rounded-[var(--ui-radius-sm)] border px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                    : 'border-app-border bg-app-surface text-app-text hover:bg-app-hover'
                }`}
              >
                {definition.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={`${sectionLabelById(activeSection)} filters`}
        subtitle={sectionDescriptionById(activeSection)}
        actions={
          <SecondaryButton onClick={clearFilters} disabled={!hasActiveFilters}>
            Clear filters
          </SecondaryButton>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField
            label="Search"
            value={searchInput}
            onChange={(event) => handleFilterChange(setSearchInput, event.target.value)}
            placeholder="Search grants, funders, programs..."
          />
          <SelectField
            label="Status"
            value={statusFilter}
            onChange={(event) => handleFilterChange(setStatusFilter, event.target.value)}
          >
            {STATUS_OPTIONS_BY_SECTION[activeSection].map((option) => (
              <option key={option.value || option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Jurisdiction"
            value={jurisdictionFilter}
            onChange={(event) => handleFilterChange(setJurisdictionFilter, event.target.value)}
          >
            {GRANT_JURISDICTION_OPTIONS.map((option) => (
              <option key={option.value || option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <FormField
            label="Fiscal Year"
            value={fiscalYearFilter}
            onChange={(event) => handleFilterChange(setFiscalYearFilter, event.target.value)}
            placeholder="2025"
          />
          <SelectField
            label="Funder"
            value={funderFilter}
            onChange={(event) => handleFilterChange(setFunderFilter, event.target.value)}
          >
            <option value="">All funders</option>
            {toOptions(lookups.funders, (item) => item.id, (item) => item.name).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Program"
            value={programFilter}
            onChange={(event) => handleFilterChange(setProgramFilter, event.target.value)}
          >
            <option value="">All programs</option>
            {toOptions(lookups.programs, (item) => item.id, (item) => `${item.name}${item.funder_name ? ` • ${item.funder_name}` : ''}`).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Recipient"
            value={recipientFilter}
            onChange={(event) => handleFilterChange(setRecipientFilter, event.target.value)}
          >
            <option value="">All recipients</option>
            {toOptions(lookups.recipients, (item) => item.id, (item) => item.name).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Funded Program"
            value={fundedProgramFilter}
            onChange={(event) => handleFilterChange(setFundedProgramFilter, event.target.value)}
          >
            <option value="">All funded programs</option>
            {toOptions(lookups.fundedPrograms, (item) => item.id, (item) => item.name).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <FormField
            label="Due After"
            type="date"
            value={dueAfterFilter}
            onChange={(event) => handleFilterChange(setDueAfterFilter, event.target.value)}
          />
          <FormField
            label="Due Before"
            type="date"
            value={dueBeforeFilter}
            onChange={(event) => handleFilterChange(setDueBeforeFilter, event.target.value)}
          />
          <FormField
            label="Minimum Amount"
            type="number"
            min="0"
            step="0.01"
            value={minAmountFilter}
            onChange={(event) => handleFilterChange(setMinAmountFilter, event.target.value)}
            placeholder="0.00"
          />
          <FormField
            label="Maximum Amount"
            type="number"
            min="0"
            step="0.01"
            value={maxAmountFilter}
            onChange={(event) => handleFilterChange(setMaxAmountFilter, event.target.value)}
            placeholder="0.00"
          />
          <SelectField
            label="Page Size"
            value={String(limit)}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </SelectField>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)]">
        {renderSectionTable(activeSection, rows, sectionColumns, pagination, currentPaginationText, {
          onPageChange: setPage,
          onRefresh: refreshData,
          loading,
          saving,
        })}
        {activeSection === 'calendar' || activeSection === 'activities' ? (
          <SectionCard
            title={`${sectionLabelById(activeSection)} overview`}
            subtitle="These sections are read-only views of upcoming deadlines and recent activity."
          >
            {summary ? (
              <div className="space-y-3">
                <p className="text-sm text-app-text-muted">
                  Upcoming reports: {summary.upcoming_reports} • Upcoming disbursements: {summary.upcoming_disbursements}
                </p>
                <p className="text-sm text-app-text-muted">
                  Overdue reports: {summary.overdue_reports}
                </p>
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton onClick={() => navigate('/grants/reports')}>Open reports</SecondaryButton>
                  <SecondaryButton onClick={() => navigate('/grants/awards')}>Open awards</SecondaryButton>
                </div>
              </div>
            ) : (
              <LoadingState label="Loading overview..." />
            )}
          </SectionCard>
        ) : (
          <SectionCard
            title={selectedId ? `Edit ${sectionLabelById(activeSection)}` : `Create ${sectionLabelById(activeSection)}`}
            subtitle="Save changes directly from this internal staff-only workspace."
          >
            <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
              <div className="grid gap-4 md:grid-cols-2">
                {sectionFieldDescriptors.map((descriptor) => (
                  <div key={descriptor.name} className={descriptor.colSpan ?? ''}>
                    <SectionFormField
                      descriptor={descriptor}
                      value={formValues[descriptor.name] ?? ''}
                      onChange={handleFormChange}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <PrimaryButton type="submit" disabled={saving}>
                  {saving ? 'Saving...' : selectedId ? 'Save changes' : 'Create record'}
                </PrimaryButton>
                {selectedId && (
                  <>
                    <SecondaryButton
                      type="button"
                      onClick={() => {
                        setSelectedId(null);
                        setFormValues(createBlankFormValues(activeSection));
                      }}
                    >
                      New record
                    </SecondaryButton>
                    <DangerButton type="button" onClick={() => void handleDeleteRecord()} disabled={saving}>
                      Delete
                    </DangerButton>
                  </>
                )}
              </div>
            </form>

            <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-app-text-muted">
                Quick references
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-3 text-sm text-app-text-muted">
                  {lookups.funders.length} funders loaded
                </div>
                <div className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-3 text-sm text-app-text-muted">
                  {lookups.programs.length} programs loaded
                </div>
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      {summary && (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="Upcoming items" subtitle="Deadlines and due dates pulled from the grant calendar.">
            <div className="space-y-3">
              {summary.upcoming_items.length === 0 ? (
                <EmptyState
                  title="No upcoming items"
                  description="This portfolio does not have calendar items inside the current window."
                />
              ) : (
                summary.upcoming_items.slice(0, 6).map((item) => (
                  <div
                    key={`${item.item_type}-${item.id}`}
                    className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-app-text">{item.grant_number}</p>
                        <p className="text-sm text-app-text-muted">{item.grant_title}</p>
                        <p className="text-xs uppercase tracking-wide text-app-text-subtle">{item.item_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-app-text">{formatDateSmart(item.due_at)}</p>
                        <p className="text-xs text-app-text-muted">{formatMaybeDate(item.due_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Recent activity" subtitle="Latest audit entries across the grants workspace.">
            <div className="space-y-3">
              {summary.recent_activity.length === 0 ? (
                <EmptyState
                  title="No activity yet"
                  description="Activity will appear after staff create or update grants."
                />
              ) : (
                summary.recent_activity.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-app-text">{item.action}</p>
                        <p className="text-sm text-app-text-muted">{item.entity_type}</p>
                        <p className="text-sm text-app-text-muted">{item.notes ?? 'No notes provided.'}</p>
                      </div>
                      <p className="text-xs text-app-text-muted">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function renderSectionTable(
  section: GrantsSectionId,
  rows: EditableGrantRecord[] | GrantCalendarItem[] | GrantActivityLog[],
  columns: TableColumn<
    GrantFunder | GrantProgram | RecipientOrganization | FundedProgram | GrantApplication | GrantAward | GrantDisbursement | GrantReport | GrantDocument | GrantActivityLog | GrantCalendarItem
  >[],
  pagination: GrantPagination | null,
  paginationLabel: string | null,
  controls: {
    onPageChange: (page: number) => void;
    onRefresh: () => void;
    loading: boolean;
    saving: boolean;
  }
) {
  const title = `${sectionLabelById(section)} records`;
  const subtitle = paginationLabel ?? sectionDescriptionById(section);

  return renderTable({
    title,
    subtitle,
    rows: rows as Array<
      GrantFunder | GrantProgram | RecipientOrganization | FundedProgram | GrantApplication | GrantAward | GrantDisbursement | GrantReport | GrantDocument | GrantActivityLog | GrantCalendarItem
    >,
    columns,
    rowKey: (row) => getRowKey(section, row),
    emptyLabel: 'No records match the current filters.',
    actions: pagination ? (
      <div className="flex flex-wrap gap-2">
        <SecondaryButton onClick={controls.onRefresh} disabled={controls.loading || controls.saving}>
          Refresh
        </SecondaryButton>
        <SecondaryButton
          onClick={() => controls.onPageChange(Math.max(1, pagination.page - 1))}
          disabled={pagination.page <= 1}
        >
          Previous
        </SecondaryButton>
        <SecondaryButton
          onClick={() => controls.onPageChange(Math.min(pagination.total_pages, pagination.page + 1))}
          disabled={pagination.page >= pagination.total_pages}
        >
          Next
        </SecondaryButton>
      </div>
    ) : undefined,
  });
}

function getFieldDescriptors(
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

function getSectionColumns(
  section: GrantsSectionId,
  lookups: GrantsLookupState,
  handlers: {
    onSelect: (record: EditableGrantRecord) => void;
    onDelete: (recordId: string) => Promise<void> | void;
    onStatusChange: (applicationId: string, payload: GrantApplicationStatusUpdateDTO) => Promise<void>;
    onAwardApplication: (application: GrantApplication) => Promise<void>;
  }
): TableColumn<
  GrantFunder | GrantProgram | RecipientOrganization | FundedProgram | GrantApplication | GrantAward | GrantDisbursement | GrantReport | GrantDocument | GrantActivityLog | GrantCalendarItem
>[] {
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

function recordToFormValues(
  section: GrantsSectionId,
  record:
    | GrantFunder
    | GrantProgram
    | RecipientOrganization
    | FundedProgram
    | GrantApplication
    | GrantAward
    | GrantDisbursement
    | GrantReport
    | GrantDocument
): FormState {
  switch (section) {
    case 'funders': {
      const funder = record as GrantFunder;
      return {
        name: funder.name,
        jurisdiction: funder.jurisdiction,
        funder_type: funder.funder_type ?? '',
        contact_name: funder.contact_name ?? '',
        contact_email: funder.contact_email ?? '',
        contact_phone: funder.contact_phone ?? '',
        website: funder.website ?? '',
        notes: funder.notes ?? '',
        active: String(funder.active),
      };
    }
    case 'programs': {
      const program = record as GrantProgram;
      return {
        funder_id: program.funder_id,
        name: program.name,
        program_code: program.program_code ?? '',
        fiscal_year: program.fiscal_year ?? '',
        jurisdiction: program.jurisdiction,
        status: program.status,
        application_open_at: toNullableString(program.application_open_at),
        application_due_at: toNullableString(program.application_due_at),
        award_date: toNullableString(program.award_date),
        expiry_date: toNullableString(program.expiry_date),
        total_budget: toNumberString(program.total_budget),
        notes: program.notes ?? '',
      };
    }
    case 'recipients': {
      const recipient = record as RecipientOrganization;
      return {
        name: recipient.name,
        legal_name: recipient.legal_name ?? '',
        jurisdiction: recipient.jurisdiction ?? '',
        province: recipient.province ?? '',
        city: recipient.city ?? '',
        contact_name: recipient.contact_name ?? '',
        contact_email: recipient.contact_email ?? '',
        contact_phone: recipient.contact_phone ?? '',
        website: recipient.website ?? '',
        status: recipient.status,
        notes: recipient.notes ?? '',
        active: String(recipient.active),
      };
    }
    case 'funded-programs': {
      const fundedProgram = record as FundedProgram;
      return {
        recipient_organization_id: fundedProgram.recipient_organization_id,
        name: fundedProgram.name,
        description: fundedProgram.description ?? '',
        owner_user_id: fundedProgram.owner_user_id ?? '',
        status: fundedProgram.status,
        start_date: toNullableString(fundedProgram.start_date),
        end_date: toNullableString(fundedProgram.end_date),
        budget: toNumberString(fundedProgram.budget),
        notes: fundedProgram.notes ?? '',
      };
    }
    case 'applications': {
      const application = record as GrantApplication;
      return {
        application_number: application.application_number,
        title: application.title,
        funder_id: application.funder_id,
        program_id: application.program_id ?? '',
        recipient_organization_id: application.recipient_organization_id ?? '',
        funded_program_id: application.funded_program_id ?? '',
        status: application.status,
        requested_amount: String(application.requested_amount),
        approved_amount: toNumberString(application.approved_amount),
        currency: application.currency,
        submitted_at: toNullableString(application.submitted_at),
        reviewed_at: toNullableString(application.reviewed_at),
        decision_at: toNullableString(application.decision_at),
        due_at: toNullableString(application.due_at),
        outcome_reason: application.outcome_reason ?? '',
        notes: application.notes ?? '',
      };
    }
    case 'awards': {
      const award = record as GrantAward;
      return {
        grant_number: award.grant_number,
        title: award.title,
        application_id: award.application_id ?? '',
        funder_id: award.funder_id,
        program_id: award.program_id ?? '',
        recipient_organization_id: award.recipient_organization_id ?? '',
        funded_program_id: award.funded_program_id ?? '',
        status: award.status,
        amount: String(award.amount),
        committed_amount: String(award.committed_amount),
        currency: award.currency,
        fiscal_year: award.fiscal_year ?? '',
        jurisdiction: award.jurisdiction,
        award_date: toNullableString(award.award_date),
        reviewed_at: '',
        decision_at: '',
        start_date: toNullableString(award.start_date),
        end_date: toNullableString(award.end_date),
        expiry_date: toNullableString(award.expiry_date),
        reporting_frequency: award.reporting_frequency ?? '',
        next_report_due_at: toNullableString(award.next_report_due_at),
        closeout_due_at: toNullableString(award.closeout_due_at),
        notes: award.notes ?? '',
      };
    }
    case 'disbursements': {
      const disbursement = record as GrantDisbursement;
      return {
        grant_id: disbursement.grant_id,
        tranche_label: disbursement.tranche_label ?? '',
        scheduled_date: toNullableString(disbursement.scheduled_date),
        paid_at: toNullableString(disbursement.paid_at),
        amount: String(disbursement.amount),
        currency: disbursement.currency,
        status: disbursement.status,
        method: disbursement.method ?? '',
        notes: disbursement.notes ?? '',
      };
    }
    case 'reports': {
      const report = record as GrantReport;
      return {
        grant_id: report.grant_id,
        report_type: report.report_type,
        period_start: toNullableString(report.period_start),
        period_end: toNullableString(report.period_end),
        due_at: report.due_at,
        submitted_at: toNullableString(report.submitted_at),
        status: report.status,
        summary: report.summary ?? '',
        outstanding_items: report.outstanding_items ?? '',
        notes: report.notes ?? '',
      };
    }
    case 'documents': {
      const document = record as GrantDocument;
      return {
        grant_id: document.grant_id ?? '',
        application_id: document.application_id ?? '',
        report_id: document.report_id ?? '',
        document_type: document.document_type,
        file_name: document.file_name,
        file_url: document.file_url,
        mime_type: document.mime_type,
        file_size: String(document.file_size),
        notes: document.notes ?? '',
        uploaded_by: document.uploaded_by ?? '',
      };
    }
    case 'calendar':
    case 'activities':
    default:
      return {};
  }
}

function buildFunderPayload(values: FormState): CreateGrantFunderDTO {
  return {
    name: values.name?.trim() || '',
    jurisdiction: toGrantJurisdiction(values.jurisdiction) ?? 'other',
    funder_type: values.funder_type?.trim() || null,
    contact_name: values.contact_name?.trim() || null,
    contact_email: values.contact_email?.trim() || null,
    contact_phone: values.contact_phone?.trim() || null,
    website: values.website?.trim() || null,
    notes: values.notes?.trim() || null,
    active: values.active === 'false' ? false : true,
  };
}

function buildProgramPayload(values: FormState): CreateGrantProgramDTO {
  return {
    funder_id: values.funder_id,
    name: values.name?.trim() || '',
    program_code: values.program_code?.trim() || null,
    fiscal_year: values.fiscal_year?.trim() || null,
    jurisdiction: toGrantJurisdiction(values.jurisdiction) ?? 'other',
    status: values.status ? (values.status as GrantProgramStatus) : 'draft',
    application_open_at: values.application_open_at || null,
    application_due_at: values.application_due_at || null,
    award_date: values.award_date || null,
    expiry_date: values.expiry_date || null,
    total_budget: values.total_budget ? Number(values.total_budget) : null,
    notes: values.notes?.trim() || null,
  };
}

function buildRecipientPayload(values: FormState): CreateRecipientOrganizationDTO {
  return {
    name: values.name?.trim() || '',
    legal_name: values.legal_name?.trim() || null,
    jurisdiction: toGrantJurisdiction(values.jurisdiction) ?? null,
    province: values.province?.trim() || null,
    city: values.city?.trim() || null,
    contact_name: values.contact_name?.trim() || null,
    contact_email: values.contact_email?.trim() || null,
    contact_phone: values.contact_phone?.trim() || null,
    website: values.website?.trim() || null,
    status: values.status ? (values.status as GrantRecipientStatus) : 'active',
    notes: values.notes?.trim() || null,
    active: values.active === 'false' ? false : true,
  };
}

function buildFundedProgramPayload(values: FormState): CreateFundedProgramDTO {
  return {
    recipient_organization_id: values.recipient_organization_id,
    name: values.name?.trim() || '',
    description: values.description?.trim() || null,
    owner_user_id: values.owner_user_id?.trim() || null,
    status: values.status ? (values.status as CreateFundedProgramDTO['status']) : 'planned',
    start_date: values.start_date || null,
    end_date: values.end_date || null,
    budget: values.budget ? Number(values.budget) : null,
    notes: values.notes?.trim() || null,
  };
}

function buildApplicationPayload(values: FormState): CreateGrantApplicationDTO {
  return {
    application_number: values.application_number?.trim() || null,
    title: values.title?.trim() || '',
    funder_id: values.funder_id,
    program_id: values.program_id || null,
    recipient_organization_id: values.recipient_organization_id || null,
    funded_program_id: values.funded_program_id || null,
    status: values.status ? (values.status as GrantApplicationStatus) : 'draft',
    requested_amount: values.requested_amount ? Number(values.requested_amount) : 0,
    approved_amount: values.approved_amount ? Number(values.approved_amount) : null,
    currency: toStringOrDefault(values.currency, 'CAD'),
    submitted_at: values.submitted_at || null,
    reviewed_at: values.reviewed_at || null,
    decision_at: values.decision_at || null,
    due_at: values.due_at || null,
    outcome_reason: values.outcome_reason?.trim() || null,
    notes: values.notes?.trim() || null,
  };
}

function inferJurisdictionFromFunder(funderId: string, lookups: GrantsLookupState): GrantJurisdiction {
  const funder = lookups.funders.find((item) => item.id === funderId);
  return funder?.jurisdiction ?? 'provincial';
}

function buildAwardPayload(
  values: FormState,
  lookups: GrantsLookupState
): CreateGrantAwardDTO {
  const fallbackJurisdiction = inferJurisdictionFromFunder(values.funder_id, lookups);
  return {
    grant_number: values.grant_number?.trim() || null,
    title: values.title?.trim() || '',
    application_id: values.application_id || null,
    funder_id: values.funder_id,
    program_id: values.program_id || null,
    recipient_organization_id: values.recipient_organization_id || null,
    funded_program_id: values.funded_program_id || null,
    status: values.status ? (values.status as GrantAwardStatus) : 'active',
    amount: values.amount ? Number(values.amount) : 0,
    committed_amount: values.committed_amount ? Number(values.committed_amount) : undefined,
    currency: toStringOrDefault(values.currency, 'CAD'),
    fiscal_year: values.fiscal_year?.trim() || null,
    jurisdiction: toGrantJurisdiction(values.jurisdiction) ?? fallbackJurisdiction,
    award_date: values.award_date || null,
    reviewed_at: values.reviewed_at || null,
    decision_at: values.decision_at || null,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
    expiry_date: values.expiry_date || null,
    reporting_frequency: values.reporting_frequency ? (values.reporting_frequency as GrantReportingFrequency) : null,
    next_report_due_at: values.next_report_due_at || null,
    closeout_due_at: values.closeout_due_at || null,
    notes: values.notes?.trim() || null,
  };
}

function buildAwardPayloadFromApplication(
  application: GrantApplication,
  lookups: GrantsLookupState,
  currentFormValues: FormState
): CreateGrantAwardDTO {
  const fallbackAmount = application.approved_amount ?? application.requested_amount;
  const fallbackJurisdiction = inferJurisdictionFromFunder(application.funder_id, lookups);
  return {
    grant_number: currentFormValues.grant_number?.trim() || null,
    title: currentFormValues.title?.trim() || application.title,
    application_id: application.id,
    funder_id: application.funder_id,
    program_id: application.program_id ?? null,
    recipient_organization_id: application.recipient_organization_id ?? null,
    funded_program_id: application.funded_program_id ?? null,
    status: isAwardStatus(currentFormValues.status) ? currentFormValues.status : 'active',
    amount: currentFormValues.amount ? Number(currentFormValues.amount) : fallbackAmount,
    committed_amount: currentFormValues.committed_amount ? Number(currentFormValues.committed_amount) : fallbackAmount,
    currency: toStringOrDefault(currentFormValues.currency || application.currency, 'CAD'),
    fiscal_year: currentFormValues.fiscal_year?.trim() || null,
    jurisdiction: toGrantJurisdiction(currentFormValues.jurisdiction) ?? fallbackJurisdiction,
    award_date: currentFormValues.award_date || toDateInputValue(new Date()),
    reviewed_at: currentFormValues.reviewed_at || toDateInputValue(new Date()),
    decision_at: currentFormValues.decision_at || toDateInputValue(new Date()),
    start_date: currentFormValues.start_date || null,
    end_date: currentFormValues.end_date || null,
    expiry_date: currentFormValues.expiry_date || null,
    reporting_frequency:
      (currentFormValues.reporting_frequency as GrantReportingFrequency) || null,
    next_report_due_at: currentFormValues.next_report_due_at || null,
    closeout_due_at: currentFormValues.closeout_due_at || null,
    notes: currentFormValues.notes?.trim() || application.notes || null,
  };
}

function buildDisbursementPayload(values: FormState): CreateGrantDisbursementDTO {
  return {
    grant_id: values.grant_id,
    tranche_label: values.tranche_label?.trim() || null,
    scheduled_date: values.scheduled_date || null,
    paid_at: values.paid_at || null,
    amount: values.amount ? Number(values.amount) : 0,
    currency: toStringOrDefault(values.currency, 'CAD'),
    status: values.status ? (values.status as GrantDisbursementStatus) : 'scheduled',
    method: values.method?.trim() || null,
    notes: values.notes?.trim() || null,
  };
}

function buildReportPayload(values: FormState): CreateGrantReportDTO {
  return {
    grant_id: values.grant_id,
    report_type: values.report_type?.trim() || 'quarterly',
    period_start: values.period_start || null,
    period_end: values.period_end || null,
    due_at: values.due_at || '',
    submitted_at: values.submitted_at || null,
    status: values.status ? (values.status as GrantReportStatus) : 'draft',
    summary: values.summary?.trim() || null,
    outstanding_items: values.outstanding_items?.trim() || null,
    notes: values.notes?.trim() || null,
  };
}

function buildDocumentPayload(values: FormState): CreateGrantDocumentDTO {
  return {
    grant_id: values.grant_id || null,
    application_id: values.application_id || null,
    report_id: values.report_id || null,
    document_type: values.document_type?.trim() || '',
    file_name: values.file_name?.trim() || '',
    file_url: values.file_url?.trim() || '',
    mime_type: values.mime_type?.trim() || 'application/octet-stream',
    file_size: values.file_size ? Number(values.file_size) : 0,
    notes: values.notes?.trim() || null,
    uploaded_by: values.uploaded_by?.trim() || null,
  };
}
