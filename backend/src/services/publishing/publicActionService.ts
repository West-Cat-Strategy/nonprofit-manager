import { Pool, PoolClient } from 'pg';
import dbPool, { setCurrentUserId } from '@config/database';
import { services } from '@container/services';
import type { PublishedSite } from '@app-types/publishing';
import type {
  CreatePublicActionRequest,
  PublicAction,
  PublicActionReviewStatus,
  PublicActionStatus,
  PublicActionSubmission,
  PublicActionSubmissionRequest,
  PublicActionSubmissionResult,
  PublicActionSupportLetterArtifact,
  PublicActionType,
  UpdatePublicActionRequest,
} from '@app-types/websiteBuilder';
import { SiteManagementService } from './siteManagementService';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const asBoolean = (value: unknown): boolean =>
  value === true || value === 'true' || value === 'on' || value === '1';

const parseAmount = (value: unknown): number | null => {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : null;
};

const toIso = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const mapActionRow = (row: Record<string, unknown>): PublicAction => ({
  id: row.id as string,
  organizationId: row.organization_id as string,
  siteId: row.site_id as string,
  pageId: (row.page_id as string | null) || null,
  componentId: (row.component_id as string | null) || null,
  actionType: row.action_type as PublicActionType,
  status: row.status as PublicActionStatus,
  slug: row.slug as string,
  title: row.title as string,
  description: (row.description as string | null) || null,
  settings: (row.settings as Record<string, unknown> | null) || {},
  confirmationMessage: (row.confirmation_message as string | null) || null,
  publishedAt: toIso(row.published_at),
  closedAt: toIso(row.closed_at),
  submissionCount: Number(row.submission_count || 0),
  createdAt: new Date(row.created_at as string).toISOString(),
  updatedAt: new Date(row.updated_at as string).toISOString(),
});

const mapSubmissionRow = (row: Record<string, unknown>): PublicActionSubmission => ({
  id: row.id as string,
  organizationId: row.organization_id as string,
  siteId: row.site_id as string,
  actionId: row.action_id as string,
  actionType: row.action_type as PublicActionType,
  reviewStatus: row.review_status as PublicActionReviewStatus,
  contactId: (row.contact_id as string | null) || null,
  sourceEntityType: (row.source_entity_type as string | null) || null,
  sourceEntityId: (row.source_entity_id as string | null) || null,
  duplicateOfSubmissionId: (row.duplicate_of_submission_id as string | null) || null,
  consent: (row.consent as Record<string, unknown> | null) || {},
  payloadRedacted: (row.payload_redacted as Record<string, unknown> | null) || {},
  generatedArtifact: (row.generated_artifact as Record<string, unknown> | null) || {},
  pagePath: (row.page_path as string | null) || null,
  visitorId: (row.visitor_id as string | null) || null,
  sessionId: (row.session_id as string | null) || null,
  referrer: (row.referrer as string | null) || null,
  submittedAt: new Date(row.submitted_at as string).toISOString(),
  createdAt: new Date(row.created_at as string).toISOString(),
  updatedAt: new Date(row.updated_at as string).toISOString(),
});

const mapSupportLetterRow = (row: Record<string, unknown>): PublicActionSupportLetterArtifact => ({
  id: row.id as string,
  organizationId: row.organization_id as string,
  siteId: row.site_id as string,
  actionId: row.action_id as string,
  submissionId: row.submission_id as string,
  contactId: (row.contact_id as string | null) || null,
  templateVersion: row.template_version as string,
  letterTitle: row.letter_title as string,
  letterBody: row.letter_body as string,
  approvalStatus: row.approval_status as PublicActionSupportLetterArtifact['approvalStatus'],
  generatedMetadata: (row.generated_metadata as Record<string, unknown> | null) || {},
  approvedAt: toIso(row.approved_at),
  approvedBy: (row.approved_by as string | null) || null,
  createdAt: new Date(row.created_at as string).toISOString(),
  updatedAt: new Date(row.updated_at as string).toISOString(),
});

export interface PublicActionSubmissionContext {
  idempotencyKey?: string;
  pagePath?: string;
  visitorId?: string;
  sessionId?: string;
  referrer?: string;
  userAgent?: string;
}

export class PublicActionService {
  private readonly siteManagement: SiteManagementService;

