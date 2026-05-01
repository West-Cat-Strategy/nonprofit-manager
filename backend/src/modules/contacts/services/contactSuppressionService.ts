import type { Pool } from 'pg';
import pool from '@config/database';
import type {
  CommunicationFatiguePolicy,
  ContactSuppressionEvidence,
  ContactSuppressionEvidenceResult,
  ContactSuppressionReason,
  CreateContactSuppressionEvidenceDTO,
  UpdateContactSuppressionEvidenceDTO,
} from '@app-types/contact';

interface ContactAccountRow {
  id: string;
  account_id: string | null;
}

interface ContactSuppressionEvidenceRow {
  id: string;
  contact_id: string;
  account_id: string | null;
  channel: ContactSuppressionEvidence['channel'];
  reason: ContactSuppressionReason;
  source: ContactSuppressionEvidence['source'];
  source_label: string | null;
  provider: string | null;
  provider_list_id: string | null;
  provider_event_id: string | null;
  provider_event_type: string | null;
  provider_reason: string | null;
  evidence: Record<string, unknown>;
  notes: string | null;
  is_active: boolean;
  starts_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  resolved_at: Date | null;
  resolved_by: string | null;
  resolved_note: string | null;
}

interface CommunicationFatiguePolicyRow {
  id: string;
  account_id: string | null;
  channel: CommunicationFatiguePolicy['channel'];
  max_messages: number;
  window_days: number;
  enforcement: CommunicationFatiguePolicy['enforcement'];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

interface ProviderSuppressionEvidenceRequest {
  contactId: string;
  channel: 'email';
  reason: 'mailchimp_unsubscribe' | 'mailchimp_cleaned';
  source: 'mailchimp_webhook';
  provider: 'mailchimp';
  providerListId?: string | null;
  providerEventId?: string | null;
  providerEventType: 'unsubscribe' | 'cleaned';
  providerReason?: string | null;
  preserveDoNotEmail: true;
  evidence: Record<string, unknown>;
}

interface StaffSuppressionRequest {
  channel: ContactSuppressionEvidence['channel'];
  reason?: ContactSuppressionReason;
  evidence_summary?: string | null;
  source_reference?: string | null;
  starts_at?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown>;
}

export class ContactSuppressionService {
  constructor(private readonly db: Pool = pool) {}

  async list(contactId: string): Promise<ContactSuppressionEvidenceResult | null> {
    const contact = await this.getContactAccount(contactId);
    if (!contact) {
      return null;
    }

    const [suppressionResult, policy] = await Promise.all([
      this.db.query<ContactSuppressionEvidenceRow>(
        `SELECT id, contact_id, account_id, channel, reason, source, source_label,
                provider, provider_list_id, provider_event_id, provider_event_type,
                provider_reason, evidence, notes, is_active, starts_at, expires_at,
                created_at, updated_at, created_by, resolved_at, resolved_by, resolved_note
         FROM contact_suppression_evidence
         WHERE contact_id = $1
         ORDER BY is_active DESC, updated_at DESC`,
        [contact.id]
      ),
      this.getFatiguePolicy(contact.account_id, 'email'),
    ]);

    return {
      items: suppressionResult.rows.map(this.mapSuppressionEvidence),
      total: suppressionResult.rows.length,
      fatiguePolicy: policy,
    };
  }

  async create(
    contactId: string,
    payload: CreateContactSuppressionEvidenceDTO,
    userId?: string | null
  ): Promise<ContactSuppressionEvidence | null> {
    const contact = await this.getContactAccount(contactId);
    if (!contact) {
      return null;
    }

    const result = await this.db.query<ContactSuppressionEvidenceRow>(
      `INSERT INTO contact_suppression_evidence (
         contact_id, account_id, channel, reason, source, source_label,
         evidence, notes, starts_at, expires_at, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, contact_id, account_id, channel, reason, source, source_label,
                 provider, provider_list_id, provider_event_id, provider_event_type,
                 provider_reason, evidence, notes, is_active, starts_at, expires_at,
                 created_at, updated_at, created_by, resolved_at, resolved_by, resolved_note`,
      [
        contact.id,
        contact.account_id,
        payload.channel,
        payload.reason,
        payload.source,
        'Staff do-not-contact',
        JSON.stringify({ note: payload.evidence }),
        payload.notes ?? null,
        payload.starts_at ?? null,
        payload.expires_at ?? null,
        userId ?? null,
      ]
    );

    await this.syncContactSuppressionFlags(contact.id);
    return this.mapSuppressionEvidence(result.rows[0]);
  }

  async upsertStaffSuppression(
    contactId: string,
    payload: StaffSuppressionRequest,
    userId?: string | null
  ): Promise<ContactSuppressionEvidence | null> {
    return this.create(
      contactId,
      {
        channel: payload.channel,
        reason: payload.reason ?? 'staff_dnc',
        source: 'staff',
        evidence: payload.evidence_summary || payload.source_reference || 'Staff do-not-contact request',
        notes: payload.source_reference ?? null,
        starts_at: payload.starts_at ?? null,
        expires_at: payload.expires_at ?? null,
      },
      userId
    );
  }

