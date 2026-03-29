import type { PublishedContent, PublishedNavItem } from '@app-types/publishing';
import { escapeHtml } from './escapeHtml';

export function generateNavigationHtml(content: PublishedContent): string {
  const nav = content.navigation;
  if (!nav || !nav.items?.length) return '';

  const stickyClass = nav.sticky ? 'nav--sticky' : '';
  const transparentClass = nav.transparent ? 'nav--transparent' : '';
  const menuId = `site-nav-menu-${content.templateId}`;

  return `
  <nav class="site-nav ${stickyClass} ${transparentClass}">
    <div class="nav-container">
      ${nav.logo ? `<a href="/" class="nav-logo"><img src="${escapeHtml(nav.logo)}" alt="${escapeHtml(nav.logoAlt || 'Logo')}"></a>` : ''}
      <button class="nav-toggle" type="button" aria-label="Toggle navigation" aria-controls="${escapeHtml(menuId)}" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-menu" id="${escapeHtml(menuId)}">
        ${nav.items.map((item) => generateNavItemHtml(item)).join('\n')}
      </ul>
    </div>
  </nav>`;
}

function generateNavItemHtml(item: PublishedNavItem): string {
  const target = item.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
  const hasChildren = item.children && item.children.length > 0;
  const isPortalCta = /portal/i.test(item.label) || /portal/i.test(item.url);
  const ctaStyle = isPortalCta
    ? 'padding: 0.75rem 1.1rem; border-radius: 9999px; background: currentColor; color: white !important;'
    : '';

  if (hasChildren) {
    return `
        <li class="nav-item nav-item--dropdown">
          <a href="${escapeHtml(item.url)}"${target} data-track-click="true" data-track-label="${escapeHtml(item.label)}" data-track-href="${escapeHtml(item.url)}" style="${ctaStyle}">${escapeHtml(item.label)}</a>
          <ul class="nav-dropdown">
            ${item.children?.map((child) => `
              <li><a href="${escapeHtml(child.url)}"${child.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : ''} data-track-click="true" data-track-label="${escapeHtml(child.label)}" data-track-href="${escapeHtml(child.url)}">${escapeHtml(child.label)}</a></li>
            `).join('\n') || ''}
          </ul>
        </li>`;
  }

  return `<li class="nav-item${isPortalCta ? ' nav-item--cta' : ''}"><a href="${escapeHtml(item.url)}"${target} data-track-click="true" data-track-label="${escapeHtml(item.label)}" data-track-href="${escapeHtml(item.url)}" style="${ctaStyle}">${escapeHtml(item.label)}</a></li>`;
}
