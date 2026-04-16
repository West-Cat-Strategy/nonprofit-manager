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

class PortalCaseFormsApiClient {
  async listForms(): Promise<CaseFormAssignment[]> {
    const response = await portalApi.get<ApiEnvelope<CaseFormAssignment[]>>('/v2/portal/forms');
    return unwrapApiData(response.data);
  }

  async getForm(assignmentId: string): Promise<CaseFormAssignmentDetail> {
    const response = await portalApi.get<ApiEnvelope<CaseFormAssignmentDetail>>(
      `/v2/portal/forms/${assignmentId}`
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
      `/v2/portal/forms/${assignmentId}/assets`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return unwrapApiData(response.data);
  }

  async saveDraft(assignmentId: string, payload: SaveCaseFormDraftDTO): Promise<CaseFormAssignment> {
    const response = await portalApi.post<ApiEnvelope<CaseFormAssignment>>(
      `/v2/portal/forms/${assignmentId}/draft`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async submit(assignmentId: string, payload: SubmitCaseFormDTO): Promise<CaseFormAssignmentDetail> {
    const response = await portalApi.post<ApiEnvelope<CaseFormAssignmentDetail>>(
      `/v2/portal/forms/${assignmentId}/submit`,
      payload
    );
    return unwrapApiData(response.data);
  }

  getResponsePacketDownloadUrl(assignmentId: string): string {
    return `/api/v2/portal/forms/${assignmentId}/response-packet`;
  }
}

export const portalCaseFormsApiClient = new PortalCaseFormsApiClient();
