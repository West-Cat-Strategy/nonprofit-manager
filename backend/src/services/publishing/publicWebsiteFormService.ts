import { Pool } from 'pg';
import dbPool from '@config/database';
import { services } from '@container/services';
import type { PublishedComponent, PublishedSite } from '@app-types/publishing';
import { AvailabilityStatus } from '@app-types/volunteer';
import { stripeService } from '@services/domains/operations';
import { addOrUpdateMember, isMailchimpConfigured } from '@services/mailchimpService';
import { SiteManagementService } from './siteManagementService';

export interface PublicWebsiteFormResult {
  formType: string;
  message: string;
  contactId?: string;
  donationId?: string;
  paymentIntent?: Awaited<ReturnType<typeof stripeService.createPaymentIntent>>;
  mailchimpSynced?: boolean;
}

interface ContactIdentity {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  message?: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizePhone = (value: string | undefined): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
};

const splitName = (value: string | undefined): { firstName: string; lastName: string } => {
  const parts = (value || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: 'Website', lastName: 'Visitor' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Visitor' };
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
};

const toIdentity = (payload: Record<string, unknown>): ContactIdentity => {
  const name = typeof payload.name === 'string' ? splitName(payload.name) : null;
  return {
    firstName:
      typeof payload.first_name === 'string' && payload.first_name.trim().length > 0
        ? payload.first_name.trim()
        : name?.firstName || 'Website',
    lastName:
      typeof payload.last_name === 'string' && payload.last_name.trim().length > 0
        ? payload.last_name.trim()
        : name?.lastName || 'Visitor',
    email: typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : undefined,
    phone: typeof payload.phone === 'string' ? payload.phone.trim() : undefined,
    message:
      typeof payload.message === 'string'
        ? payload.message.trim()
        : typeof payload.notes === 'string'
          ? payload.notes.trim()
          : undefined,
  };
};

const appendUniqueTags = (existing: string[] | null | undefined, incoming: string[] = []): string[] => {
  const seen = new Set<string>();
  const values = [...(existing || []), ...incoming]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const deduped: string[] = [];
  for (const value of values) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(value);
  }
  return deduped;
};

export class PublicWebsiteFormService {
  private readonly siteManagement: SiteManagementService;

  constructor(private readonly pool: Pool) {
    this.siteManagement = new SiteManagementService(pool);
  }

  private findComponentById(
    site: PublishedSite,
    componentId: string
  ): PublishedComponent | null {
    if (!site.publishedContent) {
      return null;
    }

    const search = (components: PublishedComponent[]): PublishedComponent | null => {
      for (const component of components) {
        if (component.id === componentId) {
          return component;
        }

        const nestedComponents = Array.isArray(component.components)
          ? (component.components as PublishedComponent[])
          : [];
        const nestedMatch = nestedComponents.length > 0 ? search(nestedComponents) : null;
        if (nestedMatch) {
          return nestedMatch;
        }

        const nestedColumns = Array.isArray(component.columns)
          ? (component.columns as Array<{ components?: PublishedComponent[] }>)
          : [];
        for (const column of nestedColumns) {
          const columnComponents = Array.isArray(column.components) ? column.components : [];
          const columnMatch = search(columnComponents);
          if (columnMatch) {
            return columnMatch;
          }
        }
      }

      return null;
    };

    for (const page of site.publishedContent.pages) {
      for (const section of page.sections) {
        const match = search(section.components);
        if (match) {
          return match;
        }
      }
    }

    return null;
  }

