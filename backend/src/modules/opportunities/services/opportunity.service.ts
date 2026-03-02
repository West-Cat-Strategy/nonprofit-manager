import { Pool } from 'pg';
import pool from '@config/database';
import type {
  CreateOpportunityDTO,
  CreateOpportunityStageDTO,
  MoveOpportunityStageDTO,
  Opportunity,
  OpportunityFilters,
  OpportunityStage,
  OpportunitySummary,
  ReorderOpportunityStagesDTO,
  UpdateOpportunityDTO,
  UpdateOpportunityStageDTO,
} from '@app-types/opportunity';

const DEFAULT_STAGES: Array<Omit<CreateOpportunityStageDTO, 'stage_order'>> = [
  { name: 'Prospecting', probability: 10, is_closed: false, is_won: false, is_active: true },
  { name: 'Qualified', probability: 30, is_closed: false, is_won: false, is_active: true },
  { name: 'Proposal', probability: 60, is_closed: false, is_won: false, is_active: true },
  { name: 'Won', probability: 100, is_closed: true, is_won: true, is_active: true },
  { name: 'Lost', probability: 0, is_closed: true, is_won: false, is_active: true },
];

type StageRow = OpportunityStage;
type OpportunityRow = Opportunity;

const mapStage = (row: StageRow): OpportunityStage => ({
  ...row,
  created_at: new Date(row.created_at).toISOString(),
  updated_at: new Date(row.updated_at).toISOString(),
});

const mapOpportunity = (row: OpportunityRow): Opportunity => ({
  ...row,
  created_at: new Date(row.created_at).toISOString(),
  updated_at: new Date(row.updated_at).toISOString(),
  expected_close_date: row.expected_close_date || null,
  actual_close_date: row.actual_close_date || null,
});

export class OpportunityService {
  constructor(private readonly db: Pool) {}

