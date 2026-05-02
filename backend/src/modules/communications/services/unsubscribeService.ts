import { createHash } from 'crypto';
import type { Pool } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import {
  ContactSuppressionService,
  contactSuppressionService,
} from '@modules/contacts/services/contactSuppressionService';
import { verifyLocalUnsubscribeToken } from './unsubscribeTokenService';

interface LocalUnsubscribeRecipientRow {
  id: string;
  campaign_run_id: string;
  contact_id: string | null;
  email: string;
}

interface SuppressionRecorder {
  recordSuppressionEvidence: ContactSuppressionService['recordSuppressionEvidence'];
}

export interface LocalUnsubscribeResult {
  accepted: true;
}

export const normalizeUnsubscribeEmail = (email: string): string => email.trim().toLowerCase();

export const hashUnsubscribeEmail = (email: string): string =>
  createHash('sha256').update(normalizeUnsubscribeEmail(email)).digest('hex');

export const buildLocalUnsubscribeProviderEventId = (
  runId: string,
  recipientId: string,
  emailHash: string
): string => `local-email-unsubscribe:${runId}:${recipientId}:${emailHash}`;

export class LocalUnsubscribeService {
  constructor(
    private readonly db: Pool = pool,
    private readonly suppressionRecorder: SuppressionRecorder = contactSuppressionService
  ) {}

  async recordFromToken(token: string): Promise<LocalUnsubscribeResult> {
    const payload = verifyLocalUnsubscribeToken(token);
    if (!payload) {
      return { accepted: true };
    }

    try {
      const result = await this.db.query<LocalUnsubscribeRecipientRow>(
        `SELECT crr.id,
                crr.campaign_run_id,
                crr.contact_id,
                crr.email
           FROM campaign_run_recipients crr
           INNER JOIN campaign_runs cr ON cr.id = crr.campaign_run_id
          WHERE crr.id = $1
            AND crr.campaign_run_id = $2
            AND cr.provider = 'local_email'`,
        [payload.recipientId, payload.runId]
      );
      const recipient = result.rows[0];
      if (!recipient?.contact_id) {
        return { accepted: true };
      }

      const normalizedEmail = normalizeUnsubscribeEmail(recipient.email);
      if (!normalizedEmail || hashUnsubscribeEmail(normalizedEmail) !== payload.emailHash) {
        return { accepted: true };
      }

      await this.suppressionRecorder.recordSuppressionEvidence({
        contactId: recipient.contact_id,
        channel: 'email',
        reason: 'unsubscribed',
        source: 'system',
        provider: 'local_email',
        providerEventId: buildLocalUnsubscribeProviderEventId(
          payload.runId,
          payload.recipientId,
          payload.emailHash
        ),
        providerEventType: 'unsubscribe',
        providerReason: 'one_click_unsubscribe',
        preserveDoNotEmail: true,
        evidence: {
          tokenVersion: payload.v,
          runId: payload.runId,
          recipientId: payload.recipientId,
          emailHash: payload.emailHash,
        },
      });
    } catch (error) {
      logger.warn('Local email unsubscribe token could not be recorded', { error });
    }

    return { accepted: true };
  }
}

export const localUnsubscribeService = new LocalUnsubscribeService();

export const recordLocalUnsubscribeFromToken = (token: string): Promise<LocalUnsubscribeResult> =>
  localUnsubscribeService.recordFromToken(token);
