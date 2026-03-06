import type { Pool } from 'pg';
import { SiteManagementService } from '@services/publishing/siteManagementService';

const buildSiteRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'site-1',
  user_id: 'user-1',
  owner_user_id: 'owner-1',
  organization_id: 'org-1',
  site_kind: 'campaign',
  parent_site_id: 'parent-1',
  migration_status: 'complete',
  template_id: 'template-1',
  name: 'Campaign Site',
  subdomain: 'campaign-site',
  custom_domain: 'campaign.example.org',
  ssl_enabled: true,
  ssl_certificate_expires_at: '2026-03-10T00:00:00.000Z',
  status: 'published',
  published_version: 'v2',
  published_at: '2026-03-09T00:00:00.000Z',
  published_content: { pages: [] },
  analytics_enabled: true,
  created_at: '2026-03-08T00:00:00.000Z',
  updated_at: '2026-03-11T00:00:00.000Z',
  ...overrides,
});

describe('SiteManagementService', () => {
  let mockQuery: jest.Mock;
  let service: SiteManagementService;

  beforeEach(() => {
    mockQuery = jest.fn();
    service = new SiteManagementService({ query: mockQuery } as unknown as Pool);
  });

  it('maps a full published site row to the declared contract', () => {
    const site = service.mapRowToSite(buildSiteRow());

    expect(site).toEqual({
      id: 'site-1',
      userId: 'user-1',
      ownerUserId: 'owner-1',
      organizationId: 'org-1',
      siteKind: 'campaign',
      parentSiteId: 'parent-1',
      migrationStatus: 'complete',
      templateId: 'template-1',
      name: 'Campaign Site',
      subdomain: 'campaign-site',
      customDomain: 'campaign.example.org',
      sslEnabled: true,
      sslCertificateExpiresAt: new Date('2026-03-10T00:00:00.000Z'),
      status: 'published',
      publishedVersion: 'v2',
      publishedAt: new Date('2026-03-09T00:00:00.000Z'),
      publishedContent: { pages: [] },
      analyticsEnabled: true,
      createdAt: new Date('2026-03-08T00:00:00.000Z'),
      updatedAt: new Date('2026-03-11T00:00:00.000Z'),
    });
  });

  it('applies backward-safe fallbacks for legacy or null site fields', () => {
    const site = service.mapRowToSite(
      buildSiteRow({
        owner_user_id: null,
        organization_id: null,
        site_kind: null,
        parent_site_id: null,
        migration_status: null,
      })
    );

    expect(site.userId).toBe('user-1');
    expect(site.ownerUserId).toBe('user-1');
    expect(site.organizationId).toBeNull();
    expect(site.siteKind).toBe('organization');
    expect(site.parentSiteId).toBeNull();
    expect(site.migrationStatus).toBe('complete');
  });

  it('persists owner_user_id, site_kind, and parent_site_id when creating a site', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'template-1',
            owner_user_id: 'template-owner',
            organization_id: 'org-1',
            migration_status: 'complete',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'parent-1', organization_id: 'org-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          buildSiteRow({
            owner_user_id: 'user-1',
          }),
        ],
      });

    const site = await service.createSite(
      'user-1',
      {
        templateId: 'template-1',
        name: 'Campaign Site',
        subdomain: 'Campaign-Site',
        customDomain: 'Campaign.Example.Org',
        siteKind: 'campaign',
        parentSiteId: 'parent-1',
      },
      'org-1'
    );

    expect(site.ownerUserId).toBe('user-1');

    const insertCall = mockQuery.mock.calls[4];
    expect(insertCall[0]).toContain('owner_user_id, organization_id, site_kind, parent_site_id, migration_status');
    expect(insertCall[1]).toEqual([
      'user-1',
      'user-1',
      'org-1',
      'campaign',
      'parent-1',
      'complete',
      'template-1',
      'Campaign Site',
      'campaign-site',
      'campaign.example.org',
    ]);
  });

  it('persists siteKind and parentSiteId when updating a site', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [buildSiteRow()] })
      .mockResolvedValueOnce({
        rows: [
          buildSiteRow({
            site_kind: 'organization',
            parent_site_id: null,
          }),
        ],
      });

    const updated = await service.updateSite(
      'site-1',
      'user-1',
      {
        siteKind: 'organization',
        parentSiteId: null,
      },
      'org-1'
    );

    expect(updated?.siteKind).toBe('organization');
    expect(updated?.parentSiteId).toBeNull();

    const updateCall = mockQuery.mock.calls[1];
    expect(updateCall[0]).toContain('site_kind = $1');
    expect(updateCall[0]).toContain('parent_site_id = $2');
    expect(updateCall[1]).toEqual(['organization', null, 'site-1']);
  });
});
