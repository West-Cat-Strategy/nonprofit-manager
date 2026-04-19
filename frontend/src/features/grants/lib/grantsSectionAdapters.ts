import { grantsApiClient } from '../api/grantsApiClient';
import type {
  GrantActivityLog,
  GrantCalendarItem,
  GrantListFilters,
  GrantPagination,
  PaginatedGrantResult,
} from '../types/contracts';
import {
  BLANK_FORM_VALUES_BY_SECTION,
  RECORD_TO_FORM_VALUES_BY_SECTION,
  buildApplicationPayload,
  buildAwardPayload,
  buildDisbursementPayload,
  buildDocumentPayload,
  buildFundedProgramPayload,
  buildFunderPayload,
  buildProgramPayload,
  buildRecipientPayload,
  buildReportPayload,
} from './grantsPageMappers';
import type {
  EditableGrantRecord,
  FormState,
  GrantsLookupState,
  GrantsSectionId,
  GrantsTableRow,
} from './grantsPageTypes';

type GrantsSectionLoadResult = {
  rows: GrantsTableRow[];
  pagination: GrantPagination | null;
};

type GrantsSectionMetadata = {
  id: GrantsSectionId;
  label: string;
  path: string;
  description: string;
  primaryActionLabel: string;
};

type EditableGrantsSectionAdapter = GrantsSectionMetadata & {
  readOnly?: false;
  createBlankFormValues: () => FormState;
  recordToFormValues: (record: EditableGrantRecord) => FormState;
  loadRows: (query: GrantListFilters) => Promise<GrantsSectionLoadResult>;
  saveRecord: (input: {
    selectedId: string | null;
    formValues: FormState;
    lookups: GrantsLookupState;
  }) => Promise<string>;
  deleteRecord: (recordId: string) => Promise<void>;
};

type ReadOnlyGrantsSectionAdapter = GrantsSectionMetadata & {
  readOnly: true;
  createBlankFormValues: () => FormState;
  recordToFormValues: (_record: EditableGrantRecord) => FormState;
  loadRows: (query: GrantListFilters) => Promise<GrantsSectionLoadResult>;
};

export type GrantsSectionAdapter = EditableGrantsSectionAdapter | ReadOnlyGrantsSectionAdapter;

const toListRows = async <T>(
  request: Promise<PaginatedGrantResult<T>>
): Promise<GrantsSectionLoadResult> => {
  const result = await request;
  return {
    rows: result.data as GrantsTableRow[],
    pagination: result.pagination,
  };
};

const toReadOnlyRows = (
  rows: GrantCalendarItem[] | GrantActivityLog[]
): Promise<GrantsSectionLoadResult> =>
  Promise.resolve({
    rows: rows as GrantsTableRow[],
    pagination: null,
  });

