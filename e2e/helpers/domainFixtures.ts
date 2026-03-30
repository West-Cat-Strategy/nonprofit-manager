import type { Page } from '@playwright/test';
import { getAuthHeaders } from './database';

const apiURL = () => {
  const backendPort = process.env.E2E_BACKEND_PORT?.trim();
  if (backendPort) {
    return `http://127.0.0.1:${backendPort}`;
  }

  return process.env.API_URL || 'http://localhost:3001';
};

type ApiBody = Record<string, unknown>;

const unwrapBody = <T extends ApiBody>(body: ApiBody): T => ((body.data as T | undefined) ?? (body as T));

async function postJSON(page: Page, token: string, path: string, data: unknown) {
  const headers = await getAuthHeaders(page, token);
  return page.request.post(`${apiURL()}${path}`, { headers, data });
}

async function deleteWithAuth(page: Page, token: string, path: string) {
  const headers = await getAuthHeaders(page, token);
  return page.request.delete(`${apiURL()}${path}`, { headers });
}

export async function createAlertConfig(page: Page, token: string): Promise<string> {
  const response = await postJSON(page, token, '/api/v2/alerts/configs', {
    name: `E2E Alert ${Date.now()}`,
    metric_type: 'donations',
    condition: 'exceeds',
    threshold: 10,
    frequency: 'daily',
    channels: ['email'],
    severity: 'medium',
  });
  if (!response.ok()) {
    throw new Error(`Failed to create alert config (${response.status()}): ${await response.text()}`);
  }
  const body = await response.json();
  const id = body.id || body.alert_config_id || body.data?.id;
  if (!id) {
    throw new Error(`Alert config created but id missing in response: ${JSON.stringify(body)}`);
  }
  return id;
}

export async function deleteAlertConfig(page: Page, token: string, id: string) {
  await deleteWithAuth(page, token, `/api/v2/alerts/configs/${id}`);
}

export async function createSavedReport(page: Page, token: string): Promise<string> {
  const response = await postJSON(page, token, '/api/v2/saved-reports', {
    name: `E2E Saved Report ${Date.now()}`,
    entity: 'contacts',
    report_definition: {
      entity: 'contacts',
      fields: ['first_name', 'last_name', 'email'],
      filters: [],
      sort: [],
    },
  });
  if (!response.ok()) {
    throw new Error(`Failed to create saved report (${response.status()}): ${await response.text()}`);
  }
  const body = await response.json();
  return body.id || body.saved_report_id || body.data?.id;
}

export async function deleteSavedReport(page: Page, token: string, id: string) {
  await deleteWithAuth(page, token, `/api/v2/saved-reports/${id}`);
}

export async function createPublicReportLink(page: Page, token: string): Promise<{
  reportId: string;
  publicToken: string;
  url: string;
}> {
  const reportId = await createSavedReport(page, token);
  const response = await postJSON(page, token, `/api/v2/saved-reports/${reportId}/public-link`, {});
  if (!response.ok()) {
    throw new Error(`Failed to create public report link (${response.status()}): ${await response.text()}`);
  }

  const body = unwrapBody<{ token?: string; url?: string }>(await response.json());
  if (!body.token || !body.url) {
    throw new Error(`Public report link created but token/url missing: ${JSON.stringify(body)}`);
  }

  return {
    reportId,
    publicToken: body.token,
    url: body.url,
  };
}

export async function createTemplate(page: Page, token: string): Promise<string> {
  const response = await postJSON(page, token, '/api/v2/templates', {
    name: `E2E Template ${Date.now()}`,
    category: 'landing-page',
    description: 'E2E test template',
  });
  if (!response.ok()) {
    throw new Error(`Failed to create template (${response.status()}): ${await response.text()}`);
  }
  const body = await response.json();
  const id = body.id || body.template_id || body.templateId || body.data?.id || body.data?.template_id;
  if (!id) {
    throw new Error(`Template created but id missing in response: ${JSON.stringify(body)}`);
  }
  return id;
}

export async function deleteTemplate(page: Page, token: string, id: string) {
  await deleteWithAuth(page, token, `/api/v2/templates/${id}`);
}

