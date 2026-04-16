import api from '../../../services/api';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  CaseFormAsset,
  CaseFormAssignment,
  CaseFormAssignmentDetail,
  SaveCaseFormDraftDTO,
  SubmitCaseFormDTO,
} from '../../../types/caseForms';

class PublicCaseFormsApiClient {
  async getForm(token: string): Promise<CaseFormAssignmentDetail> {
    const response = await api.get<ApiEnvelope<CaseFormAssignmentDetail>>(`/v2/public/case-forms/${token}`);
    return unwrapApiData(response.data);
  }

  async uploadAsset(
    token: string,
    input: { question_key: string; asset_kind: 'upload' | 'signature'; file: File }
  ): Promise<CaseFormAsset> {
    const formData = new FormData();
    formData.set('question_key', input.question_key);
    formData.set('asset_kind', input.asset_kind);
    formData.set('file', input.file);

    const response = await api.post<ApiEnvelope<CaseFormAsset>>(
      `/v2/public/case-forms/${token}/assets`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return unwrapApiData(response.data);
  }

  async saveDraft(token: string, payload: SaveCaseFormDraftDTO): Promise<CaseFormAssignment> {
    const response = await api.post<ApiEnvelope<CaseFormAssignment>>(
      `/v2/public/case-forms/${token}/draft`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async submit(token: string, payload: SubmitCaseFormDTO): Promise<CaseFormAssignmentDetail> {
    const response = await api.post<ApiEnvelope<CaseFormAssignmentDetail>>(
      `/v2/public/case-forms/${token}/submit`,
      payload
    );
    return unwrapApiData(response.data);
  }

  getResponsePacketDownloadUrl(token: string): string {
    return `/api/v2/public/case-forms/${token}/response-packet`;
  }
}

export const publicCaseFormsApiClient = new PublicCaseFormsApiClient();
