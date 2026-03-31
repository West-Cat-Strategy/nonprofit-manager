import type { Pool } from 'pg';
import { VersionService } from '@services/publishing/versionService';

const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

describe('VersionService', () => {
  let service: VersionService;

  const mockUserId = 'user-123';
  const mockSiteId = 'site-789';

  const mockSiteRow = {
    id: mockSiteId,
    user_id: mockUserId,
    owner_user_id: mockUserId,
    organization_id: null,
    site_kind: 'organization',
    parent_site_id: null,
    migration_status: 'complete',
    template_id: 'template-456',
    name: 'Test Site',
    subdomain: 'test-site',
    custom_domain: 'example.com',
    ssl_enabled: false,
    ssl_certificate_expires_at: null,
    status: 'published',
    published_version: 'v-live-2',
    published_at: new Date('2026-03-04T00:00:00.000Z').toISOString(),
    published_content: { templateId: 'template-456' },
    analytics_enabled: true,
    created_at: new Date('2026-03-01T00:00:00.000Z').toISOString(),
    updated_at: new Date('2026-03-04T00:00:00.000Z').toISOString(),
  };

  const mockVersionRow = {
    id: 'version-1',
    site_id: mockSiteId,
    version: 'v-live-1',
    published_content: { templateId: 'template-456', step: 'first publish' },
    published_at: new Date('2026-03-02T00:00:00.000Z').toISOString(),
    published_by: mockUserId,
    change_description: 'Initial publish',
  };

  beforeEach(() => {
    service = new VersionService(mockPool);
    (mockPool.query as jest.Mock).mockReset();
  });

  it('returns a published version for public preview links', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockVersionRow] })
      .mockResolvedValueOnce({ rows: [{ published_version: mockSiteRow.published_version }] });

    const result = await service.getPublicVersion(mockSiteId, 'v-live-1');

    expect(result).toMatchObject({
      id: 'version-1',
      siteId: mockSiteId,
      version: 'v-live-1',
      changeDescription: 'Initial publish',
      isCurrent: false,
    });
    expect(mockPool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT * FROM site_versions WHERE site_id = $1 AND version = $2',
      [mockSiteId, 'v-live-1']
    );
    expect(mockPool.query).toHaveBeenNthCalledWith(
      2,
      'SELECT published_version FROM published_sites WHERE id = $1',
      [mockSiteId]
    );
  });

  it('rolls back to a prior version and writes an audit entry', async () => {
    (mockPool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockSiteRow] })
      .mockResolvedValueOnce({ rows: [mockVersionRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rollback-version-row',
            site_id: mockSiteId,
            version: 'v-live-1-rollback-123',
            published_content: mockVersionRow.published_content,
            published_at: new Date('2026-03-05T00:00:00.000Z').toISOString(),
            published_by: mockUserId,
            change_description: 'Rollback from v-live-2 to v-live-1',
          },
        ],
      });

    const result = await service.rollback(mockSiteId, mockUserId, 'v-live-1');

    expect(result).toMatchObject({
      success: true,
      siteId: mockSiteId,
      previousVersion: 'v-live-2',
      currentVersion: 'v-live-1',
      message: 'Successfully rolled back from v-live-2 to v-live-1',
    });
    expect(mockPool.query).toHaveBeenNthCalledWith(
      2,
      'SELECT * FROM site_versions WHERE site_id = $1 AND version = $2',
      [mockSiteId, 'v-live-1']
    );
    expect(mockPool.query).toHaveBeenNthCalledWith(
      3,
      `UPDATE published_sites
       SET published_content = $1,
           published_version = $2,
           published_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [JSON.stringify(mockVersionRow.published_content), 'v-live-1', mockSiteId]
    );
    expect(mockPool.query).toHaveBeenNthCalledWith(
      4,
      `INSERT INTO site_versions (site_id, version, published_content, published_by, change_description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        mockSiteId,
        expect.stringMatching(/^v-live-1-rollback-/),
        JSON.stringify(mockVersionRow.published_content),
        mockUserId,
        'Rollback from v-live-2 to v-live-1',
      ]
    );
  });
});
