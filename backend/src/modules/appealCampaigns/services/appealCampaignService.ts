import { Pool } from 'pg';
import dbPool from '@config/database';
import type {
  AppealCampaign,
  AppealCampaignProvider,
  AppealCampaignProviderLink,
  AppealCampaignProviderLinkInput,
  AppealCampaignStatus,
  CreateAppealCampaignInput,
  UpdateAppealCampaignInput,
} from '@app-types/appealCampaign';

type AppealCampaignRow = {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  kind: AppealCampaign['kind'];
  status: AppealCampaignStatus;
  start_date: Date | string | null;
  end_date: Date | string | null;
  compatibility_labels: string[] | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  modified_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type AppealCampaignProviderLinkRow = {
  id: string;
  appeal_campaign_id: string;
  organization_id: string;
  provider: AppealCampaignProvider;
  provider_campaign_id: string | null;
  provider_audience_id: string | null;
  label: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type QueryValue = string | string[] | Date | null | Record<string, unknown>;

export class AppealCampaignValidationError extends Error {
  statusCode = 400;
}

const toIsoDate = (value: Date | string | null): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
};

const toIsoDateTime = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const uniqueStrings = (values: readonly string[] = []): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const cleanText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeCode = (code: string | undefined, name: string): string => {
  const source = cleanText(code) ?? name;
  const normalized = source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  if (!normalized) {
    throw new AppealCampaignValidationError('Appeal campaign code is required');
  }
  return normalized;
};

const mapCampaignRow = (
  row: AppealCampaignRow,
  providerLinks?: AppealCampaignProviderLink[]
): AppealCampaign => ({
  id: row.id,
  organizationId: row.organization_id,
  code: row.code,
  name: row.name,
  description: row.description,
  kind: row.kind,
  status: row.status,
  startDate: toIsoDate(row.start_date),
  endDate: toIsoDate(row.end_date),
  compatibilityLabels: row.compatibility_labels ?? [],
  metadata: row.metadata ?? {},
  createdBy: row.created_by,
  modifiedBy: row.modified_by,
  createdAt: toIsoDateTime(row.created_at),
  updatedAt: toIsoDateTime(row.updated_at),
  ...(providerLinks ? { providerLinks } : {}),
});

const mapProviderLinkRow = (row: AppealCampaignProviderLinkRow): AppealCampaignProviderLink => ({
  id: row.id,
  appealCampaignId: row.appeal_campaign_id,
  organizationId: row.organization_id,
  provider: row.provider,
  providerCampaignId: row.provider_campaign_id,
  providerAudienceId: row.provider_audience_id,
  label: row.label,
  metadata: row.metadata ?? {},
  createdBy: row.created_by,
  createdAt: toIsoDateTime(row.created_at),
  updatedAt: toIsoDateTime(row.updated_at),
});

export class AppealCampaignService {
  constructor(private readonly pool: Pool) {}

  async listCampaigns(
    organizationId: string,
    status?: AppealCampaignStatus
  ): Promise<AppealCampaign[]> {
    const params: QueryValue[] = [organizationId];
    const conditions = ['organization_id = $1'];
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    const result = await this.pool.query<AppealCampaignRow>(
      `SELECT *
       FROM appeal_campaigns
       WHERE ${conditions.join(' AND ')}
       ORDER BY updated_at DESC, name ASC`,
      params
    );

    return result.rows.map((row) => mapCampaignRow(row));
  }

  async getCampaign(organizationId: string, campaignId: string): Promise<AppealCampaign | null> {
    const result = await this.pool.query<AppealCampaignRow>(
      `SELECT *
       FROM appeal_campaigns
       WHERE organization_id = $1 AND id = $2
       LIMIT 1`,
      [organizationId, campaignId]
    );
    if (!result.rows[0]) return null;

    const providerLinks = await this.listProviderLinks(result.rows[0].id);
    return mapCampaignRow(result.rows[0], providerLinks);
  }

  async createCampaign(
    organizationId: string,
    userId: string | undefined,
    input: CreateAppealCampaignInput
  ): Promise<AppealCampaign> {
    const name = cleanText(input.name);
    if (!name) {
      throw new AppealCampaignValidationError('Appeal campaign name is required');
    }

    const result = await this.pool.query<AppealCampaignRow>(
      `INSERT INTO appeal_campaigns (
         organization_id, code, name, description, kind, status, start_date, end_date,
         compatibility_labels, metadata, created_by, modified_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
       RETURNING *`,
      [
        organizationId,
        normalizeCode(input.code, name),
        name,
        cleanText(input.description),
        input.kind ?? 'appeal',
        input.status ?? 'active',
        input.startDate ?? null,
        input.endDate ?? null,
        uniqueStrings(input.compatibilityLabels),
        input.metadata ?? {},
        userId ?? null,
      ]
    );

    const campaign = mapCampaignRow(result.rows[0]);
    const providerLinks = await this.upsertProviderLinks(
      campaign.id,
      organizationId,
      input.providerLinks,
      userId
    );
    return { ...campaign, providerLinks };
  }

  async updateCampaign(
    organizationId: string,
    campaignId: string,
    userId: string | undefined,
    input: UpdateAppealCampaignInput
  ): Promise<AppealCampaign | null> {
    const updates: string[] = [];
    const params: QueryValue[] = [];

    const add = (column: string, value: QueryValue): void => {
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    };

    if (input.name !== undefined) {
      const name = cleanText(input.name);
      if (!name) throw new AppealCampaignValidationError('Appeal campaign name is required');
      add('name', name);
    }
    if (input.code !== undefined) {
      add('code', normalizeCode(input.code, input.name ?? input.code));
    }
    if (input.description !== undefined) add('description', cleanText(input.description));
    if (input.kind !== undefined) add('kind', input.kind);
    if (input.status !== undefined) add('status', input.status);
    if (input.startDate !== undefined) add('start_date', input.startDate);
    if (input.endDate !== undefined) add('end_date', input.endDate);
    if (input.compatibilityLabels !== undefined) {
      add('compatibility_labels', uniqueStrings(input.compatibilityLabels));
    }
    if (input.metadata !== undefined) add('metadata', input.metadata);

    let row: AppealCampaignRow | undefined;
    if (updates.length > 0) {
      add('modified_by', userId ?? null);
      params.push(campaignId, organizationId);
      const result = await this.pool.query<AppealCampaignRow>(
        `UPDATE appeal_campaigns
         SET ${updates.join(', ')},
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $${params.length - 1} AND organization_id = $${params.length}
         RETURNING *`,
        params
      );
      row = result.rows[0];
      if (!row) return null;
    } else {
      const result = await this.pool.query<AppealCampaignRow>(
        `SELECT *
         FROM appeal_campaigns
         WHERE id = $1 AND organization_id = $2`,
        [campaignId, organizationId]
      );
      row = result.rows[0];
      if (!row) return null;
    }

    const providerLinks = await this.upsertProviderLinks(
      campaignId,
      organizationId,
      input.providerLinks,
      userId
    );
    const allLinks = input.providerLinks ? providerLinks : await this.listProviderLinks(campaignId);
    return mapCampaignRow(row, allLinks);
  }

  async requireCampaignForScope(
    campaignId: string | null | undefined,
    options: { organizationId?: string | null; scopeAccountIds?: string[] } = {}
  ): Promise<AppealCampaign | null> {
    if (!campaignId) return null;

    const scopeAccountIds = uniqueStrings(options.scopeAccountIds ?? []);
    const result = await this.pool.query<AppealCampaignRow>(
      `SELECT *
       FROM appeal_campaigns
       WHERE id = $1
         AND ($2::uuid IS NULL OR organization_id = $2)
         AND ($3::uuid[] IS NULL OR organization_id = ANY($3::uuid[]))
       LIMIT 1`,
      [
        campaignId,
        options.organizationId ?? null,
        scopeAccountIds.length > 0 ? scopeAccountIds : null,
      ]
    );

    if (!result.rows[0]) {
      throw new AppealCampaignValidationError('Appeal campaign was not found for this organization');
    }
    return mapCampaignRow(result.rows[0]);
  }

  async upsertProviderLink(
    input: {
      appealCampaignId: string | null | undefined;
      organizationId?: string | null;
      scopeAccountIds?: string[];
      provider: AppealCampaignProvider;
      providerCampaignId?: string | null;
      providerAudienceId?: string | null;
      label?: string | null;
      metadata?: Record<string, unknown>;
      createdBy?: string | null;
    }
  ): Promise<AppealCampaignProviderLink | null> {
    const campaign = await this.requireCampaignForScope(input.appealCampaignId, {
      organizationId: input.organizationId,
      scopeAccountIds: input.scopeAccountIds,
    });
    if (!campaign) return null;

    const providerCampaignId = cleanText(input.providerCampaignId);
    const providerAudienceId = cleanText(input.providerAudienceId);
    const label = cleanText(input.label);
    if (!providerCampaignId && !providerAudienceId && !label) {
      return null;
    }

    const result = await this.pool.query<AppealCampaignProviderLinkRow>(
      `INSERT INTO appeal_campaign_provider_links (
         appeal_campaign_id, organization_id, provider, provider_campaign_id,
         provider_audience_id, label, metadata, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (organization_id, provider, provider_campaign_id)
       WHERE provider_campaign_id IS NOT NULL
       DO UPDATE SET
         appeal_campaign_id = EXCLUDED.appeal_campaign_id,
         provider_audience_id = COALESCE(EXCLUDED.provider_audience_id, appeal_campaign_provider_links.provider_audience_id),
         label = COALESCE(EXCLUDED.label, appeal_campaign_provider_links.label),
         metadata = appeal_campaign_provider_links.metadata || EXCLUDED.metadata,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        campaign.id,
        campaign.organizationId,
        input.provider,
        providerCampaignId,
        providerAudienceId,
        label,
        input.metadata ?? {},
        input.createdBy ?? null,
      ]
    );

    return mapProviderLinkRow(result.rows[0]);
  }

  async resolveProviderCampaign(
    organizationId: string,
    provider: AppealCampaignProvider,
    providerCampaignId: string | null | undefined
  ): Promise<AppealCampaign | null> {
    const cleanProviderCampaignId = cleanText(providerCampaignId);
    if (!cleanProviderCampaignId) return null;

    const result = await this.pool.query<AppealCampaignRow>(
      `SELECT ac.*
       FROM appeal_campaign_provider_links link
       INNER JOIN appeal_campaigns ac ON ac.id = link.appeal_campaign_id
       WHERE link.organization_id = $1
         AND link.provider = $2
         AND link.provider_campaign_id = $3
       LIMIT 1`,
      [organizationId, provider, cleanProviderCampaignId]
    );

    return result.rows[0] ? mapCampaignRow(result.rows[0]) : null;
  }

  private async listProviderLinks(campaignId: string): Promise<AppealCampaignProviderLink[]> {
    const result = await this.pool.query<AppealCampaignProviderLinkRow>(
      `SELECT *
       FROM appeal_campaign_provider_links
       WHERE appeal_campaign_id = $1
       ORDER BY provider ASC, created_at ASC`,
      [campaignId]
    );
    return result.rows.map(mapProviderLinkRow);
  }

  private async upsertProviderLinks(
    campaignId: string,
    organizationId: string,
    providerLinks: AppealCampaignProviderLinkInput[] | undefined,
    userId: string | undefined
  ): Promise<AppealCampaignProviderLink[]> {
    if (!providerLinks?.length) {
      return this.listProviderLinks(campaignId);
    }

    const links: AppealCampaignProviderLink[] = [];
    for (const providerLink of providerLinks) {
      const link = await this.upsertProviderLink({
        appealCampaignId: campaignId,
        organizationId,
        provider: providerLink.provider,
        providerCampaignId: providerLink.providerCampaignId,
        providerAudienceId: providerLink.providerAudienceId,
        label: providerLink.label,
        metadata: providerLink.metadata,
        createdBy: userId ?? null,
      });
      if (link) links.push(link);
    }
    return links;
  }
}

export const appealCampaignService = new AppealCampaignService(dbPool);
export default appealCampaignService;
