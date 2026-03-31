import { Pool } from 'pg';
import dbPool from '@config/database';
import { services } from '@container/services';
import type { PublishedComponent, PublishedSite } from '@app-types/publishing';
import { AvailabilityStatus } from '@app-types/volunteer';
import type { Activity } from '@app-types/activity';
import type { RecurringDonationPlanStatus } from '@app-types/recurringDonation';
import { addOrUpdateMember, isMailchimpConfigured } from '@services/mailchimpService';
import { activityEventService, type CreateActivityEventInput } from '@services/activityEventService';
import stripeService from '@services/stripeService';
import { SiteManagementService } from './siteManagementService';
import {
  PublicSubmissionConflictError,
  PublicSubmissionReplayError,
  publicSubmissionService,
} from './publicSubmissionService';
import {
  mergeManagedComponentConfig,
  WebsiteSiteSettingsService,
} from './siteSettingsService';

export interface PublicWebsiteFormResult {
  formType: string;
  message: string;
  contactId?: string;
  caseId?: string;
  donationId?: string;
  recurringPlanId?: string;
  recurringPlanStatus?: RecurringDonationPlanStatus;
  redirectUrl?: string;
  returnUrl?: string;
  paymentIntent?: Awaited<ReturnType<typeof stripeService.createPaymentIntent>>;
  mailchimpSynced?: boolean;
  idempotentReplay?: boolean;
}

export interface PublicWebsiteFormRequestContext {
  idempotencyKey?: string;
  ipAddress?: string;
  userAgent?: string;
  pagePath?: string;
  visitorId?: string;
  sessionId?: string;
  referrer?: string;
}

interface ContactIdentity {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  message?: string;
}

type SupportedPublicWebsiteFormType =
  | 'contact-form'
  | 'newsletter-signup'
  | 'volunteer-interest-form'
  | 'referral-form'
  | 'donation-form';

interface PublicWebsiteFormSubmissionOutcome {
  result: PublicWebsiteFormResult;
  resultEntityType?: Activity['entity_type'];
  resultEntityId?: string;
  activity?: CreateActivityEventInput;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizePhone = (value: string | undefined): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
};

