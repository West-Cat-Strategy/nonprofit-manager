import publicApi from '../../../services/publicApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  CaseFormAsset,
  CaseFormAssignment,
  CaseFormAssignmentDetail,
  SaveCaseFormDraftDTO,
  SubmitCaseFormDTO,
} from '../../../types/caseForms';

const publicTokenHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

class PublicCaseFormsApiClient {
  async getForm(token: string): Promise<CaseFormAssignmentDetail> {
    const response = await publicApi.get<ApiEnvelope<CaseFormAssignmentDetail>>(
      '/v2/public/case-forms',
      {
        headers: publicTokenHeaders(token),
      }
    );
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

    const response = await publicApi.post<ApiEnvelope<CaseFormAsset>>(
      '/v2/public/case-forms/assets',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data', ...publicTokenHeaders(token) },
      }
    );
    return unwrapApiData(response.data);
  }

  async saveDraft(token: string, payload: SaveCaseFormDraftDTO): Promise<CaseFormAssignment> {
    const response = await publicApi.post<ApiEnvelope<CaseFormAssignment>>(
      '/v2/public/case-forms/draft',
      payload,
      { headers: publicTokenHeaders(token) }
    );
    return unwrapApiData(response.data);
  }

  async submit(token: string, payload: SubmitCaseFormDTO): Promise<CaseFormAssignmentDetail> {
    const response = await publicApi.post<ApiEnvelope<CaseFormAssignmentDetail>>(
      '/v2/public/case-forms/submit',
      payload,
      { headers: publicTokenHeaders(token) }
    );
    return unwrapApiData(response.data);
  }

  async downloadResponsePacket(token: string): Promise<BlobPart> {
    const response = await publicApi.get<BlobPart>('/v2/public/case-forms/response-packet', {
      headers: publicTokenHeaders(token),
      responseType: 'blob',
    });
    return response.data;
  }
}

export const publicCaseFormsApiClient = new PublicCaseFormsApiClient();
