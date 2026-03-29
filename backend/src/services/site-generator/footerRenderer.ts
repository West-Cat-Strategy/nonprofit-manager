import type { PublishedContent } from '@app-types/publishing';
import { escapeHtml } from './escapeHtml';
import { getSocialIcon } from './socialIcons';

export function generateFooterHtml(content: PublishedContent): string {
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
                <li><a href="${escapeHtml(link.url)}" data-track-click="true" data-track-label="${escapeHtml(link.label)}" data-track-href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a></li>
              `).join('\n')}
            </ul>
          </div>
        `).join('\n')}
      </div>
      ` : ''}

      ${footer.socialLinks?.length ? `
      <div class="footer-social">
        ${footer.socialLinks.map((link) => `
          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(link.platform)}" data-track-click="true" data-track-label="${escapeHtml(link.platform)}" data-track-href="${escapeHtml(link.url)}">
            ${getSocialIcon(link.platform)}
          </a>
        `).join('\n')}
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
