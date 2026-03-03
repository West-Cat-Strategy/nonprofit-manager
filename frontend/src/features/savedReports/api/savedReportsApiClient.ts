import api from '../../../services/api';
import type {
  CreateSavedReportRequest,
  PublicReportSnapshotMeta,
  ReportEntity,
  SavedReport,
  SavedReportsListPage,
  SharePrincipalRole,
  SharePrincipalUser,
  ShareSettings,
  UpdateSavedReportRequest,
} from '../types/contracts';

interface SharePrincipalsResponse {
  users: SharePrincipalUser[];
  roles: SharePrincipalRole[];
}

interface PublicLinkResponse {
  token: string;
  url: string;
}

interface ShareRequestPayload {
  user_ids?: string[];
  role_names?: string[];
  share_settings?: ShareSettings;
}

export class SavedReportsApiClient {
  async fetchSavedReports(options: {
    entity?: ReportEntity;
    page?: number;
    limit?: number;
    summary?: boolean;
  } = {}): Promise<SavedReportsListPage> {
    const response = await api.get<SavedReportsListPage>('/v2/saved-reports', {
      params: {
        ...(options.entity ? { entity: options.entity } : {}),
        ...(typeof options.page === 'number' ? { page: options.page } : {}),
        ...(typeof options.limit === 'number' ? { limit: options.limit } : {}),
        ...(typeof options.summary === 'boolean' ? { summary: options.summary } : {}),
      },
    });
    return response.data;
  }

  async fetchSavedReportById(id: string): Promise<SavedReport> {
    const response = await api.get<SavedReport>(`/v2/saved-reports/${id}`);
    return response.data;
  }

  async createSavedReport(data: CreateSavedReportRequest): Promise<SavedReport> {
    const response = await api.post<SavedReport>('/v2/saved-reports', data);
    return response.data;
  }

  async updateSavedReport(id: string, data: UpdateSavedReportRequest): Promise<SavedReport> {
    const response = await api.put<SavedReport>(`/v2/saved-reports/${id}`, data);
    return response.data;
  }

  async deleteSavedReport(id: string): Promise<void> {
    await api.delete(`/v2/saved-reports/${id}`);
  }

  async fetchSharePrincipals(search?: string, limit = 25): Promise<SharePrincipalsResponse> {
    const response = await api.get<SharePrincipalsResponse>('/v2/saved-reports/share/principals', {
      params: {
        ...(search ? { search } : {}),
        limit,
      },
    });
    return response.data;
  }

  async shareSavedReport(id: string, payload: ShareRequestPayload): Promise<SavedReport> {
    const response = await api.post<SavedReport>(`/v2/saved-reports/${id}/share`, payload);
    return response.data;
  }

  async removeSavedReportShare(id: string, payload: ShareRequestPayload): Promise<SavedReport> {
    const response = await api.delete<SavedReport>(`/v2/saved-reports/${id}/share`, {
      data: payload,
    });
    return response.data;
  }

  async generatePublicLink(id: string, expires_at?: string): Promise<PublicLinkResponse> {
    const response = await api.post<PublicLinkResponse>(`/v2/saved-reports/${id}/public-link`, {
      ...(expires_at ? { expires_at } : {}),
    });
    return response.data;
  }

  async revokePublicLink(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/v2/saved-reports/${id}/public-link`);
    return response.data;
  }

  async fetchPublicReportMetadata(token: string): Promise<PublicReportSnapshotMeta> {
    const response = await api.get<PublicReportSnapshotMeta>(`/public/reports/${token}`);
    return response.data;
  }

  async downloadPublicReportSnapshot(token: string, format: 'csv' | 'xlsx'): Promise<BlobPart> {
    const response = await api.get<BlobPart>(`/public/reports/${token}/download`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }
}

export const savedReportsApiClient = new SavedReportsApiClient();
