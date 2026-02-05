/**
 * Mailchimp Controller Tests
 * Unit tests for email marketing controller
 */

import { Request, Response } from 'express';
import * as mailchimpController from '../../controllers/mailchimpController';
import * as mailchimpService from '../../services/mailchimpService';
import { AuthRequest } from '../../middleware/auth';

// Mock the mailchimp service
jest.mock('../../services/mailchimpService');

// Mock the logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockMailchimpService = mailchimpService as jest.Mocked<typeof mailchimpService>;

describe('Mailchimp Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockSend = jest.fn();
    mockStatus = jest.fn().mockReturnThis();

    mockRequest = {
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      json: mockJson,
      status: mockStatus,
      send: mockSend,
      getHeader: jest.fn().mockReturnValue(undefined),
    };
  });

  describe('getStatus', () => {
    it('returns Mailchimp status successfully', async () => {
      const mockStatus = {
        configured: true,
        accountName: 'Test Account',
        listCount: 5,
      };
      mockMailchimpService.getStatus.mockResolvedValue(mockStatus);

      await mailchimpController.getStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockMailchimpService.getStatus).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith(mockStatus);
    });

    it('handles errors gracefully', async () => {
      mockMailchimpService.getStatus.mockRejectedValue(new Error('Service error'));

      await mailchimpController.getStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'Failed to get Mailchimp status' }));
    });
  });

  describe('getLists', () => {
    it('returns lists when Mailchimp is configured', async () => {
      const mockLists = [
        { id: 'list_1', name: 'Newsletter', memberCount: 100, createdAt: new Date('2024-01-01'), doubleOptIn: true },
      ];
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.getLists.mockResolvedValue(mockLists);

      await mailchimpController.getLists(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockMailchimpService.getLists).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith(mockLists);
    });

    it('returns 503 when Mailchimp is not configured', async () => {
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(false);

      await mailchimpController.getLists(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(503);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'Mailchimp is not configured' }));
    });

    it('handles service errors', async () => {
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.getLists.mockRejectedValue(new Error('API error'));

      await mailchimpController.getLists(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'Failed to get Mailchimp lists' }));
    });
  });

  describe('getList', () => {
    it('returns a specific list', async () => {
      const mockList = {
        id: 'list_123',
        name: 'Donors',
        memberCount: 200,
        createdAt: new Date('2024-01-01'),
        doubleOptIn: true,
      };
      mockRequest.params = { id: 'list_123' };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.getList.mockResolvedValue(mockList);

      await mailchimpController.getList(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockMailchimpService.getList).toHaveBeenCalledWith('list_123');
      expect(mockJson).toHaveBeenCalledWith(mockList);
    });

    it('returns 400 when list ID is missing', async () => {
      mockRequest.params = {};

      await mailchimpController.getList(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'List ID is required' }));
    });

    it('returns 503 when Mailchimp is not configured', async () => {
      mockRequest.params = { id: 'list_123' };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(false);

      await mailchimpController.getList(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(503);
    });
  });

  describe('addMember', () => {
    it('adds a new member successfully', async () => {
      const mockMember = {
        id: 'member_123',
        emailAddress: 'test@example.com',
        status: 'subscribed' as const,
        mergeFields: { FNAME: 'Test' },
        tags: [],
        listId: 'list_123',
        createdAt: new Date('2024-01-01'),
        lastChanged: new Date('2024-01-01'),
      };
      mockRequest.body = {
        listId: 'list_123',
        email: 'test@example.com',
        status: 'subscribed',
      };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.addOrUpdateMember.mockResolvedValue(mockMember);

      await mailchimpController.addMember(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockMailchimpService.addOrUpdateMember).toHaveBeenCalledWith({
        listId: 'list_123',
        email: 'test@example.com',
        status: 'subscribed',
        mergeFields: undefined,
        tags: undefined,
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockMember);
    });

    it('returns 400 when listId is missing', async () => {
      mockRequest.body = { email: 'test@example.com' };

      await mailchimpController.addMember(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'List ID is required' }));
    });

    it('returns 400 when email is missing', async () => {
      mockRequest.body = { listId: 'list_123' };

      await mailchimpController.addMember(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'Email is required' }));
    });
  });

  describe('getMember', () => {
    it('returns member when found', async () => {
      const mockMember = {
        id: 'member_123',
        emailAddress: 'test@example.com',
        status: 'subscribed' as const,
        mergeFields: {},
        tags: [],
        listId: 'list_123',
        createdAt: new Date('2024-01-01'),
        lastChanged: new Date('2024-01-01'),
      };
      mockRequest.params = { listId: 'list_123', email: 'test@example.com' };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.getMember.mockResolvedValue(mockMember);

      await mailchimpController.getMember(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockMailchimpService.getMember).toHaveBeenCalledWith('list_123', 'test@example.com');
      expect(mockJson).toHaveBeenCalledWith(mockMember);
    });

    it('returns 404 when member not found', async () => {
      mockRequest.params = { listId: 'list_123', email: 'notfound@example.com' };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.getMember.mockResolvedValue(null);

      await mailchimpController.getMember(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'Member not found' }));
    });

    it('returns 400 when params are missing', async () => {
      mockRequest.params = { listId: 'list_123' };

      await mailchimpController.getMember(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteMember', () => {
    it('deletes member successfully', async () => {
      mockRequest.params = { listId: 'list_123', email: 'test@example.com' };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.deleteMember.mockResolvedValue();

      await mailchimpController.deleteMember(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockMailchimpService.deleteMember).toHaveBeenCalledWith('list_123', 'test@example.com');
      expect(mockStatus).toHaveBeenCalledWith(204);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('syncContact', () => {
    it('syncs contact successfully', async () => {
      const mockResult = {
        contactId: 'contact_123',
        email: 'test@example.com',
        success: true,
        action: 'added' as const,
      };
      mockRequest.body = {
        contactId: 'contact_123',
        listId: 'list_123',
        tags: ['VIP'],
      };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.syncContact.mockResolvedValue(mockResult);

      await mailchimpController.syncContact(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockMailchimpService.syncContact).toHaveBeenCalledWith({
        contactId: 'contact_123',
        listId: 'list_123',
        tags: ['VIP'],
      });
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });

    it('returns 400 when sync fails', async () => {
      const mockResult = {
        contactId: 'contact_123',
        email: 'test@example.com',
        success: false,
        action: 'skipped' as const,
        error: 'Contact has no email',
      };
      mockRequest.body = { contactId: 'contact_123', listId: 'list_123' };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.syncContact.mockResolvedValue(mockResult);

      await mailchimpController.syncContact(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });

    it('returns 400 when contactId is missing', async () => {
      mockRequest.body = { listId: 'list_123' };

      await mailchimpController.syncContact(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'Contact ID is required' }));
    });

    it('returns 400 when listId is missing', async () => {
      mockRequest.body = { contactId: 'contact_123' };

      await mailchimpController.syncContact(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'List ID is required' }));
    });
  });

  describe('bulkSyncContacts', () => {
    it('bulk syncs contacts successfully', async () => {
      const mockResult = {
        total: 3,
        added: 2,
        updated: 1,
        skipped: 0,
        errors: 0,
        results: [],
      };
      mockRequest.body = {
        contactIds: ['1', '2', '3'],
        listId: 'list_123',
      };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.bulkSyncContacts.mockResolvedValue(mockResult);

      await mailchimpController.bulkSyncContacts(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockMailchimpService.bulkSyncContacts).toHaveBeenCalledWith({
        contactIds: ['1', '2', '3'],
        listId: 'list_123',
        tags: undefined,
      });
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });

    it('returns 400 when contactIds is empty', async () => {
      mockRequest.body = { contactIds: [], listId: 'list_123' };

      await mailchimpController.bulkSyncContacts(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Contact IDs array is required and must not be empty' })
      );
    });

    it('returns 400 when contactIds is not an array', async () => {
      mockRequest.body = { contactIds: 'not-array', listId: 'list_123' };

      await mailchimpController.bulkSyncContacts(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('returns 400 when too many contacts', async () => {
      mockRequest.body = {
        contactIds: Array(501).fill('id'),
        listId: 'list_123',
      };

      await mailchimpController.bulkSyncContacts(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Maximum 500 contacts can be synced at once' })
      );
    });
  });

  describe('updateMemberTags', () => {
    it('updates member tags successfully', async () => {
      mockRequest.body = {
        listId: 'list_123',
        email: 'test@example.com',
        tagsToAdd: ['VIP'],
        tagsToRemove: ['Old'],
      };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.updateMemberTags.mockResolvedValue();

      await mailchimpController.updateMemberTags(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockMailchimpService.updateMemberTags).toHaveBeenCalledWith({
        listId: 'list_123',
        email: 'test@example.com',
        tagsToAdd: ['VIP'],
        tagsToRemove: ['Old'],
      });
      expect(mockJson).toHaveBeenCalledWith({ success: true });
    });

    it('returns 400 when listId is missing', async () => {
      mockRequest.body = { email: 'test@example.com' };

      await mailchimpController.updateMemberTags(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'List ID is required' }));
    });

    it('returns 400 when email is missing', async () => {
      mockRequest.body = { listId: 'list_123' };

      await mailchimpController.updateMemberTags(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'Email is required' }));
    });
  });

  describe('getListTags', () => {
    it('returns list tags successfully', async () => {
      const mockTags = [
        { id: 1, name: 'VIP', memberCount: 50 },
        { id: 2, name: 'Active', memberCount: 100 },
      ];
      mockRequest.params = { listId: 'list_123' };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.getListTags.mockResolvedValue(mockTags);

      await mailchimpController.getListTags(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockMailchimpService.getListTags).toHaveBeenCalledWith('list_123');
      expect(mockJson).toHaveBeenCalledWith(mockTags);
    });

    it('returns 400 when listId is missing', async () => {
      mockRequest.params = {};

      await mailchimpController.getListTags(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getCampaigns', () => {
    it('returns all campaigns when no listId provided', async () => {
      const mockCampaigns = [
        {
          id: 'camp_1',
          type: 'regular' as const,
          status: 'sent' as const,
          title: 'Newsletter',
          listId: 'list_123',
          createdAt: new Date('2024-01-01'),
        },
      ];
      mockRequest.query = {};
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.getCampaigns.mockResolvedValue(mockCampaigns);

      await mailchimpController.getCampaigns(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockMailchimpService.getCampaigns).toHaveBeenCalledWith(undefined);
      expect(mockJson).toHaveBeenCalledWith(mockCampaigns);
    });

    it('returns campaigns for specific list', async () => {
      mockRequest.query = { listId: 'list_123' };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.getCampaigns.mockResolvedValue([]);

      await mailchimpController.getCampaigns(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockMailchimpService.getCampaigns).toHaveBeenCalledWith('list_123');
    });
  });

  describe('createSegment', () => {
    it('creates segment successfully', async () => {
      const mockSegment = {
        id: 123,
        name: 'Recent Donors',
        memberCount: 0,
        listId: 'list_123',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      mockRequest.body = {
        listId: 'list_123',
        name: 'Recent Donors',
        matchType: 'all',
        conditions: [{ field: 'date_added', op: 'greater', value: '30' }],
      };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.createSegment.mockResolvedValue(mockSegment);

      await mailchimpController.createSegment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockSegment);
    });

    it('returns 400 when listId is missing', async () => {
      mockRequest.body = {
        name: 'Test',
        conditions: [{ field: 'date_added', op: 'greater', value: '30' }],
      };

      await mailchimpController.createSegment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'List ID is required' }));
    });

    it('returns 400 when name is missing', async () => {
      mockRequest.body = {
        listId: 'list_123',
        conditions: [{ field: 'date_added', op: 'greater', value: '30' }],
      };

      await mailchimpController.createSegment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'Segment name is required' }));
    });

    it('returns 400 when conditions are missing', async () => {
      mockRequest.body = {
        listId: 'list_123',
        name: 'Test',
      };

      await mailchimpController.createSegment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'Segment conditions are required' }));
    });

    it('returns 400 when conditions are empty', async () => {
      mockRequest.body = {
        listId: 'list_123',
        name: 'Test',
        conditions: [],
      };

      await mailchimpController.createSegment(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ error: 'Segment conditions are required' }));
    });
  });

  describe('getSegments', () => {
    it('returns segments for a list', async () => {
      const mockSegments = [
        {
          id: 123,
          name: 'Recent Donors',
          memberCount: 50,
          listId: 'list_123',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];
      mockRequest.params = { listId: 'list_123' };
      mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
      mockMailchimpService.getSegments.mockResolvedValue(mockSegments);

      await mailchimpController.getSegments(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockMailchimpService.getSegments).toHaveBeenCalledWith('list_123');
      expect(mockJson).toHaveBeenCalledWith(mockSegments);
    });
  });

  describe('handleWebhook', () => {
    it('handles subscribe event', async () => {
      mockRequest.body = {
        type: 'subscribe',
        data: {
          email: 'new@example.com',
          listId: 'list_123',
        },
      };

      await mailchimpController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({ received: true });
    });

    it('handles unsubscribe event', async () => {
      mockRequest.body = {
        type: 'unsubscribe',
        data: {
          email: 'unsub@example.com',
          listId: 'list_123',
        },
      };

      await mailchimpController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({ received: true });
    });

    it('handles profile update event', async () => {
      mockRequest.body = {
        type: 'profile',
        data: {
          email: 'profile@example.com',
          listId: 'list_123',
        },
      };

      await mailchimpController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({ received: true });
    });

    it('handles email change event', async () => {
      mockRequest.body = {
        type: 'upemail',
        data: {
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
          listId: 'list_123',
        },
      };

      await mailchimpController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({ received: true });
    });

    it('handles cleaned event', async () => {
      mockRequest.body = {
        type: 'cleaned',
        data: {
          email: 'bounced@example.com',
          listId: 'list_123',
          reason: 'hard',
        },
      };

      await mailchimpController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({ received: true });
    });

    it('handles campaign event', async () => {
      mockRequest.body = {
        type: 'campaign',
        data: {
          listId: 'list_123',
        },
      };

      await mailchimpController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({ received: true });
    });

    it('handles unknown event type', async () => {
      mockRequest.body = {
        type: 'unknown_event',
        data: {},
      };

      await mailchimpController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({ received: true });
    });

    it('returns 200 even on processing error', async () => {
      // Simulate an error by having undefined data
      mockRequest.body = {
        type: null,
        data: undefined,
      };

      await mailchimpController.handleWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      // Should still return received: true
      expect(mockJson).toHaveBeenCalled();
    });
  });
});
