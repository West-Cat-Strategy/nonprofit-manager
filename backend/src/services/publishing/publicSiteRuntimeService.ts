import { Pool } from 'pg';
import dbPool from '@config/database';
import type { PublishedComponent, PublishedPage, PublishedSection, PublishedSite, PublishedTheme } from '@app-types/publishing';
import type { PublicEventDetail, PublicEventListItem } from '@app-types/event';
import type { WebsiteEntry } from '@app-types/websiteBuilder';
import { EventService } from '@modules/events/services/eventService';
import {
  buildSeoMeta,
  generateFooterHtml,
  generateGoogleAnalyticsScript,
  generateNavigationHtml,
  generateThemeCSS,
} from '@services/site-generator';
import { escapeHtml } from '@services/site-generator/escapeHtml';
import { generateComponentHtml } from '@services/site-generator/componentRenderer';
import { WebsiteEntryService, websiteEntryService } from './websiteEntryService';
import {
  mergeManagedComponentConfig,
  WebsiteSiteSettingsService,
} from './siteSettingsService';

type ResolvedRoute =
  | { kind: 'static'; page: PublishedPage }
  | { kind: 'eventsIndex'; page: PublishedPage }
  | { kind: 'eventDetail'; page: PublishedPage; slug: string }
  | { kind: 'newslettersIndex'; page: PublishedPage }
  | { kind: 'newsletterDetail'; page: PublishedPage; slug: string };

type RuntimeContext =
  | { kind: 'static' }
  | { kind: 'eventsIndex'; items: PublicEventListItem[]; detailPathPattern: string }
  | { kind: 'eventDetail'; event: PublicEventDetail; detailPathPattern: string }
  | { kind: 'newslettersIndex'; items: WebsiteEntry[]; detailPathPattern: string }
  | { kind: 'newsletterDetail'; entry: WebsiteEntry; detailPathPattern: string };

const normalizePath = (value: string): string => {
  if (!value || value === '/') {
    return '/';
  }
  const normalized = value.startsWith('/') ? value : `/${value}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
};

const matchRoutePattern = (
  routePattern: string,
  requestPath: string
): { matches: boolean; params: Record<string, string> } => {
  const pattern = normalizePath(routePattern);
  const path = normalizePath(requestPath);
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = path.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return { matches: false, params: {} };
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const pathSegment = pathSegments[index];

    if (patternSegment.startsWith(':')) {
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
      continue;
    }

    if (patternSegment !== pathSegment) {
      return { matches: false, params: {} };
    }
  }

  return { matches: true, params };
};

const getPageRoutePattern = (page: PublishedPage): string => {
  if (page.routePattern && page.routePattern.trim().length > 0) {
    return page.routePattern.trim();
  }

  if (page.pageType === 'collectionIndex') {
    if (page.collection === 'events') return '/events';
    if (page.collection === 'newsletters') return '/newsletters';
  }

  if (page.pageType === 'collectionDetail') {
    if (page.collection === 'events') return '/events/:slug';
    if (page.collection === 'newsletters') return '/newsletters/:slug';
  }

  return page.isHomepage ? '/' : `/${page.slug}`;
};

const buildAnalyticsScript = (siteId: string): string => `
  <script>
    (function() {
      var visitorId = localStorage.getItem('npm_visitor_id') || (function() {
        var id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('npm_visitor_id', id);
        return id;
      })();
      var sessionId = sessionStorage.getItem('npm_session_id') || (function() {
        var id = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem('npm_session_id', id);
        return id;
      })();

      fetch('/api/v2/sites/${escapeHtml(siteId)}/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'pageview',
          pagePath: window.location.pathname,
          visitorId: visitorId,
          sessionId: sessionId
        })
      }).catch(function() {});
    })();
  </script>
