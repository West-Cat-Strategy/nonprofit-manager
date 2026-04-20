import type { PoolClient } from 'pg';
import type { CaseFormDefault, CaseFormSubmission, CaseFormSchema } from '@app-types/caseForms';
import type { CaseFormAssignmentRecord, CaseFormsRepository } from '../../repositories/caseFormsRepository';
import { CaseFormsUseCase } from '../caseForms.usecase';

const sendMailMock = jest.fn();
const uploadFileMock = jest.fn();
const generateCaseFormResponsePacketMock = jest.fn();
const requireCaseOwnershipMock = jest.fn();
const createCaseNoteQueryMock = jest.fn();

jest.mock('@services/emailService', () => ({
  sendMail: (...args: unknown[]) => sendMailMock(...args),
}));

jest.mock('@services/fileStorageService', () => ({
  uploadFile: (...args: unknown[]) => uploadFileMock(...args),
}));

jest.mock('../../services/caseFormPacketService', () => ({
  generateCaseFormResponsePacket: (...args: unknown[]) => generateCaseFormResponsePacketMock(...args),
}));

jest.mock('../../queries/shared', () => ({
  requireCaseOwnership: (...args: unknown[]) => requireCaseOwnershipMock(...args),
}));

jest.mock('../../queries/notesQueries', () => ({
  createCaseNoteQuery: (...args: unknown[]) => createCaseNoteQueryMock(...args),
}));

const schema: CaseFormSchema = {
  version: 1,
  title: 'Housing Intake',
  sections: [
    {
      id: 'section-1',
      title: 'Client Details',
      questions: [
        {
          id: 'question-email',
          key: 'email',
          type: 'email',
          label: 'Email',
          required: true,
          mapping_target: {
            entity: 'contact',
            field: 'email',
          },
        },
        {
          id: 'question-household',
          key: 'household_size',
          type: 'number',
          label: 'Household Size',
          required: true,
          mapping_target: {
            entity: 'case',
            container: 'intake_data',
            key: 'household_size',
          },
        },
      ],
    },
  ],
};

const makeAssignment = (
  overrides: Partial<CaseFormAssignmentRecord> = {}
): CaseFormAssignmentRecord => ({
  id: 'assignment-1',
  case_id: 'case-1',
  contact_id: 'contact-1',
  account_id: 'org-1',
  case_type_id: null,
  source_default_id: null,
  source_default_version: null,
  title: 'Housing Intake',
  description: 'Collect current housing details.',
  status: 'draft',
  schema,
  current_draft_answers: {},
  last_draft_saved_at: null,
  due_at: null,
  recipient_email: 'client@example.com',
  delivery_target: null,
  sent_at: null,
  viewed_at: null,
  submitted_at: null,
  reviewed_at: null,
  closed_at: null,
  created_at: '2026-04-16T12:00:00.000Z',
  updated_at: '2026-04-16T12:00:00.000Z',
  created_by: 'staff-creator',
  updated_by: 'staff-sender',
  case_number: 'CASE-001',
  case_title: 'Housing support',
  contact_first_name: 'Client',
  contact_last_name: 'Person',
  client_viewable: true,
  case_assigned_to: 'case-worker-1',
  review_follow_up_id: null,
  latest_submission: null,
  ...overrides,
});

const makeSubmission = (overrides: Partial<CaseFormSubmission> = {}): CaseFormSubmission => ({
  id: 'submission-1',
  assignment_id: 'assignment-1',
  case_id: 'case-1',
  contact_id: 'contact-1',
  submission_number: 1,
  client_submission_id: 'client-submission-1',
  answers: {
    email: 'client@example.com',
    household_size: 3,
  },
  mapping_audit: [],
  asset_refs: [],
  signature_refs: [],
  response_packet_file_name: 'housing-intake-response.pdf',
  response_packet_file_path: 'case-forms/housing-intake-response.pdf',
  response_packet_case_document_id: 'case-doc-1',
  response_packet_contact_document_id: 'contact-doc-1',
  submitted_by_actor_type: 'portal',
  submitted_by_user_id: null,
  submitted_by_portal_user_id: 'portal-user-1',
  access_token_id: null,
  created_at: '2026-04-16T12:30:00.000Z',
  response_packet_download_url: null,
  ...overrides,
});

