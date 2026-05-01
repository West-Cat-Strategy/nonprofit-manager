import type { Pool, PoolClient } from 'pg';
import { createCaseNoteQuery } from '../queries/notesQueries';
import { requireCaseOwnership } from '../queries/shared';
import { hashData } from '@utils/encryption';
import type { CaseFormAssignment } from '@app-types/caseForms';
import type {
  CaseFormAssignmentRecord,
  CaseFormsRepository,
} from '../repositories/caseFormsRepository';
import type {
  AssignmentDetailResult,
  ScopedPortalActor,
  ScopedPublicActor,
} from './caseForms.usecase.shared';
import { includesEmailDelivery, includesPortalDelivery } from './caseForms.usecase.shared';

export const getCaseAssignment = async (
  repository: CaseFormsRepository,
  db: Pool | PoolClient,
  caseId: string,
  assignmentId: string,
  organizationId?: string
): Promise<CaseFormAssignmentRecord> => {
  await requireCaseOwnership(db, caseId, organizationId);
  const assignment = await repository.getAssignmentById(assignmentId);
  if (!assignment || assignment.case_id !== caseId) {
    throw Object.assign(new Error('Form assignment not found'), { statusCode: 404, code: 'not_found' });
  }
  return assignment;
};

export const getPortalAssignment = async (
  repository: CaseFormsRepository,
  input: ScopedPortalActor,
  assignmentId: string
): Promise<CaseFormAssignmentRecord> => {
  const assignment = await repository.getAssignmentById(assignmentId);
  if (
    !assignment
    || assignment.contact_id !== input.contactId
    || assignment.client_viewable !== true
    || assignment.status === 'draft'
    || !includesPortalDelivery(assignment.delivery_target)
  ) {
    throw Object.assign(new Error('Form assignment not found'), { statusCode: 404, code: 'not_found' });
  }
  return assignment;
};

export const getPublicAccess = async (
  repository: CaseFormsRepository,
  rawToken: string
): Promise<ScopedPublicActor> => {
  const tokenHash = hashData(rawToken);
  const token = await repository.getAccessTokenByHash(tokenHash);
  if (!token) {
    throw Object.assign(new Error('Form access link not found'), { statusCode: 404, code: 'not_found' });
  }

  if (token.assignment.client_viewable !== true) {
    throw Object.assign(new Error('Form access link not found'), { statusCode: 404, code: 'not_found' });
  }

  if (token.assignment.status === 'draft' || !includesEmailDelivery(token.assignment.delivery_target)) {
    throw Object.assign(new Error('Form access link not found'), { statusCode: 404, code: 'not_found' });
  }

  if (token.revoked_at) {
    throw Object.assign(new Error('Form access link has been revoked'), { statusCode: 410, code: 'gone' });
  }

  const expiresAt = new Date(token.expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    await repository.withTransaction(async (client) => {
      await repository.updateAssignment(client, token.assignment.id, {
        status: 'expired',
      });
    });
    throw Object.assign(new Error('Form access link has expired'), { statusCode: 410, code: 'expired' });
  }

  return { token };
};

export const buildAssignmentDetail = async (
  repository: CaseFormsRepository,
  assignment: CaseFormAssignmentRecord,
  options: {
    responsePacketDownloadUrl?: string | null;
    buildAssetDownloadUrl?: ((assetId: string) => string) | null;
    includeEvidenceEvents?: boolean;
  } = {}
): Promise<AssignmentDetailResult> => {
  const submissions = await repository.listSubmissionsForAssignment(assignment.id);
  const assignmentAssets = await repository.listAssetsForAssignment(assignment.id);
  const evidenceEvents = options.includeEvidenceEvents
    ? await repository.listAssignmentEvents(assignment.id)
    : undefined;
  const assets = submissions.length
    ? await repository.listAssetsForSubmissionIds(submissions.map((submission) => submission.id))
    : [];
  const assetsBySubmission = new Map<
    string,
    Awaited<ReturnType<typeof repository.listAssetsForSubmissionIds>>[number][]
  >();

  for (const asset of assets) {
    if (!asset.submission_id) continue;
    const list = assetsBySubmission.get(asset.submission_id) || [];
    list.push(asset);
    assetsBySubmission.set(asset.submission_id, list);
  }

  const hydratedSubmissions = submissions.map((submission) => {
    const submissionAssets = assetsBySubmission.get(submission.id) || [];
    return {
      ...submission,
      asset_refs: submissionAssets
        .filter((asset) => asset.asset_kind === 'upload')
        .map((asset) => ({
          ...asset,
          download_url: options.buildAssetDownloadUrl ? options.buildAssetDownloadUrl(asset.id) : null,
        })),
      signature_refs: submissionAssets
        .filter((asset) => asset.asset_kind === 'signature')
        .map((asset) => ({
          ...asset,
          download_url: options.buildAssetDownloadUrl ? options.buildAssetDownloadUrl(asset.id) : null,
        })),
      response_packet_download_url:
        submission.response_packet_file_path && options.responsePacketDownloadUrl
          ? options.responsePacketDownloadUrl
          : null,
    };
  });

  const plainAssignment: CaseFormAssignment = {
    ...assignment,
    draft_assets: assignmentAssets
      .filter((asset) => !asset.submission_id)
      .map((asset) => ({
        ...asset,
        download_url: options.buildAssetDownloadUrl ? options.buildAssetDownloadUrl(asset.id) : null,
      })),
    latest_submission: hydratedSubmissions[0] || null,
  };

  return {
    assignment: plainAssignment,
    submissions: hydratedSubmissions,
    ...(evidenceEvents ? { evidence_events: evidenceEvents } : {}),
  };
};

export const createLifecycleNote = async (
  client: PoolClient,
  caseId: string,
  content: string,
  userId?: string | null
): Promise<void> => {
  await createCaseNoteQuery(
    client,
    {
      case_id: caseId,
      note_type: 'system',
      content,
      is_internal: true,
      visible_to_client: false,
    },
    userId || undefined
  );
};
