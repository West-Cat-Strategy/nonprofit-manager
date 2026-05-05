import type { Pool } from 'pg';
import { PublishService } from '@services/publishing/publishService';

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
} as unknown as Pool;

describe('PublishService', () => {
  let service: PublishService;
  let mockClient: { query: jest.Mock; release: jest.Mock };
  const originalSiteBaseUrl = process.env.SITE_BASE_URL;

  const mockUserId = 'user-123';
  const mockTemplateId = 'template-456';
  const mockSiteId = 'site-789';

  const existingSiteRow = {
    id: mockSiteId,
    user_id: mockUserId,
    owner_user_id: mockUserId,
    organization_id: null,
    site_kind: 'organization',
    parent_site_id: null,
    migration_status: 'complete',
    template_id: mockTemplateId,
    name: 'Test Site',
    subdomain: 'test-site',
    custom_domain: 'example.com',
    ssl_enabled: false,
    ssl_certificate_expires_at: null,
    status: 'published',
    published_version: 'v-old',
    published_at: new Date('2026-03-01T00:00:00.000Z').toISOString(),
    published_content: { templateId: mockTemplateId },
    analytics_enabled: true,
    created_at: new Date('2026-03-01T00:00:00.000Z').toISOString(),
    updated_at: new Date('2026-03-01T00:00:00.000Z').toISOString(),
  };

  const templateRow = {
    id: mockTemplateId,
    name: 'Community Template',
    description: 'A community site template',
    theme: {},
    global_settings: {},
    pages: [],
    organization_id: null,
    owner_user_id: mockUserId,
    user_id: mockUserId,
    migration_status: 'complete',
  };

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    service = new PublishService(mockPool);
    (mockPool.query as jest.Mock).mockReset();
    (mockPool.connect as jest.Mock).mockReset();
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    if (originalSiteBaseUrl === undefined) {
      delete process.env.SITE_BASE_URL;
    } else {
      process.env.SITE_BASE_URL = originalSiteBaseUrl;
    }
  });

  it('publishes a live site and updates the current deployment', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingSiteRow] });
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [templateRow] })
      .mockResolvedValueOnce({
        rows: [
          {
            ...existingSiteRow,
            published_version: 'v-live-1',
            published_at: new Date().toISOString(),
            published_content: { templateId: mockTemplateId, version: 'live' },
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'version-row',
            site_id: mockSiteId,
            version: 'v-live-1',
            published_content: { templateId: mockTemplateId },
            published_at: new Date().toISOString(),
            published_by: mockUserId,
            change_description: 'Published via API',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.publish(mockUserId, mockTemplateId, mockSiteId, undefined, 'live');

    expect(result.target).toBe('live');
    expect(result.siteId).toBe(mockSiteId);
    expect(result.url).toBe('https://example.com');
    expect(result.previewUrl).toContain('?preview=true&version=');
    expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE published_sites'), [
      expect.any(String),
      expect.stringMatching(/^v/),
      mockSiteId,
    ]);
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO site_versions'),
      expect.arrayContaining([mockSiteId, expect.stringMatching(/^v/), expect.anything(), mockUserId])
    );
  });

  it('creates a preview deployment without mutating the live site row', async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingSiteRow] });
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [templateRow] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'version-row',
            site_id: mockSiteId,
            version: 'preview-v-live-1',
            published_content: { templateId: mockTemplateId },
            published_at: new Date().toISOString(),
            published_by: mockUserId,
            change_description: 'Preview publish via API',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.publish(mockUserId, mockTemplateId, mockSiteId, undefined, 'preview');

    expect(result.target).toBe('preview');
    expect(result.siteId).toBe(mockSiteId);
    expect(result.previewUrl).toMatch(
      /^https:\/\/example\.com\?preview=true&version=preview-v\d+$/
    );
    expect(mockClient.query.mock.calls.some(([sql]) => String(sql).includes('UPDATE published_sites'))).toBe(false);
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO site_versions'),
      expect.arrayContaining([mockSiteId, expect.stringMatching(/^preview-v/), expect.anything(), mockUserId])
    );
  });

  it('publishes subdomain sites to the Caddy public-site host', async () => {
    process.env.SITE_BASE_URL = 'http://sites.localhost';
    const subdomainSiteRow = {
      ...existingSiteRow,
      custom_domain: null,
      subdomain: 'mutual-aid',
    };
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [subdomainSiteRow] });
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [templateRow] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'version-row',
            site_id: mockSiteId,
            version: 'preview-v-live-1',
            published_content: { templateId: mockTemplateId },
            published_at: new Date().toISOString(),
            published_by: mockUserId,
            change_description: 'Preview publish via API',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.publish(mockUserId, mockTemplateId, mockSiteId, undefined, 'preview');

    expect(result.url).toBe('http://mutual-aid.sites.localhost');
    expect(result.previewUrl).toMatch(
      /^http:\/\/mutual-aid\.sites\.localhost\?preview=true&version=preview-v\d+$/
    );
  });
});