const makeDefault = (overrides: Partial<CaseFormDefault> = {}): CaseFormDefault => ({
  id: 'default-1',
  case_type_id: 'case-type-1',
  account_id: 'org-1',
  title: 'Housing Intake',
  description: 'Collect current housing details.',
  schema,
  version: 4,
  is_active: true,
  created_at: '2026-04-15T12:00:00.000Z',
  updated_at: '2026-04-15T12:00:00.000Z',
  created_by: 'staff-creator',
  updated_by: 'staff-creator',
  ...overrides,
});

type RepositoryMock = {
  [K in keyof CaseFormsRepository]: jest.Mock;
};

const createRepositoryMock = (): {
  repository: CaseFormsRepository;
  mocks: RepositoryMock;
  transactionClient: PoolClient;
} => {
  const transactionClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
  } as unknown as PoolClient;

  const mocks = {
    withTransaction: jest.fn(async (callback: (client: PoolClient) => Promise<unknown>) => callback(transactionClient)),
    listDefaultsByCaseType: jest.fn(),
    getDefaultById: jest.fn(),
    createDefault: jest.fn(),
    updateDefault: jest.fn(),
    listRecommendedDefaultsForCase: jest.fn(),
    listAssignmentsForCase: jest.fn(),
    listAssignmentsForPortal: jest.fn(),
    getAssignmentById: jest.fn(),
    createAssignment: jest.fn(),
    updateAssignment: jest.fn(),
    saveDraft: jest.fn(),
    markAssignmentViewed: jest.fn(),
    markAssignmentAfterSubmission: jest.fn(),
    markAssignmentSent: jest.fn(),
    markAssignmentReviewDecision: jest.fn(),
    getSubmissionByClientSubmissionId: jest.fn(),
    listSubmissionsForAssignment: jest.fn(),
    getNextSubmissionNumber: jest.fn(),
    createSubmission: jest.fn(),
    listAssetsForAssignment: jest.fn(),
    listAssetsForSubmissionIds: jest.fn(),
    createAsset: jest.fn(),
    linkAssetsToSubmission: jest.fn(),
    createAccessToken: jest.fn(),
    revokeAccessTokens: jest.fn(),
    getAccessTokenByHash: jest.fn(),
    markAccessTokenViewed: jest.fn(),
    markAccessTokenUsed: jest.fn(),
    getReviewFollowUp: jest.fn(),
    createReviewFollowUp: jest.fn(),
    updateScheduledReviewFollowUp: jest.fn(),
    completeReviewFollowUp: jest.fn(),
    cancelReviewFollowUp: jest.fn(),
    updateContactFields: jest.fn(),
    updateCaseJsonField: jest.fn(),
    createCaseDocumentRecord: jest.fn(),
    createContactDocumentRecord: jest.fn(),
  } as unknown as RepositoryMock;

  return {
    repository: mocks as unknown as CaseFormsRepository,
    mocks,
    transactionClient,
  };
};

