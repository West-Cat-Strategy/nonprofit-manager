import type { Page } from '@playwright/test';
import { getAuthHeaders } from './database';

const apiURL = () => process.env.API_URL || 'http://localhost:3001';

async function postJSON(page: Page, token: string, path: string, data: unknown) {
  const headers = await getAuthHeaders(page, token);
  return page.request.post(`${apiURL()}${path}`, { headers, data });
}

async function deleteWithAuth(page: Page, token: string, path: string) {
  const headers = await getAuthHeaders(page, token);
  return page.request.delete(`${apiURL()}${path}`, { headers });
}

export async function createAlertConfig(page: Page, token: string): Promise<string> {
  const response = await postJSON(page, token, '/api/alerts/configs', {
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
  await deleteWithAuth(page, token, `/api/alerts/configs/${id}`);
}

export async function createSavedReport(page: Page, token: string): Promise<string> {
  const response = await postJSON(page, token, '/api/saved-reports', {
    name: `E2E Saved Report ${Date.now()}`,
    entity: 'contacts',
    report_definition: {
      entity: 'contacts',
      fields: ['first_name', 'last_name', 'email'],
      filters: [],
      sort: [],
    },
  });
  const body = await response.json();
  return body.id || body.saved_report_id || body.data?.id;
}

export async function deleteSavedReport(page: Page, token: string, id: string) {
  await deleteWithAuth(page, token, `/api/saved-reports/${id}`);
}

export async function createTemplate(page: Page, token: string): Promise<string> {
  const response = await postJSON(page, token, '/api/templates', {
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
  await deleteWithAuth(page, token, `/api/templates/${id}`);
}

export async function createWebhookEndpoint(page: Page, token: string): Promise<string> {
  const response = await postJSON(page, token, '/api/webhooks/endpoints', {
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
  await deleteWithAuth(page, token, `/api/webhooks/endpoints/${id}`);
}
