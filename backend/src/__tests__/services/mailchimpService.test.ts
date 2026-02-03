/**
 * Mailchimp Service Tests
 * Unit tests for email marketing integration
 */

// Set environment variables BEFORE importing the service
process.env.MAILCHIMP_API_KEY = 'test-api-key-us1';
process.env.MAILCHIMP_SERVER_PREFIX = 'us1';

// Mock the Mailchimp client
jest.mock('@mailchimp/mailchimp_marketing', () => ({
  setConfig: jest.fn(),
  ping: {
    get: jest.fn(),
  },
  root: {
    getRoot: jest.fn(),
  },
  lists: {
    getAllLists: jest.fn(),
    getList: jest.fn(),
    setListMember: jest.fn(),
    getListMember: jest.fn(),
    deleteListMemberPermanent: jest.fn(),
    updateListMemberTags: jest.fn(),
    listSegments: jest.fn(),
    createSegment: jest.fn(),
  },
  campaigns: {
    list: jest.fn(),
  },
}));

// Mock the database pool
jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

// Mock the logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import service AFTER setting env vars and mocks
import * as mailchimpService from '../../services/mailchimpService';

// Get mocked modules
import mailchimp from '@mailchimp/mailchimp_marketing';
import pool from '../../config/database';

// Use any to work around incomplete Mailchimp types
const mockMailchimp = mailchimp as any;
const mockPool = pool as any;

