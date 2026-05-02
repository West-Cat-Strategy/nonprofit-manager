import { createHash, randomBytes } from 'crypto';
import { Pool } from 'pg';
import type {
  PublishedSite,
  RenderablePublishedComponent,
  WebsiteSiteSettings,
} from '@app-types/publishing';
import type { PublicWebsiteFormRequestContext, PublicWebsiteFormResult } from './publicWebsiteFormService';
import { sendNewsletterSignupConfirmationEmail } from '@services/emailService';
import newsletterProviderService from '@services/newsletterProviderService';
import { appendUniqueTags, type ContactIdentity } from './publicWebsiteFormServiceHelpers';

interface NewsletterDestinationSnapshot {
  provider: 'local_email' | 'mailchimp' | 'mautic';
  audienceId: string | null;
  shouldSync: boolean;
  tags: string[];
}

interface NewsletterConfirmationRow {
  id: string;
  site_id: string;
  organization_id: string | null;
  user_id: string;
  owner_user_id: string | null;
  site_name: string;
  form_key: string;
  email: string;
  email_normalized: string;
  first_name: string;
  last_name: string;
  provider: 'local_email' | 'mailchimp' | 'mautic';
  audience_id: string | null;
  tags: string[] | null;
  source_metadata: Record<string, unknown> | null;
}

type EnsureContact = (
  site: PublishedSite,
  identity: ContactIdentity,
  defaultTags?: string[]
) => Promise<{ contactId: string; created: boolean }>;

type BuildAuditMetadata = (
  context: PublicWebsiteFormRequestContext,
  extra?: Record<string, unknown>
) => Record<string, unknown>;

interface NewsletterConfirmationDependencies {
  ensureContact: EnsureContact;
  buildAuditMetadata: BuildAuditMetadata;
  getSettingsForSite: (site: PublishedSite) => Promise<WebsiteSiteSettings>;
}

const NEWSLETTER_CONFIRMATION_HOURS = 48;
export const NEWSLETTER_CONFIRMATION_MESSAGE =
  'Please check your email to confirm your newsletter signup.';
const NEWSLETTER_CONFIRMATION_RESPONSE =
  'If this confirmation link is valid, your newsletter signup is confirmed.';

const hashNewsletterConfirmationToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const createNewsletterConfirmationToken = (): { token: string; tokenHash: string } => {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashNewsletterConfirmationToken(token) };
};

export class PublicNewsletterSignupConfirmationService {
  constructor(
    private readonly pool: Pool,
    private readonly deps: NewsletterConfirmationDependencies
  ) {}

  async createPendingSignup(
    site: PublishedSite,
    component: RenderablePublishedComponent,
    identity: ContactIdentity,
    context: PublicWebsiteFormRequestContext
  ): Promise<{ provider: NewsletterDestinationSnapshot['provider']; message: string }> {
    const defaultTags = appendUniqueTags((component.defaultTags as string[] | undefined) || [], [
      'newsletter',
    ]);
    const settings = await this.deps.getSettingsForSite(site);
    const destination = newsletterProviderService.resolveNewsletterDestination(settings, {
      audienceMode:
        (component.audienceMode as
          | 'crm'
          | 'local_email'
          | 'mailchimp'
          | 'mautic'
          | 'both'
          | undefined) || 'crm',
      mailchimpListId: component.mailchimpListId as string | undefined,
      mauticSegmentId: component.mauticSegmentId as string | undefined,
      defaultTags,
    });

    await this.createOrRefreshConfirmation(site, component.id, identity, destination, context);

    return {
      provider: destination.provider,
      message: (component.successMessage as string | undefined) || NEWSLETTER_CONFIRMATION_MESSAGE,
    };
  }

