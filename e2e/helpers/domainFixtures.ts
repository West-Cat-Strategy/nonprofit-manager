import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { createTestContact, getAuthHeaders } from './database';

const apiURL = () => {
  const backendPort = process.env.E2E_BACKEND_PORT?.trim();
  if (backendPort) {
    return `http://127.0.0.1:${backendPort}`;
  }

  return process.env.API_URL || 'http://localhost:3001';
};

type ApiBody = Record<string, unknown>;

const unwrapBody = <T extends ApiBody>(body: ApiBody): T => ((body.data as T | undefined) ?? (body as T));

const frontendURL = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

const backendRequire = createRequire(path.resolve(__dirname, '..', '..', 'backend', 'package.json'));
const { Client: PgClient } = backendRequire('pg') as {
  Client: new (config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) => {
    connect(): Promise<void>;
    end(): Promise<void>;
    query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
  };
};
const bcrypt = backendRequire('bcryptjs') as {
  hash(value: string, saltRounds: number): Promise<string>;
};

type AdminReviewAction = 'approve' | 'reject';

let backendTsRuntimeRegistered = false;

const ensureBackendTsRuntime = (): void => {
  if (backendTsRuntimeRegistered) {
    return;
  }

  process.env.TS_NODE_PROJECT = path.resolve(__dirname, '..', '..', 'backend', 'tsconfig.json');
  backendRequire('ts-node/register/transpile-only');
  backendRequire('tsconfig-paths/register');
  backendTsRuntimeRegistered = true;
};

const getSessionTokenUtils = (): {
  issueAdminPendingRegistrationReviewToken: (input: {
    pendingRegistrationId: string;
    adminUserId: string;
    action: AdminReviewAction;
    expiresInSeconds?: number;
  }) => string;
} => {
  ensureBackendTsRuntime();
  return backendRequire('./src/utils/sessionTokens') as {
    issueAdminPendingRegistrationReviewToken: (input: {
      pendingRegistrationId: string;
      adminUserId: string;
      action: AdminReviewAction;
      expiresInSeconds?: number;
    }) => string;
  };
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const normalizeId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getTokenUserId = (token: string): string | undefined => {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return undefined;
  }

  return normalizeId(payload.id) || normalizeId(payload.userId) || normalizeId(payload.user_id);
};

const getTestDatabaseConfig = (): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
} => ({
  host: process.env.DB_HOST || process.env.E2E_DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.E2E_DB_PORT || '8012'),
  database: process.env.DB_NAME || process.env.E2E_DB_NAME || 'nonprofit_manager_test',
  user: process.env.E2E_DB_ADMIN_USER || process.env.TEST_DB_ADMIN_USER || 'postgres',
  password: process.env.E2E_DB_ADMIN_PASSWORD || process.env.TEST_DB_ADMIN_PASSWORD || 'postgres',
});

const extractTrailingUrlSegment = (url: string, context: string): string => {
  const pathname = new URL(url).pathname;
  const token = pathname.split('/').filter(Boolean).pop();
  if (!token) {
    throw new Error(`${context} did not include a trailing token segment: ${url}`);
  }
  return token;
};

async function postJSON(page: Page, token: string, path: string, data: unknown) {
  const headers = await getAuthHeaders(page, token);
  return page.request.post(`${apiURL()}${path}`, { headers, data });
}

async function getJSON(page: Page, token: string, path: string) {
  const headers = await getAuthHeaders(page, token);
  return page.request.get(`${apiURL()}${path}`, { headers });
}

async function deleteWithAuth(page: Page, token: string, path: string) {
  const headers = await getAuthHeaders(page, token);
  return page.request.delete(`${apiURL()}${path}`, { headers });
}

async function putJSON(page: Page, token: string, path: string, data: unknown) {
  const headers = await getAuthHeaders(page, token);
  return page.request.put(`${apiURL()}${path}`, { headers, data });
}

const buildCaseFormSchema = () => ({
  version: 1,
  title: 'Dark Mode Audit Intake',
  description: 'A minimal schema used to provision signed-link dark-mode coverage.',
  sections: [
    {
      id: 'basic-info',
      title: 'Basic Information',
      questions: [
        {
          id: 'preferred-name',
          key: 'preferred_name',
          type: 'text',
          label: 'Preferred name',
          required: true,
        },
      ],
    },
  ],
});

async function getCaseTypeId(page: Page, token: string): Promise<string> {
  const response = await getJSON(page, token, '/api/v2/cases/types');
  if (!response.ok()) {
    throw new Error(`Failed to fetch case types (${response.status()}): ${await response.text()}`);
  }

  const body = unwrapBody<Array<{ id?: string }> | { types?: Array<{ id?: string }> }>(
    await response.json()
  );
  const caseTypes = Array.isArray(body) ? body : body.types || [];
  const caseTypeId = caseTypes.find((row) => typeof row.id === 'string' && row.id.trim().length > 0)?.id;
  if (!caseTypeId) {
    throw new Error('No case type id was available for the public case-form fixture.');
  }

  return caseTypeId;
}

