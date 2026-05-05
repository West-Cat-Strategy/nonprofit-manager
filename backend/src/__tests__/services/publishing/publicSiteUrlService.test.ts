import {
  buildPublicSiteCnameTarget,
  buildPublicSiteUrl,
  getSiteKeyFromPublicHostname,
} from '@services/publishing/publicSiteUrlService';

const originalSiteBaseUrl = process.env.SITE_BASE_URL;

describe('publicSiteUrlService', () => {
  afterEach(() => {
    if (originalSiteBaseUrl === undefined) {
      delete process.env.SITE_BASE_URL;
    } else {
      process.env.SITE_BASE_URL = originalSiteBaseUrl;
    }
  });

  it('builds subdomain URLs under the configured Caddy public-site host', () => {
    process.env.SITE_BASE_URL = 'http://sites.localhost';

    expect(
      buildPublicSiteUrl({
        id: 'site-1',
        subdomain: 'mutual-aid',
        customDomain: null,
      })
    ).toBe('http://mutual-aid.sites.localhost');
    expect(
      buildPublicSiteCnameTarget({
        id: 'site-1',
        subdomain: 'mutual-aid',
      })
    ).toBe('mutual-aid.sites.localhost');
  });

  it('extracts the site key from Caddy-served public hostnames', () => {
    process.env.SITE_BASE_URL = 'https://sites.example.org';

    expect(getSiteKeyFromPublicHostname('mutual-aid.sites.example.org')).toBe('mutual-aid');
    expect(getSiteKeyFromPublicHostname('sites.example.org')).toBeNull();
    expect(getSiteKeyFromPublicHostname('mutual-aid.example.org')).toBeNull();
  });

  it('uses the local Caddy public-site host when SITE_BASE_URL is not set', () => {
    delete process.env.SITE_BASE_URL;

    expect(
      buildPublicSiteUrl({
        id: 'site-1',
        subdomain: 'mutual-aid',
        customDomain: null,
      })
    ).toBe('http://mutual-aid.sites.localhost');
  });
});