const SECTION_ADAPTERS: Record<GrantsSectionId, GrantsSectionAdapter> = {
  funders: {
    id: 'funders',
    label: 'Funders',
    path: '/grants/funders',
    description: 'Track federal, provincial, and private funders with contacts and totals.',
    primaryActionLabel: 'New funder',
    createBlankFormValues: BLANK_FORM_VALUES_BY_SECTION.funders,
    recordToFormValues: RECORD_TO_FORM_VALUES_BY_SECTION.funders,
    loadRows: (query) => toListRows(grantsApiClient.listFunders(query)),
    saveRecord: async ({ selectedId, formValues }) => {
      if (selectedId) {
        await grantsApiClient.updateFunder(selectedId, buildFunderPayload(formValues));
        return 'Funder updated.';
      }

      await grantsApiClient.createFunder(buildFunderPayload(formValues));
      return 'Funder created.';
    },
    deleteRecord: (recordId) => grantsApiClient.deleteFunder(recordId),
  },
  programs: {
    id: 'programs',
    label: 'Programs',
    path: '/grants/programs',
    description: 'Manage grant programs, application windows, and award timelines.',
    primaryActionLabel: 'New program',
    createBlankFormValues: BLANK_FORM_VALUES_BY_SECTION.programs,
    recordToFormValues: RECORD_TO_FORM_VALUES_BY_SECTION.programs,
    loadRows: (query) => toListRows(grantsApiClient.listPrograms(query)),
    saveRecord: async ({ selectedId, formValues }) => {
      if (selectedId) {
        await grantsApiClient.updateProgram(selectedId, buildProgramPayload(formValues));
        return 'Program updated.';
      }

      await grantsApiClient.createProgram(buildProgramPayload(formValues));
      return 'Program created.';
    },
    deleteRecord: (recordId) => grantsApiClient.deleteProgram(recordId),
  },
  recipients: {
    id: 'recipients',
    label: 'Recipients',
    path: '/grants/recipients',
    description: 'Keep recipient organizations, contacts, and geographies organized.',
    primaryActionLabel: 'New recipient',
    createBlankFormValues: BLANK_FORM_VALUES_BY_SECTION.recipients,
    recordToFormValues: RECORD_TO_FORM_VALUES_BY_SECTION.recipients,
    loadRows: (query) => toListRows(grantsApiClient.listRecipients(query)),
    saveRecord: async ({ selectedId, formValues }) => {
      if (selectedId) {
        await grantsApiClient.updateRecipient(selectedId, buildRecipientPayload(formValues));
        return 'Recipient updated.';
      }

      await grantsApiClient.createRecipient(buildRecipientPayload(formValues));
      return 'Recipient created.';
    },
    deleteRecord: (recordId) => grantsApiClient.deleteRecipient(recordId),
  },
  'funded-programs': {
    id: 'funded-programs',
    label: 'Funded Programs',
    path: '/grants/funded-programs',
    description: 'Track the internal programs and initiatives funded by grants.',
    primaryActionLabel: 'New funded program',
    createBlankFormValues: BLANK_FORM_VALUES_BY_SECTION['funded-programs'],
    recordToFormValues: RECORD_TO_FORM_VALUES_BY_SECTION['funded-programs'],
    loadRows: (query) => toListRows(grantsApiClient.listFundedPrograms(query)),
    saveRecord: async ({ selectedId, formValues }) => {
      if (selectedId) {
        await grantsApiClient.updateFundedProgram(selectedId, buildFundedProgramPayload(formValues));
        return 'Funded program updated.';
      }

      await grantsApiClient.createFundedProgram(buildFundedProgramPayload(formValues));
      return 'Funded program created.';
    },
    deleteRecord: (recordId) => grantsApiClient.deleteFundedProgram(recordId),
  },
  applications: {
    id: 'applications',
    label: 'Applications',
    path: '/grants/applications',
    description: 'Review applications, status changes, and award conversions.',
    primaryActionLabel: 'New application',
    createBlankFormValues: BLANK_FORM_VALUES_BY_SECTION.applications,
    recordToFormValues: RECORD_TO_FORM_VALUES_BY_SECTION.applications,
    loadRows: (query) => toListRows(grantsApiClient.listApplications(query)),
    saveRecord: async ({ selectedId, formValues }) => {
      if (selectedId) {
        await grantsApiClient.updateApplication(selectedId, buildApplicationPayload(formValues));
        return 'Application updated.';
      }

      await grantsApiClient.createApplication(buildApplicationPayload(formValues));
      return 'Application created.';
    },
    deleteRecord: (recordId) => grantsApiClient.deleteApplication(recordId),
  },
  awards: {
    id: 'awards',
    label: 'Awards',
    path: '/grants/awards',
    description: 'Track award records, commitments, and outstanding balances.',
    primaryActionLabel: 'New award',
    createBlankFormValues: BLANK_FORM_VALUES_BY_SECTION.awards,
    recordToFormValues: RECORD_TO_FORM_VALUES_BY_SECTION.awards,
    loadRows: (query) => toListRows(grantsApiClient.listAwards(query)),
    saveRecord: async ({ selectedId, formValues, lookups }) => {
      if (selectedId) {
        await grantsApiClient.updateAward(selectedId, buildAwardPayload(formValues, lookups));
        return 'Award updated.';
      }

      await grantsApiClient.createAward(buildAwardPayload(formValues, lookups));
      return 'Award created.';
    },
    deleteRecord: (recordId) => grantsApiClient.deleteAward(recordId),
  },
  disbursements: {
    id: 'disbursements',
    label: 'Disbursements',
    path: '/grants/disbursements',
    description: 'Manage the payment schedule and payout status for each grant.',
    primaryActionLabel: 'New disbursement',
    createBlankFormValues: BLANK_FORM_VALUES_BY_SECTION.disbursements,
    recordToFormValues: RECORD_TO_FORM_VALUES_BY_SECTION.disbursements,
    loadRows: (query) => toListRows(grantsApiClient.listDisbursements(query)),
    saveRecord: async ({ selectedId, formValues }) => {
      if (selectedId) {
        await grantsApiClient.updateDisbursement(selectedId, buildDisbursementPayload(formValues));
        return 'Disbursement updated.';
      }

      await grantsApiClient.createDisbursement(buildDisbursementPayload(formValues));
      return 'Disbursement created.';
    },
    deleteRecord: (recordId) => grantsApiClient.deleteDisbursement(recordId),
  },
  reports: {
    id: 'reports',
    label: 'Reports',
    path: '/grants/reports',
    description: 'Follow reporting deadlines, submissions, and review outcomes.',
    primaryActionLabel: 'New report',
    createBlankFormValues: BLANK_FORM_VALUES_BY_SECTION.reports,
    recordToFormValues: RECORD_TO_FORM_VALUES_BY_SECTION.reports,
    loadRows: (query) => toListRows(grantsApiClient.listReports(query)),
    saveRecord: async ({ selectedId, formValues }) => {
      if (selectedId) {
        await grantsApiClient.updateReport(selectedId, buildReportPayload(formValues));
        return 'Report updated.';
      }

      await grantsApiClient.createReport(buildReportPayload(formValues));
      return 'Report created.';
    },
    deleteRecord: (recordId) => grantsApiClient.deleteReport(recordId),
  },
  documents: {
    id: 'documents',
    label: 'Documents',
    path: '/grants/documents',
    description: 'Attach grant agreements, submissions, and supporting documents.',
    primaryActionLabel: 'New document',
    createBlankFormValues: BLANK_FORM_VALUES_BY_SECTION.documents,
    recordToFormValues: RECORD_TO_FORM_VALUES_BY_SECTION.documents,
    loadRows: (query) => toListRows(grantsApiClient.listDocuments(query)),
    saveRecord: async ({ selectedId, formValues }) => {
      if (selectedId) {
        await grantsApiClient.updateDocument(selectedId, buildDocumentPayload(formValues));
        return 'Document updated.';
      }

      await grantsApiClient.createDocument(buildDocumentPayload(formValues));
      return 'Document created.';
    },
    deleteRecord: (recordId) => grantsApiClient.deleteDocument(recordId),
  },
  calendar: {
    id: 'calendar',
    label: 'Calendar',
    path: '/grants/calendar',
    description: 'Monitor upcoming due dates, milestones, and payment events.',
    primaryActionLabel: 'Refresh calendar',
    readOnly: true,
    createBlankFormValues: BLANK_FORM_VALUES_BY_SECTION.calendar,
    recordToFormValues: RECORD_TO_FORM_VALUES_BY_SECTION.calendar,
    loadRows: async (query) =>
      toReadOnlyRows(
        await grantsApiClient.getCalendar({
          start_date: query.due_after,
          end_date: query.due_before,
          limit: query.limit,
        })
      ),
  },
  activities: {
    id: 'activities',
    label: 'Activity Log',
    path: '/grants/activities',
    description: 'Review the audit trail for grants, applications, and related records.',
    primaryActionLabel: 'Refresh activity',
    readOnly: true,
    createBlankFormValues: BLANK_FORM_VALUES_BY_SECTION.activities,
    recordToFormValues: RECORD_TO_FORM_VALUES_BY_SECTION.activities,
    loadRows: async (query) =>
      toListRows(
        grantsApiClient.listActivities({
          ...query,
          sort_by: 'created_at',
          sort_order: 'desc',
        })
      ),
  },
};