`;

const buildPublicFormRuntimeScript = (): string => `
  <script>
    (function() {
      async function submitForm(form) {
        var statusNode = form.querySelector('[data-form-status]');
        var payload = {};
        var visitorId = localStorage.getItem('npm_visitor_id');
        var sessionId = sessionStorage.getItem('npm_session_id');
        Array.prototype.forEach.call(new FormData(form).entries(), function(entry) {
          payload[entry[0]] = entry[1];
        });
        if (visitorId) {
          payload.visitorId = visitorId;
        }
        if (sessionId) {
          payload.sessionId = sessionId;
        }

        if (statusNode) {
          statusNode.textContent = 'Submitting...';
        }

        try {
          var response = await fetch(form.action, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          var data = await response.json();
          if (!response.ok || data.success === false) {
            throw new Error(data.error && data.error.message ? data.error.message : 'Submission failed');
          }

          var result = data.data || data;
          if (statusNode) {
            statusNode.textContent = result.message || 'Submitted successfully.';
          }
          form.reset();
        } catch (error) {
          if (statusNode) {
            statusNode.textContent = error instanceof Error ? error.message : 'Submission failed';
          }
        }
      }

      function attachHandlers() {
        var forms = document.querySelectorAll('[data-public-site-form="true"]');
        forms.forEach(function(form) {
          form.addEventListener('submit', function(event) {
            event.preventDefault();
            submitForm(form);
          });
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachHandlers);
      } else {
        attachHandlers();
      }
    })();
  </script>
`;

export class PublicSiteRuntimeService {
  private readonly events: EventService;
  private readonly entries: WebsiteEntryService;
  private readonly siteSettings: WebsiteSiteSettingsService;

  constructor(pool: Pool) {
    this.events = new EventService(pool);
    this.entries = websiteEntryService;
    this.siteSettings = new WebsiteSiteSettingsService(pool);
  }

  private mergeComponentSettings(
    component: PublishedComponent,
    settings: Awaited<ReturnType<WebsiteSiteSettingsService['getPublicSettings']>>
  ): PublishedComponent {
    const withSettings = mergeManagedComponentConfig(component, settings);
    const componentRecord = withSettings as PublishedComponent & {
      components?: PublishedComponent[];
      columns?: Array<{ components?: PublishedComponent[] }>;
    };

    if (Array.isArray(componentRecord.components)) {
      componentRecord.components = componentRecord.components.map((nested) =>
        this.mergeComponentSettings(nested, settings)
      );
    }

    if (Array.isArray(componentRecord.columns)) {
      componentRecord.columns = componentRecord.columns.map((column) => ({
        ...column,
        components: Array.isArray(column.components)
          ? column.components.map((nested) => this.mergeComponentSettings(nested, settings))
          : [],
      }));
    }

    return componentRecord;
  }

  private async buildRenderableSite(site: PublishedSite): Promise<PublishedSite> {
    if (!site.publishedContent) {
      return site;
    }

    const settings = await this.siteSettings.getPublicSettings(site.id);

    return {
      ...site,
      publishedContent: {
        ...site.publishedContent,
        pages: site.publishedContent.pages.map((page) => ({
          ...page,
          sections: page.sections.map((section) => ({
            ...section,
            components: section.components.map((component) =>
              this.mergeComponentSettings(component, settings)
            ),
          })),
        })),
      },
    };
  }

  private resolveRoute(site: PublishedSite, requestPath: string): ResolvedRoute | null {
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

  private getDetailPathPattern(
    site: PublishedSite,
    collection: 'events' | 'newsletters'
  ): string {
    const detailPage = site.publishedContent?.pages.find(
      (page) => page.pageType === 'collectionDetail' && page.collection === collection
    );
    return detailPage ? getPageRoutePattern(detailPage) : `/${collection}/:slug`;
  }

  private buildDetailPath(pattern: string, slug: string): string {
    return normalizePath(pattern.replace(':slug', encodeURIComponent(slug)).replace(':id', encodeURIComponent(slug)));
  }

  private renderPublicForm(
    site: PublishedSite,
    component: PublishedComponent,
    fieldsHtml: string,
    submitText: string,
    description?: string
  ): string {
    return `
      <form
        data-public-site-form="true"
        action="/api/v2/public/forms/${encodeURIComponent(site.id)}/${encodeURIComponent(component.id)}/submit"
        method="post"
        style="display: grid; gap: 0.75rem; padding: 1.25rem; border: 1px solid var(--npm-border); border-radius: 16px; background: var(--npm-surface);"
      >
        ${description ? `<p style="margin: 0; color: var(--npm-muted);">${escapeHtml(description)}</p>` : ''}
        ${fieldsHtml}
        <button type="submit" style="padding: 0.85rem 1rem; border: none; border-radius: 999px; background: var(--npm-primary); color: white; font-weight: 600; cursor: pointer;">
          ${escapeHtml(submitText)}
        </button>
        <p data-form-status style="margin: 0; min-height: 1.2rem; color: var(--npm-muted); font-size: 0.95rem;"></p>
      </form>
    `;
  }

  private renderEventCards(
    items: PublicEventListItem[],
    detailPathPattern: string,
    layout: 'grid' | 'list' = 'grid',
    emptyMessage: string = 'No public events are available right now.'
  ): string {
    if (items.length === 0) {
      return `<div class="npm-empty">${escapeHtml(emptyMessage)}</div>`;
    }

    const className = layout === 'grid' ? 'npm-card-grid' : 'npm-card-list';
    return `
      <div class="${className}">
        ${items
          .map((item) => {
            const href = this.buildDetailPath(detailPathPattern, item.slug);
            return `
              <article class="npm-card">
                <p class="npm-card-kicker">${escapeHtml(item.event_type)}</p>
                <h3><a href="${escapeHtml(href)}">${escapeHtml(item.event_name)}</a></h3>
                <p class="npm-card-meta">${escapeHtml(new Date(item.start_date).toLocaleString())}</p>
                <p class="npm-card-meta">${escapeHtml(
                  [item.location_name, item.city, item.state_province, item.country]
                    .filter(Boolean)
                    .join(', ') || 'Location TBD'
                )}</p>
                ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
              </article>
            `;
          })
          .join('\n')}
      </div>
    `;
  }

  private renderNewsletterCards(
    items: WebsiteEntry[],
    detailPathPattern: string,
    emptyMessage: string = 'No newsletters are available right now.'
  ): string {
    if (items.length === 0) {
      return `<div class="npm-empty">${escapeHtml(emptyMessage)}</div>`;
    }

    return `
      <div class="npm-card-list">
        ${items
          .map((item) => `
            <article class="npm-card">
              <p class="npm-card-kicker">${escapeHtml(item.source)}</p>
              <h3>
                <a href="${escapeHtml(this.buildDetailPath(detailPathPattern, item.slug))}">
                  ${escapeHtml(item.title)}
                </a>
              </h3>
              ${item.publishedAt ? `<p class="npm-card-meta">${escapeHtml(new Date(item.publishedAt).toLocaleDateString())}</p>` : ''}
              ${item.excerpt ? `<p>${escapeHtml(item.excerpt)}</p>` : ''}
            </article>
          `)
          .join('\n')}
      </div>
    `;
  }

  private renderEventDetail(event: PublicEventDetail): string {
    const location = [event.location_name, event.address_line1, event.address_line2, event.city, event.state_province, event.postal_code, event.country]
      .filter((value): value is string => Boolean(value))
      .join(', ');

    return `
      <article class="npm-detail">
        <p class="npm-card-kicker">${escapeHtml(event.event_type)}</p>
        <h1>${escapeHtml(event.event_name)}</h1>
        <p class="npm-card-meta">${escapeHtml(new Date(event.start_date).toLocaleString())}</p>
        ${location ? `<p class="npm-card-meta">${escapeHtml(location)}</p>` : ''}
        ${typeof event.capacity === 'number' ? `<p class="npm-card-meta">Capacity: ${event.registered_count}/${event.capacity}</p>` : ''}
        ${event.description ? `<div class="npm-detail-body"><p>${escapeHtml(event.description)}</p></div>` : ''}
      </article>
    `;
  }

  private renderNewsletterDetail(entry: WebsiteEntry): string {
    const bodyHtml = entry.bodyHtml && entry.bodyHtml.trim().length > 0
      ? entry.bodyHtml
      : entry.body
        ? `<p>${escapeHtml(entry.body)}</p>`
        : entry.excerpt
          ? `<p>${escapeHtml(entry.excerpt)}</p>`
          : '<p>No newsletter body is available for this entry.</p>';

    return `
      <article class="npm-detail">
        <p class="npm-card-kicker">${escapeHtml(entry.source)}</p>
        <h1>${escapeHtml(entry.title)}</h1>
        ${entry.publishedAt ? `<p class="npm-card-meta">${escapeHtml(new Date(entry.publishedAt).toLocaleDateString())}</p>` : ''}
        <div class="npm-detail-body">
          ${bodyHtml}
        </div>
      </article>
    `;
  }

  private async renderComponent(
    site: PublishedSite,
    component: PublishedComponent,
    theme: PublishedTheme,
    context: RuntimeContext
  ): Promise<string> {
    switch (component.type) {
      case 'contact-form':
        return this.renderPublicForm(
          site,
          component,
          `
            <div class="npm-field-grid">
              <input name="first_name" placeholder="First name" required />
              <input name="last_name" placeholder="Last name" required />
            </div>
            <input name="email" type="email" placeholder="Email" required />
            ${component.includePhone !== false ? '<input name="phone" type="tel" placeholder="Phone" />' : ''}
            ${component.includeMessage !== false ? '<textarea name="message" rows="4" placeholder="How can we help?"></textarea>' : ''}
          `,
          String(component.submitText || 'Send Message'),
          typeof component.description === 'string' ? component.description : undefined
        );
      case 'newsletter-signup':
        return this.renderPublicForm(
          site,
          component,
          `
            <div class="npm-field-grid">
              <input name="first_name" placeholder="First name" />
              <input name="last_name" placeholder="Last name" />
            </div>
            <input name="email" type="email" placeholder="Email" required />
          `,
          String(component.buttonText || 'Subscribe'),
          typeof component.description === 'string' ? component.description : undefined
        );
      case 'volunteer-interest-form':
        return this.renderPublicForm(
          site,
          component,
          `
            <div class="npm-field-grid">
              <input name="first_name" placeholder="First name" required />
              <input name="last_name" placeholder="Last name" required />
            </div>
            <input name="email" type="email" placeholder="Email" required />
            ${component.includePhone !== false ? '<input name="phone" type="tel" placeholder="Phone" />' : ''}
            <input name="availability" placeholder="Availability" />
            <textarea name="message" rows="4" placeholder="Skills or interests"></textarea>
          `,
          String(component.submitText || 'Send Interest'),
          typeof component.description === 'string' ? component.description : undefined
        );
      case 'donation-form':
        return this.renderPublicForm(
          site,
          component,
          `
            <div class="npm-field-grid">
              <input name="first_name" placeholder="First name" required />
              <input name="last_name" placeholder="Last name" required />
            </div>
            <input name="email" type="email" placeholder="Email" required />
            <input name="phone" type="tel" placeholder="Phone" />
            <input name="amount" type="number" min="1" step="0.01" placeholder="Amount" required />
            ${component.recurringOption === true ? '<label class="npm-checkbox"><input type="checkbox" name="recurring" value="true" /> Monthly recurring donation</label>' : ''}
          `,
          String(component.submitText || component.buttonText || 'Donate'),
          typeof component.description === 'string' ? component.description : undefined
        );
      case 'event-list':
      case 'event-calendar': {
        const eventType = typeof component.eventType === 'string' ? component.eventType : undefined;
        const limit = typeof component.maxEvents === 'number' ? component.maxEvents : 12;
        const listData =
          context.kind === 'eventsIndex'
            ? context.items
            : (await this.events.listPublicEventsByOwner(site.ownerUserId || site.userId, {
                event_type: eventType as PublicEventListItem['event_type'] | undefined,
                include_past: component.showPastEvents === true,
                limit,
                offset: 0,
                sort_by: 'start_date',
                sort_order: 'asc',
              })).items;

        const detailPathPattern =
          context.kind === 'eventsIndex' || context.kind === 'eventDetail'
            ? context.detailPathPattern
            : this.getDetailPathPattern(site, 'events');
        return this.renderEventCards(
          listData.slice(0, limit),
          detailPathPattern,
          component.type === 'event-calendar' ? 'list' : ((component.layout as 'grid' | 'list') || 'grid'),
          typeof component.emptyMessage === 'string'
            ? component.emptyMessage
            : 'No public events are available right now.'
        );
      }
      case 'event-detail':
        return context.kind === 'eventDetail'
          ? this.renderEventDetail(context.event)
          : '<div class="npm-empty">Event details render on event detail pages.</div>';
      case 'event-registration':
        if (context.kind !== 'eventDetail') {
          return '<div class="npm-empty">Event registration renders on event detail pages.</div>';
        }
        return `
          <form
            data-public-site-form="true"
            action="/api/v2/public/events/${encodeURIComponent(context.event.event_id)}/registrations?site=${encodeURIComponent(site.id)}"
            method="post"
            style="display: grid; gap: 0.75rem; padding: 1.25rem; border: 1px solid var(--npm-border); border-radius: 16px; background: var(--npm-surface);"
          >
            <div class="npm-field-grid">
              <input name="first_name" placeholder="First name" required />
              <input name="last_name" placeholder="Last name" required />
            </div>
            <input name="email" type="email" placeholder="Email" required />
            ${component.includePhone !== false ? '<input name="phone" type="tel" placeholder="Phone" />' : ''}
            <textarea name="notes" rows="4" placeholder="Notes"></textarea>
            <button type="submit" style="padding: 0.85rem 1rem; border: none; border-radius: 999px; background: var(--npm-primary); color: white; font-weight: 600; cursor: pointer;">
              ${escapeHtml(String(component.submitText || 'Register'))}
            </button>
            <p data-form-status style="margin: 0; min-height: 1.2rem; color: var(--npm-muted); font-size: 0.95rem;"></p>
          </form>
        `;
      case 'newsletter-archive': {
        const listData =
          context.kind === 'newslettersIndex'
            ? context.items
            : (await this.entries.listPublicNewsletters(site, {
                limit: typeof component.maxItems === 'number' ? component.maxItems : 10,
                offset: 0,
                sourceFilter:
                  (component.sourceFilter as 'native' | 'mailchimp' | 'all' | undefined) || 'all',
              })).items;
        const detailPathPattern =
          context.kind === 'newslettersIndex' || context.kind === 'newsletterDetail'
            ? context.detailPathPattern
            : this.getDetailPathPattern(site, 'newsletters');
        return this.renderNewsletterCards(
          listData.slice(0, typeof component.maxItems === 'number' ? component.maxItems : 10),
          detailPathPattern,
          typeof component.emptyMessage === 'string'
            ? component.emptyMessage
            : 'No newsletters are available right now.'
        );
      }
      default:
        return generateComponentHtml(component, theme);
    }
  }

  private async renderSection(
    site: PublishedSite,
    section: PublishedSection,
    theme: PublishedTheme,
    context: RuntimeContext
  ): Promise<string> {
    const style: string[] = [];

    if (section.backgroundColor) style.push(`background-color: ${section.backgroundColor}`);
    if (section.backgroundImage) {
      style.push(`background-image: url('${section.backgroundImage}')`);
      style.push('background-size: cover');
      style.push('background-position: center');
    }
    if (section.paddingTop) style.push(`padding-top: ${section.paddingTop}`);
    if (section.paddingBottom) style.push(`padding-bottom: ${section.paddingBottom}`);
    if (section.paddingLeft) style.push(`padding-left: ${section.paddingLeft}`);
    if (section.paddingRight) style.push(`padding-right: ${section.paddingRight}`);

    const renderedComponents = await Promise.all(
      section.components.map((component) => this.renderComponent(site, component, theme, context))
    );

    return `
      <section class="site-section" ${style.length > 0 ? `style="${style.join('; ')}"` : ''}>
        <div class="section-container" style="max-width: ${section.maxWidth || '1200px'}; margin: 0 auto;">
          ${renderedComponents.join('\n')}
        </div>
      </section>
    `;
  }

  private hasComponentType(page: PublishedPage, types: string[]): boolean {
    return page.sections.some((section) =>
      section.components.some((component) => types.includes(component.type))
    );
  }

  private getRuntimeCss(): string {
    return `
      :root {
        --npm-primary: var(--color-primary, #1f4d3b);
        --npm-surface: var(--color-surface, #ffffff);
        --npm-border: var(--color-border, #d8e1dc);
        --npm-muted: var(--color-text-muted, #60716a);
      }

      .npm-card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1rem;
      }

      .npm-card-list {
        display: grid;
        gap: 1rem;
      }

      .npm-card,
      .npm-detail,
      .npm-empty {
        border: 1px solid var(--npm-border);
        border-radius: 18px;
        background: var(--npm-surface);
        padding: 1.25rem;
      }

      .npm-card-kicker {
        margin: 0 0 0.4rem;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--npm-muted);
      }

      .npm-card h3,
      .npm-detail h1 {
        margin-bottom: 0.5rem;
      }

      .npm-card-meta {
        margin: 0.2rem 0;
        color: var(--npm-muted);
      }

      .npm-detail-body {
        margin-top: 1rem;
      }

      .npm-field-grid {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .npm-checkbox {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      [data-public-site-form="true"] input,
      [data-public-site-form="true"] textarea {
        width: 100%;
        padding: 0.8rem 0.9rem;
        border: 1px solid var(--npm-border);
        border-radius: 12px;
        font: inherit;
      }

      @media (max-width: 768px) {
        .npm-field-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
  }

  async renderSitePage(site: PublishedSite, requestPath: string): Promise<string | null> {
    const renderableSite = await this.buildRenderableSite(site);

    if (!renderableSite.publishedContent) {
      return null;
    }

    const resolved = this.resolveRoute(renderableSite, requestPath);
    if (!resolved) {
      return null;
    }

    let runtimeContext: RuntimeContext = { kind: 'static' };
    const page = resolved.page;

    if (resolved.kind === 'eventsIndex') {
      runtimeContext = {
        kind: 'eventsIndex',
        items: (
          await this.events.listPublicEventsByOwner(renderableSite.ownerUserId || renderableSite.userId, {
            limit: 50,
            offset: 0,
            sort_by: 'start_date',
            sort_order: 'asc',
          })
        ).items,
        detailPathPattern: this.getDetailPathPattern(renderableSite, 'events'),
      };
    } else if (resolved.kind === 'eventDetail') {
      const event = await this.events.getPublicEventBySlug(
        renderableSite.ownerUserId || renderableSite.userId,
        resolved.slug
      );
      if (!event) {
        return null;
      }
      runtimeContext = {
        kind: 'eventDetail',
        event,
        detailPathPattern: this.getDetailPathPattern(renderableSite, 'events'),
      };
    } else if (resolved.kind === 'newslettersIndex') {
      runtimeContext = {
        kind: 'newslettersIndex',
        items: (
          await this.entries.listPublicNewsletters(renderableSite, {
            limit: 50,
            offset: 0,
            sourceFilter: 'all',
          })
        ).items,
        detailPathPattern: this.getDetailPathPattern(renderableSite, 'newsletters'),
      };
    } else if (resolved.kind === 'newsletterDetail') {
      const entry = await this.entries.getPublicNewsletterBySlug(renderableSite, resolved.slug);
      if (!entry) {
        return null;
      }
      runtimeContext = {
        kind: 'newsletterDetail',
        entry,
        detailPathPattern: this.getDetailPathPattern(renderableSite, 'newsletters'),
      };
    }

    const sectionsHtml = await Promise.all(
      page.sections.map((section) =>
        this.renderSection(renderableSite, section, renderableSite.publishedContent!.theme, runtimeContext)
      )
    );

    let fallbackHtml = '';
    if (runtimeContext.kind === 'eventsIndex' && !this.hasComponentType(page, ['event-list', 'event-calendar'])) {
      fallbackHtml = this.renderEventCards(runtimeContext.items, runtimeContext.detailPathPattern);
    } else if (runtimeContext.kind === 'eventDetail') {
      if (!this.hasComponentType(page, ['event-detail'])) {
        fallbackHtml = this.renderEventDetail(runtimeContext.event);
      }
      if (!this.hasComponentType(page, ['event-registration'])) {
        fallbackHtml += await this.renderComponent(
          renderableSite,
          { id: 'event-registration-default', type: 'event-registration', submitText: 'Register' },
          renderableSite.publishedContent.theme,
          runtimeContext
        );
      }
    } else if (runtimeContext.kind === 'newslettersIndex' && !this.hasComponentType(page, ['newsletter-archive'])) {
      fallbackHtml = this.renderNewsletterCards(runtimeContext.items, runtimeContext.detailPathPattern);
    } else if (runtimeContext.kind === 'newsletterDetail') {
      fallbackHtml = this.renderNewsletterDetail(runtimeContext.entry);
    }

    const pageTitle =
      runtimeContext.kind === 'eventDetail'
        ? runtimeContext.event.event_name
        : runtimeContext.kind === 'newsletterDetail'
          ? runtimeContext.entry.title
          : page.seo?.title || page.name || renderableSite.publishedContent.seoDefaults.title;
    const description =
      runtimeContext.kind === 'eventDetail'
        ? runtimeContext.event.description || renderableSite.publishedContent.seoDefaults.description
        : runtimeContext.kind === 'newsletterDetail'
          ? runtimeContext.entry.excerpt ||
            runtimeContext.entry.seo.description ||
            renderableSite.publishedContent.seoDefaults.description
          : page.seo?.description || renderableSite.publishedContent.seoDefaults.description;
    const analyticsScript = renderableSite.publishedContent.seoDefaults.googleAnalyticsId
      ? generateGoogleAnalyticsScript(renderableSite.publishedContent.seoDefaults.googleAnalyticsId)
      : '';

    const bodyHtml = `
      ${generateNavigationHtml(renderableSite.publishedContent)}
      <main>
        ${sectionsHtml.join('\n')}
        ${fallbackHtml}
      </main>
      ${generateFooterHtml(renderableSite.publishedContent)}
      ${buildAnalyticsScript(renderableSite.id)}
      ${buildPublicFormRuntimeScript()}
    `;

    return buildSeoMeta(
      pageTitle,
      description,
      renderableSite.publishedContent.seoDefaults,
      page.seo,
      `${generateThemeCSS(renderableSite.publishedContent.theme)}\n${this.getRuntimeCss()}`,
      bodyHtml,
      analyticsScript
    );
  }
}

export const publicSiteRuntimeService = new PublicSiteRuntimeService(dbPool);
export default publicSiteRuntimeService;
