import jwt from 'jsonwebtoken';
import request, { type Test } from 'supertest';
import app from '../../index';
import pool from '../../config/database';
import { getJwtSecret } from '../../config/jwt';
import { encrypt } from '@utils/encryption';

type ApiEnvelope<T> = { data?: T } | T;

const unwrap = <T>(body: ApiEnvelope<T>): T =>
  (body && typeof body === 'object' && 'data' in body ? (body as { data: T }).data : body) as T;

const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const withOrgAuth = (req: Test, token: string, organizationId: string): Test =>
  req
    .set('Authorization', `Bearer ${token}`)
    .set('X-Organization-Id', organizationId);

const createFetchResponse = (payload: unknown, status: number = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(payload),
});

describe('Social media API integration', () => {
  let adminUserId: string;
  let managerUserId: string;
  let organizationId: string;
  let adminToken: string;
  let managerToken: string;
  let templateId: string;
  let siteId: string;
  let settingsId: string;
  let pageId: string;

  beforeAll(async () => {
    const suffix = unique();

    const adminUserResult = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, 'Social', 'Admin', 'admin', TRUE, NOW(), NOW())
       RETURNING id`,
      [
        `social-admin-${suffix}@example.com`,
        '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG',
      ]
    );
    adminUserId = adminUserResult.rows[0].id;

    const managerUserResult = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, 'Social', 'Manager', 'manager', TRUE, NOW(), NOW())
       RETURNING id`,
      [
        `social-manager-${suffix}@example.com`,
        '$2a$10$012345678901234567890uI6TTMsnx6Vf7hYhVJrV2N4mcoX8f6mG',
      ]
    );
    managerUserId = managerUserResult.rows[0].id;

    const accountResult = await pool.query<{ id: string }>(
      `INSERT INTO accounts (
         account_name,
         account_type,
         email,
         is_active,
         created_at,
         updated_at,
         created_by,
         modified_by
       ) VALUES ($1, 'organization', $2, TRUE, NOW(), NOW(), $3, $3)
       RETURNING id`,
      [`Social Media Org ${suffix}`, `social-org-${suffix}@example.com`, adminUserId]
    );
    organizationId = accountResult.rows[0].id;

    await pool.query(
      `INSERT INTO user_account_access (user_id, account_id, access_level, granted_by, is_active)
       VALUES ($1, $2, 'admin', $3, TRUE), ($4, $2, 'manager', $3, TRUE)`,
      [adminUserId, organizationId, adminUserId, managerUserId]
    );

    const templateResult = await pool.query<{ id: string }>(
      `INSERT INTO templates (
         user_id,
         owner_user_id,
         organization_id,
         migration_status,
         name,
         description,
         category,
         status,
         theme,
         global_settings,
         created_at,
         updated_at
       ) VALUES ($1, $1, $2, 'complete', $3, 'Social media test template', 'multi-page', 'draft', $4, $5, NOW(), NOW())
       RETURNING id`,
      [
        adminUserId,
        organizationId,
        `Social Template ${suffix}`,
        JSON.stringify({
          colors: { primary: '#123456' },
          typography: { fontFamily: 'system-ui' },
        }),
        JSON.stringify({}),
      ]
    );
    templateId = templateResult.rows[0].id;

    const siteResult = await pool.query<{ id: string }>(
      `INSERT INTO published_sites (
         user_id,
         owner_user_id,
         organization_id,
         site_kind,
         migration_status,
         template_id,
         name,
         subdomain,
         status,
         published_version,
         published_at,
         published_content,
         analytics_enabled,
         created_at,
         updated_at
       ) VALUES ($1, $1, $2, 'organization', 'complete', $3, $4, $5, 'draft', NULL, NULL, NULL, TRUE, NOW(), NOW())
       RETURNING id`,
      [
        adminUserId,
        organizationId,
        templateId,
        `Social Site ${suffix}`,
        `social-${suffix}`.slice(0, 60),
      ]
    );
    siteId = siteResult.rows[0].id;

    const settingsResult = await pool.query<{ id: string }>(
      `INSERT INTO social_media_org_settings (
         organization_id,
         platform,
         app_id,
         app_secret_encrypted,
         access_token_encrypted,
         is_configured,
         created_by,
         modified_by
       ) VALUES ($1, 'facebook', $2, $3, $4, TRUE, $5, $5)
       RETURNING id`,
      [
        organizationId,
        'fb-app',
        encrypt('fb-secret'),
        encrypt('user-token'),
        adminUserId,
      ]
    );
    settingsId = settingsResult.rows[0].id;

    const pageResult = await pool.query<{ id: string }>(
      `INSERT INTO social_media_pages (
         organization_id,
         settings_id,
         platform,
         external_page_id,
         page_name,
         page_access_token_encrypted,
         sync_enabled,
         created_by,
         modified_by
       ) VALUES ($1, $2, 'facebook', $3, $4, $5, TRUE, $6, $6)
       RETURNING id`,
      [
        organizationId,
        settingsId,
        'fb-page-1',
        'River District Volunteers',
        encrypt('page-token'),
        adminUserId,
      ]
    );
    pageId = pageResult.rows[0].id;

    await pool.query(
      `INSERT INTO social_media_daily_snapshots (
         organization_id,
         page_id,
         platform,
         snapshot_date,
         followers,
         reach,
         impressions,
         engaged_users,
         post_count,
         raw_payload
       ) VALUES ($1, $2, 'facebook', CURRENT_DATE - INTERVAL '1 day', 210, 420, 620, 31, 6, $3)`,
      [organizationId, pageId, JSON.stringify({ seeded: true })]
    );

    adminToken = jwt.sign(
      {
        id: adminUserId,
        email: `social-admin-${suffix}@example.com`,
        role: 'admin',
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    managerToken = jwt.sign(
      {
        id: managerUserId,
        email: `social-manager-${suffix}@example.com`,
        role: 'manager',
      },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    (global as typeof globalThis & { fetch: jest.Mock }).fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    await pool.query('DELETE FROM website_site_settings WHERE site_id = $1', [siteId]);
    await pool.query('DELETE FROM social_media_daily_snapshots WHERE page_id = $1', [pageId]);
    await pool.query('DELETE FROM social_media_pages WHERE id = $1', [pageId]);
    await pool.query('DELETE FROM social_media_org_settings WHERE id = $1', [settingsId]);
    await pool.query('DELETE FROM published_sites WHERE id = $1', [siteId]);
    await pool.query('DELETE FROM templates WHERE id = $1', [templateId]);
    await pool.query(
      'DELETE FROM user_account_access WHERE user_id IN ($1, $2) AND account_id = $3',
      [adminUserId, managerUserId, organizationId]
    );
    await pool.query('DELETE FROM accounts WHERE id = $1', [organizationId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [adminUserId, managerUserId]);
  });

  it('enforces admin-only access for organization social media settings', async () => {
    const response = await withOrgAuth(
      request(app).get('/api/v2/social-media/facebook/settings'),
      managerToken,
      organizationId
    ).expect(403);

    expect(response.body.error.code).toBe('forbidden');
  });

  it('validates snapshot path params before the controller executes', async () => {
    const response = await withOrgAuth(
      request(app).get('/api/v2/social-media/facebook/pages/not-a-uuid/snapshots'),
      adminToken,
      organizationId
    ).expect(400);

    expect(response.body.error.code).toBe('validation_error');
  });

  it('updates settings, syncs a Facebook page, and stores site-level mappings', async () => {
    const updateSettingsResponse = await withOrgAuth(
      request(app)
        .put('/api/v2/social-media/facebook/settings')
        .send({ appId: 'fb-app-updated', accessToken: 'replacement-token' }),
      adminToken,
      organizationId
    ).expect(200);

    const updatedSettings = unwrap<{
      appId: string | null;
      credentials: { accessToken: boolean; appSecret: boolean };
      isConfigured: boolean;
    }>(updateSettingsResponse.body);

    expect(updatedSettings).toMatchObject({
      appId: 'fb-app-updated',
      credentials: {
        accessToken: true,
        appSecret: true,
      },
      isConfigured: true,
    });
    expect(updatedSettings).not.toHaveProperty('accessToken');

    const listPagesResponse = await withOrgAuth(
      request(app).get('/api/v2/social-media/facebook/pages'),
      adminToken,
      organizationId
    ).expect(200);

    const pagesPayload = unwrap<{ pages: Array<{ id: string; latestSnapshot: { followers: number } | null }> }>(
      listPagesResponse.body
    );
    expect(pagesPayload.pages).toHaveLength(1);
    expect(pagesPayload.pages[0]).toMatchObject({
      id: pageId,
      latestSnapshot: {
        followers: 210,
      },
    });

    const fetchMock = global.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(
        createFetchResponse({
          id: 'fb-page-1',
          name: 'River District Volunteers',
          followers_count: 321,
        })
      )
      .mockResolvedValueOnce(createFetchResponse({ summary: { total_count: 11 } }))
      .mockResolvedValueOnce(createFetchResponse({ data: [{ values: [{ value: 654 }] }] }))
      .mockResolvedValueOnce(createFetchResponse({ data: [{ values: [{ value: 987 }] }] }))
      .mockResolvedValueOnce(createFetchResponse({ data: [{ values: [{ value: 42 }] }] }));

    const syncResponse = await withOrgAuth(
      request(app).post(`/api/v2/social-media/facebook/pages/${pageId}/sync`),
      adminToken,
      organizationId
    ).expect(200);

    const syncedPage = unwrap<{
      id: string;
      lastSyncAt: string | null;
      latestSnapshot: {
        followers: number | null;
        reach: number | null;
        impressions: number | null;
        engagedUsers: number | null;
      } | null;
    }>(syncResponse.body);

    expect(syncedPage.id).toBe(pageId);
    expect(syncedPage.lastSyncAt).not.toBeNull();
    expect(syncedPage.latestSnapshot).toMatchObject({
      followers: 321,
      reach: 654,
      impressions: 987,
      engagedUsers: 42,
    });

    const updateMappingResponse = await withOrgAuth(
      request(app)
        .put(`/api/v2/sites/${siteId}/integrations/facebook`)
        .send({ trackedPageId: pageId, syncEnabled: true }),
      adminToken,
      organizationId
    ).expect(200);

    const integrationStatus = unwrap<{
      social: {
        facebook: {
          trackedPageId: string | null;
          trackedPageName: string | null;
          syncEnabled: boolean | undefined;
          lastSyncAt: string | null;
        };
      };
    }>(updateMappingResponse.body);

    expect(integrationStatus.social.facebook).toMatchObject({
      trackedPageId: pageId,
      trackedPageName: 'River District Volunteers',
      syncEnabled: true,
    });
    expect(integrationStatus.social.facebook.lastSyncAt).not.toBeNull();
  });
});
