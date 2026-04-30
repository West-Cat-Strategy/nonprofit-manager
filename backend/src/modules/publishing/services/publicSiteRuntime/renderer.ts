import type { EventService } from '@modules/events/services/eventService';
import type {
  PublicEventDetail,
  PublicEventListItem,
} from '@app-types/event';
import type {
  PublishedComponent,
  PublishedPage,
  PublishedSection,
  PublishedSite,
  PublishedTheme,
  RenderablePublishedComponent,
} from '@app-types/publishing';
import type { WebsiteEntry } from '@app-types/websiteBuilder';
import type { WebsiteEntryService } from '@services/publishing/websiteEntryService';
import {
  buildSeoMeta,
  generateFooterHtml,
  generateGoogleAnalyticsScript,
  generateNavigationHtml,
  generateNavigationToggleScript,
  generateThemeCSS,
} from '@services/site-generator';
import { escapeHtml } from '@services/site-generator/escapeHtml';
import { generateComponentHtml } from '@services/site-generator/componentRenderer';
import { sanitizeNewsletterHtml } from '@services/publishing/newsletterHtmlSanitizer';
import {
  buildPublicEventRegistrationSubmissionPath,
  buildPublicWebsiteFormSubmissionPath,
} from '@services/publishing/publicWebsiteFormServiceHelpers';
import { sanitizeRenderableUrl } from '@services/site-generator/urlSanitizer';
import { PublicSiteRouteResolver } from './routeResolver';
import {
  buildAnalyticsScript,
  buildDetailPath,
  buildPublicFormRuntimeScript,
  getPublicSiteOwnerUserId,
  RuntimeContext,
} from './shared';

type PublicEventsPort = Pick<EventService, 'listPublicEventsByOwner'>;
type WebsiteEntriesPort = Pick<WebsiteEntryService, 'listPublicNewsletters'>;

const resolveGridTemplateColumns = (columns: Array<{ width?: string }> | undefined): string => {
  if (!columns || columns.length === 0) {
    return 'repeat(auto-fit, minmax(240px, 1fr))';
  }

  const tracks = columns.map((column) => {
    const width = typeof column.width === 'string' ? column.width.trim() : '';
    const match = width.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (match) {
      const numerator = Number.parseInt(match[1] || '1', 10);
      const denominator = Number.parseInt(match[2] || '1', 10);
      if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
        return `${Math.max(1, numerator)}fr`;
      }
    }

    const parsed = Number.parseFloat(width);
    if (Number.isFinite(parsed) && parsed > 0) {
      return `${parsed}fr`;
    }

    return '1fr';
  });

  return tracks.join(' ');
};

export class PublicSiteRenderer {
  constructor(
    private readonly events: PublicEventsPort,
    private readonly entries: WebsiteEntriesPort,
    private readonly routeResolver: PublicSiteRouteResolver
  ) {}