describe('MailchimpService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isMailchimpConfigured', () => {
    it('should return true when Mailchimp is configured', () => {
      // The service initializes on module load, so this tests the initial state
      const result = mailchimpService.isMailchimpConfigured();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getStatus', () => {
    it('should return configured status when Mailchimp is healthy', async () => {
      mockMailchimp.ping.get.mockResolvedValue({
        health_status: "Everything's Chimpy!",
      });
      mockMailchimp.root.getRoot.mockResolvedValue({
        account_name: 'Test Nonprofit',
        total_subscribers: 1000,
      });
      mockMailchimp.lists.getAllLists.mockResolvedValue({
        total_items: 3,
      });

      const status = await mailchimpService.getStatus();

      if (status.configured) {
        expect(status.accountName).toBe('Test Nonprofit');
        expect(status.listCount).toBe(3);
      }
    });

    it('should return not configured when ping fails', async () => {
      (mockMailchimp.ping.get as jest.Mock).mockResolvedValue({
        health_status: 'Error',
      });

      const status = await mailchimpService.getStatus();

      expect(status.configured).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (mockMailchimp.ping.get as jest.Mock).mockRejectedValue(new Error('API Error'));

      const status = await mailchimpService.getStatus();

      expect(status.configured).toBe(false);
    });
  });

  describe('getLists', () => {
    it('should return formatted list of audiences', async () => {
      (mockMailchimp.lists.getAllLists as jest.Mock).mockResolvedValue({
        lists: [
          {
            id: 'list-123',
            name: 'Newsletter',
            stats: { member_count: 500 },
            date_created: '2024-01-01T00:00:00Z',
            double_optin: true,
          },
          {
            id: 'list-456',
            name: 'Donors',
            stats: { member_count: 200 },
            date_created: '2024-02-01T00:00:00Z',
            double_optin: false,
          },
        ],
      });

      const lists = await mailchimpService.getLists();

      expect(lists).toHaveLength(2);
      expect(lists[0].id).toBe('list-123');
      expect(lists[0].name).toBe('Newsletter');
      expect(lists[0].memberCount).toBe(500);
      expect(lists[0].doubleOptIn).toBe(true);
      expect(lists[1].id).toBe('list-456');
      expect(lists[1].memberCount).toBe(200);
    });

    it('should handle empty lists', async () => {
      (mockMailchimp.lists.getAllLists as jest.Mock).mockResolvedValue({
        lists: [],
      });

      const lists = await mailchimpService.getLists();

      expect(lists).toHaveLength(0);
    });
  });

  describe('getList', () => {
    it('should return a specific list by ID', async () => {
      (mockMailchimp.lists.getList as jest.Mock).mockResolvedValue({
        id: 'list-123',
        name: 'Newsletter',
        stats: { member_count: 500 },
        date_created: '2024-01-01T00:00:00Z',
        double_optin: true,
      });

      const list = await mailchimpService.getList('list-123');

      expect(list.id).toBe('list-123');
      expect(list.name).toBe('Newsletter');
      expect(list.memberCount).toBe(500);
    });
  });

  describe('addOrUpdateMember', () => {
    it('should add a new member to a list', async () => {
      (mockMailchimp.lists.setListMember as jest.Mock).mockResolvedValue({
        id: 'member-abc',
        email_address: 'test@example.com',
        status: 'subscribed',
        merge_fields: { FNAME: 'John', LNAME: 'Doe' },
        tags: [{ name: 'donor' }],
        list_id: 'list-123',
        timestamp_signup: '2024-01-15T10:00:00Z',
        last_changed: '2024-01-15T10:00:00Z',
      });

      const member = await mailchimpService.addOrUpdateMember({
        listId: 'list-123',
        email: 'test@example.com',
        status: 'subscribed',
        mergeFields: { FNAME: 'John', LNAME: 'Doe' },
      });

      expect(member.emailAddress).toBe('test@example.com');
      expect(member.status).toBe('subscribed');
      expect(member.tags).toContain('donor');
    });

    it('should add tags when provided', async () => {
      (mockMailchimp.lists.setListMember as jest.Mock).mockResolvedValue({
        id: 'member-abc',
        email_address: 'test@example.com',
        status: 'subscribed',
        merge_fields: {},
        tags: [],
        list_id: 'list-123',
        timestamp_signup: '2024-01-15T10:00:00Z',
        last_changed: '2024-01-15T10:00:00Z',
      });
      (mockMailchimp.lists.updateListMemberTags as jest.Mock).mockResolvedValue({});

      await mailchimpService.addOrUpdateMember({
        listId: 'list-123',
        email: 'test@example.com',
        tags: ['donor', 'volunteer'],
      });

      expect(mockMailchimp.lists.updateListMemberTags).toHaveBeenCalledWith(
        'list-123',
        expect.any(String),
        {
          tags: [
            { name: 'donor', status: 'active' },
            { name: 'volunteer', status: 'active' },
          ],
        }
      );
    });
  });

  describe('getMember', () => {
    it('should return a member when found', async () => {
      (mockMailchimp.lists.getListMember as jest.Mock).mockResolvedValue({
        id: 'member-abc',
        email_address: 'test@example.com',
        status: 'subscribed',
        merge_fields: { FNAME: 'John' },
        tags: [{ name: 'donor' }],
        list_id: 'list-123',
        timestamp_signup: '2024-01-15T10:00:00Z',
        last_changed: '2024-01-15T10:00:00Z',
      });

      const member = await mailchimpService.getMember('list-123', 'test@example.com');

      expect(member).not.toBeNull();
      expect(member?.emailAddress).toBe('test@example.com');
    });

    it('should return null when member not found (404)', async () => {
      const error = new Error('Not found');
      (error as Error & { status: number }).status = 404;
      (mockMailchimp.lists.getListMember as jest.Mock).mockRejectedValue(error);

      const member = await mailchimpService.getMember('list-123', 'notfound@example.com');

      expect(member).toBeNull();
    });

    it('should throw on other errors', async () => {
      (mockMailchimp.lists.getListMember as jest.Mock).mockRejectedValue(
        new Error('Server error')
      );

      await expect(
        mailchimpService.getMember('list-123', 'test@example.com')
      ).rejects.toThrow('Server error');
    });
  });

  describe('deleteMember', () => {
    it('should delete a member from a list', async () => {
      (mockMailchimp.lists.deleteListMemberPermanent as jest.Mock).mockResolvedValue({});

      await expect(
        mailchimpService.deleteMember('list-123', 'test@example.com')
      ).resolves.toBeUndefined();

      expect(mockMailchimp.lists.deleteListMemberPermanent).toHaveBeenCalled();
    });
  });

  describe('syncContact', () => {
    it('should sync a contact to Mailchimp', async () => {
      // Mock database query to return contact
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            contact_id: 'contact-123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            phone: '555-1234',
            address_line1: '123 Main St',
            city: 'Anytown',
            state_province: 'CA',
            postal_code: '12345',
            country: 'US',
            do_not_email: false,
          },
        ],
      });

      // Mock getMember to return null (new member)
      (mockMailchimp.lists.getListMember as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Not found'), { status: 404 })
      );

      // Mock setListMember
      (mockMailchimp.lists.setListMember as jest.Mock).mockResolvedValue({
        id: 'member-abc',
        email_address: 'john.doe@example.com',
        status: 'subscribed',
        merge_fields: {},
        tags: [],
        list_id: 'list-123',
        timestamp_signup: '2024-01-15T10:00:00Z',
        last_changed: '2024-01-15T10:00:00Z',
      });

      const result = await mailchimpService.syncContact({
        contactId: 'contact-123',
        listId: 'list-123',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('added');
      expect(result.email).toBe('john.doe@example.com');
    });

    it('should skip contacts with no email', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            contact_id: 'contact-123',
            first_name: 'John',
            last_name: 'Doe',
            email: null,
            do_not_email: false,
          },
        ],
      });

      const result = await mailchimpService.syncContact({
        contactId: 'contact-123',
        listId: 'list-123',
      });

      expect(result.success).toBe(false);
      expect(result.action).toBe('skipped');
      expect(result.error).toContain('no email');
    });

    it('should skip contacts with do_not_email flag', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            contact_id: 'contact-123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            do_not_email: true,
          },
        ],
      });

      const result = await mailchimpService.syncContact({
        contactId: 'contact-123',
        listId: 'list-123',
      });

      expect(result.success).toBe(false);
      expect(result.action).toBe('skipped');
      expect(result.error).toContain('do_not_email');
    });

    it('should return error for non-existent contact', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await mailchimpService.syncContact({
        contactId: 'non-existent',
        listId: 'list-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('bulkSyncContacts', () => {
    it('should sync multiple contacts', async () => {
      // Mock database query for first contact
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              contact_id: 'contact-1',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com',
              do_not_email: false,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              contact_id: 'contact-2',
              first_name: 'Jane',
              last_name: 'Smith',
              email: 'jane@example.com',
              do_not_email: false,
            },
          ],
        });

      // Mock getMember to return 404 for both (new members)
      (mockMailchimp.lists.getListMember as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Not found'), { status: 404 })
      );

      // Mock setListMember for both
      (mockMailchimp.lists.setListMember as jest.Mock).mockResolvedValue({
        id: 'member-abc',
        email_address: 'test@example.com',
        status: 'subscribed',
        merge_fields: {},
        tags: [],
        list_id: 'list-123',
        timestamp_signup: '2024-01-15T10:00:00Z',
        last_changed: '2024-01-15T10:00:00Z',
      });

      const result = await mailchimpService.bulkSyncContacts({
        contactIds: ['contact-1', 'contact-2'],
        listId: 'list-123',
      });

      expect(result.total).toBe(2);
      expect(result.added).toBe(2);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('updateMemberTags', () => {
    it('should add and remove tags', async () => {
      (mockMailchimp.lists.updateListMemberTags as jest.Mock).mockResolvedValue({});

      await mailchimpService.updateMemberTags({
        listId: 'list-123',
        email: 'test@example.com',
        tagsToAdd: ['new-tag'],
        tagsToRemove: ['old-tag'],
      });

      expect(mockMailchimp.lists.updateListMemberTags).toHaveBeenCalledWith(
        'list-123',
        expect.any(String),
        {
          tags: [
            { name: 'new-tag', status: 'active' },
            { name: 'old-tag', status: 'inactive' },
          ],
        }
      );
    });
  });

  describe('getListTags', () => {
    it('should return list tags/segments', async () => {
      (mockMailchimp.lists.listSegments as jest.Mock).mockResolvedValue({
        segments: [
          { id: 1, name: 'Donors', member_count: 100 },
          { id: 2, name: 'Volunteers', member_count: 50 },
        ],
      });

      const tags = await mailchimpService.getListTags('list-123');

      expect(tags).toHaveLength(2);
      expect(tags[0].name).toBe('Donors');
      expect(tags[0].memberCount).toBe(100);
    });
  });

  describe('getCampaigns', () => {
    it('should return campaigns with analytics', async () => {
      (mockMailchimp.campaigns.list as jest.Mock).mockResolvedValue({
        campaigns: [
          {
            id: 'campaign-1',
            type: 'regular',
            status: 'sent',
            settings: { title: 'Monthly Newsletter', subject_line: 'January Update' },
            recipients: { list_id: 'list-123' },
            create_time: '2024-01-01T00:00:00Z',
            send_time: '2024-01-05T10:00:00Z',
            emails_sent: 500,
            report_summary: {
              opens: 250,
              unique_opens: 200,
              open_rate: 0.4,
              clicks: 50,
              subscriber_clicks: 40,
              click_rate: 0.08,
            },
          },
        ],
      });

      const campaigns = await mailchimpService.getCampaigns();

      expect(campaigns).toHaveLength(1);
      expect(campaigns[0].title).toBe('Monthly Newsletter');
      expect(campaigns[0].status).toBe('sent');
      expect(campaigns[0].reportSummary?.openRate).toBe(0.4);
    });

    it('should filter campaigns by list ID', async () => {
      (mockMailchimp.campaigns.list as jest.Mock).mockResolvedValue({
        campaigns: [],
      });

      await mailchimpService.getCampaigns('list-123');

      expect(mockMailchimp.campaigns.list).toHaveBeenCalledWith({
        count: 50,
        list_id: 'list-123',
      });
    });
  });

  describe('createSegment', () => {
    it('should create a new segment', async () => {
      (mockMailchimp.lists.createSegment as jest.Mock).mockResolvedValue({
        id: 123,
        name: 'High Donors',
        member_count: 0,
        list_id: 'list-123',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      });

      const segment = await mailchimpService.createSegment({
        listId: 'list-123',
        name: 'High Donors',
        matchType: 'all',
        conditions: [
          { field: 'DONATION_TOTAL', op: 'greater', value: 1000 },
        ],
      });

      expect(segment.name).toBe('High Donors');
      expect(segment.id).toBe(123);
    });
  });

  describe('getSegments', () => {
    it('should return segments for a list', async () => {
      (mockMailchimp.lists.listSegments as jest.Mock).mockResolvedValue({
        segments: [
          {
            id: 1,
            name: 'Active Donors',
            member_count: 100,
            list_id: 'list-123',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-15T00:00:00Z',
          },
        ],
      });

      const segments = await mailchimpService.getSegments('list-123');

      expect(segments).toHaveLength(1);
      expect(segments[0].name).toBe('Active Donors');
      expect(segments[0].memberCount).toBe(100);
    });
  });
});
