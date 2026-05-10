import api from '../../../services/api';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';

export type QueueViewSurface = 'cases' | 'portal_appointments' | 'portal_conversations' | 'workbench';

export interface QueueViewDefinition {
  id: string;
  ownerUserId: string | null;
  surface: QueueViewSurface;
  name: string;
  filters: Record<string, unknown>;
  columns: unknown[];
  sort: Record<string, unknown>;
  rowLimit: number;
  dashboardBehavior: Record<string, unknown>;
  permissionScope: string[];
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface QueueViewDefinitionInput {
  id?: string;
  surface: QueueViewSurface;
  name: string;
  filters?: Record<string, unknown>;
  columns?: unknown[];
  sort?: Record<string, unknown>;
  rowLimit?: number;
  dashboardBehavior?: Record<string, unknown>;
  permissionScope?: string[];
}

class QueueViewsApiClient {
  private getSurfaceEndpoint(surface: QueueViewSurface): string {
    if (surface === 'cases') {
      return '/v2/cases/queue-views';
    }
    if (surface === 'workbench') {
      return '/v2/dashboard/queue-views';
    }
    return '/v2/portal-admin/queue-views';
  }

  async listQueueViews(surface: QueueViewSurface): Promise<QueueViewDefinition[]> {
    const endpoint = this.getSurfaceEndpoint(surface);
    const response = await api.get<ApiEnvelope<QueueViewDefinition[]>>(endpoint, {
      params:
        endpoint === '/v2/portal-admin/queue-views'
          ? { surface }
          : undefined,
    });
    return unwrapApiData(response.data);
  }

  async saveQueueView(payload: QueueViewDefinitionInput): Promise<QueueViewDefinition> {
    const endpoint = this.getSurfaceEndpoint(payload.surface);
    const scopedPayload = {
      id: payload.id,
      name: payload.name,
      filters: payload.filters,
      columns: payload.columns,
      sort: payload.sort,
      rowLimit: payload.rowLimit,
      dashboardBehavior: payload.dashboardBehavior,
      permissionScope: payload.permissionScope,
    };
    const response = await api.post<ApiEnvelope<QueueViewDefinition>>(
      endpoint,
      endpoint === '/v2/portal-admin/queue-views' ? payload : scopedPayload
    );
    return unwrapApiData(response.data);
  }

  async archiveQueueView(surface: QueueViewSurface, viewId: string): Promise<void> {
    const endpoint = this.getSurfaceEndpoint(surface);
    await api.delete(`${endpoint}/${viewId}`, {
      params:
        endpoint === '/v2/portal-admin/queue-views'
          ? { surface }
          : undefined,
    });
  }
}

export const queueViewsApiClient = new QueueViewsApiClient();