  async ensureDefaultStages(organizationId: string, userId: string | null): Promise<void> {
    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM opportunity_stages
       WHERE organization_id = $1`,
      [organizationId]
    );

    if (Number.parseInt(countResult.rows[0]?.count || '0', 10) > 0) {
      return;
    }

    for (let idx = 0; idx < DEFAULT_STAGES.length; idx += 1) {
      const stage = DEFAULT_STAGES[idx];
      await this.db.query(
        `INSERT INTO opportunity_stages (
           organization_id,
           name,
           stage_order,
           probability,
           is_closed,
           is_won,
           is_active,
           created_by,
           modified_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
         ON CONFLICT (organization_id, name) DO NOTHING`,
        [
          organizationId,
          stage.name,
          idx,
          stage.probability || null,
          stage.is_closed || false,
          stage.is_won || false,
          stage.is_active ?? true,
          userId,
        ]
      );
    }
  }

  async listStages(organizationId: string): Promise<OpportunityStage[]> {
    const result = await this.db.query<StageRow>(
      `SELECT *
       FROM opportunity_stages
       WHERE organization_id = $1
       ORDER BY stage_order ASC, created_at ASC`,
      [organizationId]
    );

    return result.rows.map(mapStage);
  }

  async createStage(
    organizationId: string,
    userId: string,
    data: CreateOpportunityStageDTO
  ): Promise<OpportunityStage> {
    const orderResult = await this.db.query<{ next_order: number }>(
      `SELECT COALESCE(MAX(stage_order), -1) + 1 AS next_order
       FROM opportunity_stages
       WHERE organization_id = $1`,
      [organizationId]
    );

    const stageOrder = data.stage_order ?? orderResult.rows[0].next_order;

    const result = await this.db.query<StageRow>(
      `INSERT INTO opportunity_stages (
         organization_id,
         name,
         stage_order,
         probability,
         is_closed,
         is_won,
         is_active,
         created_by,
         modified_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING *`,
      [
        organizationId,
        data.name,
        stageOrder,
        data.probability ?? null,
        data.is_closed ?? false,
        data.is_won ?? false,
        data.is_active ?? true,
        userId,
      ]
    );

    return mapStage(result.rows[0]);
  }

  async updateStage(
    organizationId: string,
    stageId: string,
    userId: string,
    data: UpdateOpportunityStageDTO
  ): Promise<OpportunityStage | null> {
    const updates: string[] = ['modified_by = $3', 'updated_at = NOW()'];
    const values: unknown[] = [organizationId, stageId, userId];

    const addUpdate = (field: string, value: unknown): void => {
      values.push(value);
      updates.push(`${field} = $${values.length}`);
    };

    if (data.name !== undefined) addUpdate('name', data.name);
    if (data.stage_order !== undefined) addUpdate('stage_order', data.stage_order);
    if (data.probability !== undefined) addUpdate('probability', data.probability);
    if (data.is_closed !== undefined) addUpdate('is_closed', data.is_closed);
    if (data.is_won !== undefined) addUpdate('is_won', data.is_won);
    if (data.is_active !== undefined) addUpdate('is_active', data.is_active);

    const result = await this.db.query<StageRow>(
      `UPDATE opportunity_stages
       SET ${updates.join(', ')}
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return mapStage(result.rows[0]);
  }

  async reorderStages(
    organizationId: string,
    userId: string,
    data: ReorderOpportunityStagesDTO
  ): Promise<OpportunityStage[]> {
    const existingResult = await this.db.query<{ id: string }>(
      `SELECT id
       FROM opportunity_stages
       WHERE organization_id = $1
       ORDER BY stage_order ASC`,
      [organizationId]
    );

    const existingIds = existingResult.rows.map((row) => row.id);
    const incomingIds = data.stage_ids;
    const existingSet = new Set(existingIds);
    const incomingSet = new Set(incomingIds);

    const isExactStageSet =
      existingIds.length === incomingIds.length &&
      existingSet.size === incomingSet.size &&
      existingIds.every((id) => incomingSet.has(id));

    if (!isExactStageSet) {
      throw new Error('Stage reorder payload must include all stages exactly once');
    }

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      for (let idx = 0; idx < data.stage_ids.length; idx += 1) {
        await client.query(
          `UPDATE opportunity_stages
           SET stage_order = $4,
               modified_by = $3,
               updated_at = NOW()
           WHERE organization_id = $1
             AND id = $2`,
          [organizationId, data.stage_ids[idx], userId, idx]
        );
      }

      const result = await client.query<StageRow>(
        `SELECT *
         FROM opportunity_stages
         WHERE organization_id = $1
         ORDER BY stage_order ASC`,
        [organizationId]
      );

      await client.query('COMMIT');
      return result.rows.map(mapStage);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async getDefaultStageId(organizationId: string): Promise<string> {
    const result = await this.db.query<{ id: string }>(
      `SELECT id
       FROM opportunity_stages
       WHERE organization_id = $1
         AND is_active = true
       ORDER BY stage_order ASC
       LIMIT 1`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      throw new Error('No active opportunity stages available');
    }

    return result.rows[0].id;
  }

  private async assertStageInOrganization(organizationId: string, stageId: string): Promise<void> {
    const stageResult = await this.db.query<{ id: string }>(
      `SELECT id
       FROM opportunity_stages
       WHERE organization_id = $1
         AND id = $2
       LIMIT 1`,
      [organizationId, stageId]
    );

    if (stageResult.rows.length === 0) {
      throw new Error('Opportunity stage not found in organization');
    }
  }

  async listOpportunities(
    organizationId: string,
    filters: OpportunityFilters
  ): Promise<{ data: Opportunity[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const where: string[] = ['o.organization_id = $1'];
    const values: unknown[] = [organizationId];

    const addFilter = (clause: string, value?: unknown): void => {
      if (value === undefined || value === null || value === '') return;
      values.push(value);
      where.push(clause.replace('?', `$${values.length}`));
    };

    addFilter('o.stage_id = ?', filters.stage_id);
    addFilter('o.status = ?', filters.status);
    addFilter('o.assigned_to = ?', filters.assigned_to);

    if (filters.search) {
      values.push(`%${filters.search}%`);
      where.push(`(o.name ILIKE $${values.length} OR o.description ILIKE $${values.length})`);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM opportunities o
       ${whereClause}`,
      values
    );

    const total = Number.parseInt(countResult.rows[0]?.count || '0', 10);

    const rowsResult = await this.db.query<OpportunityRow>(
      `SELECT o.*,
              st.name AS stage_name,
              st.stage_order,
              acc.account_name,
              con.first_name || ' ' || con.last_name AS contact_name,
              assignee.first_name || ' ' || assignee.last_name AS assigned_to_name
       FROM opportunities o
       INNER JOIN opportunity_stages st ON st.id = o.stage_id
       LEFT JOIN accounts acc ON acc.id = o.account_id
       LEFT JOIN contacts con ON con.id = o.contact_id
       LEFT JOIN users assignee ON assignee.id = o.assigned_to
       ${whereClause}
       ORDER BY st.stage_order ASC, o.updated_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return {
      data: rowsResult.rows.map(mapOpportunity),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getOpportunityById(
    organizationId: string,
    opportunityId: string
  ): Promise<Opportunity | null> {
    const result = await this.db.query<OpportunityRow>(
      `SELECT o.*,
              st.name AS stage_name,
              st.stage_order,
              acc.account_name,
              con.first_name || ' ' || con.last_name AS contact_name,
              assignee.first_name || ' ' || assignee.last_name AS assigned_to_name
       FROM opportunities o
       INNER JOIN opportunity_stages st ON st.id = o.stage_id
       LEFT JOIN accounts acc ON acc.id = o.account_id
       LEFT JOIN contacts con ON con.id = o.contact_id
       LEFT JOIN users assignee ON assignee.id = o.assigned_to
       WHERE o.organization_id = $1
         AND o.id = $2
       LIMIT 1`,
      [organizationId, opportunityId]
    );

    if (result.rows.length === 0) return null;
    return mapOpportunity(result.rows[0]);
  }

  async createOpportunity(
    organizationId: string,
    userId: string,
    data: CreateOpportunityDTO
  ): Promise<Opportunity> {
    let stageId = data.stage_id;
    if (!stageId) {
      stageId = await this.getDefaultStageId(organizationId);
    } else {
      await this.assertStageInOrganization(organizationId, stageId);
    }

    if (data.donation_id) {
      const donationResult = await this.db.query<{ id: string }>(
        `SELECT id
         FROM donations
         WHERE id = $1
           AND organization_id = $2
         LIMIT 1`,
        [data.donation_id, organizationId]
      );
      if (donationResult.rows.length === 0) {
        throw new Error('Donation link not found');
      }
    }

    const result = await this.db.query<OpportunityRow>(
      `INSERT INTO opportunities (
         organization_id,
         name,
         description,
         stage_id,
         account_id,
         contact_id,
         donation_id,
         amount,
         currency,
         expected_close_date,
         status,
         loss_reason,
         source,
         assigned_to,
         created_by,
         modified_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'USD'), $10, COALESCE($11, 'open'), $12, $13, $14, $15, $15)
       RETURNING *`,
      [
        organizationId,
        data.name,
        data.description || null,
        stageId,
        data.account_id || null,
        data.contact_id || null,
        data.donation_id || null,
        data.amount ?? null,
        data.currency || null,
        data.expected_close_date || null,
        data.status || null,
        data.loss_reason || null,
        data.source || null,
        data.assigned_to || null,
        userId,
      ]
    );

    await this.db.query(
      `INSERT INTO opportunity_stage_history (opportunity_id, from_stage_id, to_stage_id, changed_by, notes)
       VALUES ($1, NULL, $2, $3, 'initial stage')`,
      [result.rows[0].id, stageId, userId]
    );

    const created = await this.getOpportunityById(organizationId, result.rows[0].id);
    if (!created) {
      throw new Error('Failed to fetch created opportunity');
    }

    return created;
  }

  async updateOpportunity(
    organizationId: string,
    opportunityId: string,
    userId: string,
    data: UpdateOpportunityDTO
  ): Promise<Opportunity | null> {
    if (data.stage_id) {
      await this.assertStageInOrganization(organizationId, data.stage_id);
    }

    if (data.donation_id) {
      const donationResult = await this.db.query<{ id: string }>(
        `SELECT id
         FROM donations
         WHERE id = $1
           AND organization_id = $2
         LIMIT 1`,
        [data.donation_id, organizationId]
      );
      if (donationResult.rows.length === 0) {
        throw new Error('Donation link not found');
      }
    }

    const current = await this.getOpportunityById(organizationId, opportunityId);
    if (!current) return null;

    const updates: string[] = ['modified_by = $3', 'updated_at = NOW()'];
    const values: unknown[] = [organizationId, opportunityId, userId];

    const addUpdate = (field: string, value: unknown): void => {
      values.push(value);
      updates.push(`${field} = $${values.length}`);
    };

    if (data.name !== undefined) addUpdate('name', data.name);
    if (data.description !== undefined) addUpdate('description', data.description);
    if (data.stage_id !== undefined) addUpdate('stage_id', data.stage_id);
    if (data.account_id !== undefined) addUpdate('account_id', data.account_id);
    if (data.contact_id !== undefined) addUpdate('contact_id', data.contact_id);
    if (data.donation_id !== undefined) addUpdate('donation_id', data.donation_id);
    if (data.amount !== undefined) addUpdate('amount', data.amount);
    if (data.currency !== undefined) addUpdate('currency', data.currency);
    if (data.expected_close_date !== undefined) addUpdate('expected_close_date', data.expected_close_date);
    if (data.actual_close_date !== undefined) addUpdate('actual_close_date', data.actual_close_date);
    if (data.status !== undefined) addUpdate('status', data.status);
    if (data.loss_reason !== undefined) addUpdate('loss_reason', data.loss_reason);
    if (data.source !== undefined) addUpdate('source', data.source);
    if (data.assigned_to !== undefined) addUpdate('assigned_to', data.assigned_to);

    const result = await this.db.query<OpportunityRow>(
      `UPDATE opportunities
       SET ${updates.join(', ')}
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;

    if (data.stage_id && data.stage_id !== current.stage_id) {
      await this.db.query(
        `INSERT INTO opportunity_stage_history (opportunity_id, from_stage_id, to_stage_id, changed_by, notes)
         VALUES ($1, $2, $3, $4, 'updated via edit')`,
        [opportunityId, current.stage_id, data.stage_id, userId]
      );
    }

    return this.getOpportunityById(organizationId, opportunityId);
  }

  async moveOpportunityStage(
    organizationId: string,
    opportunityId: string,
    userId: string,
    data: MoveOpportunityStageDTO
  ): Promise<Opportunity | null> {
    await this.assertStageInOrganization(organizationId, data.stage_id);

    const current = await this.getOpportunityById(organizationId, opportunityId);
    if (!current) return null;

    if (current.stage_id === data.stage_id) {
      return current;
    }

    await this.db.query(
      `UPDATE opportunities
       SET stage_id = $3,
           modified_by = $4,
           updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2`,
      [organizationId, opportunityId, data.stage_id, userId]
    );

    await this.db.query(
      `INSERT INTO opportunity_stage_history (opportunity_id, from_stage_id, to_stage_id, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [opportunityId, current.stage_id, data.stage_id, userId, data.notes || null]
    );

    return this.getOpportunityById(organizationId, opportunityId);
  }

  async deleteOpportunity(organizationId: string, opportunityId: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM opportunities
       WHERE organization_id = $1
         AND id = $2
       RETURNING id`,
      [organizationId, opportunityId]
    );

    return result.rows.length > 0;
  }

  async getSummary(organizationId: string): Promise<OpportunitySummary> {
    const countsResult = await this.db.query<{
      total: string;
      open: string;
      won: string;
      lost: string;
      weighted_amount: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status = 'open')::text AS open,
         COUNT(*) FILTER (WHERE status = 'won')::text AS won,
         COUNT(*) FILTER (WHERE status = 'lost')::text AS lost,
         COALESCE(SUM((COALESCE(amount, 0) * COALESCE(st.probability, 0)) / 100.0), 0)::text AS weighted_amount
       FROM opportunities o
       INNER JOIN opportunity_stages st ON st.id = o.stage_id
       WHERE o.organization_id = $1`,
      [organizationId]
    );

    const stageTotalsResult = await this.db.query<{
      stage_id: string;
      stage_name: string;
      count: string;
      amount: string;
    }>(
      `SELECT st.id AS stage_id,
              st.name AS stage_name,
              COUNT(o.id)::text AS count,
              COALESCE(SUM(o.amount), 0)::text AS amount
       FROM opportunity_stages st
       LEFT JOIN opportunities o
         ON o.stage_id = st.id
        AND o.organization_id = st.organization_id
       WHERE st.organization_id = $1
       GROUP BY st.id, st.name, st.stage_order
       ORDER BY st.stage_order ASC`,
      [organizationId]
    );

    const counts = countsResult.rows[0];

    return {
      total: Number.parseInt(counts?.total || '0', 10),
      open: Number.parseInt(counts?.open || '0', 10),
      won: Number.parseInt(counts?.won || '0', 10),
      lost: Number.parseInt(counts?.lost || '0', 10),
      weighted_amount: Number.parseFloat(counts?.weighted_amount || '0'),
      stage_totals: stageTotalsResult.rows.map((row) => ({
        stage_id: row.stage_id,
        stage_name: row.stage_name,
        count: Number.parseInt(row.count || '0', 10),
        amount: Number.parseFloat(row.amount || '0'),
      })),
    };
  }
}

export const opportunityService = new OpportunityService(pool);
