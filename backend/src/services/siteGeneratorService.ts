/**
 * Site Generator Service
 * Generates static HTML/CSS for published websites
 */

import type {
  PublishedContent,
  PublishedPage,
  GeneratedPage,
} from '../types/publishing';
import { escapeHtml } from './siteGenerator/escapeHtml';
import { getSocialIcon } from './siteGenerator/socialIcons';
import { generateThemeCSS } from './siteGenerator/themeCss';
import { generateSectionHtml } from './siteGenerator/componentRenderer';

export class SiteGeneratorService {
  /**
   * Generate all pages for a published site
   */
  generateSite(content: PublishedContent): GeneratedPage[] {
    return content.pages.map((page) => this.generatePage(page, content));
  }

  /**
   * Generate a single page
   */
  generatePage(page: PublishedPage, content: PublishedContent): GeneratedPage {
    const css = generateThemeCSS(content.theme);
    const html = this.generateHTML(page, content, css);

    return {
      slug: page.slug,
      html,
      css,
    };
  }

  /**
   * Generate the full HTML document
   */
  private generateHTML(
    page: PublishedPage,
    content: PublishedContent,
    css: string
  ): string {
    const title = page.seo?.title || page.name || content.seoDefaults.title;
    const description = page.seo?.description || content.seoDefaults.description;
    const favicon = content.seoDefaults.favicon || '/favicon.ico';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${page.seo?.keywords?.length ? `<meta name="keywords" content="${escapeHtml(page.seo.keywords.join(', '))}">` : ''}
  ${page.seo?.noIndex ? '<meta name="robots" content="noindex">' : ''}
  ${page.seo?.canonicalUrl ? `<link rel="canonical" href="${escapeHtml(page.seo.canonicalUrl)}">` : ''}
  <link rel="icon" href="${escapeHtml(favicon)}">

  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${page.seo?.ogImage || content.seoDefaults.ogImage ? `<meta property="og:image" content="${escapeHtml(page.seo?.ogImage || content.seoDefaults.ogImage || '')}">` : ''}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">

  <!-- Google Analytics -->
  ${content.seoDefaults.googleAnalyticsId ? this.generateGoogleAnalytics(content.seoDefaults.googleAnalyticsId) : ''}

  <!-- Custom Head Code -->
  ${content.seoDefaults.customHeadCode || ''}

  <style>
${css}
  </style>
</head>
<body>
  ${this.generateNavigation(content)}

  <main>
    ${page.sections.map((section) => generateSectionHtml(section, content.theme)).join('\n')}
  </main>

  ${this.generateFooter(content)}

  <!-- Site Analytics -->
  <script>
    (function() {
      var siteId = '${content.templateId}';
      var visitorId = localStorage.getItem('npm_visitor_id') || (function() {
        var id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('npm_visitor_id', id);
        return id;
      })();
      var sessionId = sessionStorage.getItem('npm_session_id') || (function() {
        var id = 's_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        sessionStorage.setItem('npm_session_id', id);
        return id;
      })();

      fetch('/api/sites/' + siteId + '/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'pageview',
          pagePath: window.location.pathname,
          visitorId: visitorId,
          sessionId: sessionId
        })
      }).catch(function(err) { if (console && console.debug) console.debug('Analytics tracking failed:', err); });
    })();
  </script>
</body>
</html>`;
  }

  /**
   * Generate Google Analytics script
   */
  private generateGoogleAnalytics(gaId: string): string {
    return `
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(gaId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${escapeHtml(gaId)}');
  </script>`;
  }

  /**
   * Generate navigation HTML
   */
  private generateNavigation(content: PublishedContent): string {
    const nav = content.navigation;
    if (!nav || !nav.items?.length) return '';

    const stickyClass = nav.sticky ? 'nav--sticky' : '';
    const transparentClass = nav.transparent ? 'nav--transparent' : '';

    return `
  <nav class="site-nav ${stickyClass} ${transparentClass}">
    <div class="nav-container">
      ${nav.logo ? `<a href="/" class="nav-logo"><img src="${escapeHtml(nav.logo)}" alt="${escapeHtml(nav.logoAlt || 'Logo')}"></a>` : ''}
      <button class="nav-toggle" aria-label="Toggle navigation">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-menu">
        ${nav.items.map((item) => this.generateNavItem(item)).join('\n')}
      </ul>
    </div>
  </nav>`;
  }

  /**
   * Generate a navigation item
   */
  private generateNavItem(item: { id: string; label: string; url: string; children?: unknown[]; openInNewTab?: boolean }): string {
    const target = item.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      return `
        <li class="nav-item nav-item--dropdown">
          <a href="${escapeHtml(item.url)}"${target}>${escapeHtml(item.label)}</a>
          <ul class="nav-dropdown">
            ${(item.children as Array<{ id: string; label: string; url: string; openInNewTab?: boolean }>).map((child) => `
              <li><a href="${escapeHtml(child.url)}"${child.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(child.label)}</a></li>
            `).join('\n')}
          </ul>
        </li>`;
    }

    return `<li class="nav-item"><a href="${escapeHtml(item.url)}"${target}>${escapeHtml(item.label)}</a></li>`;
  }

  /**
   * Generate footer HTML
   */
  private generateFooter(content: PublishedContent): string {
    const footer = content.footer;
    if (!footer) return '';

    const style = footer.backgroundColor
      ? `style="background-color: ${footer.backgroundColor}; color: ${footer.textColor || 'inherit'}"`
      : '';

    return `
  <footer class="site-footer" ${style}>
    <div class="footer-container">
      ${footer.columns?.length ? `
      <div class="footer-columns">
        ${footer.columns.map((col) => `
          <div class="footer-column">
            <h4>${escapeHtml(col.title)}</h4>
            <ul>
              ${col.links.map((link) => `
                <li><a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a></li>
              `).join('\n')}
            </ul>
          </div>
        `).join('\n')}
      </div>
      ` : ''}

      ${footer.socialLinks?.length ? `
      <div class="footer-social">
        ${footer.socialLinks.map((link) => `
          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(link.platform)}">
            ${getSocialIcon(link.platform)}
          </a>
        `).join('\n')}
      </div>
      ` : ''}

      ${footer.showNewsletter ? `
      <div class="footer-newsletter">
        <h4>${escapeHtml(footer.newsletterTitle || 'Subscribe to our newsletter')}</h4>
        ${footer.newsletterDescription ? `<p>${escapeHtml(footer.newsletterDescription)}</p>` : ''}
        <form class="newsletter-form">
          <input type="email" placeholder="Enter your email" required>
          <button type="submit">Subscribe</button>
        </form>
      </div>
      ` : ''}

      <div class="footer-copyright">
        <p>${escapeHtml(footer.copyright)}</p>
      </div>
    </div>
  </footer>`;
  }

}

export const siteGeneratorService = new SiteGeneratorService();
export default siteGeneratorService;