export async function createWebsiteSite(
  page: Page,
  token: string,
  templateId: string,
  options: {
    name?: string;
    subdomain?: string;
    customDomain?: string;
  } = {}
): Promise<string> {
  const response = await postJSON(page, token, '/api/v2/sites', {
    templateId,
    name: options.name || `E2E Website ${Date.now()}`,
    ...(options.subdomain ? { subdomain: options.subdomain } : {}),
    ...(options.customDomain ? { customDomain: options.customDomain } : {}),
  });
  if (!response.ok()) {
    throw new Error(`Failed to create website site (${response.status()}): ${await response.text()}`);
  }
  const body = await response.json();
  const id = body.id || body.site_id || body.siteId || body.data?.id || body.data?.site_id;
  if (!id) {
    throw new Error(`Website site created but id missing in response: ${JSON.stringify(body)}`);
  }
  return id;
}

export async function deleteWebsiteSite(page: Page, token: string, id: string) {
  await deleteWithAuth(page, token, `/api/v2/sites/${id}`);
}

export async function createWebsiteEntry(
  page: Page,
  token: string,
  siteId: string,
  data: {
    title: string;
    excerpt?: string;
    body?: string;
    bodyHtml?: string;
    status?: 'draft' | 'published' | 'archived';
    slug?: string;
  }
): Promise<string> {
  const response = await postJSON(page, token, `/api/v2/sites/${siteId}/entries`, {
    kind: 'newsletter',
    source: 'native',
    status: data.status || 'published',
    title: data.title,
    excerpt: data.excerpt,
    body: data.body,
    bodyHtml: data.bodyHtml,
    slug: data.slug,
    seo: {
      title: data.title,
      description: data.excerpt || data.title,
    },
  });
  if (!response.ok()) {
    throw new Error(`Failed to create website entry (${response.status()}): ${await response.text()}`);
  }
  const body = await response.json();
  const entryId = body.id || body.entry_id || body.entryId || body.data?.id || body.data?.entry_id;
  if (!entryId) {
    throw new Error(`Website entry created but id missing in response: ${JSON.stringify(body)}`);
  }
  return entryId;
}

export async function deleteWebsiteEntry(page: Page, token: string, siteId: string, entryId: string) {
  await deleteWithAuth(page, token, `/api/v2/sites/${siteId}/entries/${entryId}`);
}

export async function publishWebsiteSite(
  page: Page,
  token: string,
  payload: {
    siteId: string;
    templateId: string;
  }
): Promise<{
  siteId: string;
  url: string;
  previewUrl?: string;
}> {
  const response = await postJSON(page, token, '/api/v2/sites/publish', payload);
  if (!response.ok()) {
    throw new Error(`Failed to publish website site (${response.status()}): ${await response.text()}`);
  }

  const body = unwrapBody<{
    siteId?: string;
    url?: string;
    previewUrl?: string;
  }>(await response.json());
  if (!body.siteId || !body.url) {
    throw new Error(`Published website site is missing siteId/url: ${JSON.stringify(body)}`);
  }

  return {
    siteId: body.siteId,
    url: body.url,
    previewUrl: body.previewUrl,
  };
}

export async function createWebhookEndpoint(page: Page, token: string): Promise<string> {
  const response = await postJSON(page, token, '/api/v2/webhooks/endpoints', {
    // Use a public IP literal to avoid DNS resolution flakes in restricted environments.
    url: 'https://8.8.8.8/webhook',
    events: ['account.created'],
    description: 'E2E endpoint',
  });
  if (!response.ok()) {
    throw new Error(`Failed to create webhook endpoint (${response.status()}): ${await response.text()}`);
  }
  const body = await response.json();
  const id =
    body.id ||
    body.endpoint_id ||
    body.endpointId ||
    body.webhook_endpoint_id ||
    body.data?.id ||
    body.data?.endpoint_id;
  if (!id) {
    throw new Error(`Webhook endpoint created but id missing in response: ${JSON.stringify(body)}`);
  }
  return id;
}

export async function deleteWebhookEndpoint(page: Page, token: string, id: string) {
  await deleteWithAuth(page, token, `/api/v2/webhooks/endpoints/${id}`);
}
