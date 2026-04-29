import pool from '@config/database';
import type { Pool, PoolClient } from 'pg';
import type {
  CaseFormAsset,
  CaseFormDeliveryTarget,
  CaseFormDefault,
  CaseFormSchema,
  CaseFormSubmission,
} from '@app-types/caseForms';
import {
  createDefault,
  getDefaultById,
  listDefaultsByCaseType,
  listRecommendedDefaultsForCase,
  updateDefault,
} from './caseFormsRepository.defaults';
import {
  createAssignment,
  getAssignmentById,
  listAssignmentsForCase,
  listAssignmentsForPortal,
  markAssignmentAfterSubmission,
  markAssignmentSent,
  markAssignmentReviewDecision,
  markAssignmentViewed,
  saveDraft,
  updateAssignment,
} from './caseFormsRepository.assignments';
import {
  createAccessToken,
  createAsset,
  createCaseDocumentRecord,
  createContactDocumentRecord,
  createSubmission,
  getAccessTokenByHash,
  getNextSubmissionNumber,
  getSubmissionByClientSubmissionId,
  linkAssetsToSubmission,
  listAssetsForAssignment,
  listAssetsForSubmissionIds,
  listSubmissionsForAssignment,
  markAccessTokenUsed,
  markAccessTokenViewed,
  revokeAccessTokens,
  updateCaseJsonField,
  updateContactFields,
} from './caseFormsRepository.submissions';
import type { ReviewFollowUpRecord } from './caseFormsRepository.followUps';
import {
  cancelReviewFollowUp as cancelReviewFollowUpQuery,
  completeReviewFollowUp as completeReviewFollowUpQuery,
  createReviewFollowUp as createReviewFollowUpQuery,
  getReviewFollowUp as getReviewFollowUpQuery,
  updateScheduledReviewFollowUp as updateScheduledReviewFollowUpQuery,
} from './caseFormsRepository.followUps';
import type {
  CaseFormAccessTokenRecord,
  CaseFormAssignmentRecord,
  DbExecutor,
} from './caseFormsRepository.shared';

export type {
  CaseFormAccessTokenRecord,
  CaseFormAssignmentRecord,
} from './caseFormsRepository.shared';
export type { ReviewFollowUpRecord } from './caseFormsRepository.followUps';

export class CaseFormsRepository {
  constructor(private readonly db: Pool = pool) {}

  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listDefaultsByCaseType(caseTypeId: string, organizationId?: string): Promise<CaseFormDefault[]> {
    return listDefaultsByCaseType(this.db, caseTypeId, organizationId);
  }

  async getDefaultById(defaultId: string, organizationId?: string): Promise<CaseFormDefault | null> {
    return getDefaultById(this.db, defaultId, organizationId);
  }

  async createDefault(
    executor: DbExecutor,
    input: {
      caseTypeId: string;
      organizationId?: string | null;
      title: string;
      description?: string | null;
      schema: CaseFormSchema;
      isActive: boolean;
      userId?: string | null;
    }
  ): Promise<CaseFormDefault> {
    return createDefault(executor, input);
  }

  async updateDefault(
    executor: DbExecutor,
    defaultId: string,
    input: {
      title?: string;
      description?: string | null;
      schema?: CaseFormSchema;
      isActive?: boolean;
      userId?: string | null;
    }
  ): Promise<CaseFormDefault> {
    return updateDefault(executor, defaultId, input);
  }

  async listRecommendedDefaultsForCase(caseId: string, organizationId?: string): Promise<CaseFormDefault[]> {
    return listRecommendedDefaultsForCase(this.db, caseId, organizationId);
  }

  async listAssignmentsForCase(caseId: string, organizationId?: string): Promise<CaseFormAssignmentRecord[]> {
    return listAssignmentsForCase(this.db, caseId, organizationId);
  }

  async listAssignmentsForPortal(contactId: string, status?: string): Promise<CaseFormAssignmentRecord[]> {
    return listAssignmentsForPortal(this.db, contactId, status);
  }

  async getAssignmentById(assignmentId: string): Promise<CaseFormAssignmentRecord | null> {
    return getAssignmentById(this.db, assignmentId);
  }