  private renderPublicForm(
    site: PublishedSite,
    component: PublishedComponent,
    fieldsHtml: string,
    submitText: string,
    description?: string
  ): string {
    return `
      <form
        class="npm-public-form npm-public-form--${escapeHtml(component.type)}"
        data-public-site-form="true"
        action="${escapeHtml(buildPublicWebsiteFormSubmissionPath(site.id, component.id))}"
        method="post"
        style="display: grid; gap: 0.85rem; padding: 1.35rem; border: 1px solid var(--npm-border); border-radius: 18px; background: var(--npm-surface); box-shadow: 0 12px 30px rgba(19, 49, 38, 0.08);"
      >
        ${description ? `<p style="margin: 0; color: var(--npm-muted);">${escapeHtml(description)}</p>` : ''}
        ${fieldsHtml}
        <button type="submit" class="btn" style="padding: 0.9rem 1rem; border: none; border-radius: 999px; background: var(--npm-primary); color: white; font-weight: 700; cursor: pointer; box-shadow: 0 6px 18px rgba(31, 77, 59, 0.22);">
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
            const href = buildDetailPath(detailPathPattern, item.slug);
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
                <a href="${escapeHtml(buildDetailPath(detailPathPattern, item.slug))}">
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
    const location = [
      event.location_name,
      event.address_line1,
      event.address_line2,
      event.city,
      event.state_province,
      event.postal_code,
      event.country,
    ]
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
    const sanitizedBodyHtml =
      entry.bodyHtml && entry.bodyHtml.trim().length > 0
        ? sanitizeNewsletterHtml(entry.bodyHtml)
        : '';
    const bodyHtml =
      sanitizedBodyHtml.trim().length > 0
        ? sanitizedBodyHtml
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

  private async renderNestedComponents(
    site: PublishedSite,
    components: PublishedComponent[] | undefined,
    theme: PublishedTheme,
    context: RuntimeContext
  ): Promise<string> {
    const nestedComponents = components || [];
    const rendered = await Promise.all(
      nestedComponents.map((nestedComponent) => this.renderComponent(site, nestedComponent, theme, context))
    );
    return rendered.join('\n');
  }

  private async renderHeroComponent(
    site: PublishedSite,
    component: RenderablePublishedComponent,
    theme: PublishedTheme,
    context: RuntimeContext
  ): Promise<string> {
    const backgroundColor = (component.backgroundColor as string) || theme.colors.surface;
    const backgroundImage = sanitizeRenderableUrl(component.backgroundImage as string);
    const overlay = component.overlay !== false && Boolean(backgroundImage);
    const overlayColor = (component.overlayColor as string) || '#000000';
    const overlayOpacity =
      typeof component.overlayOpacity === 'number' ? component.overlayOpacity : 0.45;
    const height = (component.height as string) || undefined;
    const minHeight = (component.minHeight as string) || '28rem';
    const verticalAlign = (component.verticalAlign as string) || 'center';
    const justifyContentMap: Record<string, string> = {
      top: 'flex-start',
      center: 'center',
      bottom: 'flex-end',
    };
    const nestedHtml = await this.renderNestedComponents(
      site,
      (component.components as PublishedComponent[]) || [],
      theme,
      context
    );

    return `
      <div class="hero-component" style="position: relative; overflow: hidden; display: flex; align-items: ${justifyContentMap[verticalAlign] || 'center'}; min-height: ${minHeight}; ${height ? `height: ${height};` : ''} border-radius: ${theme.borderRadius.lg}; background-color: ${backgroundColor}; padding: clamp(2rem, 4vw, 3.5rem);">
        ${backgroundImage ? `<div aria-hidden="true" style="position: absolute; inset: 0; background-image: url('${backgroundImage}'); background-size: cover; background-position: center;"></div>` : ''}
        ${overlay ? `<div aria-hidden="true" style="position: absolute; inset: 0; background: ${overlayColor}; opacity: ${overlayOpacity};"></div>` : ''}
        <div style="position: relative; z-index: 1; width: 100%;">
          ${nestedHtml}
        </div>
      </div>
    `;
  }

  private async renderColumnsComponent(
    site: PublishedSite,
    component: RenderablePublishedComponent,
    theme: PublishedTheme,
    context: RuntimeContext
  ): Promise<string> {
    const columns =
      (component.columns as Array<{ width?: string; components?: PublishedComponent[] }>) || [];
    const gap = (component.gap as string) || '1.5rem';
    const templateColumns = resolveGridTemplateColumns(columns);
    const columnsHtml = await Promise.all(
      columns.map(async (column) => {
        const nestedHtml = await this.renderNestedComponents(
          site,
          column.components || [],
          theme,
          context
        );

        return `
          <div class="columns-column" style="min-width: 0;">
            ${nestedHtml}
          </div>
        `;
      })
    );

    return `
      <div class="columns-component" style="display: grid; gap: ${gap}; grid-template-columns: ${templateColumns}; align-items: stretch;">
        ${columnsHtml.join('\n')}
      </div>
    `;
  }

  private async renderComponent(
    site: PublishedSite,
    component: PublishedComponent,
    theme: PublishedTheme,
    context: RuntimeContext
  ): Promise<string> {
    switch (component.type) {
      case 'hero':
        return this.renderHeroComponent(
          site,
          component as RenderablePublishedComponent,
          theme,
          context
        );
      case 'columns':
        return this.renderColumnsComponent(
          site,
          component as RenderablePublishedComponent,
          theme,
          context
        );
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
      case 'referral-form':
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
            <input name="subject" placeholder="Referral subject" />
            <input name="referral_source" placeholder="Who is this referral coming from?" />
            <textarea name="notes" rows="5" placeholder="Tell us what is happening and how we can help."></textarea>
            <label class="npm-checkbox"><input type="checkbox" name="urgent" value="true" /> Mark this referral as urgent</label>
          `,
          String(component.submitText || 'Submit Referral'),
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
            : (
                await this.events.listPublicEventsByOwner(getPublicSiteOwnerUserId(site), {
                  event_type: eventType as PublicEventListItem['event_type'] | undefined,
                  include_past: component.showPastEvents === true,
                  limit,
                  offset: 0,
                  sort_by: 'start_date',
                  sort_order: 'asc',
                })
              ).items;

        const detailPathPattern =
          context.kind === 'eventsIndex' || context.kind === 'eventDetail'
            ? context.detailPathPattern
            : this.routeResolver.getDetailPathPattern(site, 'events');
        return this.renderEventCards(
          listData.slice(0, limit),
          detailPathPattern,
          component.type === 'event-calendar'
            ? 'list'
            : ((component.layout as 'grid' | 'list') || 'grid'),
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
            action="${escapeHtml(buildPublicEventRegistrationSubmissionPath(site.id, context.event.event_id))}"
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
            : (
                await this.entries.listPublicNewsletters(site, {
                  limit: typeof component.maxItems === 'number' ? component.maxItems : 10,
                  offset: 0,
                  sourceFilter:
                    (component.sourceFilter as 'native' | 'mailchimp' | 'all' | undefined) || 'all',
                })
              ).items;
        const detailPathPattern =
          context.kind === 'newslettersIndex' || context.kind === 'newsletterDetail'
            ? context.detailPathPattern
            : this.routeResolver.getDetailPathPattern(site, 'newsletters');
        return this.renderNewsletterCards(
          listData.slice(0, typeof component.maxItems === 'number' ? component.maxItems : 10),
          detailPathPattern,
          typeof component.emptyMessage === 'string'
            ? component.emptyMessage
            : 'No newsletters are available right now.'
        );
      }
      default:
        return generateComponentHtml(component as RenderablePublishedComponent, theme);
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
        align-items: stretch;
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
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
      }