  async update(
    contactId: string,
    suppressionId: string,
    payload: UpdateContactSuppressionEvidenceDTO,
    userId?: string | null
  ): Promise<ContactSuppressionEvidence | null> {
    const contact = await this.getContactAccount(contactId);
    if (!contact) {
      return null;
    }

    const result = await this.db.query<ContactSuppressionEvidenceRow>(
      `UPDATE contact_suppression_evidence
       SET is_active = COALESCE($3, is_active),
           resolved_at = CASE WHEN $3 = false THEN CURRENT_TIMESTAMP ELSE resolved_at END,
           resolved_by = CASE WHEN $3 = false THEN $4 ELSE resolved_by END,
           resolved_note = CASE WHEN $3 = false THEN $5 ELSE resolved_note END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND contact_id = $2
       RETURNING id, contact_id, account_id, channel, reason, source, source_label,
                 provider, provider_list_id, provider_event_id, provider_event_type,
                 provider_reason, evidence, notes, is_active, starts_at, expires_at,
                 created_at, updated_at, created_by, resolved_at, resolved_by, resolved_note`,
      [
        suppressionId,
        contact.id,
        payload.is_active ?? null,
        userId ?? null,
        payload.resolved_note ?? null,
      ]
    );

    if (!result.rows[0]) {
      return null;
    }

    await this.syncContactSuppressionFlags(contact.id);
    return this.mapSuppressionEvidence(result.rows[0]);
  }

  async recordSuppressionEvidence(
    request: ProviderSuppressionEvidenceRequest
  ): Promise<ContactSuppressionEvidence | null> {
    const contact = await this.getContactAccount(request.contactId);
    if (!contact) {
      return null;
    }

    const result = await this.db.query<ContactSuppressionEvidenceRow>(
      `INSERT INTO contact_suppression_evidence (
         contact_id, account_id, channel, reason, source, source_label,
         provider, provider_list_id, provider_event_id, provider_event_type,
         provider_reason, evidence, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $11)
       ON CONFLICT (provider, provider_event_id, contact_id, channel, reason)
       WHERE provider_event_id IS NOT NULL
       DO UPDATE SET
         evidence = EXCLUDED.evidence,
         provider_reason = EXCLUDED.provider_reason,
         is_active = true,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, contact_id, account_id, channel, reason, source, source_label,
                 provider, provider_list_id, provider_event_id, provider_event_type,
                 provider_reason, evidence, notes, is_active, starts_at, expires_at,
                 created_at, updated_at, created_by, resolved_at, resolved_by, resolved_note`,
      [
        contact.id,
        contact.account_id,
        request.channel,
        request.reason,
        request.source,
        'Mailchimp webhook',
        request.provider,
        request.providerListId ?? null,
        request.providerEventId ?? null,
        request.providerEventType,
        request.providerReason ?? null,
        JSON.stringify(request.evidence),
      ]
    );

    if (request.preserveDoNotEmail) {
      await this.syncContactSuppressionFlags(contact.id);
    }

    return this.mapSuppressionEvidence(result.rows[0]);
  }

  private async getContactAccount(contactId: string): Promise<ContactAccountRow | null> {
    const result = await this.db.query<ContactAccountRow>(
      `SELECT id, account_id
       FROM contacts
       WHERE id = $1`,
      [contactId]
    );
    return result.rows[0] ?? null;
  }

  private async getFatiguePolicy(
    accountId: string | null,
    channel: CommunicationFatiguePolicy['channel']
  ): Promise<CommunicationFatiguePolicy | null> {
    const result = await this.db.query<CommunicationFatiguePolicyRow>(
      `SELECT id, account_id, channel, max_messages, window_days, enforcement,
              is_active, created_at, updated_at, created_by, updated_by
       FROM communication_fatigue_policies
       WHERE is_active = true
         AND channel = $1
         AND (
           ($2::uuid IS NULL AND account_id IS NULL)
           OR account_id = $2::uuid
         )
       ORDER BY account_id NULLS LAST
       LIMIT 1`,
      [channel, accountId]
    );
    return result.rows[0] ? this.mapFatiguePolicy(result.rows[0]) : null;
  }

  private async syncContactSuppressionFlags(contactId: string): Promise<void> {
    await this.db.query(
      `UPDATE contacts
       SET do_not_email = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND EXISTS (
           SELECT 1
           FROM contact_suppression_evidence cse
           WHERE cse.contact_id = contacts.id
             AND cse.is_active = true
             AND cse.channel IN ('email', 'all')
             AND (cse.starts_at IS NULL OR cse.starts_at <= CURRENT_TIMESTAMP)
             AND (cse.expires_at IS NULL OR cse.expires_at > CURRENT_TIMESTAMP)
         )`,
      [contactId]
    );
  }

  private mapSuppressionEvidence(row: ContactSuppressionEvidenceRow): ContactSuppressionEvidence {
    return {
      id: row.id,
      contact_id: row.contact_id,
      account_id: row.account_id,
      channel: row.channel,
      reason: row.reason,
      source: row.source,
      source_label: row.source_label,
      provider: row.provider,
      provider_list_id: row.provider_list_id,
      provider_event_id: row.provider_event_id,
      provider_event_type: row.provider_event_type,
      provider_reason: row.provider_reason,
      evidence: row.evidence ?? {},
      notes: row.notes,
      is_active: row.is_active,
      starts_at: row.starts_at,
      expires_at: row.expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      resolved_at: row.resolved_at,
      resolved_by: row.resolved_by,
      resolved_note: row.resolved_note,
    };
  }

  private mapFatiguePolicy(row: CommunicationFatiguePolicyRow): CommunicationFatiguePolicy {
    return {
      id: row.id,
      account_id: row.account_id,
      channel: row.channel,
      max_messages: Number(row.max_messages),
      window_days: Number(row.window_days),
      enforcement: row.enforcement,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    };
  }
}

export const contactSuppressionService = new ContactSuppressionService();

export const recordContactSuppressionEvidence = (
  request: ProviderSuppressionEvidenceRequest
): Promise<ContactSuppressionEvidence | null> =>
  contactSuppressionService.recordSuppressionEvidence(request);