  async createAssignment(
    executor: DbExecutor,
    input: {
      caseId: string;
      contactId: string;
      accountId?: string | null;
      caseTypeId?: string | null;
      sourceDefaultId?: string | null;
      sourceDefaultVersion?: number | null;
      title: string;
      description?: string | null;
      schema: CaseFormSchema;
      dueAt?: string | null;
      recipientEmail?: string | null;
      userId?: string | null;
    }
  ): Promise<CaseFormAssignmentRecord> {
    return createAssignment(executor, input);
  }

  async updateAssignment(
    executor: DbExecutor,
    assignmentId: string,
    input: {
      title?: string;
      description?: string | null;
      schema?: CaseFormSchema;
      dueAt?: string | null;
      recipientEmail?: string | null;
      status?: string;
      deliveryTarget?: CaseFormDeliveryTarget | null;
      reviewFollowUpId?: string | null;
      userId?: string | null;
    }
  ): Promise<CaseFormAssignmentRecord> {
    return updateAssignment(executor, assignmentId, input);
  }

  async saveDraft(
    executor: DbExecutor,
    assignmentId: string,
    answers: Record<string, unknown>,
    input: {
      status: string;
      userId?: string | null;
    }
  ): Promise<CaseFormAssignmentRecord> {
    return saveDraft(executor, assignmentId, answers, input);
  }

  async markAssignmentViewed(executor: DbExecutor, assignmentId: string): Promise<void> {
    return markAssignmentViewed(executor, assignmentId);
  }

  async markAssignmentAfterSubmission(
    executor: DbExecutor,
    assignmentId: string,
    answers: Record<string, unknown>,
    userId?: string | null
  ): Promise<void> {
    return markAssignmentAfterSubmission(executor, assignmentId, answers, userId);
  }

  async markAssignmentSent(executor: DbExecutor, assignmentId: string): Promise<void> {
    return markAssignmentSent(executor, assignmentId);
  }

  async markAssignmentReviewDecision(
    executor: DbExecutor,
    assignmentId: string,
    input: {
      status: 'revision_requested' | 'reviewed' | 'closed' | 'cancelled';
      notes?: string | null;
      userId?: string | null;
    }
  ): Promise<void> {
    return markAssignmentReviewDecision(executor, assignmentId, input);
  }

  async getSubmissionByClientSubmissionId(
    assignmentId: string,
    clientSubmissionId: string
  ): Promise<CaseFormSubmission | null> {
    return getSubmissionByClientSubmissionId(this.db, assignmentId, clientSubmissionId);
  }

  async listSubmissionsForAssignment(assignmentId: string): Promise<CaseFormSubmission[]> {
    return listSubmissionsForAssignment(this.db, assignmentId);
  }

  async getNextSubmissionNumber(executor: DbExecutor, assignmentId: string): Promise<number> {
    return getNextSubmissionNumber(executor, assignmentId);
  }

  async createSubmission(
    executor: DbExecutor,
    input: {
      assignmentId: string;
      caseId: string;
      contactId: string;
      submissionNumber: number;
      answers: Record<string, unknown>;
      mappingAudit: unknown[];
      clientSubmissionId?: string | null;
      actorType: 'staff' | 'portal' | 'public';
      submittedByUserId?: string | null;
      submittedByPortalUserId?: string | null;
      accessTokenId?: string | null;
      responsePacketFileName?: string | null;
      responsePacketFilePath?: string | null;
      responsePacketCaseDocumentId?: string | null;
      responsePacketContactDocumentId?: string | null;
    }
  ): Promise<CaseFormSubmission> {
    return createSubmission(executor, input);
  }

  async listAssetsForAssignment(assignmentId: string): Promise<CaseFormAsset[]> {
    return listAssetsForAssignment(this.db, assignmentId);
  }

  async listAssetsForSubmissionIds(submissionIds: string[]): Promise<CaseFormAsset[]> {
    return listAssetsForSubmissionIds(this.db, submissionIds);
  }

  async createAsset(
    executor: DbExecutor,
    input: {
      assignmentId: string;
      caseId: string;
      contactId: string;
      questionKey: string;
      assetKind: 'upload' | 'signature';
      fileName: string;
      originalName: string;
      filePath: string;
      fileSize: number;
      mimeType: string;
      actorType: 'staff' | 'portal' | 'public';
      userId?: string | null;
      portalUserId?: string | null;
    }
  ): Promise<CaseFormAsset> {
    return createAsset(executor, input);
  }

