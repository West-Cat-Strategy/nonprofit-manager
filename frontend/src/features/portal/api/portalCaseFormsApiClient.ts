import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  CaseFormAsset,
  CaseFormAssignment,
  CaseFormAssignmentDetail,
  SaveCaseFormDraftDTO,
  SubmitCaseFormDTO,
} from '../../../types/caseForms';

const PORTAL_FORM_ASSIGNMENTS_BASE_PATH = '/v2/portal/forms/assignments';

const isCaseFormAssignment = (value: unknown): value is CaseFormAssignment => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<CaseFormAssignment>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.status === 'string'
  );
};

const isCaseFormAssignmentArray = (value: unknown): value is CaseFormAssignment[] =>
  Array.isArray(value) && value.every(isCaseFormAssignment);

export class PortalCaseFormsApiClient {
  async listForms(): Promise<CaseFormAssignment[]> {
    const response = await portalApi.get<ApiEnvelope<unknown>>(PORTAL_FORM_ASSIGNMENTS_BASE_PATH);
    const assignments = unwrapApiData(response.data);
    if (!isCaseFormAssignmentArray(assignments)) {
      throw new Error(
        'Portal forms contract error: expected an array of case-form assignments from /v2/portal/forms/assignments.'
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