  private async findExistingContact(
    site: PublishedSite,
    identity: ContactIdentity
  ): Promise<{ id: string; tags: string[] | null } | null> {
    if (identity.email) {
      const byEmail = await this.pool.query<{ id: string; tags: string[] | null }>(
        `SELECT id, tags
         FROM contacts
         WHERE lower(email) = $1
           AND ($2::uuid IS NULL OR account_id = $2 OR account_id IS NULL)
         ORDER BY CASE WHEN account_id = $2 THEN 0 ELSE 1 END, created_at ASC
         LIMIT 1`,
        [identity.email, site.organizationId]
      );
      if (byEmail.rows[0]) {
        return byEmail.rows[0];
      }
    }

    const normalizedPhone = normalizePhone(identity.phone);
    if (normalizedPhone) {
      const byPhone = await this.pool.query<{ id: string; tags: string[] | null }>(
        `SELECT id, tags
         FROM contacts
         WHERE (
           regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = $1
           OR regexp_replace(COALESCE(mobile_phone, ''), '[^0-9]', '', 'g') = $1
         )
           AND ($2::uuid IS NULL OR account_id = $2 OR account_id IS NULL)
         ORDER BY CASE WHEN account_id = $2 THEN 0 ELSE 1 END, created_at ASC
         LIMIT 1`,
        [normalizedPhone, site.organizationId]
      );
      if (byPhone.rows[0]) {
        return byPhone.rows[0];
      }
    }

    return null;
  }