async function createCaseForPublicForm(
  page: Page,
  token: string,
  organizationId?: string
): Promise<{
  caseId: string;
  contactId: string;
}> {
  const email = `dark-mode-case-form-${Date.now()}@example.com`;
  const contact = await createTestContact(page, token, {
    firstName: 'Dark',
    lastName: 'Mode Form',
    email,
    ...(organizationId ? { accountId: organizationId } : {}),
  });
  const caseTypeId = await getCaseTypeId(page, token);
  const response = await postJSON(page, token, '/api/v2/cases', {
    contact_id: contact.id,
    ...(organizationId ? { account_id: organizationId } : {}),
    case_type_id: caseTypeId,
    title: `Dark Mode Public Form ${Date.now()}`,
    description: 'Dark mode accessibility audit case-form fixture',
    priority: 'medium',
    is_urgent: false,
    client_viewable: true,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create case-form fixture case (${response.status()}): ${await response.text()}`);
  }

  const body = unwrapBody<{ id?: string; case_id?: string }>(await response.json());
  const caseId = body.id || body.case_id;
  if (!caseId) {
    throw new Error(`Case-form fixture case id missing in response: ${JSON.stringify(body)}`);
  }

  const shareResponse = await putJSON(page, token, `/api/v2/cases/${caseId}/client-viewable`, {
    client_viewable: true,
  });
  if (!shareResponse.ok()) {
    throw new Error(
      `Failed to mark case-form fixture client-viewable (${shareResponse.status()}): ${await shareResponse.text()}`
    );
  }

  return { caseId, contactId: contact.id };
}

async function resolveCaseFormAssignmentId(input: {
  page: Page;
  token: string;
  caseId: string;
  title: string;
  recipientEmail: string;
  fallbackId?: string;
}): Promise<string | null> {
  const response = await getJSON(input.page, input.token, `/api/v2/cases/${input.caseId}/forms`);
  if (!response.ok()) {
    return input.fallbackId || null;
  }

  const body = unwrapBody<Record<string, unknown>>(await response.json());
  const assignments = Array.isArray(body)
    ? body
    : Array.isArray((body.items as unknown[] | undefined))
      ? (body.items as Array<Record<string, unknown>>)
      : Array.isArray((body.data as unknown[] | undefined))
        ? (body.data as Array<Record<string, unknown>>)
        : [];

  const matched =
    assignments.find(
      (assignment) =>
        assignment.title === input.title && assignment.recipient_email === input.recipientEmail
    ) ||
    assignments.find((assignment) => {
      const id = assignment.id || assignment.assignment_id;
      return typeof id === 'string' && id === input.fallbackId;
    });

  const assignmentId = matched ? matched.id || matched.assignment_id : null;
  return typeof assignmentId === 'string' && assignmentId.length > 0
    ? assignmentId
    : input.fallbackId || null;
}

async function provisionPublicCaseFormFallback(input: {
  token: string;
  caseId: string;
  contactId: string;
  organizationId?: string;
  title: string;
  recipientEmail: string;
}): Promise<{
  assignmentId: string;
  accessLinkUrl: string;
}> {
  const userId = getTokenUserId(input.token);
  if (!userId) {
    throw new Error('Unable to derive a user id for the public case-form fixture fallback.');
  }

  const rawToken = crypto.randomBytes(24).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const client = new PgClient(getTestDatabaseConfig());

  try {
    await client.connect();
    await client.query('BEGIN');

    const assignmentResult = await client.query<{ id: string }>(
      `INSERT INTO case_form_assignments (
         case_id,
         contact_id,
         account_id,
         title,
         description,
         status,
         schema,
         current_draft_answers,
         recipient_email,
         delivery_target,
         sent_at,
         created_by,
         updated_by
       )
       VALUES ($1, $2, $3, $4, $5, 'sent', $6::jsonb, '{}'::jsonb, $7, 'email', NOW(), $8, $8)
       RETURNING id`,
      [
        input.caseId,
        input.contactId,
        input.organizationId || null,
        input.title,
        'Secure public form fixture for the dark-mode audit',
        JSON.stringify(buildCaseFormSchema()),
        input.recipientEmail,
        userId,
      ]
    );

    const assignmentId = assignmentResult.rows[0]?.id;
    if (!assignmentId) {
      throw new Error('Public case-form fallback insert did not return an assignment id.');
    }

    await client.query(
      `INSERT INTO case_form_access_tokens (
         assignment_id,
         case_id,
         contact_id,
         recipient_email,
         token_hash,
         expires_at,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        assignmentId,
        input.caseId,
        input.contactId,
        input.recipientEmail,
        tokenHash,
        expiresAt,
        userId,
      ]
    );

    await client.query('COMMIT');

    return {
      assignmentId,
      accessLinkUrl: `${frontendURL()}/public/case-forms/${rawToken}`,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function createStaffInvitationLink(page: Page, token: string): Promise<{
  invitationId: string;
  invitationToken: string;
  inviteUrl: string;
}> {
  const response = await postJSON(page, token, '/api/v2/invitations', {
    email: `dark-mode-staff-invite-${Date.now()}@example.com`,
    role: 'staff',
    message: 'Dark mode audit fixture',
    expiresInDays: 7,
    sendEmail: false,
  });
  if (!response.ok()) {
    throw new Error(`Failed to create staff invitation (${response.status()}): ${await response.text()}`);
  }

  const body = await response.json();
  const invitationId = body?.invitation?.id;
  const inviteUrl = body?.inviteUrl;
  if (typeof invitationId !== 'string' || typeof inviteUrl !== 'string') {
    throw new Error(`Staff invitation fixture missing response data: ${JSON.stringify(body)}`);
  }

  return {
    invitationId,
    invitationToken: extractTrailingUrlSegment(inviteUrl, 'Staff invitation URL'),
    inviteUrl,
  };
}

export async function createPortalInvitationLink(page: Page, token: string): Promise<{
  invitationId: string;
  invitationToken: string;
  inviteUrl: string;
}> {
  const response = await postJSON(page, token, '/api/v2/portal/admin/invitations', {
    email: `dark-mode-portal-invite-${Date.now()}@example.com`,
    expiresInDays: 7,
  });
  if (!response.ok()) {
    throw new Error(`Failed to create portal invitation (${response.status()}): ${await response.text()}`);
  }

  const body = unwrapBody<{ invitation?: { id?: string }; inviteUrl?: string }>(await response.json());
  const invitationId = body.invitation?.id;
  const inviteUrl = body.inviteUrl;
  if (typeof invitationId !== 'string' || typeof inviteUrl !== 'string') {
    throw new Error(`Portal invitation fixture missing response data: ${JSON.stringify(body)}`);
  }

  return {
    invitationId,
    invitationToken: extractTrailingUrlSegment(inviteUrl, 'Portal invitation URL'),
    inviteUrl,
  };
}

export async function createAdminRegistrationReviewLink(input: {
  adminUserId: string;
  action?: AdminReviewAction;
}): Promise<{
  pendingRegistrationId: string;
  reviewToken: string;
  reviewUrl: string;
}> {
  const client = new PgClient(getTestDatabaseConfig());
  try {
    await client.connect();
    const passwordHash = await bcrypt.hash('DarkMode123!@#', 10);
    const result = await client.query<{ id: string }>(
      `INSERT INTO pending_registrations (email, password_hash, first_name, last_name, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [
        `dark-mode-pending-${Date.now()}@example.com`,
        passwordHash,
        'Dark',
        'Mode Review',
      ]
    );

    const pendingRegistrationId = result.rows[0]?.id;
    if (!pendingRegistrationId) {
      throw new Error('Pending registration fixture insert did not return an id.');
    }

    const reviewToken = getSessionTokenUtils().issueAdminPendingRegistrationReviewToken({
      pendingRegistrationId,
      adminUserId: input.adminUserId,
      action: input.action || 'approve',
    });

    return {
      pendingRegistrationId,
      reviewToken,
      reviewUrl: `${frontendURL()}/admin-registration-review/${reviewToken}`,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function createPasswordResetLink(input: {
  userId: string;
}): Promise<{
  tokenId: string;
  resetToken: string;
  resetUrl: string;
}> {
  const client = new PgClient(getTestDatabaseConfig());
  try {
    await client.connect();
    const secret = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(secret, 10);
    const result = await client.query<{ id: string }>(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')
       RETURNING id`,
      [input.userId, tokenHash]
    );

    const tokenId = result.rows[0]?.id;
    if (!tokenId) {
      throw new Error('Password reset fixture insert did not return a token id.');
    }

    const resetToken = `${tokenId}.${secret}`;
    return {
      tokenId,
      resetToken,
      resetUrl: `${frontendURL()}/reset-password/${resetToken}`,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function createPortalPasswordResetLink(input: {
  portalUserId: string;
}): Promise<{
  tokenId: string;
  resetToken: string;
  resetUrl: string;
}> {
  const client = new PgClient(getTestDatabaseConfig());
  try {
    await client.connect();
    const secret = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(secret, 10);
    const result = await client.query<{ id: string }>(
      `INSERT INTO portal_password_reset_tokens (portal_user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')
       RETURNING id`,
      [input.portalUserId, tokenHash]
    );

    const tokenId = result.rows[0]?.id;
    if (!tokenId) {
      throw new Error('Portal password reset fixture insert did not return a token id.');
    }

    const resetToken = `${tokenId}.${secret}`;
    return {
      tokenId,
      resetToken,
      resetUrl: `${frontendURL()}/portal/reset-password/${resetToken}`,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function createPublicCaseFormLink(
  page: Page,
  token: string,
  options: {
    organizationId?: string;
  } = {}
): Promise<{
  caseId: string;
  assignmentId: string;
  accessToken: string;
  accessLinkUrl: string;
}> {
  const { caseId, contactId } = await createCaseForPublicForm(page, token, options.organizationId);
  const recipientEmail = `dark-mode-public-form-${Date.now()}@example.com`;
  const assignmentTitle = `Dark Mode Public Form ${Date.now()}`;
  const createAssignmentResponse = await postJSON(page, token, `/api/v2/cases/${caseId}/forms`, {
    title: assignmentTitle,
    description: 'Secure public form fixture for the dark-mode audit',
    schema: buildCaseFormSchema(),
    recipient_email: recipientEmail,
  });

  if (!createAssignmentResponse.ok()) {
    if (createAssignmentResponse.status() === 404 || createAssignmentResponse.status() >= 500) {
      const fallback = await provisionPublicCaseFormFallback({
        token,
        caseId,
        contactId,
        organizationId: options.organizationId,
        title: assignmentTitle,
        recipientEmail,
      });

      return {
        caseId,
        assignmentId: fallback.assignmentId,
        accessToken: extractTrailingUrlSegment(
          fallback.accessLinkUrl,
          'Public case-form access link'
        ),
        accessLinkUrl: fallback.accessLinkUrl,
      };
    }

    throw new Error(
      `Failed to create public case-form assignment (${createAssignmentResponse.status()}): ${await createAssignmentResponse.text()}`
    );
  }

  const assignmentBody = unwrapBody<{ id?: string; assignment_id?: string }>(
    await createAssignmentResponse.json()
  );
  let assignmentId =
    (await resolveCaseFormAssignmentId({
      page,
      token,
      caseId,
      title: assignmentTitle,
      recipientEmail,
      fallbackId: assignmentBody.id || assignmentBody.assignment_id,
    })) || undefined;
  if (!assignmentId) {
    throw new Error(`Public case-form assignment id missing in response: ${JSON.stringify(assignmentBody)}`);
  }

  let sendAssignmentResponse = await postJSON(
    page,
    token,
    `/api/v2/cases/${caseId}/forms/${assignmentId}/send`,
    {
      delivery_target: 'email',
      recipient_email: recipientEmail,
      expires_in_days: 7,
    }
  );

  if (!sendAssignmentResponse.ok() && sendAssignmentResponse.status() === 404) {
    const resolvedAssignmentId = await resolveCaseFormAssignmentId({
      page,
      token,
      caseId,
      title: assignmentTitle,
      recipientEmail,
      fallbackId: assignmentId,
    });

    if (resolvedAssignmentId && resolvedAssignmentId !== assignmentId) {
      assignmentId = resolvedAssignmentId;
      sendAssignmentResponse = await postJSON(
        page,
        token,
        `/api/v2/cases/${caseId}/forms/${assignmentId}/send`,
        {
          delivery_target: 'email',
          recipient_email: recipientEmail,
          expires_in_days: 7,
        }
      );
    }
  }

  if (!sendAssignmentResponse.ok()) {
    if (sendAssignmentResponse.status() === 404 || sendAssignmentResponse.status() >= 500) {
      const fallback = await provisionPublicCaseFormFallback({
        token,
        caseId,
        contactId,
        organizationId: options.organizationId,
        title: assignmentTitle,
        recipientEmail,
      });

      return {
        caseId,
        assignmentId: fallback.assignmentId,
        accessToken: extractTrailingUrlSegment(
          fallback.accessLinkUrl,
          'Public case-form access link'
        ),
        accessLinkUrl: fallback.accessLinkUrl,
      };
    }

    throw new Error(
      `Failed to send public case-form assignment (${sendAssignmentResponse.status()}): ${await sendAssignmentResponse.text()}`
    );
  }

  const sendBody = unwrapBody<{ access_link_url?: string | null }>(await sendAssignmentResponse.json());
  const accessLinkUrl = sendBody.access_link_url;
  if (typeof accessLinkUrl !== 'string' || accessLinkUrl.length === 0) {
    throw new Error(`Public case-form send response missing access link: ${JSON.stringify(sendBody)}`);
  }

  return {
    caseId,
    assignmentId,
    accessToken: extractTrailingUrlSegment(accessLinkUrl, 'Public case-form access link'),
    accessLinkUrl,
  };
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
