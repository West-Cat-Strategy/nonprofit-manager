import type { Pool } from 'pg';
import type {
  FacebookManagedPage,
  SocialMediaOrgSettingsRecord,
  SocialMediaPlatform,
  SocialMediaRepositoryPort,
  SocialMediaSettingsPatch,
  SocialMediaSnapshotRecord,
  SocialMediaSyncTarget,
  SocialMediaTrackedPageRecord,
} from '../types/contracts';
import { encrypt } from '@utils/encryption';

const cleanNullableString = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const encryptNullable = (value: string | null | undefined): string | null | undefined => {
  const cleaned = cleanNullableString(value);
  if (cleaned === undefined) return undefined;
  if (cleaned === null) return null;
  return encrypt(cleaned);
};

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const mapSnapshotRow = (row: Record<string, unknown>): SocialMediaSnapshotRecord => ({
  id: String(row.id),
  organizationId: String(row.organization_id),
  pageId: String(row.page_id),
  platform: String(row.platform) as SocialMediaPlatform,
  snapshotDate: new Date(String(row.snapshot_date)),
  followers: parseNumber(row.followers),
  reach: parseNumber(row.reach),
  impressions: parseNumber(row.impressions),
  engagedUsers: parseNumber(row.engaged_users),
  postCount: parseNumber(row.post_count),
  rawPayload: asObject(row.raw_payload),
  createdAt: new Date(String(row.created_at)),
  updatedAt: new Date(String(row.updated_at)),
});

const mapOrgSettingsRow = (row: Record<string, unknown>): SocialMediaOrgSettingsRecord => ({
  id: String(row.id),
  organizationId: String(row.organization_id),
  platform: String(row.platform) as SocialMediaPlatform,
  appId: (row.app_id as string | null) ?? null,
  appSecretEncrypted: (row.app_secret_encrypted as string | null) ?? null,
  accessTokenEncrypted: (row.access_token_encrypted as string | null) ?? null,
  isConfigured: Boolean(row.is_configured),
  lastTestedAt: row.last_tested_at ? new Date(String(row.last_tested_at)) : null,
  lastTestSuccess:
    row.last_test_success === null || row.last_test_success === undefined
      ? null
      : Boolean(row.last_test_success),
  lastSyncAt: row.last_sync_at ? new Date(String(row.last_sync_at)) : null,
  lastSyncError: (row.last_sync_error as string | null) ?? null,
  createdAt: new Date(String(row.created_at)),
  updatedAt: new Date(String(row.updated_at)),
});

const buildLatestSnapshot = (row: Record<string, unknown>): SocialMediaSnapshotRecord | null => {
  if (!row.latest_snapshot_id) {
    return null;
  }

  return {
    id: String(row.latest_snapshot_id),
    organizationId: String(row.organization_id),
    pageId: String(row.id),
    platform: String(row.platform) as SocialMediaPlatform,
    snapshotDate: new Date(String(row.latest_snapshot_date)),
    followers: parseNumber(row.latest_followers),
    reach: parseNumber(row.latest_reach),
    impressions: parseNumber(row.latest_impressions),
    engagedUsers: parseNumber(row.latest_engaged_users),
    postCount: parseNumber(row.latest_post_count),
    rawPayload: asObject(row.latest_raw_payload),
    createdAt: row.latest_snapshot_created_at
      ? new Date(String(row.latest_snapshot_created_at))
      : new Date(String(row.updated_at)),
    updatedAt: row.latest_snapshot_updated_at
      ? new Date(String(row.latest_snapshot_updated_at))
      : new Date(String(row.updated_at)),
  };
};

const mapTrackedPageRow = (row: Record<string, unknown>): SocialMediaTrackedPageRecord => ({
  id: String(row.id),
  organizationId: String(row.organization_id),
  settingsId: String(row.settings_id),
  platform: String(row.platform) as SocialMediaPlatform,
  externalPageId: String(row.external_page_id),
  pageName: String(row.page_name),
  pageAccessTokenEncrypted: (row.page_access_token_encrypted as string | null) ?? null,
  syncEnabled: Boolean(row.sync_enabled),
  lastSyncAt: row.last_sync_at ? new Date(String(row.last_sync_at)) : null,
  lastSyncError: (row.last_sync_error as string | null) ?? null,
  linkedSiteIds: Array.isArray(row.linked_site_ids)
    ? row.linked_site_ids.map((value) => String(value))
    : [],
  latestSnapshot: buildLatestSnapshot(row),
  createdAt: new Date(String(row.created_at)),
  updatedAt: new Date(String(row.updated_at)),
});