  async linkAssetsToSubmission(
    executor: DbExecutor,
    assetIds: string[],
    submissionId: string
  ): Promise<void> {
    return linkAssetsToSubmission(executor, assetIds, submissionId);
  }

  async createAccessToken(
    executor: DbExecutor,
    input: {
      assignmentId: string;
      caseId: string;
      contactId: string;
      recipientEmail?: string | null;
      tokenHash: string;
      expiresAt: string | Date;
      userId?: string | null;
    }
  ): Promise<string> {
    return createAccessToken(executor, input);
  }

  async revokeAccessTokens(executor: DbExecutor, assignmentId: string): Promise<void> {
    return revokeAccessTokens(executor, assignmentId);
  }

  async getAccessTokenByHash(tokenHash: string): Promise<CaseFormAccessTokenRecord | null> {
    return getAccessTokenByHash(this.db, tokenHash);
  }

  async markAccessTokenViewed(executor: DbExecutor, tokenId: string): Promise<void> {
    return markAccessTokenViewed(executor, tokenId);
  }

  async markAccessTokenUsed(
    executor: DbExecutor,
    tokenId: string,
    latestSubmissionId?: string | null
  ): Promise<void> {
    return markAccessTokenUsed(executor, tokenId, latestSubmissionId);
  }

  async getReviewFollowUp(
    executor: DbExecutor,
    organizationId: string,
    followUpId: string
  ): Promise<ReviewFollowUpRecord | null> {
    return getReviewFollowUpQuery(executor, organizationId, followUpId);
  }

  async createReviewFollowUp(
    executor: DbExecutor,
    input: {
      organizationId: string;
      caseId: string;
      title: string;
      description?: string | null;
      scheduledDate: string;
      assignedTo?: string | null;
      userId?: string | null;
    }
  ): Promise<string> {
    return createReviewFollowUpQuery(executor, input);
  }

  async updateScheduledReviewFollowUp(
    executor: DbExecutor,
    input: {
      organizationId: string;
      followUpId: string;
      title: string;
      description?: string | null;
      scheduledDate: string;
      assignedTo?: string | null;
      userId?: string | null;
    }
  ): Promise<boolean> {
    return updateScheduledReviewFollowUpQuery(executor, input);
  }

  async completeReviewFollowUp(
    executor: DbExecutor,
    input: {
      organizationId: string;
      followUpId: string;
      notes: string;
      userId?: string | null;
    }
  ): Promise<boolean> {
    return completeReviewFollowUpQuery(executor, input);
  }

  async cancelReviewFollowUp(
    executor: DbExecutor,
    input: {
      organizationId: string;
      followUpId: string;
      notes: string;
      userId?: string | null;
    }
  ): Promise<boolean> {
    return cancelReviewFollowUpQuery(executor, input);
  }

  async updateContactFields(
    executor: DbExecutor,
    contactId: string,
    patch: Record<string, unknown>
  ): Promise<void> {
    return updateContactFields(executor, contactId, patch);
  }

  async updateCaseJsonField(
    executor: DbExecutor,
    caseId: string,
    container: 'intake_data' | 'custom_data',
    key: string,
    value: unknown
  ): Promise<void> {
    return updateCaseJsonField(executor, caseId, container, key, value);
  }

  async createCaseDocumentRecord(
    executor: DbExecutor,
    input: {
      caseId: string;
      accountId?: string | null;
      documentName: string;
      documentType: string;
      description?: string | null;
      filePath: string;
      fileSize: number;
      mimeType: string;
      fileName: string;
      originalFilename: string;
      visibleToClient: boolean;
      userId?: string | null;
    }
  ): Promise<string> {
    return createCaseDocumentRecord(executor, input);
  }

  async createContactDocumentRecord(
    executor: DbExecutor,
    input: {
      contactId: string;
      caseId: string;
      documentType: string;
      title: string;
      description?: string | null;
      fileName: string;
      originalName: string;
      filePath: string;
      fileSize: number;
      mimeType: string;
      portalVisible: boolean;
      userId?: string | null;
    }
  ): Promise<string> {
    return createContactDocumentRecord(executor, input);
  }
}
