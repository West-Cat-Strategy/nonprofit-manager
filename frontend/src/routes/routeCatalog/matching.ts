import type { RouteCatalogEntry } from './types';
import { getRouteHref, routeCatalog } from './core';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeTrailingSlash = (value: string): string => {
  if (!value || value === '/') {
    return '/';
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

export function normalizeRouteLocation(value: string): string {
  try {
    const url = new URL(value, 'http://localhost');
    const normalizedPath = normalizeTrailingSlash(url.pathname);
    return `${normalizedPath}${url.search}`;
  } catch {
    const [rawPath = '/', rawSearch = ''] = String(value).split('?');
    const normalizedPath = normalizeTrailingSlash(rawPath || '/');
    return rawSearch ? `${normalizedPath}?${rawSearch}` : normalizedPath;
  }
}

type ParsedRouteLocation = {
  normalized: string;
  pathname: string;
  searchParams: URLSearchParams;
};

const parseRouteLocation = (value: string): ParsedRouteLocation => {
  const normalized = normalizeRouteLocation(value);
  const parsed = new URL(normalized, 'http://localhost');
  return {
    normalized,
    pathname: parsed.pathname,
    searchParams: parsed.searchParams,
  };
};

export function matchRouteCatalogEntry(value: string): RouteCatalogEntry | null {
  const currentLocation = parseRouteLocation(value);

  const hrefMatch = routeCatalog.find(
    (entry) => normalizeRouteLocation(getRouteHref(entry)) === currentLocation.normalized
  );
  if (hrefMatch) {
    return hrefMatch;
  }

  const exactPathMatch = routeCatalog.find(
    (entry) =>
      !entry.path.includes(':') && normalizeRouteLocation(entry.path) === currentLocation.pathname
  );
  if (exactPathMatch) {
    return exactPathMatch;
  }

  return (
    routeCatalog.find((entry) => {
      if (!entry.path.includes(':')) {
        return false;
      }

      const pattern = `^${escapeRegex(entry.path).replace(/:[^/]+/g, '[^/]+')}$`;
      return new RegExp(pattern).test(currentLocation.pathname);
    }) ?? null
  );
}
