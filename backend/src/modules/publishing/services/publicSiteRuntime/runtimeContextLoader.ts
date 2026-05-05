import type { EventService } from '@modules/events/services/eventService';
import type { PublishedSite } from '@app-types/publishing';
import type { PublicAction } from '@app-types/websiteBuilder';
import type { PublicActionService } from '@services/publishing/publicActionService';
import type { WebsiteEntryService } from '@services/publishing/websiteEntryService';
import { PublicSiteRouteResolver } from './routeResolver';
import {
  getPublicSiteOwnerUserId,
  ResolvedRoute,
  RuntimeContext,
} from './shared';

type PublicEventsPort = Pick<EventService, 'listPublicEventsByOwner' | 'getPublicEventBySlug'>;
type WebsiteEntriesPort = Pick<
  WebsiteEntryService,
  | 'listPublicNewsletters'
  | 'getPublicNewsletterBySlug'
  | 'listPublicBlogEntries'
  | 'getPublicBlogEntryBySlug'
>;
type PublicActionsPort = Pick<PublicActionService, 'listPublishedActionsForSite'>;

export class PublicSiteRuntimeContextLoader {
  constructor(
    private readonly events: PublicEventsPort,
    private readonly entries: WebsiteEntriesPort,
    private readonly actions: PublicActionsPort,
    private readonly routeResolver: PublicSiteRouteResolver
  ) {}

  async loadContext(site: PublishedSite, resolved: ResolvedRoute): Promise<RuntimeContext | null> {
    const publicActions: PublicAction[] = await this.actions.listPublishedActionsForSite(site);

    if (resolved.kind === 'eventsIndex') {
      return {
        kind: 'eventsIndex',
        items: (
          await this.events.listPublicEventsByOwner(getPublicSiteOwnerUserId(site), {
            limit: 50,
            offset: 0,
            sort_by: 'start_date',
            sort_order: 'asc',
          })
        ).items,
        detailPathPattern: this.routeResolver.getDetailPathPattern(site, 'events'),
        publicActions,
      };
    }

    if (resolved.kind === 'eventDetail') {
      const event = await this.events.getPublicEventBySlug(getPublicSiteOwnerUserId(site), resolved.slug);
      if (!event) {
        return null;
      }

      return {
        kind: 'eventDetail',
        event,
        detailPathPattern: this.routeResolver.getDetailPathPattern(site, 'events'),
        publicActions,
      };
    }

    if (resolved.kind === 'newslettersIndex') {
      return {
        kind: 'newslettersIndex',
        items: (
          await this.entries.listPublicNewsletters(site, {
            limit: 50,
            offset: 0,
            sourceFilter: 'all',
          })
        ).items,
        detailPathPattern: this.routeResolver.getDetailPathPattern(site, 'newsletters'),
        publicActions,
      };
    }

    if (resolved.kind === 'newsletterDetail') {
      const entry = await this.entries.getPublicNewsletterBySlug(site, resolved.slug);
      if (!entry) {
        return null;
      }

      return {
        kind: 'newsletterDetail',
        entry,
        detailPathPattern: this.routeResolver.getDetailPathPattern(site, 'newsletters'),
        publicActions,
      };
    }

    if (resolved.kind === 'blogIndex') {
      return {
        kind: 'blogIndex',
        items: (
          await this.entries.listPublicBlogEntries(site, {
            limit: 50,
            offset: 0,
            sourceFilter: 'all',
          })
        ).items,
        detailPathPattern: this.routeResolver.getDetailPathPattern(site, 'blog'),
        publicActions,
      };
    }

    if (resolved.kind === 'blogDetail') {
      const entry = await this.entries.getPublicBlogEntryBySlug(site, resolved.slug);
      if (!entry) {
        return null;
      }

      return {
        kind: 'blogDetail',
        entry,
        detailPathPattern: this.routeResolver.getDetailPathPattern(site, 'blog'),
        publicActions,
      };
    }

    return { kind: 'static', publicActions };
  }
}