  constructor(private readonly pool: Pool) {
    this.siteManagement = new SiteManagementService(pool);
  }

  private async requireOwnedSite(
    siteId: string,
    userId: string,
    organizationId?: string
  ): Promise<PublishedSite> {
    const site = await this.siteManagement.getSite(siteId, userId, organizationId);
    if (!site) {
      throw new Error('Site not found or access denied');
    }
    if (!site.organizationId || site.migrationStatus === 'needs_assignment') {
      throw new Error('Site needs organization assignment before managing public actions');
    }
    return site;
  }

  private async resolvePublicSite(siteKey: string): Promise<PublishedSite | null> {
    const normalized = siteKey.trim().toLowerCase();
    if (UUID_PATTERN.test(normalized)) {
      const byId = await this.siteManagement.getPublicSiteByIdForPreview(normalized);
      if (byId) return byId;
    }

    const bySubdomain = await this.siteManagement.getSiteBySubdomainForPreview(normalized);
    if (bySubdomain) return bySubdomain;

    return this.siteManagement.getSiteByDomainForPreview(normalized);
  }

  async listActions(siteId: string, userId: string, organizationId?: string): Promise<PublicAction[]> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    const result = await this.pool.query(
      `SELECT a.*,
              COUNT(s.id)::int AS submission_count
       FROM website_public_actions a
       LEFT JOIN website_public_action_submissions s ON s.action_id = a.id
       WHERE a.site_id = $1
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [site.id]
    );
    return result.rows.map((row) => mapActionRow(row));
  }

  async listPublishedActionsForSite(site: PublishedSite): Promise<PublicAction[]> {
    const result = await this.pool.query(
      `SELECT a.*,
              COUNT(s.id)::int AS submission_count
       FROM website_public_actions a
       LEFT JOIN website_public_action_submissions s ON s.action_id = a.id
       WHERE a.site_id = $1
         AND a.status = 'published'
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [site.id]
    );
    return result.rows.map((row) => mapActionRow(row));
  }

  async createAction(
    siteId: string,
    userId: string,
    data: CreatePublicActionRequest,
    organizationId?: string
  ): Promise<PublicAction> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    const slug = normalizeSlug(data.slug || data.title);
    const status = data.status || 'draft';
    const publishedAt = data.publishedAt || (status === 'published' ? new Date().toISOString() : null);

    const result = await this.pool.query(
      `INSERT INTO website_public_actions (
         organization_id, site_id, page_id, component_id, action_type, status, slug,
         title, description, settings, confirmation_message, published_at, closed_at,
         created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
       RETURNING *, 0::int AS submission_count`,
      [
        site.organizationId,
        site.id,
        data.pageId || null,
        data.componentId || null,
        data.actionType,
        status,
        slug,
        data.title.trim(),
        data.description || null,
        JSON.stringify(data.settings || {}),
        data.confirmationMessage || null,
        publishedAt,
        data.closedAt || null,
        userId,
      ]
    );

    return mapActionRow(result.rows[0]);
  }

  async updateAction(
    siteId: string,
    actionId: string,
    userId: string,
    data: UpdatePublicActionRequest,
    organizationId?: string
  ): Promise<PublicAction | null> {
    await this.requireOwnedSite(siteId, userId, organizationId);

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;
    const add = (sql: string, value: unknown) => {
      updates.push(`${sql} = $${paramIndex++}`);
      params.push(value);
    };

    if (data.status !== undefined) add('status', data.status);
    if (data.slug !== undefined) add('slug', normalizeSlug(data.slug));
    if (data.title !== undefined) add('title', data.title.trim());
    if (data.description !== undefined) add('description', data.description || null);
    if (data.pageId !== undefined) add('page_id', data.pageId || null);
    if (data.componentId !== undefined) add('component_id', data.componentId || null);
    if (data.settings !== undefined) add('settings', JSON.stringify(data.settings || {}));
    if (data.confirmationMessage !== undefined) {
      add('confirmation_message', data.confirmationMessage || null);
    }
    if (data.publishedAt !== undefined) add('published_at', data.publishedAt || null);
    if (data.closedAt !== undefined) add('closed_at', data.closedAt || null);

    if (updates.length === 0) {
      const existing = await this.pool.query(
        `SELECT a.*,
                COUNT(s.id)::int AS submission_count
         FROM website_public_actions a
         LEFT JOIN website_public_action_submissions s ON s.action_id = a.id
         WHERE a.id = $1 AND a.site_id = $2
         GROUP BY a.id`,
        [actionId, siteId]
      );
      return existing.rows[0] ? mapActionRow(existing.rows[0]) : null;
    }

    add('updated_by', userId);
    params.push(actionId, siteId);

    const result = await this.pool.query(
      `UPDATE website_public_actions
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND site_id = $${paramIndex}
       RETURNING *, (
         SELECT COUNT(*)::int FROM website_public_action_submissions WHERE action_id = website_public_actions.id
       ) AS submission_count`,
      params
    );

    return result.rows[0] ? mapActionRow(result.rows[0]) : null;
  }

  async listSubmissions(
    siteId: string,
    actionId: string,
    userId: string,
    organizationId?: string
  ): Promise<PublicActionSubmission[]> {
    await this.requireOwnedSite(siteId, userId, organizationId);
    const result = await this.pool.query(
      `SELECT *
       FROM website_public_action_submissions
       WHERE site_id = $1 AND action_id = $2
       ORDER BY submitted_at DESC`,
      [siteId, actionId]
    );
    return result.rows.map((row) => mapSubmissionRow(row));
  }

  async exportSubmissionsCsv(
    siteId: string,
    actionId: string,
    userId: string,
    organizationId?: string
  ): Promise<string> {
    const submissions = await this.listSubmissions(siteId, actionId, userId, organizationId);
    const header = ['submitted_at', 'review_status', 'action_type', 'contact_id', 'source_entity_type', 'source_entity_id'];
    const values = (submission: PublicActionSubmission): string[] => [
      submission.submittedAt,
      submission.reviewStatus,
      submission.actionType,
      submission.contactId || '',
      submission.sourceEntityType || '',
      submission.sourceEntityId || '',
    ];
    const rows = submissions.map((submission) =>
      values(submission)
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',')
    );
    return `${header.join(',')}\n${rows.join('\n')}`;
  }

  async getSupportLetterArtifact(
    siteId: string,
    actionId: string,
    submissionId: string,
    userId: string,
    organizationId?: string
  ): Promise<PublicActionSupportLetterArtifact | null> {
    await this.requireOwnedSite(siteId, userId, organizationId);
    const result = await this.pool.query(
      `SELECT sl.*
       FROM website_support_letters sl
       INNER JOIN website_public_action_submissions s ON s.id = sl.submission_id
       WHERE sl.site_id = $1
         AND sl.action_id = $2
         AND sl.submission_id = $3
         AND s.action_type = 'support_letter_request'
       LIMIT 1`,
      [siteId, actionId, submissionId]
    );
    return result.rows[0] ? mapSupportLetterRow(result.rows[0]) : null;
  }

  private async findExistingContact(
    site: PublishedSite,
    payload: PublicActionSubmissionRequest,
    executor: Pick<Pool | PoolClient, 'query'> = this.pool
  ): Promise<{ id: string; tags: string[] | null } | null> {
    const email = asString(payload.email)?.toLowerCase();
    if (!email) return null;

    const result = await executor.query<{ id: string; tags: string[] | null }>(
      `SELECT id, tags
       FROM contacts
       WHERE lower(email) = $1
         AND ($2::uuid IS NULL OR account_id = $2 OR account_id IS NULL)
       ORDER BY CASE WHEN account_id = $2 THEN 0 ELSE 1 END, created_at ASC
       LIMIT 1`,
      [email, site.organizationId]
    );

    return result.rows[0] || null;
  }

  private async withSiteOwnerContext<T>(
    site: PublishedSite,
    work: (executor: Pick<Pool | PoolClient, 'query'>, client?: PoolClient) => Promise<T>
  ): Promise<T> {
    const siteOwnerId = site.ownerUserId || site.userId;
    const connect = (this.pool as unknown as { connect?: () => Promise<PoolClient> }).connect;

    if (!siteOwnerId || typeof connect !== 'function') {
      return work(this.pool);
    }

    const client = await connect.call(this.pool);
    try {
      await client.query('BEGIN');
      await setCurrentUserId(client, siteOwnerId, { local: true });
      const result = await work(client, client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensureContact(
    site: PublishedSite,
    payload: PublicActionSubmissionRequest,
    tags: string[]
  ): Promise<string | undefined> {
    const email = asString(payload.email);
    const firstName = asString(payload.first_name) || 'Public';
    const lastName = asString(payload.last_name) || 'Supporter';
    if (!email && !asString(payload.phone)) return undefined;

    return this.withSiteOwnerContext(site, async (executor, client) => {
      const existing = await this.findExistingContact(site, payload, executor);
      if (existing) {
        const nextTags = Array.from(new Set([...(existing.tags || []), ...tags]));
        await executor.query(
          `UPDATE contacts
           SET account_id = COALESCE(account_id, $1),
               phone = COALESCE(phone, $2),
               tags = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [site.organizationId, asString(payload.phone) || null, nextTags, existing.id]
        );
        return existing.id;
      }

      const contact = await services.contact.createContact(
        {
          account_id: site.organizationId || undefined,
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone: asString(payload.phone) || null,
          notes: asString(payload.message),
          tags,
        },
        site.ownerUserId || site.userId,
        undefined,
        client
      );
      return contact.contact_id;
    });
  }

  private async findDuplicateSignature(actionId: string, email: string | undefined): Promise<string | null> {
    if (!email) return null;
    const result = await this.pool.query<{ id: string }>(
      `SELECT id
       FROM website_public_action_submissions
       WHERE action_id = $1
         AND lower(payload_redacted->>'email') = lower($2)
       ORDER BY submitted_at ASC
       LIMIT 1`,
      [actionId, email]
    );
    return result.rows[0]?.id || null;
  }

  private buildSupportLetter(
    action: PublicAction,
    payload: PublicActionSubmissionRequest
  ): { title: string; body: string; metadata: Record<string, unknown> } {
    const firstName = asString(payload.first_name) || 'Community member';
    const lastName = asString(payload.last_name) || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const purpose = asString(payload.purpose) || asString(payload.message) || 'requested support';
    const template =
      asString(action.settings.letterTemplate) ||
      'To whom it may concern,\n\nWe are writing in support of {{full_name}} regarding {{purpose}}.\n\nSincerely,\n{{organization_name}}';
    const body = template
      .replace(/\{\{full_name\}\}/g, fullName)
      .replace(/\{\{purpose\}\}/g, purpose)
      .replace(/\{\{organization_name\}\}/g, action.title);

    return {
      title: asString(action.settings.letterTitle) || `Support letter for ${fullName}`,
      body,
      metadata: {
        templateVersion: asString(action.settings.templateVersion) || 'v1',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  async submitPublicAction(
    siteKey: string,
    actionSlug: string,
    payload: PublicActionSubmissionRequest,
    context: PublicActionSubmissionContext
  ): Promise<PublicActionSubmissionResult> {
    const site = await this.resolvePublicSite(siteKey);
    if (!site) {
      throw new Error('Published site not found');
    }

    const actionResult = await this.pool.query(
      `SELECT a.*,
              COUNT(s.id)::int AS submission_count
       FROM website_public_actions a
       LEFT JOIN website_public_action_submissions s ON s.action_id = a.id
       WHERE a.site_id = $1 AND a.slug = $2
       GROUP BY a.id
       LIMIT 1`,
      [site.id, normalizeSlug(actionSlug)]
    );
    if (!actionResult.rows[0]) {
      throw new Error('Public action not found');
    }

    const action = mapActionRow(actionResult.rows[0]);
    if (action.status !== 'published') {
      throw new Error('Public action is not accepting submissions');
    }

    if (context.idempotencyKey) {
      const replay = await this.pool.query(
        `SELECT *
         FROM website_public_action_submissions
         WHERE action_id = $1 AND idempotency_key = $2
         LIMIT 1`,
        [action.id, context.idempotencyKey]
      );
      if (replay.rows[0]) {
        const submission = mapSubmissionRow(replay.rows[0]);
        return {
          actionType: action.actionType,
          message: action.confirmationMessage || 'Your response has already been received.',
          submissionId: submission.id,
          contactId: submission.contactId || undefined,
          reviewStatus: submission.reviewStatus,
          idempotentReplay: true,
        };
      }
    }

    const consent = {
      accepted: asBoolean(payload.consent),
      capturedAt: new Date().toISOString(),
    };
    const email = asString(payload.email);
    const baseTags = [action.actionType.replace(/_/g, '-')];
    const duplicateId =
      action.actionType === 'petition_signature'
        ? await this.findDuplicateSignature(action.id, email)
        : null;
    const reviewStatus: PublicActionReviewStatus = duplicateId ? 'duplicate' : 'new';
    const contactId = duplicateId ? undefined : await this.ensureContact(site, payload, baseTags);
    const payloadRedacted = {
      first_name: asString(payload.first_name) || null,
      last_name: asString(payload.last_name) || null,
      email: email || null,
      phone: asString(payload.phone) || null,
      amount: parseAmount(payload.amount),
      message: asString(payload.message) || null,
    };

    const insertSubmission = async (
      sourceEntityType?: string,
      sourceEntityId?: string,
      generatedArtifact: Record<string, unknown> = {}
    ): Promise<PublicActionSubmission> => {
      const result = await this.pool.query(
        `INSERT INTO website_public_action_submissions (
           organization_id, site_id, action_id, action_type, review_status, idempotency_key,
           contact_id, source_entity_type, source_entity_id, duplicate_of_submission_id,
           consent, payload_redacted, generated_artifact, page_path, visitor_id, session_id,
           referrer, user_agent
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::uuid, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING *`,
        [
          site.organizationId,
          site.id,
          action.id,
          action.actionType,
          reviewStatus,
          context.idempotencyKey || null,
          contactId || null,
          sourceEntityType || null,
          sourceEntityId || null,
          duplicateId,
          JSON.stringify(consent),
          JSON.stringify(payloadRedacted),
          JSON.stringify(generatedArtifact),
          context.pagePath || null,
          context.visitorId || asString(payload.visitorId) || null,
          context.sessionId || asString(payload.sessionId) || null,
          context.referrer || null,
          context.userAgent || null,
        ]
      );
      return mapSubmissionRow(result.rows[0]);
    };

    if (action.actionType === 'donation_pledge') {
      const amount = parseAmount(payload.amount);
      if (!amount) {
        throw new Error('Pledge amount is required');
      }
      const submission = await insertSubmission();
      const pledgeResult = await this.pool.query<{ id: string }>(
        `INSERT INTO website_public_pledges (
           organization_id, site_id, action_id, submission_id, contact_id, campaign_id,
           amount, currency, schedule, due_date
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          site.organizationId,
          site.id,
          action.id,
          submission.id,
          contactId || null,
          asString(action.settings.campaignId) || null,
          amount,
          asString(action.settings.currency) || 'CAD',
          JSON.stringify({
            cadence: asString(action.settings.pledgeSchedule) || asString(payload.schedule) || 'one_time',
          }),
          asString(payload.due_date) || null,
        ]
      );
      return {
        actionType: action.actionType,
        message: action.confirmationMessage || 'Your pledge has been recorded.',
        submissionId: submission.id,
        contactId,
        pledgeId: pledgeResult.rows[0].id,
        reviewStatus,
      };
    }

    if (action.actionType === 'support_letter_request') {
      const generated = this.buildSupportLetter(action, payload);
      const submission = await insertSubmission(undefined, undefined, generated.metadata);
      const templateVersion = asString(generated.metadata.templateVersion) || 'v1';
      const letterResult = await this.pool.query<{ id: string }>(
        `INSERT INTO website_support_letters (
           organization_id, site_id, action_id, submission_id, contact_id,
           template_version, letter_title, letter_body, generated_metadata
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          site.organizationId,
          site.id,
          action.id,
          submission.id,
          contactId || null,
          templateVersion,
          generated.title,
          generated.body,
          JSON.stringify(generated.metadata),
        ]
      );
      return {
        actionType: action.actionType,
        message: action.confirmationMessage || 'Your support letter request has been received.',
        submissionId: submission.id,
        contactId,
        supportLetterId: letterResult.rows[0].id,
        reviewStatus,
      };
    }

    const submission = await insertSubmission(contactId ? 'contact' : undefined, contactId);
    return {
      actionType: action.actionType,
      message: action.confirmationMessage || 'Your response has been received.',
      submissionId: submission.id,
      contactId,
      reviewStatus,
    };
  }
}

export const publicActionService = new PublicActionService(dbPool);
