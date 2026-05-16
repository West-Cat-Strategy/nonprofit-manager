import { Pool, PoolClient } from 'pg';
import dbPool, { setCurrentUserId } from '@config/database';
import { services } from '@container/services';
import appealCampaignService from '@modules/appealCampaigns/services/appealCampaignService';
import type { PublishedSite } from '@app-types/publishing';
import type {
  CreatePublicActionRequest,
  PublicAction,
  PublicActionReviewStatus,
  PublicActionSubmission,
  PublicActionSubmissionRequest,
  PublicActionSubmissionResult,
  PublicActionSubmissionTransition,
  PublicActionSubmissionTransitionResult,
  PublicActionSupportLetterArtifact,
  UpdatePublicActionRequest,
} from '@app-types/websiteBuilder';
import { SiteManagementService } from './siteManagementService';
import {
  ACTION_TYPES_REQUIRING_MANUAL_REVIEW,
  buildSubmissionPayload,
  type PublicActionSubmissionSideEffects,
} from './publicActionSubmissionHelpers';
import {
  asBoolean,
  asString,
  mapActionRow,
  mapSubmissionRow,
  mapSupportLetterRow,
  normalizeSlug,
  parseAmount,
} from './publicActionRowMappers';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const compatibilityAppealCampaignId = asString(data.settings?.appealCampaignId);
    const appealCampaign = await appealCampaignService.requireCampaignForScope(
      data.appealCampaignId ?? compatibilityAppealCampaignId,
      { organizationId: site.organizationId }
    );

    const result = await this.pool.query(
      `INSERT INTO website_public_actions (
         organization_id, site_id, appeal_campaign_id, page_id, component_id, action_type, status, slug,
         title, description, settings, confirmation_message, published_at, closed_at,
         created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
       RETURNING *, 0::int AS submission_count`,
      [
        site.organizationId,
        site.id,
        appealCampaign?.id ?? null,
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
    const site = await this.requireOwnedSite(siteId, userId, organizationId);

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
    if (data.appealCampaignId !== undefined) {
      const appealCampaign = await appealCampaignService.requireCampaignForScope(
        data.appealCampaignId,
        { organizationId: site.organizationId }
      );
      add('appeal_campaign_id', appealCampaign?.id ?? null);
    } else if (
      data.settings &&
      Object.prototype.hasOwnProperty.call(data.settings, 'appealCampaignId')
    ) {
      const settingsAppealCampaignId =
        data.settings.appealCampaignId === null ? null : asString(data.settings.appealCampaignId);
      const appealCampaign = await appealCampaignService.requireCampaignForScope(
        settingsAppealCampaignId,
        { organizationId: site.organizationId }
      );
      add('appeal_campaign_id', appealCampaign?.id ?? null);
    }
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
         AND s.review_status IN ('accepted', 'fulfilled')
         AND sl.approval_status IN ('approved', 'sent')
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

  private async ensureContactWithExecutor(
    site: PublishedSite,
    payload: PublicActionSubmissionRequest,
    tags: string[],
    executor: Pick<Pool | PoolClient, 'query'>,
    client?: PoolClient
  ): Promise<string | undefined> {
    const email = asString(payload.email);
    const firstName = asString(payload.first_name) || 'Public';
    const lastName = asString(payload.last_name) || 'Supporter';
    if (!email && !asString(payload.phone)) return undefined;

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

  private getInitialReviewStatus(
    action: PublicAction,
    duplicateSubmissionId: string | null
  ): PublicActionReviewStatus {
    if (duplicateSubmissionId) return 'duplicate';
    return ACTION_TYPES_REQUIRING_MANUAL_REVIEW.has(action.actionType) ? 'needs_review' : 'new';
  }

  private async getActionById(siteId: string, actionId: string): Promise<PublicAction | null> {
    const result = await this.pool.query(
      `SELECT a.*,
              (
                SELECT COUNT(*)::int
                FROM website_public_action_submissions s
                WHERE s.action_id = a.id
              ) AS submission_count
       FROM website_public_actions a
       WHERE a.site_id = $1 AND a.id = $2
       LIMIT 1`,
      [siteId, actionId]
    );
    return result.rows[0] ? mapActionRow(result.rows[0]) : null;
  }

  private async getSubmissionById(
    siteId: string,
    actionId: string,
    submissionId: string
  ): Promise<PublicActionSubmission | null> {
    const result = await this.pool.query(
      `SELECT *
       FROM website_public_action_submissions
       WHERE site_id = $1 AND action_id = $2 AND id = $3
       LIMIT 1`,
      [siteId, actionId, submissionId]
    );
    return result.rows[0] ? mapSubmissionRow(result.rows[0]) : null;
  }

  private async ensureSubmissionSideEffects(
    site: PublishedSite,
    action: PublicAction,
    submission: PublicActionSubmission,
    userId: string,
    executor: Pick<Pool | PoolClient, 'query'>,
    client?: PoolClient
  ): Promise<PublicActionSubmissionSideEffects> {
    const payload = buildSubmissionPayload(submission.payloadRedacted);
    const baseTags = [action.actionType.replace(/_/g, '-')];
    const existingContactId =
      submission.contactId ||
      (submission.sourceEntityType === 'contact' ? submission.sourceEntityId || undefined : undefined);
    const contactId =
      existingContactId ||
      (await this.ensureContactWithExecutor(site, payload, baseTags, executor, client));

    if (action.actionType === 'donation_pledge') {
      const amount = parseAmount(payload.amount);
      if (!amount) {
        throw new Error('Pledge amount is required');
      }

      const existingPledge = await executor.query<{ id: string }>(
        `SELECT id
         FROM website_public_pledges
         WHERE submission_id = $1
         LIMIT 1`,
        [submission.id]
      );
      const pledgeId =
        existingPledge.rows[0]?.id ||
        (
          await executor.query<{ id: string }>(
            `INSERT INTO website_public_pledges (
               organization_id, site_id, action_id, submission_id, contact_id, campaign_id,
               appeal_campaign_id,
               amount, currency, schedule, due_date
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id`,
            [
              site.organizationId,
              site.id,
              action.id,
              submission.id,
              contactId || null,
              asString(action.settings.campaignId) || null,
              action.appealCampaignId || asString(action.settings.appealCampaignId) || null,
              amount,
              asString(action.settings.currency) || 'CAD',
              JSON.stringify({
                cadence:
                  asString(action.settings.pledgeSchedule) ||
                  asString(payload.schedule) ||
                  'one_time',
              }),
              asString(payload.due_date) || null,
            ]
          )
        ).rows[0].id;

      return {
        contactId,
        pledgeId,
        sourceEntityType: 'public_pledge',
        sourceEntityId: pledgeId,
      };
    }

    if (action.actionType === 'support_letter_request') {
      const generated = this.buildSupportLetter(action, payload);
      const templateVersion = asString(generated.metadata.templateVersion) || 'v1';
      const existingLetter = await executor.query<{ id: string }>(
        `SELECT id
         FROM website_support_letters
         WHERE submission_id = $1
         LIMIT 1`,
        [submission.id]
      );

      let supportLetterId = existingLetter.rows[0]?.id;
      if (supportLetterId) {
        await executor.query(
          `UPDATE website_support_letters
           SET contact_id = COALESCE(contact_id, $1),
               approval_status = CASE
                 WHEN approval_status = 'sent' THEN approval_status
                 ELSE 'approved'
               END,
               approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
               approved_by = COALESCE(approved_by, $2),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [contactId || null, userId, supportLetterId]
        );
      } else {
        const letterResult = await executor.query<{ id: string }>(
          `INSERT INTO website_support_letters (
             organization_id, site_id, action_id, submission_id, contact_id,
             template_version, letter_title, letter_body, approval_status,
             generated_metadata, approved_at, approved_by
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', $9, CURRENT_TIMESTAMP, $10)
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
            userId,
          ]
        );
        supportLetterId = letterResult.rows[0].id;
      }

      return {
        contactId,
        supportLetterId,
        sourceEntityType: 'support_letter',
        sourceEntityId: supportLetterId,
      };
    }

    return {
      contactId,
      sourceEntityType: contactId ? 'contact' : submission.sourceEntityType || undefined,
      sourceEntityId: contactId ? contactId : submission.sourceEntityId || undefined,
    };
  }

  private async markSubmissionSideEffectsFulfilled(
    action: PublicAction,
    effects: PublicActionSubmissionSideEffects,
    userId: string,
    executor: Pick<Pool | PoolClient, 'query'>
  ): Promise<void> {
    if (action.actionType === 'donation_pledge' && effects.pledgeId) {
      await executor.query(
        `UPDATE website_public_pledges
         SET status = 'fulfilled',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [effects.pledgeId]
      );
    }

    if (action.actionType === 'support_letter_request' && effects.supportLetterId) {
      await executor.query(
        `UPDATE website_support_letters
         SET approval_status = 'sent',
             approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
             approved_by = COALESCE(approved_by, $2),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [effects.supportLetterId, userId]
      );
    }
  }

  async transitionSubmission(
    siteId: string,
    actionId: string,
    submissionId: string,
    transition: PublicActionSubmissionTransition,
    userId: string,
    organizationId?: string
  ): Promise<PublicActionSubmissionTransitionResult | null> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    const [action, submission] = await Promise.all([
      this.getActionById(site.id, actionId),
      this.getSubmissionById(site.id, actionId, submissionId),
    ]);

    if (!action || !submission) {
      return null;
    }

    if (transition === 'reject') {
      if (submission.reviewStatus === 'accepted' || submission.reviewStatus === 'fulfilled') {
        throw new Error('Cannot reject an accepted public action submission');
      }

      const result = await this.pool.query(
        `UPDATE website_public_action_submissions
         SET review_status = 'rejected',
             reviewed_at = CURRENT_TIMESTAMP,
             reviewed_by = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE site_id = $1 AND action_id = $2 AND id = $3
         RETURNING *`,
        [site.id, action.id, submission.id, userId]
      );
      return {
        submission: mapSubmissionRow(result.rows[0]),
      };
    }

    if (submission.reviewStatus === 'rejected') {
      throw new Error('Cannot accept or fulfill a rejected public action submission');
    }

    const nextReviewStatus: PublicActionReviewStatus =
      transition === 'fulfill' ? 'fulfilled' : submission.reviewStatus === 'fulfilled' ? 'fulfilled' : 'accepted';

    return this.withSiteOwnerContext(site, async (executor, client) => {
      const effects = await this.ensureSubmissionSideEffects(
        site,
        action,
        submission,
        userId,
        executor,
        client
      );

      if (transition === 'fulfill') {
        await this.markSubmissionSideEffectsFulfilled(action, effects, userId, executor);
      }

      const nextContactId = effects.contactId || submission.contactId || null;
      const nextSourceEntityType = effects.sourceEntityType || submission.sourceEntityType || null;
      const nextSourceEntityId = effects.sourceEntityId || submission.sourceEntityId || null;
      const result = await executor.query(
        `UPDATE website_public_action_submissions
         SET review_status = $4,
             contact_id = $5,
             source_entity_type = $6,
             source_entity_id = $7,
             reviewed_at = CURRENT_TIMESTAMP,
             reviewed_by = $8,
             updated_at = CURRENT_TIMESTAMP
         WHERE site_id = $1 AND action_id = $2 AND id = $3
         RETURNING *`,
        [
          site.id,
          action.id,
          submission.id,
          nextReviewStatus,
          nextContactId,
          nextSourceEntityType,
          nextSourceEntityId,
          userId,
        ]
      );

      return {
        submission: mapSubmissionRow(result.rows[0]),
        contactId: effects.contactId,
        pledgeId: effects.pledgeId,
        supportLetterId: effects.supportLetterId,
      };
    });
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
    const duplicateId =
      action.actionType === 'petition_signature'
        ? await this.findDuplicateSignature(action.id, email)
        : null;
    const reviewStatus = this.getInitialReviewStatus(action, duplicateId);
    if (action.actionType === 'donation_pledge' && !parseAmount(payload.amount)) {
      throw new Error('Pledge amount is required');
    }
    const payloadRedacted = {
      first_name: asString(payload.first_name) || null,
      last_name: asString(payload.last_name) || null,
      email: email || null,
      phone: asString(payload.phone) || null,
      amount: parseAmount(payload.amount),
      message: asString(payload.message) || null,
      purpose: asString(payload.purpose) || null,
      schedule: asString(payload.schedule) || null,
      due_date: asString(payload.due_date) || null,
    };

    const generatedArtifact =
      action.actionType === 'support_letter_request'
        ? this.buildSupportLetter(action, payload).metadata
        : {};
    const result = await this.pool.query(
      `INSERT INTO website_public_action_submissions (
         organization_id, site_id, action_id, action_type, review_status, idempotency_key,
         contact_id, source_entity_type, source_entity_id, duplicate_of_submission_id,
         consent, payload_redacted, generated_artifact, page_path, visitor_id, session_id,
         referrer, user_agent
       ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        site.organizationId,
        site.id,
        action.id,
        action.actionType,
        reviewStatus,
        context.idempotencyKey || null,
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
    const submission = mapSubmissionRow(result.rows[0]);
    return {
      actionType: action.actionType,
      message: action.confirmationMessage || 'Your response has been received.',
      submissionId: submission.id,
      reviewStatus,
    };
  }
}

export const publicActionService = new PublicActionService(dbPool);