const isTruthyFlag = (value: unknown): boolean =>
  value === true || value === 'true' || value === 'on' || value === '1' || value === 1;

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
  private readonly siteSettings: WebsiteSiteSettingsService;

  constructor(private readonly pool: Pool) {
    this.siteManagement = new SiteManagementService(pool);
    this.siteSettings = new WebsiteSiteSettingsService(pool);
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

  private async resolveReferralCaseTypeId(site: PublishedSite): Promise<string> {
    const preferred = await this.pool.query<{ id: string }>(
      `SELECT id
       FROM case_types
       WHERE is_active = true
         AND requires_intake = true
       ORDER BY sort_order ASC, created_at ASC
       LIMIT 1`
    );

    if (preferred.rows[0]?.id) {
      return preferred.rows[0].id;
    }

    const fallback = await this.pool.query<{ id: string }>(
      `SELECT id
       FROM case_types
       WHERE is_active = true
       ORDER BY sort_order ASC, created_at ASC
       LIMIT 1`
    );

    if (fallback.rows[0]?.id) {
      return fallback.rows[0].id;
    }

    throw new Error(`No active case type is available for ${site.name} referrals`);
  }

  private requireSupportedFormType(component: PublishedComponent): SupportedPublicWebsiteFormType {
    if (
      component.type === 'contact-form' ||
      component.type === 'newsletter-signup' ||
      component.type === 'volunteer-interest-form' ||
      component.type === 'referral-form' ||
      component.type === 'donation-form'
    ) {
      return component.type;
    }

    throw new Error('Unsupported website form type');
  }

  private buildAuditMetadata(
    context: PublicWebsiteFormRequestContext,
    extra: Record<string, unknown> = {}
  ): Record<string, unknown> {
    return {
      pagePath: context.pagePath || '/',
      visitorId: context.visitorId || null,
      sessionId: context.sessionId || null,
      referrer: context.referrer || null,
      ...extra,
    };
  }

  private async handleContactForm(
    site: PublishedSite,
    component: PublishedComponent,
    identity: ContactIdentity
  ): Promise<PublicWebsiteFormSubmissionOutcome> {
    const defaultTags = appendUniqueTags(
      (component.defaultTags as string[] | undefined) || [],
      component.formMode === 'supporter' ? ['supporter'] : []
    );
    const { contactId, created } = await this.ensureContact(site, identity, defaultTags);

    return {
      result: {
        formType: component.type,
        message:
          (component.successMessage as string | undefined) ||
          'Your message has been recorded.',
        contactId,
      },
      resultEntityType: 'contact',
      resultEntityId: contactId,
      activity: {
        organizationId: site.organizationId,
        siteId: site.id,
        type: 'public_form_submission',
        title: 'Public contact form submitted',
        description: `${identity.firstName} ${identity.lastName}`.trim(),
        userName: identity.email || identity.phone || `${identity.firstName} ${identity.lastName}`.trim(),
        entityType: 'contact',
        entityId: contactId,
        metadata: {
          created,
          formType: component.type,
          tags: defaultTags,
        },
      },
    };
  }

  private async handleNewsletterSignup(
    site: PublishedSite,
    component: PublishedComponent,
    identity: ContactIdentity
  ): Promise<PublicWebsiteFormSubmissionOutcome> {
    const defaultTags = appendUniqueTags((component.defaultTags as string[] | undefined) || [], [
      'newsletter',
    ]);
    const { contactId, created } = await this.ensureContact(site, identity, defaultTags);
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
      result: {
        formType: component.type,
        message:
          (component.successMessage as string | undefined) ||
          'You have been added to the newsletter list.',
        contactId,
        mailchimpSynced,
      },
      resultEntityType: 'contact',
      resultEntityId: contactId,
      activity: {
        organizationId: site.organizationId,
        siteId: site.id,
        type: 'newsletter_signup',
        title: 'Public newsletter signup',
        description: `${identity.firstName} ${identity.lastName}`.trim(),
        userName: identity.email || `${identity.firstName} ${identity.lastName}`.trim(),
        entityType: 'contact',
        entityId: contactId,
        metadata: {
          created,
          formType: component.type,
          mailchimpSynced,
        },
      },
    };
  }

  private async handleVolunteerInterest(
    site: PublishedSite,
    component: PublishedComponent,
    identity: ContactIdentity,
    payload: Record<string, unknown>
  ): Promise<PublicWebsiteFormSubmissionOutcome> {
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

    const volunteerRecord =
      volunteer.rows[0] ||
      (await services.volunteer.createVolunteer(
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
      ));

    const volunteerId =
      volunteer.rows[0]?.volunteer_id ||
      ('id' in volunteerRecord && typeof volunteerRecord.id === 'string'
        ? volunteerRecord.id
        : undefined);

    return {
      result: {
        formType: component.type,
        message:
          (component.successMessage as string | undefined) ||
          'Volunteer interest has been recorded.',
        contactId,
      },
      resultEntityType: volunteerId ? 'volunteer' : 'contact',
      resultEntityId: volunteerId || contactId,
      activity: {
        organizationId: site.organizationId,
        siteId: site.id,
        type: 'volunteer_interest_submitted',
        title: 'Volunteer interest submitted',
        description: `${identity.firstName} ${identity.lastName}`.trim(),
        userName: identity.email || `${identity.firstName} ${identity.lastName}`.trim(),
        entityType: volunteerId ? 'volunteer' : 'contact',
        entityId: volunteerId || contactId,
        relatedEntityType: volunteerId ? 'contact' : undefined,
        relatedEntityId: volunteerId ? contactId : undefined,
        metadata: {
          availability:
            typeof payload.availability === 'string' ? payload.availability : undefined,
          skills: Array.isArray(payload.skills)
            ? payload.skills.filter((value): value is string => typeof value === 'string')
            : [],
        },
      },
    };
  }

  private async handleReferralForm(
    site: PublishedSite,
    component: PublishedComponent,
    identity: ContactIdentity,
    payload: Record<string, unknown>
  ): Promise<PublicWebsiteFormSubmissionOutcome> {
    const defaultTags = appendUniqueTags((component.defaultTags as string[] | undefined) || [], [
      'referral',
      'intake',
    ]);
    const { contactId } = await this.ensureContact(site, identity, defaultTags);
    const caseTypeId = await this.resolveReferralCaseTypeId(site);
    const referralSource =
      typeof payload.referral_source === 'string' && payload.referral_source.trim().length > 0
        ? payload.referral_source.trim()
        : typeof payload.source === 'string' && payload.source.trim().length > 0
          ? payload.source.trim()
          : undefined;
    const title =
      typeof payload.subject === 'string' && payload.subject.trim().length > 0
        ? payload.subject.trim()
        : `Referral intake for ${identity.firstName} ${identity.lastName}`.trim();
    const description =
      identity.message ||
      (typeof payload.description === 'string' ? payload.description.trim() : undefined) ||
      undefined;
    const caseRecord = await services.case.createCase(
      {
        contact_id: contactId,
        account_id: (component.accountId as string | undefined) || site.organizationId || undefined,
        case_type_id: caseTypeId,
        title,
        description,
        priority:
          typeof payload.priority === 'string' &&
          ['low', 'medium', 'high', 'urgent', 'critical'].includes(payload.priority)
            ? (payload.priority as 'low' | 'medium' | 'high' | 'urgent' | 'critical')
            : 'medium',
        source: 'referral',
        referral_source: referralSource,
        intake_data: {
          ...payload,
          referral_source: referralSource,
          submitted_at: new Date().toISOString(),
        },
        custom_data: {
          publicFormType: component.type,
          siteId: site.id,
        },
        tags: defaultTags,
        is_urgent:
          isTruthyFlag(payload.urgent) ||
          isTruthyFlag(payload.is_urgent) ||
          (typeof payload.priority === 'string' && payload.priority === 'urgent'),
        client_viewable: false,
      },
      site.ownerUserId || site.userId
    );

    return {
      result: {
        formType: component.type,
        message:
          (component.successMessage as string | undefined) ||
          'Your referral has been recorded. Our team will follow up soon.',
        contactId,
        caseId: caseRecord.id,
      },
      resultEntityType: 'case',
      resultEntityId: caseRecord.id,
      activity: {
        organizationId: site.organizationId,
        siteId: site.id,
        type: 'public_form_submission',
        title: 'Public referral submitted',
        description: `${identity.firstName} ${identity.lastName}`.trim(),
        userName: identity.email || identity.phone || `${identity.firstName} ${identity.lastName}`.trim(),
        entityType: 'case',
        entityId: caseRecord.id,
        relatedEntityType: 'contact',
        relatedEntityId: contactId,
        metadata: {
          formType: component.type,
          tags: defaultTags,
          referralSource,
        },
      },
    };
  }

  private async handleDonationForm(
    site: PublishedSite,
    component: PublishedComponent,
    identity: ContactIdentity,
    payload: Record<string, unknown>,
    formKey: string,
    context: PublicWebsiteFormRequestContext
  ): Promise<PublicWebsiteFormSubmissionOutcome> {
    const amountValue =
      typeof payload.amount === 'number'
        ? payload.amount
        : typeof payload.amount === 'string'
          ? Number.parseFloat(payload.amount)
          : 0;

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      throw new Error('Donation amount is required');
    }

    const currency =
      typeof component.currency === 'string' && component.currency.trim().length > 0
        ? component.currency.trim().toUpperCase()
        : 'CAD';
    const recurringDefault =
      isTruthyFlag(payload.recurring) ||
      (payload.recurring === undefined && component.recurringDefault === true);
    const normalizedAmount = Number(amountValue.toFixed(2));
    const campaignName =
      typeof component.campaignId === 'string' ? component.campaignId : undefined;

    if (recurringDefault) {
      if (!identity.email) {
        throw new Error('Email is required for monthly donations');
      }

      if (!stripeService.isStripeConfigured()) {
        throw new Error('Monthly donations require Stripe to be configured');
      }

      const { contactId } = await this.ensureContact(site, identity, ['donor']);

      const checkoutPlan = await services.recurringDonation.createPublicCheckoutPlan({
        organizationId: site.organizationId,
        accountId:
          (component.accountId as string | undefined) || site.organizationId || undefined,
        contactId,
        siteId: site.id,
        formKey,
        donorEmail: identity.email,
        donorName: `${identity.firstName} ${identity.lastName}`.trim(),
        donorPhone: identity.phone,
        amount: normalizedAmount,
        currency,
        campaignName,
        designation: typeof payload.designation === 'string' ? payload.designation : undefined,
        notes: identity.message,
        userId: site.ownerUserId || site.userId,
        pagePath: context.pagePath || null,
        visitorId: context.visitorId || null,
        sessionId: context.sessionId || null,
        referrer: context.referrer || null,
        userAgent: context.userAgent || null,
      });

      return {
        result: {
          formType: component.type,
          message: 'Redirecting you to secure checkout...',
          contactId,
          recurringPlanId: checkoutPlan.plan.recurring_plan_id,
          recurringPlanStatus: checkoutPlan.plan.status,
          redirectUrl: checkoutPlan.redirect_url,
          returnUrl: checkoutPlan.return_url,
        },
        resultEntityType: 'contact',
        resultEntityId: contactId,
        activity: {
          organizationId: site.organizationId,
          siteId: site.id,
          type: 'public_form_submission',
          title: 'Recurring donation checkout started',
          description: `${identity.firstName} ${identity.lastName}`.trim(),
          userName: identity.email || `${identity.firstName} ${identity.lastName}`.trim(),
          entityType: 'contact',
          entityId: contactId,
          metadata: {
            amount: normalizedAmount,
            currency,
            recurring: true,
            recurringPlanId: checkoutPlan.plan.recurring_plan_id,
            status: checkoutPlan.plan.status,
          },
        },
      };
    }

    const { contactId } = await this.ensureContact(site, identity, ['donor']);

    const donation = await services.donation.createDonation(
      {
        account_id: (component.accountId as string | undefined) || site.organizationId || undefined,
        contact_id: contactId,
        amount: normalizedAmount,
        currency,
        donation_date: new Date().toISOString(),
        payment_method: 'credit_card',
        payment_status: 'pending',
        notes: identity.message,
        campaign_name: campaignName,
        is_recurring: recurringDefault,
        recurring_frequency: recurringDefault ? 'monthly' : 'one_time',
      },
      site.ownerUserId || site.userId
    );

    let paymentIntent: PublicWebsiteFormResult['paymentIntent'];
    if (identity.email && stripeService.isStripeConfigured()) {
      paymentIntent = await stripeService.createPaymentIntent({
        amount: Math.round(amountValue * 100),
        currency: currency.toLowerCase(),
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
      result: {
        formType: component.type,
        message:
          (component.successMessage as string | undefined) ||
          'Your donation has been recorded.',
        contactId,
        donationId: donation.donation_id,
        paymentIntent,
      },
      resultEntityType: 'donation',
      resultEntityId: donation.donation_id,
      activity: {
        organizationId: site.organizationId,
        siteId: site.id,
        type: 'public_donation_submitted',
        title: 'Public donation submitted',
        description: `${identity.firstName} ${identity.lastName}`.trim(),
        userName: identity.email || `${identity.firstName} ${identity.lastName}`.trim(),
        entityType: 'donation',
        entityId: donation.donation_id,
        relatedEntityType: 'contact',
        relatedEntityId: contactId,
        metadata: {
          amount: Number(amountValue.toFixed(2)),
          currency,
          recurring: recurringDefault,
        },
      },
    };
  }

  async submitForm(
    site: PublishedSite,
    formKey: string,
    payload: Record<string, unknown>,
    context: PublicWebsiteFormRequestContext = {}
  ): Promise<PublicWebsiteFormResult> {
    if (!site.publishedContent) {
      throw new Error('Published site content is unavailable');
    }

    const sourceComponent = this.findComponentById(site, formKey);
    if (!sourceComponent) {
      throw new Error('Website form not found');
    }
    const settings = await this.siteSettings.getPublicSettings(site.id);
    const component = mergeManagedComponentConfig(sourceComponent, settings);
    const formType = this.requireSupportedFormType(component);

    const identity = toIdentity(payload);

    let submissionId: string | null = null;

    try {
      const submission = await publicSubmissionService.beginSubmission({
        organizationId: site.organizationId,
        siteId: site.id,
        submissionType: formType,
        formKey,
        idempotencyKey: context.idempotencyKey,
        payload,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        auditMetadata: this.buildAuditMetadata(context, {
          formType,
          status: 'received',
        }),
      });

      if (submission.replayedResponse) {
        return {
          ...(submission.replayedResponse as unknown as PublicWebsiteFormResult),
          idempotentReplay: true,
        };
      }

      submissionId = submission.submissionId;

      const submitters: Record<
        SupportedPublicWebsiteFormType,
        () => Promise<PublicWebsiteFormSubmissionOutcome>
      > = {
        'contact-form': () => this.handleContactForm(site, component, identity),
        'newsletter-signup': () => this.handleNewsletterSignup(site, component, identity),
        'volunteer-interest-form': () =>
          this.handleVolunteerInterest(site, component, identity, payload),
        'referral-form': () => this.handleReferralForm(site, component, identity, payload),
        'donation-form': () =>
          this.handleDonationForm(site, component, identity, payload, formKey, context),
      };

      const outcome = await submitters[formType]();

      if (submissionId) {
        await publicSubmissionService.markAccepted({
          submissionId,
          responsePayload: outcome.result,
          resultEntityType: outcome.resultEntityType || null,
          resultEntityId: outcome.resultEntityId || null,
          auditMetadata: this.buildAuditMetadata(context, {
            formType,
            status: 'accepted',
            contactId: outcome.result.contactId || null,
            donationId: outcome.result.donationId || null,
            recurringPlanId: outcome.result.recurringPlanId || null,
          }),
        });
      }

      if (outcome.activity) {
        await activityEventService.recordEvent({
          ...outcome.activity,
          sourceTable: submissionId ? 'public_submissions' : null,
          sourceRecordId: submissionId || null,
        });
      }

      return outcome.result;
    } catch (error) {
      if (error instanceof PublicSubmissionReplayError) {
        throw error;
      }
      if (error instanceof PublicSubmissionConflictError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Public form submission failed';

      if (submissionId) {
        await publicSubmissionService.markRejected({
          submissionId,
          errorMessage: message,
          auditMetadata: this.buildAuditMetadata(context, {
            formType,
            status: 'rejected',
          }),
        }).catch(() => undefined);
      }

      throw error;
    }
  }

  async resolveSiteByKey(siteKey: string): Promise<PublishedSite | null> {
    const normalized = siteKey.trim().toLowerCase();

    if (UUID_PATTERN.test(normalized)) {
      const byId = await this.siteManagement.getPublicSiteByIdForPreview(normalized);
      if (byId) {
        return byId;
      }
    }

    const bySubdomain = await this.siteManagement.getSiteBySubdomainForPreview(normalized);
    if (bySubdomain) {
      return bySubdomain;
    }

    return this.siteManagement.getSiteByDomainForPreview(normalized);
  }
}

export const publicWebsiteFormService = new PublicWebsiteFormService(dbPool);
export default publicWebsiteFormService;
