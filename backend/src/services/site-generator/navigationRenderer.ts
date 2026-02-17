import type { PublishedContent, PublishedNavItem } from '@app-types/publishing';
import { escapeHtml } from './escapeHtml';

export function generateNavigationHtml(content: PublishedContent): string {
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
        ${nav.items.map((item) => generateNavItemHtml(item)).join('\n')}
      </ul>
    </div>
  </nav>`;
}

function generateNavItemHtml(item: PublishedNavItem): string {
  const target = item.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return `
        <li class="nav-item nav-item--dropdown">
          <a href="${escapeHtml(item.url)}"${target}>${escapeHtml(item.label)}</a>
          <ul class="nav-dropdown">
            ${item.children?.map((child) => `
              <li><a href="${escapeHtml(child.url)}"${child.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(child.label)}</a></li>
            `).join('\n') || ''}
          </ul>
        </li>`;
  }

  return `<li class="nav-item"><a href="${escapeHtml(item.url)}"${target}>${escapeHtml(item.label)}</a></li>`;
}
