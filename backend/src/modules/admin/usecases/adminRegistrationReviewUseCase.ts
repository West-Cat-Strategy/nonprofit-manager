import jwt from 'jsonwebtoken';
import {
  ADMIN_PENDING_REGISTRATION_REVIEW_TOKEN_ISSUER,
  verifyTokenWithOptionalIssuer,
  type AdminPendingRegistrationReviewAction,
  type AdminPendingRegistrationReviewTokenPayload,
} from '@utils/sessionTokens';
import * as repo from '../repositories/pendingRegistrationRepository';
import { approvePendingRegistration } from './approveRegistrationUseCase';
import { rejectPendingRegistration } from './rejectRegistrationUseCase';

export class AdminRegistrationReviewError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'AdminRegistrationReviewError';
  }
}

interface AdminRegistrationReviewActor {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
}

export interface AdminRegistrationReviewPreview {
  action: AdminPendingRegistrationReviewAction;
  reviewer: AdminRegistrationReviewActor;
  pendingRegistration: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    createdAt: Date;
    status: repo.PendingStatus;
    reviewedAt: Date | null;
    rejectionReason: string | null;
    hasStagedPasskeys: boolean;
  };
  currentReview: {
    status: repo.PendingStatus;
    reviewedAt: Date | null;
    rejectionReason: string | null;
    reviewedBy?: AdminRegistrationReviewActor | null;
  };
  canConfirm: boolean;
}

export interface AdminRegistrationReviewConfirmResult {
  status: 'completed' | 'already_reviewed';
  action: AdminPendingRegistrationReviewAction;
  message: string;
  review: AdminRegistrationReviewPreview;
}

const REVIEW_TOKEN_TYPE = 'admin_pending_registration_review';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const reviewerDisplayName = (reviewer: repo.AdminRecipientRow): string =>
  [reviewer.first_name, reviewer.last_name].filter(Boolean).join(' ') || reviewer.email;

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);

const isReviewAction = (value: unknown): value is AdminPendingRegistrationReviewAction =>
  value === 'approve' || value === 'reject';

const mapResolvedReviewer = (
  pending: repo.PendingRegistrationReviewRow
): AdminRegistrationReviewActor | null => {
  if (!pending.reviewed_by || !pending.reviewed_by_email) {
    return null;
  }

  return {
    id: pending.reviewed_by,
    email: pending.reviewed_by_email,
    firstName: pending.reviewed_by_first_name,
    lastName: pending.reviewed_by_last_name,
    displayName:
      [pending.reviewed_by_first_name, pending.reviewed_by_last_name]
        .filter(Boolean)
        .join(' ') || pending.reviewed_by_email,
  };
};

const buildAlreadyReviewedMessage = (pending: repo.PendingRegistrationReviewRow): string => {
  const outcome = pending.status === 'approved' ? 'approved' : 'rejected';
  const resolvedReviewer = mapResolvedReviewer(pending);

  if (resolvedReviewer) {
    return `This registration request has already been ${outcome} by ${resolvedReviewer.displayName}.`;
  }

  return `This registration request has already been ${outcome}.`;
};

const mapPreview = (input: {
  action: AdminPendingRegistrationReviewAction;
  reviewer: repo.AdminRecipientRow;
  pending: repo.PendingRegistrationReviewRow;
}): AdminRegistrationReviewPreview => ({
  action: input.action,
  reviewer: {
    id: input.reviewer.id,
    email: input.reviewer.email,
    firstName: input.reviewer.first_name,
    lastName: input.reviewer.last_name,
    displayName: reviewerDisplayName(input.reviewer),
  },
  pendingRegistration: {
    id: input.pending.id,
    email: input.pending.email,
    firstName: input.pending.first_name,
    lastName: input.pending.last_name,
    createdAt: input.pending.created_at,
    status: input.pending.status,
    reviewedAt: input.pending.reviewed_at,
    rejectionReason: input.pending.rejection_reason,
    hasStagedPasskeys: Boolean(input.pending.has_staged_passkeys),
  },
  currentReview: {
    status: input.pending.status,
    reviewedAt: input.pending.reviewed_at,
    rejectionReason: input.pending.rejection_reason,
    reviewedBy: mapResolvedReviewer(input.pending),
  },
  canConfirm: input.pending.status === 'pending',
});

