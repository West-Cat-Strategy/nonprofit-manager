import pool from '@config/database';
import { logger } from '@config/logger';
import crypto from 'crypto';

export type PublicIntakeSourceSystem = 'website_form' | 'portal_signup' | 'public_event';
export type PublicIntakeAmbiguityState = 'none' | 'no_match' | 'single_match' | 'multiple_matches';
export type PublicIntakeResolutionStatus =
  | 'resolved'
  | 'created'
  | 'needs_contact_resolution'
  | 'failed';
export type PublicIntakeMatchPosture = 'strict' | 'fuzzy' | 'manual' | 'not_attempted';
export type PublicIntakeResolutionAction =
  | 'linked_existing_contact'
  | 'created_contact'
  | 'queued_contact_resolution'
  | 'failed';

export interface PublicIntakeBusinessError {
  code: string;
  message: string;
  field?: string | null;
  severity?: 'info' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
}

export interface RecordPublicIntakeResolutionInput {
  sourceSystem: PublicIntakeSourceSystem;
  sourceReference?: string | null;
  collectionMethod?: string | null;
  collectionAt?: Date;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  accountId?: string | null;
  organizationId?: string | null;
  matchedContactId?: string | null;
  ambiguityState?: PublicIntakeAmbiguityState;
  resolutionStatus: PublicIntakeResolutionStatus;
  matchPosture?: PublicIntakeMatchPosture;
  resolutionAction?: PublicIntakeResolutionAction;
  businessErrors?: PublicIntakeBusinessError[];
  auditTrail?: unknown[];
  createdBy?: string | null;
}

interface PublicIntakeResolutionRow {
  id: string;
}

const hashSourceReference = (sourceReference?: string | null): string | null => {
  if (!sourceReference) {
    return null;
  }
  return crypto.createHash('sha256').update(sourceReference).digest('hex');
};

const deriveResolutionAction = (
  resolutionStatus: PublicIntakeResolutionStatus
): PublicIntakeResolutionAction => {
  switch (resolutionStatus) {
    case 'resolved':
      return 'linked_existing_contact';
    case 'created':
      return 'created_contact';
    case 'needs_contact_resolution':
      return 'queued_contact_resolution';
    case 'failed':
      return 'failed';
  }
};

const buildAuditTrail = (input: RecordPublicIntakeResolutionInput): unknown[] => {
  const auditTrail = Array.isArray(input.auditTrail) ? [...input.auditTrail] : [];
  const businessErrors = input.businessErrors ?? [];

  auditTrail.push({
    event: 'public_intake_resolution_contract',
    match_posture: input.matchPosture ?? 'not_attempted',
    resolution_action: input.resolutionAction ?? deriveResolutionAction(input.resolutionStatus),
    business_errors: businessErrors.map((error) => ({
      code: error.code,
      message: error.message,
      field: error.field ?? null,
      severity: error.severity ?? 'error',
      metadata: error.metadata ?? {},
    })),
  });

  return auditTrail;
};

export async function recordPublicIntakeResolution(
  input: RecordPublicIntakeResolutionInput
): Promise<string> {
  const result = await pool.query<PublicIntakeResolutionRow>(
    `INSERT INTO public_intake_resolutions (
       source_system,
       source_reference,
       collection_method,
       collection_at,
       first_name,
       last_name,
       email,
       phone,
       account_id,
       organization_id,
       matched_contact_id,
       ambiguity_state,
       resolution_status,
       audit_trail,
       created_by
     )
     VALUES ($1, $2, $3, COALESCE($4, CURRENT_TIMESTAMP), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING id`,
    [
      input.sourceSystem,
      input.sourceReference ?? null,
      input.collectionMethod ?? null,
      input.collectionAt ?? null,
      input.firstName ?? null,
      input.lastName ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.accountId ?? input.organizationId ?? null,
      input.organizationId ?? input.accountId ?? null,
      input.matchedContactId ?? null,
      input.ambiguityState ?? 'none',
      input.resolutionStatus,
      JSON.stringify(buildAuditTrail(input)),
      input.createdBy ?? null,
    ]
  );

  return result.rows[0].id;
}

export async function recordPublicIntakeResolutionBestEffort(
  input: RecordPublicIntakeResolutionInput
): Promise<string | null> {
  try {
    return await recordPublicIntakeResolution(input);
  } catch (error) {
    logger.error('Failed to record public intake resolution audit', {
      error,
      sourceSystem: input.sourceSystem,
      sourceReferenceHash: hashSourceReference(input.sourceReference),
      matchedContactId: input.matchedContactId,
      resolutionStatus: input.resolutionStatus,
      matchPosture: input.matchPosture,
      resolutionAction: input.resolutionAction,
    });
    return null;
  }
}

export const publicIntakeResolutionService = {
  recordPublicIntakeResolution,
  recordPublicIntakeResolutionBestEffort,
};

export default publicIntakeResolutionService;