      .npm-card {
        display: grid;
        gap: 0.75rem;
        align-content: start;
        height: 100%;
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
        line-height: 1.15;
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
        font-size: 0.95rem;
      }

      [data-public-site-form="true"] input,
      [data-public-site-form="true"] textarea {
        width: 100%;
        padding: 0.8rem 0.9rem;
        border: 1px solid var(--npm-border);
        border-radius: 12px;
        font: inherit;
        min-width: 0;
      }

      .npm-public-form {
        width: min(100%, 720px);
        margin: 0 auto;
      }

      .npm-public-form--donation-form {
        text-align: center;
      }

      @media (max-width: 960px) {
        .npm-card-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .npm-card-grid,
        .npm-card-list {
          gap: 0.85rem;
        }

        .npm-field-grid {
          grid-template-columns: 1fr;
        }

        .npm-public-form {
          width: 100%;
        }

        .npm-card,
        .npm-detail,
        .npm-empty {
          padding: 1rem;
        }
      }
    `;
  }

  async renderPage(
    site: PublishedSite,
    page: PublishedPage,
    runtimeContext: RuntimeContext
  ): Promise<string> {
    const theme = site.publishedContent!.theme;
    const sectionsHtml = await Promise.all(
      page.sections.map((section) => this.renderSection(site, section, theme, runtimeContext))
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
          site,
          { id: 'event-registration-default', type: 'event-registration', submitText: 'Register' },
          theme,
          runtimeContext
        );
      }
    } else if (
      runtimeContext.kind === 'newslettersIndex' &&
      !this.hasComponentType(page, ['newsletter-archive'])
    ) {
      fallbackHtml = this.renderNewsletterCards(runtimeContext.items, runtimeContext.detailPathPattern);
    } else if (runtimeContext.kind === 'newsletterDetail') {
      fallbackHtml = this.renderNewsletterDetail(runtimeContext.entry);
    }

    const pageTitle =
      runtimeContext.kind === 'eventDetail'
        ? runtimeContext.event.event_name
        : runtimeContext.kind === 'newsletterDetail'
          ? runtimeContext.entry.title
          : page.seo?.title || page.name || site.publishedContent!.seoDefaults.title;
    const description =
      runtimeContext.kind === 'eventDetail'
        ? runtimeContext.event.description || site.publishedContent!.seoDefaults.description
        : runtimeContext.kind === 'newsletterDetail'
          ? runtimeContext.entry.excerpt ||
            runtimeContext.entry.seo.description ||
            site.publishedContent!.seoDefaults.description
          : page.seo?.description || site.publishedContent!.seoDefaults.description;
    const analyticsScript = site.publishedContent!.seoDefaults.googleAnalyticsId
      ? generateGoogleAnalyticsScript(site.publishedContent!.seoDefaults.googleAnalyticsId)
      : '';

    const bodyHtml = `
      ${generateNavigationHtml(site.publishedContent!)}
      <main>
        ${sectionsHtml.join('\n')}
        ${fallbackHtml}
      </main>
      ${generateFooterHtml(site.publishedContent!)}
      ${buildAnalyticsScript(site.id)}
      ${generateNavigationToggleScript()}
      ${buildPublicFormRuntimeScript()}
    `;

    return buildSeoMeta(
      pageTitle,
      description,
      site.publishedContent!.seoDefaults,
      page.seo,
      `${generateThemeCSS(theme)}\n${this.getRuntimeCss()}`,
      bodyHtml,
      analyticsScript
    );
  }
}
