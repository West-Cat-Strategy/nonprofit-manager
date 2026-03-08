import type { PublishedSite } from '@app-types/publishing';
import {
  getPageRoutePattern,
  matchRoutePattern,
  normalizePath,
  ResolvedRoute,
} from './shared';

export class PublicSiteRouteResolver {
  resolveRoute(site: PublishedSite, requestPath: string): ResolvedRoute | null {
    if (!site.publishedContent) {
      return null;
    }

    const path = normalizePath(requestPath);
    const pages = site.publishedContent.pages;

    const staticPage = pages.find((page) => {
      const pageType = page.pageType || 'static';
      if (pageType !== 'static') {
        return false;
      }
      return matchRoutePattern(getPageRoutePattern(page), path).matches;
    });
    if (staticPage) {
      return { kind: 'static', page: staticPage };
    }

    const collectionPages = pages.filter((page) => page.pageType && page.pageType !== 'static');

    for (const page of collectionPages) {
      const route = matchRoutePattern(getPageRoutePattern(page), path);
      if (!route.matches) {
        continue;
      }

      if (page.pageType === 'collectionIndex' && page.collection === 'events') {
        return { kind: 'eventsIndex', page };
      }
      if (page.pageType === 'collectionDetail' && page.collection === 'events') {
        return { kind: 'eventDetail', page, slug: route.params.slug || route.params.id || '' };
      }
      if (page.pageType === 'collectionIndex' && page.collection === 'newsletters') {
        return { kind: 'newslettersIndex', page };
      }
      if (page.pageType === 'collectionDetail' && page.collection === 'newsletters') {
        return { kind: 'newsletterDetail', page, slug: route.params.slug || route.params.id || '' };
      }
    }

    return null;
  }

  getDetailPathPattern(site: PublishedSite, collection: 'events' | 'newsletters'): string {
    const detailPage = site.publishedContent?.pages.find(
      (page) => page.pageType === 'collectionDetail' && page.collection === collection
    );
    return detailPage ? getPageRoutePattern(detailPage) : `/${collection}/:slug`;
  }
}
