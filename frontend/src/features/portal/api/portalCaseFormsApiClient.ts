import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  CaseFormAsset,
  CaseFormAssignmentBucket,
  CaseFormAssignment,
  CaseFormAssignmentDetail,
  CaseFormAssignmentSummary,
  SaveCaseFormDraftDTO,
  SubmitCaseFormDTO,
} from '../../../types/caseForms';

const PORTAL_FORM_ASSIGNMENTS_BASE_PATH = '/v2/portal/forms/assignments';

const CASE_FORM_ASSIGNMENT_STATUSES = new Set<CaseFormAssignment['status']>([
  'draft',
  'sent',
  'viewed',
  'in_progress',
  'submitted',
  'reviewed',
  'closed',
  'expired',
  'cancelled',
]);

const isStringOrNullish = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === 'string';

const isCaseFormAssignment = (value: unknown): value is CaseFormAssignmentSummary => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<CaseFormAssignmentSummary>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.updated_at === 'string' &&
    typeof candidate.status === 'string' &&
    CASE_FORM_ASSIGNMENT_STATUSES.has(candidate.status as CaseFormAssignment['status']) &&
    isStringOrNullish(candidate.description) &&
    isStringOrNullish(candidate.due_at) &&
    isStringOrNullish(candidate.sent_at) &&
    isStringOrNullish(candidate.submitted_at) &&
    isStringOrNullish(candidate.case_number) &&
    isStringOrNullish(candidate.case_title)
  );
};

const isCaseFormAssignmentArray = (value: unknown): value is CaseFormAssignmentSummary[] =>
  Array.isArray(value) && value.every(isCaseFormAssignment);

export class PortalCaseFormsApiClient {
  async listForms(status: CaseFormAssignmentBucket = 'active'): Promise<CaseFormAssignmentSummary[]> {
    const response = await portalApi.get<ApiEnvelope<unknown>>(PORTAL_FORM_ASSIGNMENTS_BASE_PATH, {
      params: { status },
    });
    const assignments = unwrapApiData(response.data);
    if (!isCaseFormAssignmentArray(assignments)) {
      throw new Error(
        'Portal forms contract error: expected an array of case-form assignment summaries from /v2/portal/forms/assignments.'
      );
    }
    return assignments;
  }

  async getForm(assignmentId: string): Promise<CaseFormAssignmentDetail> {
    const response = await portalApi.get<ApiEnvelope<CaseFormAssignmentDetail>>(
      `${PORTAL_FORM_ASSIGNMENTS_BASE_PATH}/${assignmentId}`
    );
    return unwrapApiData(response.data);
  }

  async uploadAsset(
    assignmentId: string,
    input: { question_key: string; asset_kind: 'upload' | 'signature'; file: File }
  ): Promise<CaseFormAsset> {
    const formData = new FormData();
    formData.set('question_key', input.question_key);
    formData.set('asset_kind', input.asset_kind);
    formData.set('file', input.file);

    const response = await portalApi.post<ApiEnvelope<CaseFormAsset>>(
      `${PORTAL_FORM_ASSIGNMENTS_BASE_PATH}/${assignmentId}/assets`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return unwrapApiData(response.data);
  }

  async saveDraft(assignmentId: string, payload: SaveCaseFormDraftDTO): Promise<CaseFormAssignment> {
    const response = await portalApi.post<ApiEnvelope<CaseFormAssignment>>(
      `${PORTAL_FORM_ASSIGNMENTS_BASE_PATH}/${assignmentId}/draft`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async submit(assignmentId: string, payload: SubmitCaseFormDTO): Promise<CaseFormAssignmentDetail> {
    const response = await portalApi.post<ApiEnvelope<CaseFormAssignmentDetail>>(
      `${PORTAL_FORM_ASSIGNMENTS_BASE_PATH}/${assignmentId}/submit`,
      payload
    );
    return unwrapApiData(response.data);
  }

  getResponsePacketDownloadUrl(assignmentId: string): string {
    return `/api/v2/portal/forms/assignments/${assignmentId}/response-packet`;
  }
}

export const portalCaseFormsApiClient = new PortalCaseFormsApiClient();