const TRACKED_PAGE_SELECT = `
  smp.*,
  COALESCE(linked.linked_site_ids, ARRAY[]::uuid[]) AS linked_site_ids,
  latest.id AS latest_snapshot_id,
  latest.snapshot_date AS latest_snapshot_date,
  latest.followers AS latest_followers,
  latest.reach AS latest_reach,
  latest.impressions AS latest_impressions,
  latest.engaged_users AS latest_engaged_users,
  latest.post_count AS latest_post_count,
  latest.raw_payload AS latest_raw_payload,
  latest.created_at AS latest_snapshot_created_at,
  latest.updated_at AS latest_snapshot_updated_at
`;

const TRACKED_PAGE_JOINS = `
  LEFT JOIN LATERAL (
    SELECT
      ARRAY_AGG(wss.site_id ORDER BY wss.site_id) AS linked_site_ids
    FROM website_site_settings wss
    WHERE wss.organization_id = smp.organization_id
      AND COALESCE(wss.social_config -> 'facebook' ->> 'trackedPageId', '') = smp.id::text
  ) linked ON TRUE
  LEFT JOIN LATERAL (
    SELECT *
    FROM social_media_daily_snapshots snapshot
    WHERE snapshot.page_id = smp.id
    ORDER BY snapshot.snapshot_date DESC
    LIMIT 1
  ) latest ON TRUE
`;

