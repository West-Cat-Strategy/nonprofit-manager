import api from '../../../services/api';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  CaseFormAsset,
  CaseFormAssignment,
  CaseFormAssignmentDetail,
  CaseFormDefault,
  CaseFormReviewDecision,
  CaseFormTemplateStatus,
  CreateCaseFormAssignmentDTO,
  CreateCaseFormDefaultDTO,
  SaveCaseFormDraftDTO,
  SendCaseFormAssignmentDTO,
  SubmitCaseFormDTO,
  UpdateCaseFormAssignmentDTO,
  UpdateCaseFormDefaultDTO,
} from '../../../types/caseForms';

class StaffCaseFormsApiClient {
  async listTemplates(input?: {
    status?: CaseFormTemplateStatus;
    case_type_id?: string | null;
  }): Promise<CaseFormDefault[]> {
    const response = await api.get<ApiEnvelope<CaseFormDefault[]>>('/v2/cases/forms/templates', {
      params: {
        status: input?.status,
        case_type_id: input?.case_type_id || undefined,
      },
    });
    return unwrapApiData(response.data);
  }

  async createTemplate(payload: CreateCaseFormDefaultDTO): Promise<CaseFormDefault> {
    const response = await api.post<ApiEnvelope<CaseFormDefault>>('/v2/cases/forms/templates', payload);
    return unwrapApiData(response.data);
  }

  async autosaveTemplate(
    templateId: string,
    payload: UpdateCaseFormDefaultDTO
  ): Promise<CaseFormDefault> {
    const response = await api.put<ApiEnvelope<CaseFormDefault>>(
      `/v2/cases/forms/templates/${templateId}`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async listRecommendedDefaults(caseId: string): Promise<CaseFormDefault[]> {
    const response = await api.get<ApiEnvelope<CaseFormDefault[]>>(
      `/v2/cases/${caseId}/forms/recommended-defaults`
    );
    return unwrapApiData(response.data);
  }

  async listAssignments(caseId: string, status?: string): Promise<CaseFormAssignment[]> {
    const response = await api.get<ApiEnvelope<CaseFormAssignment[]>>(`/v2/cases/${caseId}/forms`, {
      params: {
        status,
      },
    });
    return unwrapApiData(response.data);
  }

  async createAssignment(caseId: string, payload: CreateCaseFormAssignmentDTO): Promise<CaseFormAssignment> {
    const response = await api.post<ApiEnvelope<CaseFormAssignment>>(`/v2/cases/${caseId}/forms`, payload);
    return unwrapApiData(response.data);
  }

  async instantiateDefault(caseId: string, defaultId: string): Promise<CaseFormAssignment> {
    const response = await api.post<ApiEnvelope<CaseFormAssignment>>(
      `/v2/cases/${caseId}/forms/defaults/${defaultId}/instantiate`
    );
    return unwrapApiData(response.data);
  }

  async saveAssignmentAsTemplate(
    caseId: string,
    assignmentId: string,
    payload: CreateCaseFormDefaultDTO
  ): Promise<CaseFormDefault> {
    const response = await api.post<ApiEnvelope<CaseFormDefault>>(
      `/v2/cases/${caseId}/forms/${assignmentId}/save-template`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async getAssignment(caseId: string, assignmentId: string): Promise<CaseFormAssignmentDetail> {
    const response = await api.get<ApiEnvelope<CaseFormAssignmentDetail>>(
      `/v2/cases/${caseId}/forms/${assignmentId}`
    );
    return unwrapApiData(response.data);
  }

  async updateAssignment(
    caseId: string,
    assignmentId: string,
    payload: UpdateCaseFormAssignmentDTO
  ): Promise<CaseFormAssignment> {
    const response = await api.put<ApiEnvelope<CaseFormAssignment>>(
      `/v2/cases/${caseId}/forms/${assignmentId}`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async uploadAsset(
    caseId: string,
    assignmentId: string,
    input: { question_key: string; asset_kind: 'upload' | 'signature'; file: File }
  ): Promise<CaseFormAsset> {
    const formData = new FormData();
    formData.set('question_key', input.question_key);
    formData.set('asset_kind', input.asset_kind);
    formData.set('file', input.file);

    const response = await api.post<ApiEnvelope<CaseFormAsset>>(
      `/v2/cases/${caseId}/forms/${assignmentId}/assets`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return unwrapApiData(response.data);
  }

  async saveDraft(
    caseId: string,
    assignmentId: string,
    payload: SaveCaseFormDraftDTO
  ): Promise<CaseFormAssignment> {
    const response = await api.post<ApiEnvelope<CaseFormAssignment>>(
      `/v2/cases/${caseId}/forms/${assignmentId}/draft`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async submit(
    caseId: string,
    assignmentId: string,
    payload: SubmitCaseFormDTO
  ): Promise<CaseFormAssignmentDetail> {
    const response = await api.post<ApiEnvelope<CaseFormAssignmentDetail>>(
      `/v2/cases/${caseId}/forms/${assignmentId}/staff-submit`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async send(
    caseId: string,
    assignmentId: string,
    payload: SendCaseFormAssignmentDTO
  ): Promise<CaseFormAssignment> {
    const response = await api.post<ApiEnvelope<CaseFormAssignment>>(
      `/v2/cases/${caseId}/forms/${assignmentId}/send`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async review(
    caseId: string,
    assignmentId: string,
    payload: CaseFormReviewDecision
  ): Promise<CaseFormAssignment> {
    const response = await api.post<ApiEnvelope<CaseFormAssignment>>(
      `/v2/cases/${caseId}/forms/${assignmentId}/review`,
      payload
    );
    return unwrapApiData(response.data);
  }

  getResponsePacketDownloadUrl(caseId: string, assignmentId: string): string {
    return `/api/v2/cases/${caseId}/forms/${assignmentId}/response-packet`;
  }

  getAssetDownloadUrl(caseId: string, assignmentId: string, assetId: string): string {
    return `/api/v2/cases/${caseId}/forms/${assignmentId}/assets/${assetId}/download`;
  }
}

export const staffCaseFormsApiClient = new StaffCaseFormsApiClient();
