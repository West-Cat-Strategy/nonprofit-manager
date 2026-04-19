import { toDateInputValue } from '../../../utils/format';
import { GRANT_AWARD_STATUSES, GRANT_JURISDICTIONS } from '../../../types/grant';
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
  GrantApplication,
  GrantApplicationStatus,
  GrantAward,
  GrantAwardStatus,
  GrantDisbursement,
  GrantDisbursementStatus,
  GrantDocument,
  GrantFunder,
  GrantJurisdiction,
  GrantProgram,
  GrantProgramStatus,
  GrantRecipientStatus,
  GrantReport,
  GrantReportStatus,
  GrantReportingFrequency,
  RecipientOrganization,
} from '../types/contracts';
import type { EditableGrantRecord, FormState, GrantsLookupState, GrantsSectionId } from './grantsPageTypes';

const isAwardStatus = (value: string | undefined): value is GrantAwardStatus =>
  Boolean(value && GRANT_AWARD_STATUSES.includes(value as GrantAwardStatus));

const toNullableString = (value: string | null | undefined): string => value ?? '';
const toNumberString = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value);
const toStringOrDefault = (value: string | null | undefined, fallback: string): string =>
  value && value.trim().length > 0 ? value : fallback;

export const toGrantJurisdiction = (value: string | null | undefined): GrantJurisdiction | undefined =>
  value && GRANT_JURISDICTIONS.includes(value as GrantJurisdiction) ? (value as GrantJurisdiction) : undefined;

const createEmptyGrantFormValues = (): FormState => ({});

export const BLANK_FORM_VALUES_BY_SECTION: Record<GrantsSectionId, () => FormState> = {
  funders: () => ({
    name: '',
    jurisdiction: '',
    funder_type: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    notes: '',
    active: 'true',
  }),
  programs: () => ({
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
  }),
  recipients: () => ({
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
  }),
  'funded-programs': () => ({
    recipient_organization_id: '',
    name: '',
    description: '',
    owner_user_id: '',
    status: 'planned',
    start_date: '',
    end_date: '',
    budget: '',
    notes: '',
  }),
  applications: () => ({
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
  }),
  awards: () => {
    const today = toDateInputValue(new Date());
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
  },
  disbursements: () => {
    const today = toDateInputValue(new Date());
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
  },
  reports: () => ({
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
  }),
  documents: () => ({
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
  }),
  calendar: createEmptyGrantFormValues,
  activities: createEmptyGrantFormValues,
};

export const createBlankFormValues = (section: GrantsSectionId): FormState =>
  BLANK_FORM_VALUES_BY_SECTION[section]?.() ?? {};

export const RECORD_TO_FORM_VALUES_BY_SECTION: Record<
  GrantsSectionId,
  (record: EditableGrantRecord) => FormState
> = {
  funders: (record) => {
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
  },
  programs: (record) => {
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
  },
  recipients: (record) => {
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
  },
  'funded-programs': (record) => {
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
  },
  applications: (record) => {
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
  },
  awards: (record) => {
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
  },
  disbursements: (record) => {
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
  },
  reports: (record) => {
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
  },
  documents: (record) => {
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
  },
  calendar: createEmptyGrantFormValues,
  activities: createEmptyGrantFormValues,
};

export function recordToFormValues(section: GrantsSectionId, record: EditableGrantRecord): FormState {
  return RECORD_TO_FORM_VALUES_BY_SECTION[section]?.(record) ?? {};
}

export function buildFunderPayload(values: FormState): CreateGrantFunderDTO {
  return {
    name: values.name?.trim() || '',
    jurisdiction: toGrantJurisdiction(values.jurisdiction) ?? 'other',
    funder_type: values.funder_type?.trim() || null,
    contact_name: values.contact_name?.trim() || null,
    contact_email: values.contact_email?.trim() || null,
    contact_phone: values.contact_phone?.trim() || null,
    website: values.website?.trim() || null,
    notes: values.notes?.trim() || null,
    active: values.active !== 'false',
  };
}

export function buildProgramPayload(values: FormState): CreateGrantProgramDTO {
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

export function buildRecipientPayload(values: FormState): CreateRecipientOrganizationDTO {
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
    active: values.active !== 'false',
  };
}

export function buildFundedProgramPayload(values: FormState): CreateFundedProgramDTO {
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

export function buildApplicationPayload(values: FormState): CreateGrantApplicationDTO {
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

export function buildAwardPayload(values: FormState, lookups: GrantsLookupState): CreateGrantAwardDTO {
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

export function buildAwardPayloadFromApplication(
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

export function buildDisbursementPayload(values: FormState): CreateGrantDisbursementDTO {
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

export function buildReportPayload(values: FormState): CreateGrantReportDTO {
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

export function buildDocumentPayload(values: FormState): CreateGrantDocumentDTO {
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
