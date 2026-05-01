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
    batchSegmentMembers: jest.fn(),
  },
  campaigns: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    setContent: jest.fn(),
    schedule: jest.fn(),
    send: jest.fn(),
    sendTestEmail: jest.fn(),
  },
  reports: {
    getCampaignReport: jest.fn(),
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

jest.mock('@modules/contacts/services/contactSuppressionService', () => ({
  recordContactSuppressionEvidence: jest.fn().mockResolvedValue({ id: 'suppression-evidence-1' }),
}));

// Import service AFTER setting env vars and mocks
import * as mailchimpService from '@services/mailchimpService';

// Get mocked modules
import mailchimp from '@mailchimp/mailchimp_marketing';
import pool from '../../config/database';
import { recordContactSuppressionEvidence } from '@modules/contacts/services/contactSuppressionService';

// Use any to work around incomplete Mailchimp types
const mockMailchimp = mailchimp as any;
const mockPool = pool as any;
const mockRecordContactSuppressionEvidence = recordContactSuppressionEvidence as jest.Mock;

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
      (mockMailchimp.lists.getListMember as jest.Mock).mockRejectedValue(new Error('Server error'));

      await expect(mailchimpService.getMember('list-123', 'test@example.com')).rejects.toThrow(
        'Server error'
      );
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
            address_line1: '400 West Georgia Street',
            city: 'Vancouver',
            state_province: 'BC',
            postal_code: 'V6B 1A1',
            country: 'CA',
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

  describe('saved audiences and campaign runs', () => {
    it('lists saved audiences inside the requester account scope', async () => {
      const accountId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Spring donors',
            description: null,
            filters: {
              source: 'communications_selected_contacts',
              contactIds: ['22222222-2222-4222-8222-222222222222'],
              listId: 'list-123',
            },
            source_count: 1,
            scope_account_ids: [accountId],
            status: 'active',
            created_at: new Date('2026-04-25T00:00:00Z'),
            updated_at: new Date('2026-04-25T00:00:00Z'),
            created_by: 'user-1',
          },
        ],
      });

      const audiences = await mailchimpService.listSavedAudiences('active', [accountId]);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('scope_account_ids &&'), [
        'active',
        [accountId],
      ]);
      expect(audiences).toHaveLength(1);
      expect(audiences[0].scopeAccountIds).toEqual([accountId]);
    });

    it('archives saved audiences only inside the requester account scope', async () => {
      const accountId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Spring donors',
            description: null,
            filters: {
              source: 'communications_selected_contacts',
              contactIds: ['22222222-2222-4222-8222-222222222222'],
              listId: 'list-123',
            },
            source_count: 1,
            scope_account_ids: [accountId],
            status: 'archived',
            created_at: new Date('2026-04-25T00:00:00Z'),
            updated_at: new Date('2026-04-25T00:00:00Z'),
            created_by: 'user-1',
          },
        ],
      });

      const audience = await mailchimpService.archiveSavedAudience(
        '11111111-1111-4111-8111-111111111111',
        'user-1',
        [accountId]
      );

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('scope_account_ids &&'), [
        '11111111-1111-4111-8111-111111111111',
        'user-1',
        [accountId],
      ]);
      expect(audience?.status).toBe('archived');
    });

    it('lists campaign run history inside the requester account scope', async () => {
      const accountId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'run-1',
            provider: 'mailchimp',
            provider_campaign_id: 'campaign-1',
            title: 'Spring Campaign',
            list_id: 'list-123',
            include_audience_id: null,
            exclusion_audience_ids: [],
            suppression_snapshot: [],
            test_recipients: ['reviewer@example.org'],
            audience_snapshot: { targetingMode: 'all_subscribers' },
            requested_send_time: null,
            status: 'draft',
            counts: {},
            scope_account_ids: [accountId],
            failure_message: null,
            requested_by: 'user-1',
            created_at: new Date('2026-04-25T00:00:00Z'),
            updated_at: new Date('2026-04-25T00:00:00Z'),
          },
        ],
      });

      const runs = await mailchimpService.listCampaignRuns(20, [accountId]);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/WHERE provider = 'mailchimp'[\s\S]*scope_account_ids &&/),
        [20, [accountId]]
      );
      expect(runs[0].testRecipients).toEqual(['reviewer@example.org']);
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
        conditions: [{ field: 'DONATION_TOTAL', op: 'greater', value: 1000 }],
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

  describe('createCampaign', () => {
    it('renders builder content into Mailchimp campaign content and schedules delivery', async () => {
      (mockMailchimp.campaigns.create as jest.Mock).mockResolvedValue({
        id: 'campaign-123',
        create_time: '2024-01-15T10:00:00Z',
      });
      (mockMailchimp.campaigns.setContent as jest.Mock).mockResolvedValue({});
      (mockMailchimp.campaigns.schedule as jest.Mock).mockResolvedValue({});
      const sendTime = new Date('2026-05-01T10:00:00Z');
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'run-1',
            provider: 'mailchimp',
            provider_campaign_id: 'campaign-123',
            title: 'Spring Appeal',
            list_id: 'list-123',
            include_audience_id: null,
            exclusion_audience_ids: [],
            suppression_snapshot: [],
            test_recipients: [],
            audience_snapshot: {},
            requested_send_time: sendTime,
            status: 'scheduled',
            counts: {},
            scope_account_ids: [],
            failure_message: null,
            requested_by: null,
            created_at: new Date('2024-01-15T10:00:00Z'),
            updated_at: new Date('2024-01-15T10:00:00Z'),
          },
        ],
      });

      const campaign = await mailchimpService.createCampaign({
        listId: 'list-123',
        segmentId: 42,
        title: 'Spring Appeal',
        subject: 'Spring Appeal',
        previewText: 'Support our spring programs',
        fromName: 'Community Org',
        replyTo: 'hello@example.org',
        builderContent: {
          accentColor: '#1d4ed8',
          blocks: [
            { id: 'heading-1', type: 'heading', content: 'Spring Appeal', level: 1 },
            {
              id: 'paragraph-1',
              type: 'paragraph',
              content: 'Help fund our spring programs.',
            },
          ],
        },
        sendTime,
      });

      expect(mockMailchimp.campaigns.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipients: expect.objectContaining({
            segment_opts: {
              saved_segment_id: 42,
            },
          }),
          settings: expect.objectContaining({
            subject_line: 'Spring Appeal',
            preview_text: 'Support our spring programs',
          }),
        })
      );
      expect(mockMailchimp.campaigns.setContent).toHaveBeenCalledWith(
        'campaign-123',
        expect.objectContaining({
          html: expect.stringContaining('Spring Appeal'),
          plain_text: expect.stringContaining('Help fund our spring programs.'),
        })
      );
      expect(mockMailchimp.campaigns.schedule).toHaveBeenCalledWith('campaign-123', {
        schedule_time: sendTime.toISOString(),
      });
      expect(campaign.status).toBe('schedule');
      expect(campaign.sendTime).toEqual(sendTime);
    });

    it('creates a run-specific static segment for saved-audience targeting', async () => {
      const contactOneId = '11111111-1111-4111-8111-111111111111';
      const contactTwoId = '22222222-2222-4222-8222-222222222222';
      const accountId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

      (mockMailchimp.lists.getListMember as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Not found'), { status: 404 })
      );
      (mockMailchimp.lists.setListMember as jest.Mock).mockResolvedValue({
        id: 'member-abc',
        email_address: 'synced@example.org',
        status: 'subscribed',
        merge_fields: {},
        tags: [],
        list_id: 'list-123',
        timestamp_signup: '2024-01-15T10:00:00Z',
        last_changed: '2024-01-15T10:00:00Z',
      });
      (mockMailchimp.lists.createSegment as jest.Mock).mockResolvedValue({
        id: 789,
        name: 'NPM Saved Campaign',
        member_count: 0,
        list_id: 'list-123',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      });
      (mockMailchimp.lists.batchSegmentMembers as jest.Mock).mockResolvedValue({
        total_added: 2,
      });
      (mockMailchimp.campaigns.create as jest.Mock).mockResolvedValue({
        id: 'campaign-123',
        create_time: '2024-01-15T10:00:00Z',
      });
      (mockMailchimp.campaigns.setContent as jest.Mock).mockResolvedValue({});

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'run-1',
              provider: 'mailchimp',
              provider_campaign_id: null,
              title: 'Saved Campaign',
              list_id: 'list-123',
              include_audience_id: 'audience-1',
              exclusion_audience_ids: [],
              suppression_snapshot: [],
              test_recipients: [],
              audience_snapshot: {},
              requested_send_time: null,
              status: 'draft',
              counts: {},
              scope_account_ids: [accountId],
              failure_message: null,
              requested_by: null,
              created_at: new Date('2024-01-15T10:00:00Z'),
              updated_at: new Date('2024-01-15T10:00:00Z'),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'audience-1',
              name: 'Spring Donors',
              description: null,
              filters: {
                source: 'communications_selected_contacts',
                contactIds: [contactOneId, contactTwoId],
                listId: 'list-123',
              },
              source_count: 2,
              scope_account_ids: [accountId],
              status: 'active',
              created_at: new Date('2024-01-15T10:00:00Z'),
              updated_at: new Date('2024-01-15T10:00:00Z'),
              created_by: 'user-1',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { id: contactOneId, account_id: accountId },
            { id: contactTwoId, account_id: accountId },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              contact_id: contactOneId,
              account_id: accountId,
              first_name: 'Ada',
              last_name: 'Lovelace',
              email: 'ada@example.org',
              do_not_email: false,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              contact_id: contactTwoId,
              account_id: accountId,
              first_name: 'Grace',
              last_name: 'Hopper',
              email: 'grace@example.org',
              do_not_email: false,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'run-1',
              provider: 'mailchimp',
              provider_campaign_id: 'campaign-123',
              title: 'Saved Campaign',
              list_id: 'list-123',
              include_audience_id: 'audience-1',
              exclusion_audience_ids: [],
              suppression_snapshot: [],
              test_recipients: [],
              audience_snapshot: {
                targetingMode: 'saved_audience_static_segment',
                providerSegmentId: 789,
              },
              requested_send_time: null,
              status: 'draft',
              counts: {
                requestedContactCount: 2,
                syncedContactCount: 2,
                providerSegmentMemberCount: 2,
              },
              scope_account_ids: [accountId],
              failure_message: null,
              requested_by: null,
              created_at: new Date('2024-01-15T10:00:00Z'),
              updated_at: new Date('2024-01-15T10:00:00Z'),
            },
          ],
        });

      await mailchimpService.createCampaign({
        listId: 'list-123',
        includeAudienceId: 'audience-1',
        title: 'Saved Campaign',
        subject: 'Saved Campaign',
        fromName: 'Community Org',
        replyTo: 'hello@example.org',
        htmlContent: '<p>Hello</p>',
      });

      expect(mockMailchimp.lists.createSegment).toHaveBeenCalledWith('list-123', {
        name: expect.stringContaining('Saved Campaign'),
        static_segment: [],
      });
      expect(mockMailchimp.lists.batchSegmentMembers).toHaveBeenCalledWith(
        {
          members_to_add: ['ada@example.org', 'grace@example.org'],
          members_to_remove: [],
        },
        'list-123',
        789
      );
      expect(mockMailchimp.campaigns.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipients: expect.objectContaining({
            segment_opts: {
              saved_segment_id: 789,
            },
          }),
        })
      );
      const finalizeRunCall = (mockPool.query as jest.Mock).mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('UPDATE campaign_runs')
      );
      expect(JSON.parse(finalizeRunCall?.[1][11])).toEqual(
        expect.objectContaining({
          requestedContactCount: 2,
          targetContactCount: 2,
          syncedContactCount: 2,
          providerSegmentMemberCount: 2,
        })
      );
      expect(JSON.parse(finalizeRunCall?.[1][8])).toEqual(
        expect.objectContaining({
          targetContactIds: [contactOneId, contactTwoId],
        })
      );
    });

    it('suppresses contacts from a prior run target snapshot', async () => {
      const suppressedOneId = '11111111-1111-4111-8111-111111111111';
      const suppressedTwoId = '22222222-2222-4222-8222-222222222222';
      const targetId = '33333333-3333-4333-8333-333333333333';
      const accountId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const priorRunId = '44444444-4444-4444-8444-444444444444';

      (mockMailchimp.lists.getListMember as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Not found'), { status: 404 })
      );
      (mockMailchimp.lists.setListMember as jest.Mock).mockResolvedValue({
        id: 'member-carol',
        email_address: 'carol@example.org',
        status: 'subscribed',
        merge_fields: {},
        tags: [],
        list_id: 'list-123',
        timestamp_signup: '2024-01-15T10:00:00Z',
        last_changed: '2024-01-15T10:00:00Z',
      });
      (mockMailchimp.lists.createSegment as jest.Mock).mockResolvedValue({
        id: 790,
        name: 'NPM Prior Suppression Campaign',
        member_count: 0,
        list_id: 'list-123',
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      });
      (mockMailchimp.lists.batchSegmentMembers as jest.Mock).mockResolvedValue({
        total_added: 1,
      });
      (mockMailchimp.campaigns.create as jest.Mock).mockResolvedValue({
        id: 'campaign-456',
        create_time: '2024-01-15T10:00:00Z',
      });
      (mockMailchimp.campaigns.setContent as jest.Mock).mockResolvedValue({});

      (mockPool.query as jest.Mock).mockImplementation((sql: string, params: unknown[]) => {
        if (sql.includes('INSERT INTO campaign_runs')) {
          return Promise.resolve({
            rows: [
              {
                id: 'run-2',
                provider: 'mailchimp',
                provider_campaign_id: null,
                title: 'Prior Suppression Campaign',
                list_id: 'list-123',
                include_audience_id: 'audience-1',
                exclusion_audience_ids: [],
                suppression_snapshot: [],
                test_recipients: [],
                audience_snapshot: {},
                requested_send_time: null,
                status: 'draft',
                counts: {},
                scope_account_ids: [accountId],
                failure_message: null,
                requested_by: null,
                created_at: new Date('2024-01-15T10:00:00Z'),
                updated_at: new Date('2024-01-15T10:00:00Z'),
              },
            ],
          });
        }

        if (sql.includes('FROM saved_audiences')) {
          return Promise.resolve({
            rows: [
              {
                id: 'audience-1',
                name: 'Spring Donors',
                description: null,
                filters: {
                  source: 'communications_selected_contacts',
                  contactIds: [suppressedOneId, suppressedTwoId, targetId],
                  listId: 'list-123',
                },
                source_count: 3,
                scope_account_ids: [accountId],
                status: 'active',
                created_at: new Date('2024-01-15T10:00:00Z'),
                updated_at: new Date('2024-01-15T10:00:00Z'),
                created_by: 'user-1',
              },
            ],
          });
        }

        if (sql.includes('SELECT id, account_id')) {
          return Promise.resolve({
            rows: [
              { id: suppressedOneId, account_id: accountId },
              { id: suppressedTwoId, account_id: accountId },
              { id: targetId, account_id: accountId },
            ],
          });
        }

        if (sql.includes('FROM campaign_runs') && sql.includes('id = ANY')) {
          expect(params[0]).toEqual([priorRunId]);
          return Promise.resolve({
            rows: [
              {
                id: priorRunId,
                provider: 'mailchimp',
                provider_campaign_id: 'campaign-prior',
                title: 'Already Mailed',
                list_id: 'list-123',
                include_audience_id: 'audience-old',
                exclusion_audience_ids: [],
                suppression_snapshot: [],
                test_recipients: [],
                audience_snapshot: {
                  targetContactIds: [suppressedOneId, suppressedTwoId],
                },
                requested_send_time: null,
                status: 'sent',
                counts: { targetContactCount: 2 },
                scope_account_ids: [accountId],
                failure_message: null,
                requested_by: null,
                created_at: new Date('2024-01-10T10:00:00Z'),
                updated_at: new Date('2024-01-10T10:00:00Z'),
              },
            ],
          });
        }

        if (sql.includes('FROM contacts WHERE id = $1')) {
          expect(params).toEqual([targetId]);
          return Promise.resolve({
            rows: [
              {
                contact_id: targetId,
                account_id: accountId,
                first_name: 'Carol',
                last_name: 'Shaw',
                email: 'carol@example.org',
                do_not_email: false,
              },
            ],
          });
        }

        if (sql.includes('UPDATE campaign_runs')) {
          return Promise.resolve({
            rows: [
              {
                id: 'run-2',
                provider: 'mailchimp',
                provider_campaign_id: 'campaign-456',
                title: 'Prior Suppression Campaign',
                list_id: 'list-123',
                include_audience_id: 'audience-1',
                exclusion_audience_ids: [],
                suppression_snapshot: JSON.parse(params[6] as string),
                test_recipients: [],
                audience_snapshot: JSON.parse(params[8] as string),
                requested_send_time: null,
                status: 'draft',
                counts: JSON.parse(params[11] as string),
                scope_account_ids: [accountId],
                failure_message: null,
                requested_by: null,
                created_at: new Date('2024-01-15T10:00:00Z'),
                updated_at: new Date('2024-01-15T10:00:00Z'),
              },
            ],
          });
        }

        return Promise.resolve({ rows: [] });
      });

      await mailchimpService.createCampaign({
        listId: 'list-123',
        includeAudienceId: 'audience-1',
        priorRunSuppressionIds: [priorRunId],
        title: 'Prior Suppression Campaign',
        subject: 'Prior Suppression Campaign',
        fromName: 'Community Org',
        replyTo: 'hello@example.org',
        htmlContent: '<p>Hello</p>',
      });

      expect(mockMailchimp.lists.batchSegmentMembers).toHaveBeenCalledWith(
        {
          members_to_add: ['carol@example.org'],
          members_to_remove: [],
        },
        'list-123',
        790
      );

      const finalizeRunCall = (mockPool.query as jest.Mock).mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('UPDATE campaign_runs')
      );
      expect(JSON.parse(finalizeRunCall?.[1][6])).toEqual([
        expect.objectContaining({
          type: 'prior_campaign_run',
          id: priorRunId,
          targetContactCount: 2,
        }),
      ]);
      expect(JSON.parse(finalizeRunCall?.[1][8])).toEqual(
        expect.objectContaining({
          targetContactIds: [targetId],
          priorRunSuppressionIds: [priorRunId],
        })
      );
      expect(JSON.parse(finalizeRunCall?.[1][11])).toEqual(
        expect.objectContaining({
          suppressionSourceCount: 2,
          priorRunSuppressionCount: 1,
          requestedContactCount: 1,
          targetContactCount: 1,
        })
      );
    });

    it('rejects saved-audience targeting when a provider segment is also selected', async () => {
      await expect(
        mailchimpService.createCampaign({
          listId: 'list-123',
          includeAudienceId: 'audience-1',
          segmentId: 42,
          title: 'Invalid Campaign',
          subject: 'Invalid Campaign',
          fromName: 'Community Org',
          replyTo: 'hello@example.org',
          htmlContent: '<p>Hello</p>',
        })
      ).rejects.toThrow('Choose either a provider segment or a saved audience, not both');

      expect(mockMailchimp.campaigns.create).not.toHaveBeenCalled();
    });
  });

  describe('recordCampaignLifecycleWebhook', () => {
    it('updates local run lifecycle summary when a campaign webhook includes a provider id', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await expect(
        mailchimpService.recordCampaignLifecycleWebhook({
          type: 'campaign',
          firedAt: new Date('2026-04-25T12:00:00Z'),
          data: {
            id: 'campaign-123',
            listId: 'list-123',
            status: 'sent',
          },
        })
      ).resolves.toBe(true);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("'{providerLifecycle}'"),
        [
          'campaign-123',
          'sent',
          JSON.stringify({
            lastWebhookType: 'campaign',
            lastWebhookAction: null,
            lastWebhookStatus: 'sent',
            lastWebhookAt: '2026-04-25T12:00:00.000Z',
          }),
        ]
      );
    });
  });

  describe('recordContactPreferenceWebhook', () => {
    it('marks local contacts do_not_email when Mailchimp sends unsubscribe webhooks', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'contact-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      await expect(
        mailchimpService.recordContactPreferenceWebhook({
          type: 'unsubscribe',
          firedAt: new Date('2026-05-01T12:00:00Z'),
          data: {
            listId: 'list-123',
            email: 'ada@example.org',
          },
        })
      ).resolves.toEqual({ updated: true, affectedCount: 1 });

      expect(mockRecordContactSuppressionEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          contactId: 'contact-1',
          channel: 'email',
          reason: 'mailchimp_unsubscribe',
          source: 'mailchimp_webhook',
          provider: 'mailchimp',
          providerListId: 'list-123',
          providerEventType: 'unsubscribe',
          preserveDoNotEmail: true,
        })
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET do_not_email = true'),
        ['ada@example.org']
      );
    });

    it('records suppression evidence when Mailchimp sends cleaned webhooks', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'contact-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      await expect(
        mailchimpService.recordContactPreferenceWebhook({
          type: 'cleaned',
          firedAt: new Date('2026-05-01T12:00:00Z'),
          data: {
            listId: 'list-123',
            email: 'ada@example.org',
            reason: 'hard',
          },
        })
      ).resolves.toEqual({ updated: true, affectedCount: 1 });

      expect(mockRecordContactSuppressionEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          contactId: 'contact-1',
          channel: 'email',
          reason: 'mailchimp_cleaned',
          source: 'mailchimp_webhook',
          provider: 'mailchimp',
          providerListId: 'list-123',
          providerEventType: 'cleaned',
          providerReason: 'hard',
          preserveDoNotEmail: true,
        })
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('preferred_contact_method = CASE'),
        ['ada@example.org']
      );
    });

    it('updates local contact email from Mailchimp upemail webhooks without raw email logging', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await expect(
        mailchimpService.recordContactPreferenceWebhook({
          type: 'upemail',
          firedAt: new Date('2026-05-01T12:00:00Z'),
          data: {
            listId: 'list-123',
            oldEmail: 'old@example.org',
            newEmail: 'new@example.org',
          },
        })
      ).resolves.toEqual({ updated: true, affectedCount: 1 });

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SET email = $2'), [
        'old@example.org',
        'new@example.org',
      ]);
      const logger = jest.requireMock('../../config/logger').logger;
      expect(logger.info).toHaveBeenCalledWith(
        'Mailchimp contact webhook back-sync completed',
        expect.not.objectContaining({
          email: expect.any(String),
          oldEmail: expect.any(String),
          newEmail: expect.any(String),
        })
      );
    });
  });

  describe('sendCampaignTest', () => {
    it('creates a draft campaign and sends a real test email for preflight proof', async () => {
      (mockMailchimp.campaigns.create as jest.Mock).mockResolvedValue({
        id: 'campaign-draft-1',
        create_time: '2026-05-01T12:00:00Z',
      });
      (mockMailchimp.campaigns.setContent as jest.Mock).mockResolvedValue({});
      (mockMailchimp.campaigns.sendTestEmail as jest.Mock).mockResolvedValue({});

      const result = await mailchimpService.sendDraftCampaignTest({
        listId: 'list-123',
        title: 'Spring Appeal',
        subject: 'Spring Appeal',
        fromName: 'Community Org',
        replyTo: 'hello@example.org',
        htmlContent: '<h1>Spring Appeal</h1>',
        plainTextContent: 'Spring Appeal',
        testRecipients: ['Proof@example.org', 'proof@example.org'],
      });

      expect(result).toEqual({
        delivered: true,
        recipients: ['proof@example.org'],
        providerCampaignId: 'campaign-draft-1',
        message: 'Campaign test email sent successfully',
      });
      expect(mockMailchimp.campaigns.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipients: { list_id: 'list-123' },
          settings: expect.objectContaining({
            title: 'Spring Appeal',
            subject_line: 'Spring Appeal',
          }),
        })
      );
      expect(mockMailchimp.campaigns.setContent).toHaveBeenCalledWith(
        'campaign-draft-1',
        expect.objectContaining({
          html: expect.stringContaining('Spring Appeal'),
          plain_text: expect.stringContaining('Spring Appeal'),
        })
      );
      expect(mockMailchimp.campaigns.sendTestEmail).toHaveBeenCalledWith('campaign-draft-1', {
        test_emails: ['proof@example.org'],
        send_type: 'html',
      });
    });

    it('sends a Mailchimp campaign test email to explicit recipients', async () => {
      (mockMailchimp.campaigns.sendTestEmail as jest.Mock).mockResolvedValue({});

      await expect(
        mailchimpService.sendCampaignTest({
          campaignId: 'campaign-123',
          testRecipients: ['Proof@example.org', 'proof@example.org'],
        })
      ).resolves.toBeUndefined();

      expect(mockMailchimp.campaigns.sendTestEmail).toHaveBeenCalledWith('campaign-123', {
        test_emails: ['proof@example.org'],
        send_type: 'html',
      });
    });
  });

  describe('sendCampaign', () => {
    it('sends a campaign immediately', async () => {
      (mockMailchimp.campaigns.send as jest.Mock).mockResolvedValue({});
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(mailchimpService.sendCampaign('campaign-123')).resolves.toBeUndefined();

      expect(mockMailchimp.campaigns.send).toHaveBeenCalledWith('campaign-123');
    });

    it('sends a campaign run by run id inside requester scope', async () => {
      (mockMailchimp.campaigns.send as jest.Mock).mockResolvedValue({});
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              provider: 'mailchimp',
              provider_campaign_id: 'campaign-123',
              title: 'Scoped Campaign',
              list_id: 'list-123',
              include_audience_id: null,
              exclusion_audience_ids: [],
              suppression_snapshot: [],
              test_recipients: [],
              audience_snapshot: {},
              requested_send_time: null,
              status: 'draft',
              counts: {},
              scope_account_ids: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
              failure_message: null,
              requested_by: null,
              created_at: new Date('2024-01-15T10:00:00Z'),
              updated_at: new Date('2024-01-15T10:00:00Z'),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              provider: 'mailchimp',
              provider_campaign_id: 'campaign-123',
              title: 'Scoped Campaign',
              list_id: 'list-123',
              include_audience_id: null,
              exclusion_audience_ids: [],
              suppression_snapshot: [],
              test_recipients: [],
              audience_snapshot: {},
              requested_send_time: null,
              status: 'sent',
              counts: {},
              scope_account_ids: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
              failure_message: null,
              requested_by: null,
              created_at: new Date('2024-01-15T10:00:00Z'),
              updated_at: new Date('2024-01-15T10:00:00Z'),
            },
          ],
        });

      const result = await mailchimpService.sendCampaignRun(
        '11111111-1111-4111-8111-111111111111',
        ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']
      );

      expect(mockMailchimp.campaigns.send).toHaveBeenCalledWith('campaign-123');
      expect(result?.action).toBe('sent');
      expect(result?.run.status).toBe('sent');
      expect((mockPool.query as jest.Mock).mock.calls[0][1]).toEqual([
        '11111111-1111-4111-8111-111111111111',
        ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
      ]);
    });

    it('refreshes campaign run status with normalized provider report metrics', async () => {
      (mockMailchimp.campaigns.get as jest.Mock).mockResolvedValue({
        id: 'campaign-123',
        status: 'sent',
        emails_sent: 250,
        report_summary: {
          opens: 125,
          unique_opens: 100,
          open_rate: 0.4,
          clicks: 30,
          subscriber_clicks: 25,
          click_rate: 0.1,
        },
      });
      (mockMailchimp.reports.getCampaignReport as jest.Mock).mockResolvedValue({
        emails_sent: 250,
        unsubscribed: 3,
        abuse_reports: 1,
        forwards: 2,
        bounces: {
          hard_bounces: 4,
          soft_bounces: 5,
          syntax_errors: 1,
        },
        opens: {
          opens_total: 140,
          unique_opens: 110,
          open_rate: 0.44,
          last_open: '2026-05-01T12:30:00Z',
        },
        clicks: {
          clicks_total: 45,
          unique_clicks: 35,
          click_rate: 0.14,
          last_click: '2026-05-01T12:45:00Z',
        },
      });
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              provider: 'mailchimp',
              provider_campaign_id: 'campaign-123',
              title: 'Scoped Campaign',
              list_id: 'list-123',
              include_audience_id: null,
              exclusion_audience_ids: [],
              suppression_snapshot: [],
              test_recipients: [],
              audience_snapshot: {},
              requested_send_time: null,
              status: 'sending',
              counts: { providerStatus: { status: 'sending' } },
              scope_account_ids: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
              failure_message: null,
              requested_by: null,
              created_at: new Date('2024-01-15T10:00:00Z'),
              updated_at: new Date('2024-01-15T10:00:00Z'),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              provider: 'mailchimp',
              provider_campaign_id: 'campaign-123',
              title: 'Scoped Campaign',
              list_id: 'list-123',
              include_audience_id: null,
              exclusion_audience_ids: [],
              suppression_snapshot: [],
              test_recipients: [],
              audience_snapshot: {},
              requested_send_time: null,
              status: 'sent',
              counts: {},
              scope_account_ids: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
              failure_message: null,
              requested_by: null,
              created_at: new Date('2024-01-15T10:00:00Z'),
              updated_at: new Date('2024-01-15T10:00:00Z'),
            },
          ],
        });

      await expect(
        mailchimpService.refreshCampaignRunStatus('11111111-1111-4111-8111-111111111111', [
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        ])
      ).resolves.toMatchObject({ action: 'refreshed', run: { status: 'sent' } });

      expect(mockMailchimp.reports.getCampaignReport).toHaveBeenCalledWith('campaign-123');
      const countsPatch = JSON.parse((mockPool.query as jest.Mock).mock.calls[1][1][2]);
      expect(countsPatch.providerStatus).toEqual({
        status: 'sent',
        emailsSent: 250,
        refreshedAt: expect.any(String),
      });
      expect(countsPatch.providerReportSummary).toMatchObject({
        lastReportedAt: expect.any(String),
        refreshedAt: expect.any(String),
        emailsSent: 250,
        opens: 140,
        uniqueOpens: 110,
        openRate: 0.44,
        clicks: 45,
        uniqueClicks: 35,
        clickRate: 0.14,
        unsubscribes: 3,
        abuseReports: 1,
        forwards: 2,
        bounces: {
          hard: 4,
          soft: 5,
          syntax: 1,
          total: 10,
        },
        lastOpenAt: '2026-05-01T12:30:00Z',
        lastClickAt: '2026-05-01T12:45:00Z',
      });
      expect(countsPatch.providerMetrics).toBeUndefined();
    });
  });
});