export class SocialMediaRepository implements SocialMediaRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async getOrgSettings(
    organizationId: string,
    platform: SocialMediaPlatform
  ): Promise<SocialMediaOrgSettingsRecord | null> {
    const result = await this.pool.query(
      `SELECT *
       FROM social_media_org_settings
       WHERE organization_id = $1 AND platform = $2
       LIMIT 1`,
      [organizationId, platform]
    );

    return result.rows[0] ? mapOrgSettingsRow(result.rows[0]) : null;
  }

  async upsertOrgSettings(
    organizationId: string,
    platform: SocialMediaPlatform,
    patch: SocialMediaSettingsPatch,
    userId: string
  ): Promise<SocialMediaOrgSettingsRecord> {
    const current = await this.getOrgSettings(organizationId, platform);
    const normalizedAppId = cleanNullableString(patch.appId);
    const encryptedAppSecret = encryptNullable(patch.appSecret);
    const encryptedAccessToken = encryptNullable(patch.accessToken);
    const nextAppId =
      normalizedAppId !== undefined ? normalizedAppId : current?.appId ?? null;
    const nextAppSecretEncrypted =
      encryptedAppSecret !== undefined ? encryptedAppSecret : current?.appSecretEncrypted ?? null;
    const nextAccessTokenEncrypted =
      encryptedAccessToken !== undefined
        ? encryptedAccessToken
        : current?.accessTokenEncrypted ?? null;
    const isConfigured = Boolean(nextAccessTokenEncrypted);

    const result = await this.pool.query(
      `INSERT INTO social_media_org_settings (
         organization_id,
         platform,
         app_id,
         app_secret_encrypted,
         access_token_encrypted,
         is_configured,
         created_by,
         modified_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       ON CONFLICT (organization_id, platform)
       DO UPDATE SET
         app_id = EXCLUDED.app_id,
         app_secret_encrypted = EXCLUDED.app_secret_encrypted,
         access_token_encrypted = EXCLUDED.access_token_encrypted,
         is_configured = EXCLUDED.is_configured,
         modified_by = EXCLUDED.modified_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        organizationId,
        platform,
        nextAppId,
        nextAppSecretEncrypted,
        nextAccessTokenEncrypted,
        isConfigured,
        userId,
      ]
    );

    return mapOrgSettingsRow(result.rows[0]);
  }

  async markOrgSettingsTestResult(
    settingsId: string,
    success: boolean,
    errorMessage: string | null
  ): Promise<void> {
    await this.pool.query(
      `UPDATE social_media_org_settings
       SET last_tested_at = CURRENT_TIMESTAMP,
           last_test_success = $2,
           last_sync_error = CASE
             WHEN $2 THEN last_sync_error
             ELSE COALESCE($3, last_sync_error)
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [settingsId, success, errorMessage]
    );
  }

  async markOrgSettingsSyncResult(
    settingsId: string,
    lastSyncAt: Date,
    errorMessage: string | null
  ): Promise<void> {
    await this.pool.query(
      `UPDATE social_media_org_settings
       SET last_sync_at = $2,
           last_sync_error = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [settingsId, lastSyncAt, errorMessage]
    );
  }

  async upsertTrackedPages(
    organizationId: string,
    settingsId: string,
    platform: SocialMediaPlatform,
    pages: FacebookManagedPage[],
    userId: string
  ): Promise<void> {
    for (const page of pages) {
      const encryptedPageToken = encryptNullable(page.pageAccessToken) ?? null;
      await this.pool.query(
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
         ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $7)
         ON CONFLICT (organization_id, platform, external_page_id)
         DO UPDATE SET
           settings_id = EXCLUDED.settings_id,
           page_name = EXCLUDED.page_name,
           page_access_token_encrypted = COALESCE(
             EXCLUDED.page_access_token_encrypted,
             social_media_pages.page_access_token_encrypted
           ),
           modified_by = EXCLUDED.modified_by,
           updated_at = CURRENT_TIMESTAMP`,
        [
          organizationId,
          settingsId,
          platform,
          page.externalPageId,
          page.pageName,
          encryptedPageToken,
          userId,
        ]
      );
    }
  }

  async listTrackedPages(
    organizationId: string,
    platform: SocialMediaPlatform
  ): Promise<SocialMediaTrackedPageRecord[]> {
    const result = await this.pool.query(
      `SELECT ${TRACKED_PAGE_SELECT}
       FROM social_media_pages smp
       ${TRACKED_PAGE_JOINS}
       WHERE smp.organization_id = $1
         AND smp.platform = $2
       ORDER BY smp.page_name ASC`,
      [organizationId, platform]
    );

    return result.rows.map((row) => mapTrackedPageRow(row));
  }

  async getTrackedPage(
    organizationId: string,
    pageId: string,
    platform: SocialMediaPlatform
  ): Promise<SocialMediaTrackedPageRecord | null> {
    const result = await this.pool.query(
      `SELECT ${TRACKED_PAGE_SELECT}
       FROM social_media_pages smp
       ${TRACKED_PAGE_JOINS}
       WHERE smp.organization_id = $1
         AND smp.id = $2
         AND smp.platform = $3
       LIMIT 1`,
      [organizationId, pageId, platform]
    );

    return result.rows[0] ? mapTrackedPageRow(result.rows[0]) : null;
  }

  async getSyncTarget(
    organizationId: string,
    pageId: string,
    platform: SocialMediaPlatform
  ): Promise<SocialMediaSyncTarget | null> {
    const result = await this.pool.query(
      `SELECT
         smp.*,
         smos.id AS settings_row_id,
         smos.organization_id AS settings_organization_id,
         smos.platform AS settings_platform,
         smos.app_id AS settings_app_id,
         smos.app_secret_encrypted AS settings_app_secret_encrypted,
         smos.access_token_encrypted AS settings_access_token_encrypted,
         smos.is_configured AS settings_is_configured,
         smos.last_tested_at AS settings_last_tested_at,
         smos.last_test_success AS settings_last_test_success,
         smos.last_sync_at AS settings_last_sync_at,
         smos.last_sync_error AS settings_last_sync_error,
         smos.created_at AS settings_created_at,
         smos.updated_at AS settings_updated_at
       FROM social_media_pages smp
       INNER JOIN social_media_org_settings smos
         ON smos.id = smp.settings_id
       WHERE smp.organization_id = $1
         AND smp.id = $2
         AND smp.platform = $3
       LIMIT 1`,
      [organizationId, pageId, platform]
    );

    if (!result.rows[0]) {
      return null;
    }

    const row = result.rows[0];
    return {
      page: {
        ...mapTrackedPageRow({
          ...row,
          linked_site_ids: [],
        }),
      },
      settings: mapOrgSettingsRow({
        id: row.settings_row_id,
        organization_id: row.settings_organization_id,
        platform: row.settings_platform,
        app_id: row.settings_app_id,
        app_secret_encrypted: row.settings_app_secret_encrypted,
        access_token_encrypted: row.settings_access_token_encrypted,
        is_configured: row.settings_is_configured,
        last_tested_at: row.settings_last_tested_at,
        last_test_success: row.settings_last_test_success,
        last_sync_at: row.settings_last_sync_at,
        last_sync_error: row.settings_last_sync_error,
        created_at: row.settings_created_at,
        updated_at: row.settings_updated_at,
      }),
    };
  }

  async listDueSyncTargets(
    platform: SocialMediaPlatform,
    syncBefore: Date,
    limit: number
  ): Promise<SocialMediaSyncTarget[]> {
    const result = await this.pool.query(
      `SELECT
         smp.*,
         smos.id AS settings_row_id,
         smos.organization_id AS settings_organization_id,
         smos.platform AS settings_platform,
         smos.app_id AS settings_app_id,
         smos.app_secret_encrypted AS settings_app_secret_encrypted,
         smos.access_token_encrypted AS settings_access_token_encrypted,
         smos.is_configured AS settings_is_configured,
         smos.last_tested_at AS settings_last_tested_at,
         smos.last_test_success AS settings_last_test_success,
         smos.last_sync_at AS settings_last_sync_at,
         smos.last_sync_error AS settings_last_sync_error,
         smos.created_at AS settings_created_at,
         smos.updated_at AS settings_updated_at
       FROM social_media_pages smp
       INNER JOIN social_media_org_settings smos
         ON smos.id = smp.settings_id
       WHERE smp.platform = $1
         AND smos.platform = $1
         AND smp.sync_enabled = TRUE
         AND smos.is_configured = TRUE
         AND (smp.last_sync_at IS NULL OR smp.last_sync_at < $2)
       ORDER BY COALESCE(smp.last_sync_at, to_timestamp(0)) ASC, smp.updated_at ASC
       LIMIT $3`,
      [platform, syncBefore, limit]
    );

    return result.rows.map((row) => ({
      page: mapTrackedPageRow({
        ...row,
        linked_site_ids: [],
      }),
      settings: mapOrgSettingsRow({
        id: row.settings_row_id,
        organization_id: row.settings_organization_id,
        platform: row.settings_platform,
        app_id: row.settings_app_id,
        app_secret_encrypted: row.settings_app_secret_encrypted,
        access_token_encrypted: row.settings_access_token_encrypted,
        is_configured: row.settings_is_configured,
        last_tested_at: row.settings_last_tested_at,
        last_test_success: row.settings_last_test_success,
        last_sync_at: row.settings_last_sync_at,
        last_sync_error: row.settings_last_sync_error,
        created_at: row.settings_created_at,
        updated_at: row.settings_updated_at,
      }),
    }));
  }

  async markPageSyncResult(
    pageId: string,
    lastSyncAt: Date,
    errorMessage: string | null,
    userId?: string | null
  ): Promise<void> {
    if (userId) {
      await this.pool.query(
        `UPDATE social_media_pages
         SET last_sync_at = $2,
             last_sync_error = $3,
             modified_by = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [pageId, lastSyncAt, errorMessage, userId]
      );
      return;
    }

    await this.pool.query(
      `UPDATE social_media_pages
       SET last_sync_at = $2,
           last_sync_error = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [pageId, lastSyncAt, errorMessage]
    );
  }

  async upsertDailySnapshot(args: {
    organizationId: string;
    pageId: string;
    platform: SocialMediaPlatform;
    snapshotDate: Date;
    followers: number | null;
    reach: number | null;
    impressions: number | null;
    engagedUsers: number | null;
    postCount: number | null;
    rawPayload: Record<string, unknown>;
  }): Promise<SocialMediaSnapshotRecord> {
    const result = await this.pool.query(
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
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (page_id, snapshot_date)
       DO UPDATE SET
         followers = EXCLUDED.followers,
         reach = EXCLUDED.reach,
         impressions = EXCLUDED.impressions,
         engaged_users = EXCLUDED.engaged_users,
         post_count = EXCLUDED.post_count,
         raw_payload = EXCLUDED.raw_payload,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        args.organizationId,
        args.pageId,
        args.platform,
        args.snapshotDate.toISOString().slice(0, 10),
        args.followers,
        args.reach,
        args.impressions,
        args.engagedUsers,
        args.postCount,
        JSON.stringify(args.rawPayload),
      ]
    );

    return mapSnapshotRow(result.rows[0]);
  }

  async listSnapshots(
    organizationId: string,
    pageId: string,
    platform: SocialMediaPlatform,
    limit: number
  ): Promise<SocialMediaSnapshotRecord[]> {
    const result = await this.pool.query(
      `SELECT snapshot.*
       FROM social_media_daily_snapshots snapshot
       INNER JOIN social_media_pages page
         ON page.id = snapshot.page_id
       WHERE snapshot.organization_id = $1
         AND snapshot.page_id = $2
         AND snapshot.platform = $3
         AND page.organization_id = $1
       ORDER BY snapshot.snapshot_date DESC
       LIMIT $4`,
      [organizationId, pageId, platform, limit]
    );

    return result.rows.map((row) => mapSnapshotRow(row));
  }
}
