import type { PublishedSite } from '@app-types/publishing';

const DEFAULT_PUBLIC_SITE_BASE_URL = 'http://sites.localhost';

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const getPublicSiteBaseUrl = (): string =>
  trimTrailingSlash(process.env.SITE_BASE_URL || DEFAULT_PUBLIC_SITE_BASE_URL);

export const getPublicSiteBaseHostname = (): string | null => {
  try {
    return new URL(getPublicSiteBaseUrl()).hostname.toLowerCase();
  } catch {
    return null;
  }
};

export const buildPublicSiteHost = (site: Pick<PublishedSite, 'subdomain'>): string | null => {
  if (!site.subdomain) {
    return getPublicSiteBaseHostname();
  }

  const baseHostname = getPublicSiteBaseHostname();
  if (!baseHostname) {
    return null;
  }

  return `${site.subdomain}.${baseHostname}`;
};

export const buildPublicSiteUrl = (
  site: Pick<PublishedSite, 'id' | 'subdomain' | 'customDomain'>
): string => {
  if (site.customDomain) {
    return `https://${site.customDomain}`;
  }

  const baseUrl = getPublicSiteBaseUrl();

  try {
    const url = new URL(baseUrl);
    if (site.subdomain) {
      url.hostname = `${site.subdomain}.${url.hostname}`;
      url.pathname = '/';
      url.search = '';
      url.hash = '';
      return trimTrailingSlash(url.toString());
    }

    url.pathname = `${trimTrailingSlash(url.pathname)}/${site.id}`.replace(/\/{2,}/g, '/');
    url.search = '';
    url.hash = '';
    return trimTrailingSlash(url.toString());
  } catch {
    if (site.subdomain) {
      return `${baseUrl}/${site.subdomain}`;
    }
    return `${baseUrl}/${site.id}`;
  }
};

export const buildPublicSiteCnameTarget = (
  site: Pick<PublishedSite, 'id' | 'subdomain'>
): string => buildPublicSiteHost(site) || `${site.subdomain || site.id}.sites.localhost`;

export const getSiteKeyFromPublicHostname = (hostname: string): string | null => {
  const normalizedHost = hostname.trim().toLowerCase().replace(/\.$/, '');
  if (!normalizedHost) {
    return null;
  }

  const baseHostname = getPublicSiteBaseHostname();
  if (!baseHostname || normalizedHost === baseHostname) {
    return null;
  }

  const suffix = `.${baseHostname}`;
  if (!normalizedHost.endsWith(suffix)) {
    return null;
  }

  const siteKey = normalizedHost.slice(0, -suffix.length);
  return siteKey && !siteKey.includes('.') ? siteKey : null;
};