  private async createOrRefreshConfirmation(
    site: PublishedSite,
    formKey: string,
    identity: ContactIdentity,
    destination: NewsletterDestinationSnapshot,
    context: PublicWebsiteFormRequestContext
  ): Promise<void> {
    const email = identity.email?.trim().toLowerCase();
    if (!email) {
      return;
    }

    const { token, tokenHash } = createNewsletterConfirmationToken();
    const sourceMetadata = this.deps.buildAuditMetadata(context, {
      formKey,
      provider: destination.provider,
      audienceId: destination.audienceId,
    });

    const inserted = await this.pool.query<{ id: string }>(
      `INSERT INTO newsletter_signup_confirmations (
         site_id,
         organization_id,
         form_key,
         email,
         email_normalized,
         first_name,
         last_name,
         provider,
         audience_id,
         tags,
         token_hash,
         expires_at,
         source_metadata,
         last_send_attempt_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11,
         CURRENT_TIMESTAMP + ($12::int * INTERVAL '1 hour'),
         $13::jsonb,
         CURRENT_TIMESTAMP
       )
       ON CONFLICT (site_id, form_key, email_normalized)
       DO UPDATE SET
         email = EXCLUDED.email,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         provider = EXCLUDED.provider,
         audience_id = EXCLUDED.audience_id,
         tags = EXCLUDED.tags,
         token_hash = EXCLUDED.token_hash,
         expires_at = EXCLUDED.expires_at,
         confirmed_at = NULL,
         contact_id = NULL,
         source_metadata = EXCLUDED.source_metadata,
         last_send_attempt_at = CURRENT_TIMESTAMP,
         confirmation_email_sent_at = NULL,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [
        site.id,
        site.organizationId || null,
        formKey,
        email,
        email,
        identity.firstName,
        identity.lastName,
        destination.provider,
        destination.audienceId,
        destination.tags,
        tokenHash,
        NEWSLETTER_CONFIRMATION_HOURS,
        JSON.stringify(sourceMetadata),
      ]
    );

    const emailSent = await sendNewsletterSignupConfirmationEmail(
      email,
      token,
      identity.firstName,
      site.name
    );

    if (inserted.rows[0]?.id && emailSent) {
      await this.pool.query(
        `UPDATE newsletter_signup_confirmations
         SET confirmation_email_sent_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [inserted.rows[0].id]
      );
    }
  }

  async confirmSignup(token: string): Promise<PublicWebsiteFormResult> {
    const tokenHash = hashNewsletterConfirmationToken(token);
    const confirmation = await this.pool.query<NewsletterConfirmationRow>(
      `SELECT
         nsc.id,
         nsc.site_id,
         nsc.organization_id,
         ps.user_id,
         ps.owner_user_id,
         ps.name AS site_name,
         nsc.form_key,
         nsc.email,
         nsc.email_normalized,
         nsc.first_name,
         nsc.last_name,
         nsc.provider,
         nsc.audience_id,
         nsc.tags,
         nsc.source_metadata
       FROM newsletter_signup_confirmations nsc
       JOIN published_sites ps ON ps.id = nsc.site_id
       WHERE nsc.token_hash = $1
         AND nsc.confirmed_at IS NULL
         AND nsc.expires_at >= CURRENT_TIMESTAMP
       LIMIT 1`,
      [tokenHash]
    );
    const row = confirmation.rows[0];
    if (!row) {
      return {
        formType: 'newsletter-signup',
        message: NEWSLETTER_CONFIRMATION_RESPONSE,
        newsletterSynced: false,
        providerSync: {
          provider: 'local_email',
          attempted: false,
          success: false,
        },
      };
    }

    const site = {
      id: row.site_id,
      userId: row.user_id,
      ownerUserId: row.owner_user_id,
      organizationId: row.organization_id,
      name: row.site_name,
    } as PublishedSite;
    const identity: ContactIdentity = {
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email_normalized,
    };
    const tags = appendUniqueTags(row.tags, ['newsletter']);
    const { contactId, created } = await this.deps.ensureContact(site, identity, tags);
    const settings = await this.deps.getSettingsForSite(site);
    const shouldSync = row.provider !== 'local_email' && Boolean(row.audience_id);
    let newsletterSynced = false;

    if (shouldSync && row.audience_id) {
      const syncResult = await newsletterProviderService.syncNewsletterContact(settings, {
        contactId,
        listId: row.audience_id,
        tags,
        provider: row.provider,
      });
      newsletterSynced = Boolean(syncResult.success);
    }

    await this.pool.query(
      `UPDATE newsletter_signup_confirmations
       SET confirmed_at = CURRENT_TIMESTAMP,
           contact_id = $2,
           source_metadata = COALESCE(source_metadata, '{}'::jsonb) || $3::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        row.id,
        contactId,
        JSON.stringify({
          confirmed: true,
          contactCreated: created,
          providerSync: {
            provider: row.provider,
            attempted: shouldSync,
            success: newsletterSynced,
          },
        }),
      ]
    );

    return {
      formType: 'newsletter-signup',
      message: NEWSLETTER_CONFIRMATION_RESPONSE,
      contactId,
      mailchimpSynced: row.provider === 'mailchimp' && newsletterSynced,
      newsletterSynced,
      newsletterProvider: row.provider,
      providerSync: {
        provider: row.provider,
        attempted: shouldSync,
        success: newsletterSynced,
      },
    };
  }
}