describe('CaseFormsUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireCaseOwnershipMock.mockResolvedValue({
      id: 'case-1',
      contact_id: 'contact-1',
      account_id: 'org-1',
    });
    createCaseNoteQueryMock.mockResolvedValue(undefined);
    uploadFileMock.mockResolvedValue({
      fileName: 'stored-response.pdf',
      filePath: 'case-forms/stored-response.pdf',
      fileSize: 1024,
    });
    generateCaseFormResponsePacketMock.mockResolvedValue({
      fileName: 'housing-intake-response.pdf',
      buffer: Buffer.from('pdf'),
    });
  });

  it('sends a portal-only assignment without creating an email token', async () => {
    const { repository, mocks } = createRepositoryMock();
    const useCase = new CaseFormsUseCase(repository);
    const assignment = makeAssignment();
    const refreshed = makeAssignment({
      status: 'sent',
      delivery_target: 'portal',
      sent_at: '2026-04-16T12:15:00.000Z',
    });

    mocks.getAssignmentById.mockResolvedValueOnce(assignment).mockResolvedValueOnce(refreshed);

    const result = await useCase.sendAssignment('case-1', assignment.id, {
      delivery_target: 'portal',
    }, 'staff-1', 'org-1');

    expect(mocks.createAccessToken).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(mocks.markAssignmentSent).toHaveBeenCalledTimes(1);
    expect(mocks.markAssignmentSent).toHaveBeenCalledWith(expect.anything(), assignment.id);
    expect(mocks.updateAssignment).toHaveBeenCalledWith(
      expect.anything(),
      assignment.id,
      expect.objectContaining({
        status: 'sent',
        deliveryTarget: 'portal',
      })
    );
    expect(result.delivery_target).toBe('portal');
    expect(result.access_link_url).toBeNull();
  });

  it('sends an email-only assignment with a fresh secure link', async () => {
    const { repository, mocks } = createRepositoryMock();
    const useCase = new CaseFormsUseCase(repository);
    const assignment = makeAssignment();
    const refreshed = makeAssignment({
      status: 'sent',
      delivery_target: 'email',
      sent_at: '2026-04-16T12:15:00.000Z',
    });

    mocks.getAssignmentById.mockResolvedValueOnce(assignment).mockResolvedValueOnce(refreshed);
    mocks.createAccessToken.mockResolvedValue('token-row-1');

    const result = await useCase.sendAssignment('case-1', assignment.id, {
      delivery_target: 'email',
      recipient_email: 'client@example.com',
      expires_in_days: 7,
    }, 'staff-1', 'org-1');

    expect(mocks.createAccessToken).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(mocks.markAssignmentSent).toHaveBeenCalledTimes(1);
    expect(mocks.markAssignmentSent).toHaveBeenCalledWith(expect.anything(), assignment.id);
    expect(result.delivery_target).toBe('email');
    expect(result.access_link_url).toMatch(/\/public\/case-forms\//);
  });

  it('supports combined portal and email delivery from one send action', async () => {
    const { repository, mocks } = createRepositoryMock();
    const useCase = new CaseFormsUseCase(repository);
    const assignment = makeAssignment();
    const refreshed = makeAssignment({
      status: 'sent',
      delivery_target: 'portal_and_email',
      sent_at: '2026-04-16T12:15:00.000Z',
    });

    mocks.getAssignmentById.mockResolvedValueOnce(assignment).mockResolvedValueOnce(refreshed);
    mocks.createAccessToken.mockResolvedValue('token-row-1');

    const result = await useCase.sendAssignment('case-1', assignment.id, {
      delivery_target: 'portal_and_email',
      recipient_email: 'client@example.com',
    }, 'staff-1', 'org-1');

    expect(mocks.createAccessToken).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(mocks.markAssignmentSent).toHaveBeenCalledTimes(1);
    expect(mocks.markAssignmentSent).toHaveBeenCalledWith(expect.anything(), assignment.id);
    expect(result.delivery_target).toBe('portal_and_email');
    expect(result.access_link_url).toMatch(/\/public\/case-forms\//);
  });

  it('expires public access links without clearing assignment attribution', async () => {
    const { repository, mocks } = createRepositoryMock();
    const useCase = new CaseFormsUseCase(repository);
    const assignment = makeAssignment({
      status: 'sent',
      delivery_target: 'email',
      client_viewable: true,
      updated_by: 'reviewer-1',
    });

    mocks.getAccessTokenByHash.mockResolvedValue({
      id: 'token-1',
      assignment_id: assignment.id,
      case_id: assignment.case_id,
      contact_id: assignment.contact_id,
      recipient_email: assignment.recipient_email,
      token_hash: 'token-hash',
      expires_at: new Date(Date.now() - 60_000),
      revoked_at: null,
      last_viewed_at: null,
      last_used_at: null,
      latest_submission_id: null,
      created_by: 'staff-1',
      created_at: new Date('2026-04-16T12:00:00.000Z'),
      assignment,
    } as never);

    await expect(useCase.getAssignmentDetailByToken('expired-token')).rejects.toMatchObject({
      statusCode: 410,
      code: 'expired',
    });

    expect(mocks.updateAssignment).toHaveBeenCalledWith(expect.anything(), assignment.id, {
      status: 'expired',
    });
  });

  it('returns public assignment detail for a valid email-delivery token', async () => {
    const { repository, mocks } = createRepositoryMock();
    const useCase = new CaseFormsUseCase(repository);
    const accessedAssignment = makeAssignment({
      status: 'viewed',
      delivery_target: 'email',
      client_viewable: true,
      viewed_at: '2026-04-16T12:20:00.000Z',
    });

    mocks.getAccessTokenByHash.mockResolvedValue({
      id: 'token-1',
      assignment_id: accessedAssignment.id,
      case_id: accessedAssignment.case_id,
      contact_id: accessedAssignment.contact_id,
      recipient_email: accessedAssignment.recipient_email,
      token_hash: 'token-hash',
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null,
      last_viewed_at: null,
      last_used_at: null,
      latest_submission_id: null,
      created_by: 'staff-1',
      created_at: new Date('2026-04-16T12:00:00.000Z'),
      assignment: accessedAssignment,
    } as never);
    mocks.listSubmissionsForAssignment.mockResolvedValue([]);
    mocks.listAssetsForAssignment.mockResolvedValue([]);

    const result = await useCase.getAssignmentDetailByToken('valid-token');

    expect(mocks.markAssignmentViewed).toHaveBeenCalledWith(expect.anything(), accessedAssignment.id);
    expect(mocks.markAccessTokenViewed).toHaveBeenCalledWith(expect.anything(), 'token-1');
    expect(mocks.getAssignmentById).not.toHaveBeenCalled();
    expect(result.assignment.id).toBe(accessedAssignment.id);
    expect(result.assignment.delivery_target).toBe('email');
    expect(result.assignment.viewed_at).toBe('2026-04-16T12:20:00.000Z');
    expect(result.submissions).toEqual([]);
  });

  it('rejects delivery when the case is not client-viewable', async () => {
    const { repository, mocks } = createRepositoryMock();
    const useCase = new CaseFormsUseCase(repository);

    mocks.getAssignmentById.mockResolvedValueOnce(
      makeAssignment({
        client_viewable: false,
      })
    );

    await expect(
      useCase.sendAssignment('case-1', 'assignment-1', {
        delivery_target: 'portal',
      }, 'staff-1', 'org-1')
    ).rejects.toMatchObject({
      message: 'This case must be shared with the client before forms can be delivered',
      statusCode: 400,
      code: 'validation_error',
    });

    expect(mocks.createAccessToken).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('hides unsent drafts from portal access', async () => {
    const { repository, mocks } = createRepositoryMock();
    const useCase = new CaseFormsUseCase(repository);

    mocks.getAssignmentById.mockResolvedValueOnce(
      makeAssignment({
        status: 'draft',
        delivery_target: null,
      })
    );

    await expect(
      useCase.getAssignmentDetailForPortal({ contactId: 'contact-1', portalUserId: 'portal-user-1' }, 'assignment-1')
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'not_found',
    });
  });

  it('captures the source default version when creating an assignment from a saved default', async () => {
    const { repository, mocks } = createRepositoryMock();
    const useCase = new CaseFormsUseCase(repository);
    const sourceDefault = makeDefault();
    const created = makeAssignment({
      source_default_id: sourceDefault.id,
      source_default_version: sourceDefault.version,
    });

    mocks.getDefaultById.mockResolvedValue(sourceDefault);
    mocks.createAssignment.mockResolvedValue(created);

    const result = await useCase.createAssignment(
      'case-1',
      {
        title: 'Housing Intake',
        schema,
        source_default_id: sourceDefault.id,
      },
      'staff-1',
      'org-1'
    );

    expect(mocks.getDefaultById).toHaveBeenCalledWith(sourceDefault.id, 'org-1');
    expect(mocks.createAssignment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        sourceDefaultId: sourceDefault.id,
        sourceDefaultVersion: sourceDefault.version,
      })
    );
    expect(result.source_default_version).toBe(sourceDefault.version);
  });

  it('records client submissions, mapped writeback, documents, note, and linked follow-up', async () => {
    const { repository, mocks } = createRepositoryMock();
    const useCase = new CaseFormsUseCase(repository);
    const assignment = makeAssignment({
      status: 'sent',
      delivery_target: 'portal',
      source_default_id: 'default-1',
      source_default_version: 4,
    });
    const refreshed = makeAssignment({
      status: 'submitted',
      delivery_target: 'portal',
      source_default_id: 'default-1',
      source_default_version: 4,
      submitted_at: '2026-04-16T12:30:00.000Z',
      review_follow_up_id: 'follow-up-1',
    });
    const submission = makeSubmission();

    mocks.getAssignmentById.mockResolvedValueOnce(assignment).mockResolvedValueOnce(refreshed);
    mocks.getSubmissionByClientSubmissionId.mockResolvedValue(null);
    mocks.listAssetsForAssignment.mockResolvedValue([]);
    mocks.listSubmissionsForAssignment.mockResolvedValueOnce([]).mockResolvedValueOnce([submission]);
    mocks.getNextSubmissionNumber.mockResolvedValue(1);
    mocks.createCaseDocumentRecord.mockResolvedValue('case-doc-1');
    mocks.createContactDocumentRecord.mockResolvedValue('contact-doc-1');
    mocks.createSubmission.mockResolvedValue(submission);
    mocks.createReviewFollowUp.mockResolvedValue('follow-up-1');
    mocks.listAssetsForSubmissionIds.mockResolvedValue([]);
    mocks.updateAssignment.mockResolvedValue(refreshed);

    const result = await useCase.submitForPortal(
      { contactId: 'contact-1', portalUserId: 'portal-user-1' },
      assignment.id,
      {
        answers: {
          email: 'client@example.com',
          household_size: 3,
        },
        client_submission_id: 'client-submission-1',
      }
    );

    expect(mocks.updateContactFields).toHaveBeenCalledWith(
      expect.anything(),
      assignment.contact_id,
      expect.objectContaining({
        email: 'client@example.com',
      })
    );
    expect(mocks.updateCaseJsonField).toHaveBeenCalledWith(
      expect.anything(),
      assignment.case_id,
      'intake_data',
      'household_size',
      3
    );
    expect(mocks.createCaseDocumentRecord).toHaveBeenCalled();
    expect(mocks.createContactDocumentRecord).toHaveBeenCalled();
    expect(createCaseNoteQueryMock).toHaveBeenCalled();
    expect(mocks.createReviewFollowUp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: 'org-1',
        caseId: assignment.case_id,
      })
    );
    expect(mocks.updateAssignment).toHaveBeenCalledWith(
      expect.anything(),
      assignment.id,
      expect.objectContaining({
        reviewFollowUpId: 'follow-up-1',
      })
    );
    expect(result.assignment.status).toBe('submitted');
    expect(result.assignment.source_default_version).toBe(4);
  });

  it('updates the existing scheduled review follow-up on resubmission instead of duplicating it', async () => {
    const { repository, mocks } = createRepositoryMock();
    const useCase = new CaseFormsUseCase(repository);
    const assignment = makeAssignment({
      status: 'submitted',
      delivery_target: 'portal',
      review_follow_up_id: 'follow-up-1',
    });
    const refreshed = makeAssignment({
      status: 'submitted',
      delivery_target: 'portal',
      submitted_at: '2026-04-16T13:00:00.000Z',
      review_follow_up_id: 'follow-up-1',
    });
    const submission = makeSubmission({
      id: 'submission-2',
      submission_number: 2,
      client_submission_id: 'client-submission-2',
    });

    mocks.getAssignmentById.mockResolvedValueOnce(assignment).mockResolvedValueOnce(refreshed);
    mocks.getSubmissionByClientSubmissionId.mockResolvedValue(null);
    mocks.listAssetsForAssignment.mockResolvedValue([]);
    mocks.listSubmissionsForAssignment.mockResolvedValueOnce([makeSubmission()]).mockResolvedValueOnce([submission]);
    mocks.getNextSubmissionNumber.mockResolvedValue(2);
    mocks.createCaseDocumentRecord.mockResolvedValue('case-doc-2');
    mocks.createContactDocumentRecord.mockResolvedValue('contact-doc-2');
    mocks.createSubmission.mockResolvedValue(submission);
    mocks.getReviewFollowUp.mockResolvedValue({
      id: 'follow-up-1',
      status: 'scheduled',
    });
    mocks.listAssetsForSubmissionIds.mockResolvedValue([]);

    await useCase.submitForPortal(
      { contactId: 'contact-1', portalUserId: 'portal-user-1' },
      assignment.id,
      {
        answers: {
          email: 'client@example.com',
          household_size: 4,
        },
        client_submission_id: 'client-submission-2',
      }
    );

    expect(mocks.updateScheduledReviewFollowUp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: 'org-1',
        followUpId: 'follow-up-1',
      })
    );
    expect(mocks.createReviewFollowUp).not.toHaveBeenCalled();
  });

  it('completes the linked follow-up when staff marks a submission reviewed', async () => {
    const { repository, mocks } = createRepositoryMock();
    const useCase = new CaseFormsUseCase(repository);
    const assignment = makeAssignment({
      status: 'submitted',
      delivery_target: 'portal',
      review_follow_up_id: 'follow-up-1',
    });
    const refreshed = makeAssignment({
      status: 'reviewed',
      delivery_target: 'portal',
      review_follow_up_id: 'follow-up-1',
      reviewed_at: '2026-04-16T13:30:00.000Z',
    });

    mocks.getAssignmentById.mockResolvedValueOnce(assignment).mockResolvedValueOnce(refreshed);

    await useCase.reviewAssignment('case-1', assignment.id, {
      decision: 'reviewed',
      notes: 'Mapped values verified.',
    }, 'staff-1', 'org-1');

    expect(mocks.completeReviewFollowUp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: 'org-1',
        followUpId: 'follow-up-1',
      })
    );
    expect(mocks.cancelReviewFollowUp).not.toHaveBeenCalled();
  });

  it('cancels the linked follow-up when staff cancels review', async () => {
    const { repository, mocks } = createRepositoryMock();
    const useCase = new CaseFormsUseCase(repository);
    const assignment = makeAssignment({
      status: 'submitted',
      delivery_target: 'portal',
      review_follow_up_id: 'follow-up-1',
    });
    const refreshed = makeAssignment({
      status: 'cancelled',
      delivery_target: 'portal',
      review_follow_up_id: 'follow-up-1',
    });

    mocks.getAssignmentById.mockResolvedValueOnce(assignment).mockResolvedValueOnce(refreshed);

    await useCase.reviewAssignment('case-1', assignment.id, {
      decision: 'cancelled',
      notes: 'Submission withdrawn.',
    }, 'staff-1', 'org-1');

    expect(mocks.cancelReviewFollowUp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: 'org-1',
        followUpId: 'follow-up-1',
      })
    );
    expect(mocks.completeReviewFollowUp).not.toHaveBeenCalled();
  });
});