export const SECTION_DEFINITIONS: ReadonlyArray<GrantsSectionMetadata> = Object.values(
  SECTION_ADAPTERS
).map(({ id, label, path, description, primaryActionLabel }) => ({
  id,
  label,
  path,
  description,
  primaryActionLabel,
}));

export const getGrantsSectionAdapter = (sectionId: GrantsSectionId): GrantsSectionAdapter =>
  SECTION_ADAPTERS[sectionId];

export const isEditableGrantsSection = (
  adapter: GrantsSectionAdapter
): adapter is EditableGrantsSectionAdapter => !adapter.readOnly;

export const isReadOnlyGrantsSection = (sectionId: GrantsSectionId): boolean =>
  Boolean(SECTION_ADAPTERS[sectionId].readOnly);

export const sectionLabelById = (sectionId: GrantsSectionId): string =>
  SECTION_ADAPTERS[sectionId]?.label ?? 'Grants';

export const sectionDescriptionById = (sectionId: GrantsSectionId): string =>
  SECTION_ADAPTERS[sectionId]?.description ?? 'Internal grants tracking.';

export const sectionPrimaryActionLabelById = (sectionId: GrantsSectionId): string =>
  SECTION_ADAPTERS[sectionId]?.primaryActionLabel ?? 'New record';

export const getSectionFromPath = (pathname: string): GrantsSectionId => {
  const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  const match = SECTION_DEFINITIONS.find((definition) => normalizedPath === definition.path);
  return match?.id ?? 'funders';
};