const parseReviewToken = (
  token: string
): AdminPendingRegistrationReviewTokenPayload => {
  try {
    const payload = verifyTokenWithOptionalIssuer<AdminPendingRegistrationReviewTokenPayload>(
      token,
      ADMIN_PENDING_REGISTRATION_REVIEW_TOKEN_ISSUER
    );

    if (
      payload.type !== REVIEW_TOKEN_TYPE ||
      !isUuid(payload.pendingRegistrationId) ||
      !isUuid(payload.adminUserId) ||
      !isReviewAction(payload.action)
    ) {
      throw new AdminRegistrationReviewError(
        'This review link is invalid.',
        'invalid_review_token',
        400
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof AdminRegistrationReviewError) {
      throw error;
    }

    if (error instanceof jwt.TokenExpiredError) {
      throw new AdminRegistrationReviewError(
        'This review link has expired.',
        'expired_review_token',
        410
      );
    }

    throw new AdminRegistrationReviewError(
      'This review link is invalid.',
      'invalid_review_token',
      400
    );
  }
};

const loadReviewContext = async (token: string) => {
  const payload = parseReviewToken(token);
  const reviewer = await repo.getActiveAdminRecipientById(payload.adminUserId);
  if (!reviewer) {
    throw new AdminRegistrationReviewError(
      'This review link is no longer active.',
      'reviewer_unavailable',
      403
    );
  }

  const pending = await repo.getPendingRegistrationReviewById(payload.pendingRegistrationId);
  if (!pending) {
    throw new AdminRegistrationReviewError(
      'Pending registration not found.',
      'pending_registration_not_found',
      404
    );
  }

  return { payload, reviewer, pending };
};

export async function previewAdminRegistrationReview(
  token: string
): Promise<AdminRegistrationReviewPreview> {
  const context = await loadReviewContext(token);
  return mapPreview({
    action: context.payload.action,
    reviewer: context.reviewer,
    pending: context.pending,
  });
}

export async function confirmAdminRegistrationReview(
  token: string
): Promise<AdminRegistrationReviewConfirmResult> {
  const context = await loadReviewContext(token);

  if (context.pending.status !== 'pending') {
    return {
      status: 'already_reviewed',
      action: context.payload.action,
      message: buildAlreadyReviewedMessage(context.pending),
      review: mapPreview({
        action: context.payload.action,
        reviewer: context.reviewer,
        pending: context.pending,
      }),
    };
  }

  try {
    if (context.payload.action === 'approve') {
      await approvePendingRegistration(context.pending.id, context.reviewer.id);
    } else {
      await rejectPendingRegistration(context.pending.id, context.reviewer.id);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('already been') || error.message.includes('already exists'))
    ) {
      const refreshed = await repo.getPendingRegistrationReviewById(context.pending.id);
      if (refreshed) {
        return {
          status: 'already_reviewed',
          action: context.payload.action,
          message: buildAlreadyReviewedMessage(refreshed),
          review: mapPreview({
            action: context.payload.action,
            reviewer: context.reviewer,
            pending: refreshed,
          }),
        };
      }
    }

    if (error instanceof Error && error.message.includes('not found')) {
      throw new AdminRegistrationReviewError(
        'Pending registration not found.',
        'pending_registration_not_found',
        404
      );
    }

    throw error;
  }

  const refreshed = await repo.getPendingRegistrationReviewById(context.pending.id);
  const pending = refreshed ?? context.pending;

  return {
    status: 'completed',
    action: context.payload.action,
    message:
      context.payload.action === 'approve'
        ? 'Registration approved successfully.'
        : 'Registration rejected successfully.',
    review: mapPreview({
      action: context.payload.action,
      reviewer: context.reviewer,
      pending,
    }),
  };
}
