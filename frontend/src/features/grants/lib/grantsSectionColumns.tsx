import { DangerButton, SecondaryButton } from '../../../components/ui';
import {
  formatCurrency,
  formatDate,
  formatDateOnly,
  formatDateSmart,
  toDateInputValue,
} from '../../../utils/format';
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
  GrantsLookupState,
  GrantsSectionId,
  GrantsTableRow,
  TableColumn,
} from './grantsPageTypes';

const formatMaybeDate = (value: string | null | undefined): string =>
  value ? formatDateOnly(value) : '—';

const formatMoney = (value: number | null | undefined, currency = 'CAD'): string =>
  value === null || value === undefined ? '—' : formatCurrency(value, currency);

const formatNumberOrDash = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : String(value);

export function getSectionColumns(
  section: GrantsSectionId,
  lookups: GrantsLookupState,
  handlers: {
    onSelect: (record: EditableGrantRecord) => void;
    onDelete: (recordId: string) => Promise<void> | void;
    onStatusChange: (
      applicationId: string,
      payload: GrantApplicationStatusUpdateDTO
    ) => Promise<void>;
    onAwardApplication: (application: GrantApplication) => Promise<void>;
  }
): TableColumn<GrantsTableRow>[] {
  const funderName = (id: string | null | undefined) =>
    id ? (lookups.funders.find((item) => item.id === id)?.name ?? '—') : '—';
  const programName = (id: string | null | undefined) =>
    id ? (lookups.programs.find((item) => item.id === id)?.name ?? '—') : '—';
  const recipientName = (id: string | null | undefined) =>
    id ? (lookups.recipients.find((item) => item.id === id)?.name ?? '—') : '—';
  const fundedProgramName = (id: string | null | undefined) =>
    id ? (lookups.fundedPrograms.find((item) => item.id === id)?.name ?? '—') : '—';
  const awardNumber = (id: string | null | undefined) =>
    id ? (lookups.awards.find((item) => item.id === id)?.grant_number ?? '—') : '—';

  switch (section) {
    case 'funders':
      return [
        { key: 'name', label: 'Name', render: (row: GrantFunder) => row.name },
        {
          key: 'jurisdiction',
          label: 'Jurisdiction',
          render: (row: GrantFunder) => row.jurisdiction,
        },
        {
          key: 'grant_count',
          label: 'Awards',
          render: (row: GrantFunder) => formatNumberOrDash(row.grant_count ?? null),
        },
        {
          key: 'total_amount',
          label: 'Total',
          render: (row: GrantFunder) => formatMoney(row.total_amount ?? null),
        },
        {
          key: 'active',
          label: 'Active',
          render: (row: GrantFunder) => (row.active ? 'Yes' : 'No'),
        },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: GrantFunder) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton
                className="px-3 py-1 text-xs"
                onClick={() => void handlers.onDelete(row.id)}
              >
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'programs':
      return [
        { key: 'name', label: 'Program', render: (row: GrantProgram) => row.name },
        {
          key: 'funder',
          label: 'Funder',
          render: (row: GrantProgram) => row.funder_name ?? funderName(row.funder_id),
        },
        { key: 'status', label: 'Status', render: (row: GrantProgram) => row.status },
        {
          key: 'due',
          label: 'Due',
          render: (row: GrantProgram) => formatMaybeDate(row.application_due_at),
        },
        {
          key: 'budget',
          label: 'Budget',
          render: (row: GrantProgram) => formatMoney(row.total_budget),
        },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: GrantProgram) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton
                className="px-3 py-1 text-xs"
                onClick={() => void handlers.onDelete(row.id)}
              >
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'recipients':
      return [
        { key: 'name', label: 'Recipient', render: (row: RecipientOrganization) => row.name },
        {
          key: 'jurisdiction',
          label: 'Jurisdiction',
          render: (row: RecipientOrganization) => row.jurisdiction ?? '—',
        },
        {
          key: 'grant_count',
          label: 'Awards',
          render: (row: RecipientOrganization) => formatNumberOrDash(row.grant_count ?? null),
        },
        {
          key: 'total_amount',
          label: 'Total',
          render: (row: RecipientOrganization) => formatMoney(row.total_amount ?? null),
        },
        {
          key: 'active',
          label: 'Active',
          render: (row: RecipientOrganization) => (row.active ? 'Yes' : 'No'),
        },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: RecipientOrganization) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton
                className="px-3 py-1 text-xs"
                onClick={() => void handlers.onDelete(row.id)}
              >
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'funded-programs':
      return [
        { key: 'name', label: 'Program', render: (row: FundedProgram) => row.name },
        {
          key: 'recipient',
          label: 'Recipient',
          render: (row: FundedProgram) =>
            row.recipient_name ?? recipientName(row.recipient_organization_id),
        },
        { key: 'status', label: 'Status', render: (row: FundedProgram) => row.status },
        { key: 'budget', label: 'Budget', render: (row: FundedProgram) => formatMoney(row.budget) },
        {
          key: 'owner',
          label: 'Owner',
          render: (row: FundedProgram) => row.owner_name ?? row.owner_user_id ?? '—',
        },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: FundedProgram) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton
                className="px-3 py-1 text-xs"
                onClick={() => void handlers.onDelete(row.id)}
              >
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'applications':
      return [
        {
          key: 'application_number',
          label: 'Number',
          render: (row: GrantApplication) => row.application_number,
        },
        { key: 'title', label: 'Title', render: (row: GrantApplication) => row.title },
        {
          key: 'funder',
          label: 'Funder',
          render: (row: GrantApplication) => row.funder_name ?? funderName(row.funder_id),
        },
        {
          key: 'program',
          label: 'Program',
          render: (row: GrantApplication) => row.program_name ?? programName(row.program_id),
        },
        {
          key: 'recipient',
          label: 'Recipient',
          render: (row: GrantApplication) =>
            row.recipient_name ?? recipientName(row.recipient_organization_id),
        },
        {
          key: 'funded_program',
          label: 'Funded Program',
          render: (row: GrantApplication) =>
            row.funded_program_name ?? fundedProgramName(row.funded_program_id),
        },
        { key: 'status', label: 'Status', render: (row: GrantApplication) => row.status },
        {
          key: 'requested',
          label: 'Requested',
          render: (row: GrantApplication) => formatMoney(row.requested_amount, row.currency),
        },
        {
          key: 'approved',
          label: 'Approved',
          render: (row: GrantApplication) => formatMoney(row.approved_amount, row.currency),
        },
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
              <SecondaryButton
                className="px-3 py-1 text-xs"
                onClick={() => void handlers.onAwardApplication(row)}
              >
                Award
              </SecondaryButton>
              <DangerButton
                className="px-3 py-1 text-xs"
                onClick={() => void handlers.onDelete(row.id)}
              >
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
        {
          key: 'program',
          label: 'Program',
          render: (row: GrantAward) => row.program_name ?? programName(row.program_id),
        },
        {
          key: 'recipient',
          label: 'Recipient',
          render: (row: GrantAward) =>
            row.recipient_name ?? recipientName(row.recipient_organization_id),
        },
        { key: 'status', label: 'Status', render: (row: GrantAward) => row.status },
        {
          key: 'amount',
          label: 'Amount',
          render: (row: GrantAward) => formatMoney(row.amount, row.currency),
        },
        {
          key: 'outstanding',
          label: 'Outstanding',
          render: (row: GrantAward) => formatMoney(row.outstanding_amount ?? null, row.currency),
        },
        {
          key: 'report',
          label: 'Next report',
          render: (row: GrantAward) => formatMaybeDate(row.next_report_due_at),
        },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: GrantAward) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton
                className="px-3 py-1 text-xs"
                onClick={() => void handlers.onDelete(row.id)}
              >
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'disbursements':
      return [
        {
          key: 'grant',
          label: 'Grant',
          render: (row: GrantDisbursement) => row.grant_number ?? awardNumber(row.grant_id),
        },
        {
          key: 'label',
          label: 'Tranche',
          render: (row: GrantDisbursement) => row.tranche_label ?? '—',
        },
        { key: 'status', label: 'Status', render: (row: GrantDisbursement) => row.status },
        {
          key: 'scheduled',
          label: 'Scheduled',
          render: (row: GrantDisbursement) => formatMaybeDate(row.scheduled_date),
        },
        {
          key: 'paid',
          label: 'Paid',
          render: (row: GrantDisbursement) => formatMaybeDate(row.paid_at),
        },
        {
          key: 'amount',
          label: 'Amount',
          render: (row: GrantDisbursement) => formatMoney(row.amount, row.currency),
        },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: GrantDisbursement) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton
                className="px-3 py-1 text-xs"
                onClick={() => void handlers.onDelete(row.id)}
              >
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'reports':
      return [
        {
          key: 'grant',
          label: 'Grant',
          render: (row: GrantReport) => row.grant_number ?? awardNumber(row.grant_id),
        },
        { key: 'type', label: 'Type', render: (row: GrantReport) => row.report_type },
        { key: 'status', label: 'Status', render: (row: GrantReport) => row.status },
        { key: 'due', label: 'Due', render: (row: GrantReport) => formatMaybeDate(row.due_at) },
        {
          key: 'submitted',
          label: 'Submitted',
          render: (row: GrantReport) => formatMaybeDate(row.submitted_at),
        },
        { key: 'summary', label: 'Summary', render: (row: GrantReport) => row.summary ?? '—' },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: GrantReport) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton
                className="px-3 py-1 text-xs"
                onClick={() => void handlers.onDelete(row.id)}
              >
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
          render: (row: GrantDocument) =>
            row.grant_id ?? row.application_id ?? row.report_id ?? '—',
        },
        {
          key: 'size',
          label: 'Size',
          render: (row: GrantDocument) => formatNumberOrDash(row.file_size),
        },
        { key: 'mime', label: 'Mime Type', render: (row: GrantDocument) => row.mime_type },
        {
          key: 'actions',
          label: 'Actions',
          render: (row: GrantDocument) => (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handlers.onSelect(row)}>
                Edit
              </SecondaryButton>
              <DangerButton
                className="px-3 py-1 text-xs"
                onClick={() => void handlers.onDelete(row.id)}
              >
                Delete
              </DangerButton>
            </div>
          ),
        },
      ];
    case 'calendar':
      return [
        {
          key: 'grant_number',
          label: 'Grant',
          render: (row: GrantCalendarItem) => row.grant_number,
        },
        { key: 'grant_title', label: 'Title', render: (row: GrantCalendarItem) => row.grant_title },
        { key: 'item_type', label: 'Type', render: (row: GrantCalendarItem) => row.item_type },
        { key: 'status', label: 'Status', render: (row: GrantCalendarItem) => row.status },
        {
          key: 'due',
          label: 'Due',
          render: (row: GrantCalendarItem) => formatDateSmart(row.due_at),
        },
        {
          key: 'amount',
          label: 'Amount',
          render: (row: GrantCalendarItem) => formatMoney(row.amount),
        },
      ];
    case 'activities':
      return [
        {
          key: 'created_at',
          label: 'Created',
          render: (row: GrantActivityLog) => formatDate(row.created_at),
        },
        { key: 'entity_type', label: 'Entity', render: (row: GrantActivityLog) => row.entity_type },
        { key: 'action', label: 'Action', render: (row: GrantActivityLog) => row.action },
        { key: 'notes', label: 'Notes', render: (row: GrantActivityLog) => row.notes ?? '—' },
        {
          key: 'metadata',
          label: 'Details',
          render: (row: GrantActivityLog) =>
            row.metadata && Object.keys(row.metadata).length > 0
              ? Object.entries(row.metadata)
                  .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${String(value)}`)
                  .join(', ')
              : '—',
        },
      ];
    default:
      return [];
  }
}
