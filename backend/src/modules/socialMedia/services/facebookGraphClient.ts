import crypto from 'crypto';
import type {
  FacebookAccessSettings,
  FacebookGraphClientPort,
  FacebookManagedPage,
  FacebookPageAccessSettings,
  FacebookPageMetrics,
  FacebookValidationResult,
} from '../types/contracts';

type GraphErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

type GraphAccountsResponse = GraphErrorPayload & {
  data?: Array<{
    id?: string;
    name?: string;
    access_token?: string;
  }>;
  paging?: {
    cursors?: {
      after?: string;
    };
  };
};

type GraphPageResponse = GraphErrorPayload & {
  id?: string;
  name?: string;
  followers_count?: number;
  fan_count?: number;
};

type GraphPostsResponse = GraphErrorPayload & {
  summary?: {
    total_count?: number;
  };
};

type GraphInsightResponse = GraphErrorPayload & {
  data?: Array<{
    name?: string;
    values?: Array<{
      value?: number | string | Record<string, unknown>;
    }>;
  }>;
};

const GRAPH_API_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION || 'v22.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const parseMetricValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildAppSecretProof = (
  accessToken: string,
  appSecret: string | null
): string | undefined => {
  if (!appSecret) {
    return undefined;
  }

  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
};

const getErrorMessage = (payload: GraphErrorPayload, fallback: string): string =>
  payload.error?.message || fallback;

export class FacebookGraphClient implements FacebookGraphClientPort {
  private async request<T extends GraphErrorPayload>(
    path: string,
    accessToken: string,
    params: Record<string, string | number | undefined> = {},
    appSecret?: string | null
  ): Promise<T> {
    const searchParams = new URLSearchParams();
    searchParams.set('access_token', accessToken);

    const appSecretProof = buildAppSecretProof(accessToken, appSecret || null);
    if (appSecretProof) {
      searchParams.set('appsecret_proof', appSecretProof);
    }

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      searchParams.set(key, String(value));
    }

    const response = await fetch(`${GRAPH_API_BASE_URL}/${path}?${searchParams.toString()}`);
    const payload = (await response.json()) as T;

    if (!response.ok || payload.error) {
      throw new Error(getErrorMessage(payload, `Facebook request failed (${response.status})`));
    }

    return payload;
  }

  async validateAccess(settings: FacebookAccessSettings): Promise<FacebookValidationResult> {
    const pages = await this.listManagedPages(settings);
    return {
      accountName: pages[0]?.pageName || null,
      pageCount: pages.length,
    };
  }

  async listManagedPages(settings: FacebookAccessSettings): Promise<FacebookManagedPage[]> {
    const pages: FacebookManagedPage[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.request<GraphAccountsResponse>(
        'me/accounts',
        settings.accessToken,
        {
          fields: 'id,name,access_token',
          limit: 100,
          after: cursor,
        },
        settings.appSecret
      );

      for (const row of response.data || []) {
        if (!row.id || !row.name) continue;
        pages.push({
          externalPageId: row.id,
          pageName: row.name,
          pageAccessToken: row.access_token || null,
        });
      }

      cursor = response.paging?.cursors?.after;
    } while (cursor);

    return pages;
  }

  private async readInsightMetric(
    pageId: string,
    settings: FacebookPageAccessSettings,
    metric: string
  ): Promise<{ value: number | null; error?: string }> {
    const response = await this.request<GraphInsightResponse>(
      `${pageId}/insights`,
      settings.pageAccessToken || settings.accessToken,
      {
        metric,
        period: 'day',
        date_preset: 'today',
      },
      settings.appSecret
    );

    const value = response.data?.[0]?.values?.[0]?.value;
    return {
      value: parseMetricValue(value),
    };
  }

  private async readFirstAvailableMetric(
    pageId: string,
    settings: FacebookPageAccessSettings,
    metricCandidates: string[]
  ): Promise<{ value: number | null; attempts: Array<{ metric: string; error?: string }> }> {
    const attempts: Array<{ metric: string; error?: string }> = [];

    for (const metric of metricCandidates) {
      try {
        const result = await this.readInsightMetric(pageId, settings, metric);
        attempts.push({ metric });
        if (result.value !== null) {
          return { value: result.value, attempts };
        }
      } catch (error) {
        attempts.push({
          metric,
          error: error instanceof Error ? error.message : 'Unknown Facebook metric error',
        });
      }
    }

    return { value: null, attempts };
  }

  async fetchPageMetrics(
    pageId: string,
    settings: FacebookPageAccessSettings
  ): Promise<FacebookPageMetrics> {
    const [pageResponse, postsResponse, reach, impressions, engagement] = await Promise.all([
      this.request<GraphPageResponse>(
        pageId,
        settings.pageAccessToken || settings.accessToken,
        {
          fields: 'id,name,followers_count,fan_count',
        },
        settings.appSecret
      ),
      this.request<GraphPostsResponse>(
        `${pageId}/published_posts`,
        settings.pageAccessToken || settings.accessToken,
        {
          limit: 1,
          summary: 'true',
        },
        settings.appSecret
      ),
      this.readFirstAvailableMetric(pageId, settings, [
        'page_impressions_unique',
        'page_reach',
      ]),
      this.readFirstAvailableMetric(pageId, settings, ['page_impressions']),
      this.readFirstAvailableMetric(pageId, settings, [
        'page_engaged_users',
        'page_post_engagements',
      ]),
    ]);

    return {
      followers: parseMetricValue(pageResponse.followers_count ?? pageResponse.fan_count),
      reach: reach.value,
      impressions: impressions.value,
      engagedUsers: engagement.value,
      postCount: parseMetricValue(postsResponse.summary?.total_count),
      rawPayload: {
        page: pageResponse,
        posts: postsResponse,
        insightAttempts: {
          reach: reach.attempts,
          impressions: impressions.attempts,
          engagedUsers: engagement.attempts,
        },
      },
    };
  }
}
