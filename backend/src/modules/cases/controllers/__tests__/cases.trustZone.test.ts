import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import type {
  PortalMessageEntry,
  PortalThreadSummary,
  ThreadWithMessages,
} from '@modules/portal/services/portalMessagingService';
import {
  addStaffMessage,
  getStaffThread,
  listCaseThreads,
  markStaffThreadRead,
} from '@modules/portal/services/portalMessagingService';
import { resolveCaseConversation } from '@services/caseWorkflowService';
import {
  getCasePortalConversations,
  replyCasePortalConversation,
  resolvePortalConversation,
} from '../portalConversations.controller';

jest.mock('@modules/portal/services/portalMessagingService', () => ({
  addStaffMessage: jest.fn(),
  getStaffThread: jest.fn(),
  listCaseThreads: jest.fn(),
  markStaffThreadRead: jest.fn(),
}));

jest.mock('@services/caseWorkflowService', () => ({
  resolveCaseConversation: jest.fn(),
}));

const listCaseThreadsMock = listCaseThreads as jest.MockedFunction<typeof listCaseThreads>;
const getStaffThreadMock = getStaffThread as jest.MockedFunction<typeof getStaffThread>;
const addStaffMessageMock = addStaffMessage as jest.MockedFunction<typeof addStaffMessage>;
const markStaffThreadReadMock = markStaffThreadRead as jest.MockedFunction<
  typeof markStaffThreadRead
>;
const resolveCaseConversationMock = resolveCaseConversation as jest.MockedFunction<
  typeof resolveCaseConversation
>;

const createResponse = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    getHeader: jest.fn().mockReturnValue(undefined),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

const buildRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest =>
  ({
    params: { id: 'case-1', threadId: 'thread-1' },
    body: {},
    user: { id: 'user-1', email: 'staff@example.com', role: 'staff', type: 'app' },
    organizationId: 'org-1',
    accountId: 'org-1',
    tenantId: 'org-1',
    ...overrides,
  }) as AuthRequest;

const threadSummary = (overrides: Partial<PortalThreadSummary> = {}): PortalThreadSummary => ({
  id: 'thread-1',
  account_id: 'org-1',
  contact_id: 'contact-1',
  case_id: 'case-1',
  portal_user_id: 'portal-user-1',
  pointperson_user_id: 'user-1',
  subject: 'Question',
  status: 'open',
  last_message_at: '2026-06-13T00:00:00.000Z',
  last_message_preview: 'Hello',
  created_at: '2026-06-13T00:00:00.000Z',
  updated_at: '2026-06-13T00:00:00.000Z',
  closed_at: null,
  closed_by: null,
  case_number: 'CASE-1',
  case_title: 'Housing support',
  pointperson_first_name: 'Staff',
  pointperson_last_name: 'Member',
  pointperson_email: 'staff@example.com',
  portal_email: 'client@example.com',
  unread_count: 1,
  ...overrides,
});

const messageEntry = (overrides: Partial<PortalMessageEntry> = {}): PortalMessageEntry => ({
  id: 'message-1',
  thread_id: 'thread-1',
  sender_type: 'staff',
  sender_portal_user_id: null,
  sender_user_id: 'user-1',
  message_text: 'Reply',
  is_internal: false,
  metadata: null,
  client_message_id: 'client-message-1',
  created_at: '2026-06-13T00:00:00.000Z',
  read_by_portal_at: null,
  read_by_staff_at: '2026-06-13T00:00:00.000Z',
  sender_display_name: 'Staff Member',
  ...overrides,
});

const threadWithMessages = (overrides: Partial<ThreadWithMessages> = {}): ThreadWithMessages => ({
  thread: threadSummary(),
  messages: [],
  ...overrides,
});

describe('case portal conversation trust zone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists staff conversations through the active organization and v2 envelope', async () => {
    listCaseThreadsMock.mockResolvedValueOnce([threadSummary()]);
    getStaffThreadMock.mockResolvedValueOnce(threadWithMessages());
    const res = createResponse();

    await getCasePortalConversations(buildRequest(), res, jest.fn());

    expect(listCaseThreadsMock).toHaveBeenCalledWith('case-1', 'org-1');
    expect(getStaffThreadMock).toHaveBeenCalledWith('thread-1', 'org-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: {
          conversations: [
            expect.objectContaining({
              thread: expect.objectContaining({ id: 'thread-1', account_id: 'org-1' }),
            }),
          ],
        },
      })
    );
  });

  it('scopes staff replies and returns the v2 success envelope', async () => {
    getStaffThreadMock.mockResolvedValueOnce(threadWithMessages());
    addStaffMessageMock.mockResolvedValueOnce(messageEntry());
    markStaffThreadReadMock.mockResolvedValueOnce(1);
    const res = createResponse();

    await replyCasePortalConversation(
      buildRequest({ body: { message: 'Reply', client_message_id: 'client-message-1' } }),
      res,
      jest.fn()
    );

    expect(getStaffThreadMock).toHaveBeenCalledWith('thread-1', 'org-1');
    expect(addStaffMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'org-1', senderUserId: 'user-1', threadId: 'thread-1' })
    );
    expect(markStaffThreadReadMock).toHaveBeenCalledWith('thread-1', 'org-1');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { message: expect.objectContaining({ id: 'message-1' }) },
      })
    );
  });

  it('scopes conversation resolution to the active organization', async () => {
    resolveCaseConversationMock.mockResolvedValueOnce(
      threadWithMessages({ thread: threadSummary({ status: 'closed', closed_by: 'user-1' }) })
    );
    const res = createResponse();

    await resolvePortalConversation(
      buildRequest({
        body: {
          resolution_note: 'Resolved',
          outcome_definition_ids: ['outcome-1'],
          close_status: 'closed',
          visible_to_client: true,
        },
      }),
      res,
      jest.fn()
    );

    expect(resolveCaseConversationMock).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'org-1', caseId: 'case-1', threadId: 'thread-1' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: {
          conversation: expect.objectContaining({
            thread: expect.objectContaining({ id: 'thread-1', account_id: 'org-1' }),
          }),
        },
      })
    );
  });
});
