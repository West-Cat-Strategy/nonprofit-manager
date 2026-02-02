/**
 * Publishing Service Tests
 */

import { PublishingService } from '../../services/publishingService';
import pool from '../../config/database';

// Mock the database pool
jest.mock('../../config/database', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

describe('PublishingService', () => {
  let service: PublishingService;
  const mockUserId = 'user-123';
  const mockTemplateId = 'template-456';
  const mockSiteId = 'site-789';

  beforeEach(() => {
    service = new PublishingService();
    jest.clearAllMocks();
  });

  describe('createSite', () => {
    it('should create a new site', async () => {
      const mockSiteRow = {
        id: mockSiteId,
        user_id: mockUserId,
        template_id: mockTemplateId,
        name: 'Test Site',
        subdomain: 'test-site',
        custom_domain: null,
        ssl_enabled: false,
        ssl_certificate_expires_at: null,
        status: 'draft',
        published_version: null,
        published_at: null,
        published_content: null,
        analytics_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock template existence check
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockTemplateId }] })
        // Mock subdomain check
        .mockResolvedValueOnce({ rows: [] })
        // Mock insert
        .mockResolvedValueOnce({ rows: [mockSiteRow] });

      const result = await service.createSite(mockUserId, {
        templateId: mockTemplateId,
        name: 'Test Site',
        subdomain: 'test-site',
      });

      expect(result).toMatchObject({
        id: mockSiteId,
        name: 'Test Site',
        subdomain: 'test-site',
        status: 'draft',
      });
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it('should throw error if template not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        service.createSite(mockUserId, {
          templateId: mockTemplateId,
          name: 'Test Site',
        })
      ).rejects.toThrow('Template not found or access denied');
    });

    it('should throw error if subdomain already taken', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: mockTemplateId }] })
        .mockResolvedValueOnce({ rows: [{ id: 'other-site' }] });

      await expect(
        service.createSite(mockUserId, {
          templateId: mockTemplateId,
          name: 'Test Site',
          subdomain: 'taken-subdomain',
        })
      ).rejects.toThrow('Subdomain is already taken');
    });
  });

  describe('getSite', () => {
    it('should return site when found', async () => {
      const mockSiteRow = {
        id: mockSiteId,
        user_id: mockUserId,
        template_id: mockTemplateId,
        name: 'Test Site',
        subdomain: 'test-site',
        custom_domain: null,
        ssl_enabled: false,
        ssl_certificate_expires_at: null,
        status: 'published',
        published_version: 'v1234567890',
        published_at: new Date().toISOString(),
        published_content: { templateId: mockTemplateId },
        analytics_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockSiteRow] });

      const result = await service.getSite(mockSiteId, mockUserId);

      expect(result).toMatchObject({
        id: mockSiteId,
        name: 'Test Site',
        status: 'published',
      });
    });

    it('should return null when site not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.getSite(mockSiteId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('updateSite', () => {
    it('should update site properties', async () => {
      const mockSiteRow = {
        id: mockSiteId,
        user_id: mockUserId,
        template_id: mockTemplateId,
        name: 'Updated Site',
        subdomain: 'updated-site',
        custom_domain: null,
        ssl_enabled: false,
        ssl_certificate_expires_at: null,
        status: 'draft',
        published_version: null,
        published_at: null,
        published_content: null,
        analytics_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock getSite
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockSiteRow] })
        // Mock subdomain check
        .mockResolvedValueOnce({ rows: [] })
        // Mock update
        .mockResolvedValueOnce({ rows: [mockSiteRow] });

      const result = await service.updateSite(mockSiteId, mockUserId, {
        name: 'Updated Site',
        subdomain: 'updated-site',
        analyticsEnabled: false,
      });

      expect(result).toMatchObject({
        name: 'Updated Site',
        subdomain: 'updated-site',
        analyticsEnabled: false,
      });
    });

    it('should return null when site not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.updateSite(mockSiteId, mockUserId, {
        name: 'New Name',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteSite', () => {
    it('should delete site and return true', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: mockSiteId }],
      });

      const result = await service.deleteSite(mockSiteId, mockUserId);

      expect(result).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM published_sites WHERE id = $1 AND user_id = $2 RETURNING id',
        [mockSiteId, mockUserId]
      );
    });

    it('should return false when site not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.deleteSite(mockSiteId, mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('searchSites', () => {
    it('should return paginated sites', async () => {
      const mockSiteRow = {
        id: mockSiteId,
        user_id: mockUserId,
        template_id: mockTemplateId,
        name: 'Test Site',
        subdomain: 'test-site',
        custom_domain: null,
        ssl_enabled: false,
        ssl_certificate_expires_at: null,
        status: 'draft',
        published_version: null,
        published_at: null,
        published_content: null,
        analytics_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (pool.query as jest.Mock)
        // Count query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        // Results query
        .mockResolvedValueOnce({ rows: [mockSiteRow] });

      const result = await service.searchSites(mockUserId, {
        page: 1,
        limit: 10,
      });

      expect(result).toMatchObject({
        sites: expect.arrayContaining([
          expect.objectContaining({ id: mockSiteId }),
        ]),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.searchSites(mockUserId, {
        status: 'published',
        page: 1,
        limit: 10,
      });

      expect(result.sites).toHaveLength(0);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $2'),
        expect.arrayContaining([mockUserId, 'published'])
      );
    });
  });

  describe('unpublish', () => {
    it('should set site status to draft', async () => {
      const mockSiteRow = {
        id: mockSiteId,
        user_id: mockUserId,
        template_id: mockTemplateId,
        name: 'Test Site',
        subdomain: 'test-site',
        custom_domain: null,
        ssl_enabled: false,
        ssl_certificate_expires_at: null,
        status: 'draft',
        published_version: 'v123',
        published_at: new Date().toISOString(),
        published_content: {},
        analytics_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockSiteRow] });

      const result = await service.unpublish(mockSiteId, mockUserId);

      expect(result).toMatchObject({
        id: mockSiteId,
        status: 'draft',
      });
    });

    it('should return null when site not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.unpublish(mockSiteId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('recordAnalyticsEvent', () => {
    it('should record a pageview event', async () => {
      const mockEventRow = {
        id: 'event-123',
        site_id: mockSiteId,
        page_path: '/about',
        visitor_id: 'visitor-1',
        session_id: 'session-1',
        user_agent: 'Mozilla/5.0',
        referrer: 'https://google.com',
        country: 'US',
        city: 'New York',
        device_type: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
        event_type: 'pageview',
        event_data: null,
        created_at: new Date().toISOString(),
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockEventRow] });

      const result = await service.recordAnalyticsEvent(mockSiteId, 'pageview', {
        pagePath: '/about',
        visitorId: 'visitor-1',
        sessionId: 'session-1',
        userAgent: 'Mozilla/5.0',
        referrer: 'https://google.com',
        country: 'US',
        city: 'New York',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
      });

      expect(result).toMatchObject({
        siteId: mockSiteId,
        pagePath: '/about',
        eventType: 'pageview',
      });
    });
  });

  describe('getDeploymentInfo', () => {
    it('should return deployment info for a site', async () => {
      const mockSiteRow = {
        id: mockSiteId,
        user_id: mockUserId,
        template_id: mockTemplateId,
        name: 'Test Site',
        subdomain: 'test-site',
        custom_domain: 'example.com',
        ssl_enabled: true,
        ssl_certificate_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'published',
        published_version: 'v1234567890',
        published_at: new Date().toISOString(),
        published_content: {},
        analytics_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockSiteRow] });

      const result = await service.getDeploymentInfo(mockSiteId, mockUserId);

      expect(result).toMatchObject({
        siteId: mockSiteId,
        subdomain: 'test-site',
        customDomain: 'example.com',
        status: 'published',
        sslEnabled: true,
      });
    });

    it('should return null when site not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.getDeploymentInfo(mockSiteId, mockUserId);

      expect(result).toBeNull();
    });
  });
});