  private async ensureContact(
    site: PublishedSite,
    identity: ContactIdentity,
    defaultTags: string[] = []
  ): Promise<{ contactId: string; created: boolean }> {
    const existing = await this.findExistingContact(site, identity);

    if (existing) {
      const nextTags = appendUniqueTags(existing.tags, defaultTags);
      await this.pool.query(
        `UPDATE contacts
         SET account_id = COALESCE(account_id, $1),
             phone = COALESCE(phone, $2),
             mobile_phone = COALESCE(mobile_phone, $2),
             notes = CASE
               WHEN $3::text IS NULL OR trim($3::text) = '' THEN notes
               WHEN notes IS NULL OR trim(notes) = '' THEN $3
               ELSE notes || E'\n\n' || $3
             END,
             tags = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [site.organizationId, identity.phone || null, identity.message || null, nextTags, existing.id]
      );
      return { contactId: existing.id, created: false };
    }

    const contact = await services.contact.createContact(
      {
        account_id: site.organizationId || undefined,
        first_name: identity.firstName,
        last_name: identity.lastName,
        email: identity.email,
        phone: identity.phone,
        mobile_phone: identity.phone,
        notes: identity.message,
        tags: defaultTags,
      },
      site.ownerUserId || site.userId
    );

    return { contactId: contact.contact_id, created: true };
  }

  async submitForm(
    site: PublishedSite,
    formKey: string,
    payload: Record<string, unknown>
  ): Promise<PublicWebsiteFormResult> {
    if (!site.publishedContent) {
      throw new Error('Published site content is unavailable');
    }

    const component = this.findComponentById(site, formKey);
    if (!component) {
      throw new Error('Website form not found');
    }

    const identity = toIdentity(payload);

    switch (component.type) {
      case 'contact-form': {
        const defaultTags = appendUniqueTags(
          (component.defaultTags as string[] | undefined) || [],
          component.formMode === 'supporter' ? ['supporter'] : []
        );
        const { contactId } = await this.ensureContact(site, identity, defaultTags);
        return {
          formType: component.type,
          message:
            (component.successMessage as string | undefined) ||
            'Your message has been recorded.',
          contactId,
        };
      }

      case 'newsletter-signup': {
        const defaultTags = appendUniqueTags((component.defaultTags as string[] | undefined) || [], [
          'newsletter',
        ]);
        const { contactId } = await this.ensureContact(site, identity, defaultTags);
        const audienceMode =
          (component.audienceMode as 'crm' | 'mailchimp' | 'both' | undefined) || 'crm';
        let mailchimpSynced = false;

        if (
          identity.email &&
          component.mailchimpListId &&
          audienceMode !== 'crm' &&
          isMailchimpConfigured()
        ) {
          await addOrUpdateMember({
            listId: String(component.mailchimpListId),
            email: identity.email,
            status: 'subscribed',
            mergeFields: {
              FNAME: identity.firstName,
              LNAME: identity.lastName,
              PHONE: identity.phone,
            },
            tags: defaultTags,
          });
          mailchimpSynced = true;
        }

        return {
          formType: component.type,
          message:
            (component.successMessage as string | undefined) ||
            'You have been added to the newsletter list.',
          contactId,
          mailchimpSynced,
        };
      }

      case 'volunteer-interest-form': {
        const defaultTags = appendUniqueTags((component.defaultTags as string[] | undefined) || [], [
          'volunteer-interest',
        ]);
        const { contactId } = await this.ensureContact(site, identity, defaultTags);
        const volunteer = await this.pool.query<{ volunteer_id: string }>(
          `SELECT id as volunteer_id
           FROM volunteers
           WHERE contact_id = $1
           LIMIT 1`,
          [contactId]
        );

        if (!volunteer.rows[0]) {
          await services.volunteer.createVolunteer(
            {
              contact_id: contactId,
              availability_status: AvailabilityStatus.LIMITED,
              availability_notes:
                typeof payload.availability === 'string' ? payload.availability : undefined,
              skills: Array.isArray(payload.skills)
                ? payload.skills.filter((value): value is string => typeof value === 'string')
                : undefined,
            },
            site.ownerUserId || site.userId
          );
        }

        return {
          formType: component.type,
          message:
            (component.successMessage as string | undefined) ||
            'Volunteer interest has been recorded.',
          contactId,
        };
      }

      case 'donation-form': {
        const { contactId } = await this.ensureContact(site, identity, ['donor']);
        const amountValue =
          typeof payload.amount === 'number'
            ? payload.amount
            : typeof payload.amount === 'string'
              ? Number.parseFloat(payload.amount)
              : 0;

        if (!Number.isFinite(amountValue) || amountValue <= 0) {
          throw new Error('Donation amount is required');
        }

        const donation = await services.donation.createDonation(
          {
            account_id: (component.accountId as string | undefined) || site.organizationId || undefined,
            contact_id: contactId,
            amount: Number(amountValue.toFixed(2)),
            currency: 'USD',
            donation_date: new Date().toISOString(),
            payment_method: 'credit_card',
            payment_status: 'pending',
            notes: identity.message,
            campaign_name:
              typeof component.campaignId === 'string' ? component.campaignId : undefined,
            is_recurring: payload.recurring === true,
            recurring_frequency: payload.recurring === true ? 'monthly' : 'one_time',
          },
          site.ownerUserId || site.userId
        );

        let paymentIntent: PublicWebsiteFormResult['paymentIntent'];
        if (identity.email && stripeService.isStripeConfigured()) {
          paymentIntent = await stripeService.createPaymentIntent({
            amount: Math.round(amountValue * 100),
            currency: 'usd',
            description: `Donation via ${site.name}`,
            donationId: donation.donation_id,
            receiptEmail: identity.email,
            metadata: {
              siteId: site.id,
              formKey,
              contactId,
            },
          });
        }

        return {
          formType: component.type,
          message:
            (component.successMessage as string | undefined) ||
            'Your donation has been recorded.',
          contactId,
          donationId: donation.donation_id,
          paymentIntent,
        };
      }

      default:
        throw new Error('Unsupported website form type');
    }
  }

  async resolveSiteByKey(siteKey: string): Promise<PublishedSite | null> {
    const normalized = siteKey.trim().toLowerCase();

    if (UUID_PATTERN.test(normalized)) {
      const byId = await this.siteManagement.getPublicSiteById(normalized);
      if (byId) {
        return byId;
      }
    }

    const bySubdomain = await this.siteManagement.getSiteBySubdomain(normalized);
    if (bySubdomain) {
      return bySubdomain;
    }

    return this.siteManagement.getSiteByDomain(normalized);
  }
}

export const publicWebsiteFormService = new PublicWebsiteFormService(dbPool);
export default publicWebsiteFormService;
