import type { ReactNode } from 'react';
import type {
  FundedProgram,
  GrantActivityLog,
  GrantApplication,
  GrantAward,
  GrantCalendarItem,
  GrantDisbursement,
  GrantDocument,
  GrantFunder,
  GrantPagination,
  GrantProgram,
  GrantReport,
  GrantSummary,
  RecipientOrganization,
} from '../types/contracts';

export type GrantsSectionId =
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

export type FieldKind = 'text' | 'number' | 'date' | 'textarea' | 'select';

export type SelectOption = {
  value: string;
  label: string;
};

export type FieldDescriptor = {
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

export type TableColumn<T> = {
  key: string;
  label: string;
  render(row: T): ReactNode;
  className?: string;
};

export type FormState = Record<string, string>;

export type GrantsLookupState = {
  funders: GrantFunder[];
  programs: GrantProgram[];
  recipients: RecipientOrganization[];
  fundedPrograms: FundedProgram[];
  applications: GrantApplication[];
  awards: GrantAward[];
  reports: GrantReport[];
  documents: GrantDocument[];
};

export type EditableGrantRecord =
  | GrantFunder
  | GrantProgram
  | RecipientOrganization
  | FundedProgram
  | GrantApplication
  | GrantAward
  | GrantDisbursement
  | GrantReport
  | GrantDocument;

export type GrantsTableRow =
  | EditableGrantRecord
  | GrantActivityLog
  | GrantCalendarItem;

export type GrantsLoadResult = {
  rows: GrantsTableRow[];
  pagination: GrantPagination | null;
  summary: GrantSummary;
  lookups: GrantsLookupState;
};
