import type { Pool } from 'pg';
import { CustomDomainService } from '@services/publishing/customDomainService';

jest.mock('@services/publishing/siteManagementService', () => ({
  SiteManagementService: jest.fn().mockImplementation(() => ({
    getSite: jest.fn().mockResolvedValue({ id: 'site-1', subdomain: 'org-site' }),
  })),
}));

describe('CustomDomainService', () => {
  it('fails when domain already exists on another site', async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: 'site-2' }] }),
    } as unknown as Pool;

    const service = new CustomDomainService(pool);
    await expect(service.addCustomDomain('site-1', 'user-1', 'example.org')).rejects.toThrow('Domain is already in use by another site');
  });
});
