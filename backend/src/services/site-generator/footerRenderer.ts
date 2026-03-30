import type { PublishedContent } from '@app-types/publishing';
import { escapeHtml } from './escapeHtml';
import { getSocialIcon } from './socialIcons';

const toSafeString = (value: unknown): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

export function generateFooterHtml(content: PublishedContent): string {
  const footer = content.footer;
  if (!footer) return '';
  const columns = Array.isArray(footer.columns) ? footer.columns : [];
  const socialLinks = Array.isArray(footer.socialLinks) ? footer.socialLinks : [];

  const style = footer.backgroundColor
    ? `style="background-color: ${footer.backgroundColor}; color: ${footer.textColor || 'inherit'}"`
    : '';

  return `
  <footer class="site-footer" ${style}>
    <div class="footer-container">
      ${columns.length ? `
      <div class="footer-columns">
        ${columns.map((col) => {
          const columnTitle = toSafeString(col.title);
          const links = Array.isArray(col.links) ? col.links : [];
          const renderedLinks = links
            .map((link) => {
              const label = toSafeString((link as { label?: unknown }).label);
              const href = toSafeString(
                (link as { url?: unknown; href?: unknown }).url ??
                  (link as { url?: unknown; href?: unknown }).href,
              );

              if (!label || !href) {
                return '';
              }

              return `
                <li><a href="${escapeHtml(href)}" data-track-click="true" data-track-label="${escapeHtml(label)}" data-track-href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>
              `;
            })
            .filter(Boolean)
            .join('\n');

          if (!columnTitle && !renderedLinks) {
            return '';
          }

          return `
          <div class="footer-column">
            ${columnTitle ? `<h4>${escapeHtml(columnTitle)}</h4>` : ''}
            <ul>
              ${renderedLinks}
            </ul>
          </div>
        `;
        }).filter(Boolean).join('\n')}
      </div>
      ` : ''}

      ${socialLinks.length ? `
      <div class="footer-social">
        ${socialLinks.map((link) => {
          const platform = toSafeString(link.platform);
          const href = toSafeString(link.url);

          if (!platform || !href) {
            return '';
          }

          return `
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(platform)}" data-track-click="true" data-track-label="${escapeHtml(platform)}" data-track-href="${escapeHtml(href)}">
            ${getSocialIcon(platform)}
          </a>
          `;
        }).filter(Boolean).join('\n')}
      </div>
      ` : ''}

      ${footer.showNewsletter ? `
      <div class="footer-newsletter">
        <h4>${escapeHtml(footer.newsletterTitle || 'Subscribe to our newsletter')}</h4>
        ${footer.newsletterDescription ? `<p>${escapeHtml(footer.newsletterDescription)}</p>` : ''}
        <a
          href="/whats-happening#newsletter"
          class="btn"
          data-track-click="true"
          data-track-label="Subscribe to newsletter"
          data-track-href="/whats-happening#newsletter"
          style="display: inline-flex; align-items: center; justify-content: center; margin-top: 0.5rem; padding: 0.75rem 1.1rem; border-radius: 9999px; background: #1f4d3b; color: white; font-weight: 600;"
        >
          Subscribe
        </a>
      </div>
      ` : ''}

      <div class="footer-copyright">
        <p>${escapeHtml(footer.copyright)}</p>
      </div>
    </div>
  </footer>`;
}
