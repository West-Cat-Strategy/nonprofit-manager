import crypto from 'crypto';
import type { Pool, QueryResultRow } from 'pg';
import pool from '@config/database';
import { hashData } from '@utils/encryption';

type SubmissionStatus = 'processing' | 'accepted' | 'rejected';
type SubmissionType =
  | 'contact-form'
  | 'newsletter-signup'
  | 'volunteer-interest-form'
  | 'donation-form';

interface PublicSubmissionRow extends QueryResultRow {
  id: string;
  site_id: string;
  submission_type: SubmissionType;
  form_key: string;
  idempotency_key: string | null;
  payload_hash: string;
  response_payload: Record<string, unknown> | string | null;
  status: SubmissionStatus;
  error_message: string | null;
}

export class PublicSubmissionConflictError extends Error {}
export class PublicSubmissionReplayError extends Error {
  constructor(
    message: string,
    public readonly idempotentReplay: boolean = false
  ) {
    super(message);
  }
}

export interface BeginPublicSubmissionInput {
  organizationId?: string | null;
  siteId: string;
  submissionType: SubmissionType;
  formKey: string;
  idempotencyKey?: string | null;
  payload: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  auditMetadata?: Record<string, unknown>;
}

export interface BeginPublicSubmissionResult {
  submissionId: string | null;
  replayedResponse?: Record<string, unknown>;
}

const stableSerialize = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    return `{${entries
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableSerialize(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(String(value));
};

const hashPayload = (payload: Record<string, unknown>): string =>
  crypto.createHash('sha256').update(stableSerialize(payload)).digest('hex');

const parseReplayPayload = (
  value: PublicSubmissionRow['response_payload']
): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
  return value;
};

export class PublicSubmissionService {
  constructor(private readonly db: Pool) {}

  async beginSubmission(input: BeginPublicSubmissionInput): Promise<BeginPublicSubmissionResult> {
    const payloadHash = hashPayload(input.payload);
    const trimmedKey = input.idempotencyKey?.trim() || null;

    if (trimmedKey) {
      const existing = await this.db.query<PublicSubmissionRow>(
        `SELECT id, site_id, submission_type, form_key, idempotency_key, payload_hash, response_payload, status, error_message
         FROM public_submissions
         WHERE site_id = $1
           AND submission_type = $2
           AND idempotency_key = $3
         LIMIT 1`,
        [input.siteId, input.submissionType, trimmedKey]
      );

      const row = existing.rows[0];
      if (row) {
        if (row.payload_hash !== payloadHash) {
          throw new PublicSubmissionConflictError(
            'Idempotency-Key has already been used with a different payload'
          );
        }

        if (row.status === 'accepted') {
          return {
            submissionId: null,
            replayedResponse: parseReplayPayload(row.response_payload),
          };
        }

        if (row.status === 'rejected') {
          throw new PublicSubmissionReplayError(
            row.error_message || 'This submission was already rejected',
            true
          );
        }

        throw new PublicSubmissionConflictError('A matching submission is already being processed');
      }
    }

    const created = await this.db.query<{ id: string }>(
      `INSERT INTO public_submissions (
         organization_id,
         site_id,
         submission_type,
         form_key,
         idempotency_key,
         payload_hash,
         request_payload,
         ip_hash,
         user_agent_hash,
         status,
         audit_metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, 'processing', $10::jsonb)
       RETURNING id`,
      [
        input.organizationId || null,
        input.siteId,
        input.submissionType,
        input.formKey,
        trimmedKey,
        payloadHash,
        JSON.stringify(input.payload),
        input.ipAddress ? hashData(input.ipAddress) : null,
        input.userAgent ? hashData(input.userAgent) : null,
        JSON.stringify(input.auditMetadata || {}),
      ]
    );

    return { submissionId: created.rows[0].id };
  }

  async markAccepted(input: {
    submissionId: string;
    responsePayload: Record<string, unknown>;
    resultEntityType?: string | null;
    resultEntityId?: string | null;
    auditMetadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.query(
      `UPDATE public_submissions
       SET status = 'accepted',
           response_payload = $2::jsonb,
           result_entity_type = $3,
           result_entity_id = $4::uuid,
           audit_metadata = COALESCE(audit_metadata, '{}'::jsonb) || $5::jsonb,
           processed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        input.submissionId,
        JSON.stringify(input.responsePayload),
        input.resultEntityType || null,
        input.resultEntityId || null,
        JSON.stringify(input.auditMetadata || {}),
      ]
    );
  }

  async markRejected(input: {
    submissionId: string;
    errorMessage: string;
    auditMetadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.query(
      `UPDATE public_submissions
       SET status = 'rejected',
           error_message = $2,
           audit_metadata = COALESCE(audit_metadata, '{}'::jsonb) || $3::jsonb,
           processed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        input.submissionId,
        input.errorMessage,
        JSON.stringify(input.auditMetadata || {}),
      ]
    );
  }
}

export const publicSubmissionService = new PublicSubmissionService(pool);
export default publicSubmissionService;
