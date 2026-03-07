import type { Pool } from 'pg';
import { SiteAnalyticsService } from '@services/publishing/siteAnalyticsService';

jest.mock('@services/publishing/siteManagementService', () => ({
  __mocks: {
    getSite: jest.fn(),
    mapRowToAnalytics: jest.fn(),
  },
  SiteManagementService: jest.fn().mockImplementation(function SiteManagementServiceMock() {
    const module = jest.requireMock('@services/publishing/siteManagementService') as {
      __mocks: {
        getSite: jest.Mock;
        mapRowToAnalytics: jest.Mock;
      };
    };

    return {
      getSite: module.__mocks.getSite,
      mapRowToAnalytics: module.__mocks.mapRowToAnalytics,
    };
  }),
}));

const siteManagementModule = jest.requireMock('@services/publishing/siteManagementService') as {
  __mocks: {
    getSite: jest.Mock;
    mapRowToAnalytics: jest.Mock;
  };
};

describe('SiteAnalyticsService', () => {
  const baseSite = {
    id: 'site-1',
    userId: 'user-1',
    ownerUserId: 'owner-1',
    organizationId: 'org-1',
    siteKind: 'organization',
    parentSiteId: null,
    migrationStatus: 'complete',
  };

  let pool: Pool;
  let mockQuery: jest.Mock;
  let service: SiteAnalyticsService;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool = { query: mockQuery } as unknown as Pool;
    service = new SiteAnalyticsService(pool);
    siteManagementModule.__mocks.getSite.mockReset();
    siteManagementModule.__mocks.mapRowToAnalytics.mockReset();
    siteManagementModule.__mocks.getSite.mockResolvedValue(baseSite);
    siteManagementModule.__mocks.mapRowToAnalytics.mockImplementation((row) => ({
      id: row.id,
      siteId: row.site_id,
      pagePath: row.page_path,
      eventType: row.event_type,
      createdAt: new Date(row.created_at),
      eventData: row.event_data || null,
      visitorId: row.visitor_id || null,
      sessionId: row.session_id || null,
      userAgent: row.user_agent || null,
      referrer: row.referrer || null,
      country: row.country || null,
      city: row.city || null,
      deviceType: row.device_type || null,
      browser: row.browser || null,
      os: row.os || null,
    }));
  });

  it('aggregates first-class conversion metrics and maps recent events', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            total_pageviews: '42',
            unique_visitors: '18',
            form_submissions: '6',
            event_registrations: '4',
            donations: '3',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'evt-1',
            site_id: 'site-1',
            page_path: '/events/spring-gala',
            event_type: 'event_register',
            created_at: '2026-03-05T12:00:00.000Z',
            event_data: { eventId: 'event-1' },
          },
          {
            id: 'evt-2',
            site_id: 'site-1',
            page_path: '/donate',
            event_type: 'donation',
            created_at: '2026-03-05T13:00:00.000Z',
            event_data: { amount: 50 },
          },
        ],
      });

    const metrics = await service.getConversionMetrics('site-1', 'user-1', 30, 'org-1');

    expect(metrics).toMatchObject({
      totalPageviews: 42,
      uniqueVisitors: 18,
      formSubmissions: 6,
      eventRegistrations: 4,
      donations: 3,
      totalConversions: 13,
    });
    expect(metrics.recentConversions).toHaveLength(2);
    expect(metrics.recentConversions[0]).toMatchObject({
      id: 'evt-1',
      eventType: 'event_register',
      pagePath: '/events/spring-gala',
    });
    expect(siteManagementModule.__mocks.getSite).toHaveBeenCalledWith(
      'site-1',
      'user-1',
      'org-1'
    );
  });

  it('rejects access when the site is outside the caller scope', async () => {
    siteManagementModule.__mocks.getSite.mockResolvedValue(null);

    await expect(
      service.getConversionMetrics('site-1', 'user-1', 30, 'org-1')
    ).rejects.toThrow('Site not found or access denied');

    expect(mockQuery).not.toHaveBeenCalled();
  });
});
