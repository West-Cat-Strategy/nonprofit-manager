import { Pool } from 'pg';
import dbPool from '@config/database';
import type { PublishedSite } from '@app-types/publishing';
import { EventService } from '@modules/events/services/eventService';
import { WebsiteEntryService, websiteEntryService } from '@services/publishing/websiteEntryService';
import { WebsiteSiteSettingsService } from '@services/publishing/siteSettingsService';
import { PublicSiteRenderableSiteBuilder } from './publicSiteRuntime/renderableSiteBuilder';
import { PublicSiteRouteResolver } from './publicSiteRuntime/routeResolver';
import { PublicSiteRuntimeContextLoader } from './publicSiteRuntime/runtimeContextLoader';
import { PublicSiteRenderer } from './publicSiteRuntime/renderer';

export class PublicSiteRuntimeService {
  private readonly builder: PublicSiteRenderableSiteBuilder;
  private readonly routeResolver: PublicSiteRouteResolver;
  private readonly contextLoader: PublicSiteRuntimeContextLoader;
  private readonly renderer: PublicSiteRenderer;

  constructor(pool: Pool) {
    const events = new EventService(pool);
    const entries: WebsiteEntryService = websiteEntryService;
    const siteSettings = new WebsiteSiteSettingsService(pool);

    this.routeResolver = new PublicSiteRouteResolver();
    this.builder = new PublicSiteRenderableSiteBuilder(siteSettings);
    this.contextLoader = new PublicSiteRuntimeContextLoader(events, entries, this.routeResolver);
    this.renderer = new PublicSiteRenderer(events, entries, this.routeResolver);
  }

  async renderSitePage(site: PublishedSite, requestPath: string): Promise<string | null> {
    const renderableSite = await this.builder.buildRenderableSite(site);

    if (!renderableSite.publishedContent) {
      return null;
    }

    const resolved = this.routeResolver.resolveRoute(renderableSite, requestPath);
    if (!resolved) {
      return null;
    }

    const runtimeContext = await this.contextLoader.loadContext(renderableSite, resolved);
    if (!runtimeContext) {
      return null;
    }

    return this.renderer.renderPage(renderableSite, resolved.page, runtimeContext);
  }
}

export const publicSiteRuntimeService = new PublicSiteRuntimeService(dbPool);
export default publicSiteRuntimeService;
