import type { RouteCatalogAlias, RouteCatalogEntry } from './types';
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

type NormalizedRouteAlias = {
  path: string;
  query: Record<string, string>;
  exactQuery: boolean;
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

const normalizeRouteAlias = (alias: string | RouteCatalogAlias): NormalizedRouteAlias => {
  if (typeof alias === 'string') {
    const parsed = new URL(normalizeRouteLocation(alias), 'http://localhost');
    return {
      path: parsed.pathname,
      query: Object.fromEntries(parsed.searchParams.entries()),
      exactQuery: parsed.search.length > 0,
    };
  }

  return {
    path: normalizeRouteLocation(alias.path).split('?')[0] || '/',
    query: alias.query ?? {},
    exactQuery: alias.exactQuery === true,
  };
};

const routeAliasMatches = (
  alias: string | RouteCatalogAlias,
  currentLocation: ParsedRouteLocation
): boolean => {
  const normalizedAlias = normalizeRouteAlias(alias);
  if (currentLocation.pathname !== normalizedAlias.path) {
    return false;
  }

  const aliasQueryEntries = Object.entries(normalizedAlias.query);
  if (
    normalizedAlias.exactQuery &&
    currentLocation.searchParams.size !== aliasQueryEntries.length
  ) {
    return false;
  }

  return aliasQueryEntries.every(([key, value]) => currentLocation.searchParams.get(key) === value);
};

const buildAliasRedirectTarget = (
  entry: RouteCatalogEntry,
  currentLocation: ParsedRouteLocation,
  alias: string | RouteCatalogAlias
): string => {
  const normalizedAlias = normalizeRouteAlias(alias);
  const canonicalUrl = new URL(normalizeRouteLocation(getRouteHref(entry)), 'http://localhost');
  const canonicalParams = new URLSearchParams(canonicalUrl.search);
  const remainingParams = new URLSearchParams(currentLocation.searchParams);

  for (const key of Object.keys(normalizedAlias.query)) {
    remainingParams.delete(key);
  }

  for (const [key, value] of canonicalParams.entries()) {
    remainingParams.set(key, value);
  }

  return remainingParams.size > 0
    ? `${canonicalUrl.pathname}?${remainingParams.toString()}`
    : canonicalUrl.pathname;
};

export function resolveRouteCatalogAlias(value: string): string | null {
  const currentLocation = parseRouteLocation(value);

  for (const entry of routeCatalog) {
    for (const alias of entry.aliases ?? []) {
      if (!routeAliasMatches(alias, currentLocation)) {
        continue;
      }

      const target = buildAliasRedirectTarget(entry, currentLocation, alias);
      return target === currentLocation.normalized ? null : target;
    }
  }

  return null;
}

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

  const aliasMatch = routeCatalog.find((entry) =>
    (entry.aliases ?? []).some((alias) => routeAliasMatches(alias, currentLocation))
  );
  if (aliasMatch) {
    return aliasMatch;
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
