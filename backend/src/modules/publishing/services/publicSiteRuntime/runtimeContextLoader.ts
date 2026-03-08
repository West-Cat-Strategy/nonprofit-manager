import type { EventService } from '@modules/events/services/eventService';
import type { PublishedSite } from '@app-types/publishing';
import type { WebsiteEntryService } from '@services/publishing/websiteEntryService';
import { PublicSiteRouteResolver } from './routeResolver';
import {
  getPublicSiteOwnerUserId,
  ResolvedRoute,
  RuntimeContext,
} from './shared';

type PublicEventsPort = Pick<EventService, 'listPublicEventsByOwner' | 'getPublicEventBySlug'>;
type WebsiteEntriesPort = Pick<WebsiteEntryService, 'listPublicNewsletters' | 'getPublicNewsletterBySlug'>;

export class PublicSiteRuntimeContextLoader {
  constructor(
    private readonly events: PublicEventsPort,
    private readonly entries: WebsiteEntriesPort,
    private readonly routeResolver: PublicSiteRouteResolver
  ) {}

  async loadContext(site: PublishedSite, resolved: ResolvedRoute): Promise<RuntimeContext | null> {
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
      };
    }

    return { kind: 'static' };
  }
}
