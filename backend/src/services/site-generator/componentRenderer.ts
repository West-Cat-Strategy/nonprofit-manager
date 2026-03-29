import type { PublishedComponent, PublishedSection, PublishedTheme } from '@app-types/publishing';
import { escapeHtml } from './escapeHtml';
import {
  generateButton,
  generateDivider,
  generateHeading,
  generateSpacer,
  generateStats,
  generateTestimonial,
  generateText,
} from './componentRenderer/primitives';
import { generateGallery, generateImage, generateVideo } from './componentRenderer/media';
import {
  generateContactForm,
  generateDonationForm,
  generateNewsletterSignup,
  generateSocialLinks,
} from './componentRenderer/forms';
import { generateEventList } from './componentRenderer/events';
import { sanitizeRenderableUrl } from './urlSanitizer';

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

const renderNestedComponents = (components: PublishedComponent[], theme: PublishedTheme): string =>
  components.map((nestedComponent) => generateComponentHtml(nestedComponent, theme)).join('\n');

const generateHeroComponent = (component: PublishedComponent, theme: PublishedTheme): string => {
  const backgroundColor = (component.backgroundColor as string) || theme.colors.surface;
  const backgroundImage = sanitizeRenderableUrl(component.backgroundImage as string);
  const overlay = component.overlay !== false && Boolean(backgroundImage);
  const overlayColor = (component.overlayColor as string) || '#000000';
  const overlayOpacity = typeof component.overlayOpacity === 'number' ? component.overlayOpacity : 0.45;
  const height = (component.height as string) || undefined;
  const minHeight = (component.minHeight as string) || '28rem';
  const verticalAlign = (component.verticalAlign as string) || 'center';
  const justifyContentMap: Record<string, string> = {
    top: 'flex-start',
    center: 'center',
    bottom: 'flex-end',
  };

  return `
    <div class="hero-component" style="position: relative; overflow: hidden; display: flex; align-items: ${justifyContentMap[verticalAlign] || 'center'}; min-height: ${minHeight}; ${height ? `height: ${height};` : ''} border-radius: ${theme.borderRadius.lg}; background-color: ${backgroundColor}; padding: clamp(2rem, 4vw, 3.5rem);">
      ${backgroundImage ? `<div aria-hidden="true" style="position: absolute; inset: 0; background-image: url('${backgroundImage}'); background-size: cover; background-position: center;"></div>` : ''}
      ${overlay ? `<div aria-hidden="true" style="position: absolute; inset: 0; background: ${overlayColor}; opacity: ${overlayOpacity};"></div>` : ''}
      <div style="position: relative; z-index: 1; width: 100%;">
        ${renderNestedComponents((component.components as PublishedComponent[]) || [], theme)}
      </div>
    </div>`;
};

const generateColumnsComponent = (component: PublishedComponent, theme: PublishedTheme): string => {
  const columns = (component.columns as Array<{ width?: string; components?: PublishedComponent[] }>) || [];
  const gap = (component.gap as string) || '1.5rem';
  const templateColumns = resolveGridTemplateColumns(columns);

  return `
    <div class="columns-component" style="display: grid; gap: ${gap}; grid-template-columns: ${templateColumns}; align-items: stretch;">
      ${columns
        .map(
          (column) => `
          <div class="columns-column" style="min-width: 0;">
            ${renderNestedComponents((column.components as PublishedComponent[]) || [], theme)}
          </div>`
        )
        .join('\n')}
    </div>`;
};

const generateCardComponent = (component: PublishedComponent, theme: PublishedTheme): string => {
  const image = sanitizeRenderableUrl(component.image as string);
  const imageAlt = (component.imageAlt as string) || (component.title as string) || '';
  const title = (component.title as string) || '';
  const subtitle = (component.subtitle as string) || '';
  const content = (component.content as string) || '';
  const link = sanitizeRenderableUrl((component.link as string) || '');
  const linkText = (component.linkText as string) || 'Learn more';
  const shadow = component.shadow !== false;

  return `
    <article class="card-component" style="border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.lg}; background: ${theme.colors.surface}; padding: 1.35rem; box-shadow: ${shadow ? theme.shadows.md : 'none'}; display: grid; gap: 1rem; align-content: start; height: 100%;">
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(imageAlt)}" style="width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: ${theme.borderRadius.md};">` : ''}
      ${title ? `<h3 style="margin: 0; color: ${theme.colors.text};">${escapeHtml(title)}</h3>` : ''}
      ${subtitle ? `<p style="margin: 0; color: ${theme.colors.textMuted}; font-weight: 500;">${escapeHtml(subtitle)}</p>` : ''}
      ${content ? `<p style="margin: 0; color: ${theme.colors.text}; line-height: ${theme.typography.lineHeight};">${escapeHtml(content)}</p>` : ''}
      ${link ? `<a href="${escapeHtml(link)}" data-track-click="true" data-track-label="${escapeHtml(linkText)}" data-track-href="${escapeHtml(link)}" style="justify-self: start; display: inline-flex; align-items: center; padding: 0.75rem 1.1rem; border-radius: ${theme.borderRadius.full}; background: ${theme.colors.primary}; color: white; text-decoration: none; font-weight: ${theme.typography.fontWeightMedium};">${escapeHtml(linkText)}</a>` : ''}
    </article>`;
};

const generatePricingComponent = (component: PublishedComponent, theme: PublishedTheme): string => {
  const tiers = (component.tiers as Array<Record<string, unknown>>) || [];
  const columns = (component.columns as number) || Math.min(Math.max(tiers.length, 2), 4);

  if (!tiers.length) {
    return '';
  }

  return `
    <div class="pricing-grid" style="display: grid; gap: 1rem; grid-template-columns: repeat(${columns}, minmax(0, 1fr)); align-items: stretch;">
      ${tiers
        .map((tier) => {
          const highlighted = tier.highlighted === true;
          const buttonLink = sanitizeRenderableUrl((tier.buttonLink as string) || '#') || '#';
          return `
            <article class="pricing-tier" style="border: 1px solid ${highlighted ? theme.colors.primary : theme.colors.border}; border-radius: ${theme.borderRadius.lg}; background: ${theme.colors.surface}; padding: 1.5rem; box-shadow: ${highlighted ? theme.shadows.lg : theme.shadows.sm}; display: grid; gap: 1rem; align-content: start; height: 100%;">
              ${tier.name ? `<h3 style="margin: 0; color: ${theme.colors.text};">${escapeHtml(String(tier.name))}</h3>` : ''}
              ${tier.price ? `<div style="font-size: 2rem; font-weight: ${theme.typography.fontWeightBold}; color: ${theme.colors.primary};">${escapeHtml(String(tier.price))}</div>` : ''}
              ${tier.description ? `<p style="margin: 0; color: ${theme.colors.textMuted};">${escapeHtml(String(tier.description))}</p>` : ''}
              ${(Array.isArray(tier.features) && tier.features.length > 0)
                ? `<ul style="margin: 0; padding-left: 1.2rem; color: ${theme.colors.text}; display: grid; gap: 0.35rem;">
                    ${tier.features.map((feature) => `<li>${escapeHtml(String(feature))}</li>`).join('')}
                   </ul>`
                : ''}
              ${tier.buttonText ? `<a href="${escapeHtml(buttonLink)}" data-track-click="true" data-track-label="${escapeHtml(String(tier.buttonText))}" data-track-href="${escapeHtml(buttonLink)}" style="justify-self: start; display: inline-flex; align-items: center; padding: 0.75rem 1.1rem; border-radius: ${theme.borderRadius.full}; background: ${highlighted ? theme.colors.secondary : theme.colors.primary}; color: white; text-decoration: none; font-weight: ${theme.typography.fontWeightMedium};">${escapeHtml(String(tier.buttonText))}</a>` : ''}
            </article>`;
        })
        .join('\n')}
    </div>`;
};

const generateFAQComponent = (component: PublishedComponent, theme: PublishedTheme): string => {
  const items = (component.items as Array<Record<string, unknown>>) || [];
  const expandFirst = component.expandFirst === true;

  if (!items.length) {
    return '';
  }

  return `
    <div class="faq-list" style="display: grid; gap: 1rem;">
      ${items
        .map((item, index) => `
          <details ${expandFirst && index === 0 ? 'open' : ''} style="border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.lg}; background: ${theme.colors.surface}; padding: 1rem 1.25rem;">
            <summary style="cursor: pointer; font-weight: ${theme.typography.fontWeightBold}; color: ${theme.colors.text};">${escapeHtml(String(item.question || 'Question'))}</summary>
            <div style="margin-top: 0.75rem; color: ${theme.colors.textMuted}; line-height: ${theme.typography.lineHeight};">${escapeHtml(String(item.answer || ''))}</div>
          </details>`)
        .join('\n')}
    </div>`;
};

const generateTeamComponent = (component: PublishedComponent, theme: PublishedTheme): string => {
  const members = (component.members as Array<Record<string, unknown>>) || [];
  const columns = (component.columns as number) || Math.min(Math.max(members.length, 2), 4);
  const showBio = component.showBio !== false;
  const showSocial = component.showSocial !== false;

  if (!members.length) {
    return '';
  }

  return `
    <div class="team-grid" style="display: grid; gap: 1rem; grid-template-columns: repeat(${columns}, minmax(0, 1fr)); align-items: stretch;">
      ${members
        .map((member) => {
          const memberImage = sanitizeRenderableUrl(member.image as string);
          const socialLinks = Array.isArray(member.socialLinks) ? member.socialLinks : [];
          return `
            <article class="team-member" style="border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.lg}; background: ${theme.colors.surface}; padding: 1.25rem; display: grid; gap: 0.85rem; text-align: center; align-content: start; height: 100%;">
              ${memberImage ? `<img src="${escapeHtml(memberImage)}" alt="${escapeHtml(String(member.name || 'Team member'))}" style="width: 6rem; height: 6rem; margin: 0 auto; object-fit: cover; border-radius: 999px;">` : ''}
              <div>
                <h3 style="margin: 0; color: ${theme.colors.text};">${escapeHtml(String(member.name || 'Team member'))}</h3>
                <p style="margin: 0.25rem 0 0; color: ${theme.colors.primary}; font-weight: ${theme.typography.fontWeightMedium};">${escapeHtml(String(member.role || ''))}</p>
              </div>
              ${showBio && member.bio ? `<p style="margin: 0; color: ${theme.colors.textMuted}; line-height: ${theme.typography.lineHeight};">${escapeHtml(String(member.bio))}</p>` : ''}
              ${showSocial && socialLinks.length ? generateSocialLinks({ id: `team-${String(member.id || 'member')}`, type: 'social-links', links: socialLinks, align: 'center' } as PublishedComponent) : ''}
            </article>`;
        })
        .join('\n')}
    </div>`;
};

const generateLogoGridComponent = (component: PublishedComponent): string => {
  const logos = (component.logos as Array<Record<string, unknown>>) || [];
  const columns = (component.columns as number) || Math.min(Math.max(logos.length, 3), 6);
  const grayscale = component.grayscale !== false;
  const maxLogoHeight = (component.maxLogoHeight as string) || '56px';

  if (!logos.length) {
    return '';
  }

  return `
    <div class="logo-grid" style="display: grid; gap: 1rem; align-items: center; grid-template-columns: repeat(${columns}, minmax(0, 1fr));">
      ${logos
        .map((logo) => {
          const safeSrc = sanitizeRenderableUrl(logo.src as string);
          if (!safeSrc) {
            return '';
          }
          const safeLink = sanitizeRenderableUrl(logo.link as string);
          const image = `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(String(logo.alt || 'Logo'))}" style="max-height: ${maxLogoHeight}; width: auto; max-width: 100%; filter: ${grayscale ? 'grayscale(1)' : 'none'};">`;
          const wrapped = safeLink ? `<a href="${escapeHtml(safeLink)}" data-track-click="true" data-track-label="${escapeHtml(String(logo.alt || 'Logo'))}" data-track-href="${escapeHtml(safeLink)}" style="display: flex; align-items: center; justify-content: center; min-height: ${maxLogoHeight};">${image}</a>` : `<div style="display: flex; align-items: center; justify-content: center; min-height: ${maxLogoHeight};">${image}</div>`;
          return wrapped;
        })
        .join('\n')}
    </div>`;
};

const generateMapComponent = (component: PublishedComponent, theme: PublishedTheme): string => {
  const address = typeof component.address === 'string' ? component.address.trim() : '';
  const latitude = typeof component.latitude === 'number' ? component.latitude : null;
  const longitude = typeof component.longitude === 'number' ? component.longitude : null;
  const height = (component.height as string) || '320px';

  const embedUrl =
    latitude !== null && longitude !== null
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}&output=embed`
      : address.length > 0
        ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
        : '';

  if (!embedUrl) {
    return `<div class="map-placeholder" style="border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.lg}; background: ${theme.colors.surface}; padding: 1.5rem; color: ${theme.colors.textMuted}; text-align: center;">Add a location or address to display a map.</div>`;
  }

  return `
    <div class="map-component" style="overflow: hidden; border-radius: ${theme.borderRadius.lg}; border: 1px solid ${theme.colors.border}; background: ${theme.colors.surface};">
      <iframe
        title="${escapeHtml(address || 'Map')}"
        src="${escapeHtml(embedUrl)}"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        style="width: 100%; height: ${height}; border: 0; display: block;"
      ></iframe>
    </div>`;
};

export function generateSectionHtml(section: PublishedSection, theme: PublishedTheme): string {
  const style: string[] = [];

  if (section.backgroundColor) style.push(`background-color: ${section.backgroundColor}`);
  const safeBackgroundImage = sanitizeRenderableUrl(section.backgroundImage);
  if (safeBackgroundImage) {
    style.push(`background-image: url('${safeBackgroundImage}'); background-size: cover; background-position: center`);
  }
  if (section.paddingTop) style.push(`padding-top: ${section.paddingTop}`);
  if (section.paddingBottom) style.push(`padding-bottom: ${section.paddingBottom}`);
  if (section.paddingLeft) style.push(`padding-left: ${section.paddingLeft}`);
  if (section.paddingRight) style.push(`padding-right: ${section.paddingRight}`);

  const styleAttr = style.length ? `style="${style.join('; ')}"` : '';
  const maxWidth = section.maxWidth || '1200px';

  return `
    <section class="site-section" ${styleAttr}>
      <div class="section-container" style="max-width: ${maxWidth}; margin: 0 auto;">
        ${section.components.map((component) => generateComponentHtml(component, theme)).join('\n')}
      </div>
    </section>`;
}

export function generateComponentHtml(component: PublishedComponent, theme: PublishedTheme): string {
  switch (component.type) {
    case 'heading':
      return generateHeading(component, theme);
    case 'text':
      return generateText(component, theme);
    case 'button':
      return generateButton(component, theme);
    case 'image':
      return generateImage(component);
    case 'map':
      return generateMapComponent(component, theme);
    case 'divider':
      return generateDivider(component, theme);
    case 'spacer':
      return generateSpacer(component);
    case 'stats':
      return generateStats(component, theme);
    case 'testimonial':
      return generateTestimonial(component, theme);
    case 'hero':
      return generateHeroComponent(component, theme);
    case 'columns':
      return generateColumnsComponent(component, theme);
    case 'card':
      return generateCardComponent(component, theme);
    case 'pricing':
      return generatePricingComponent(component, theme);
    case 'faq':
      return generateFAQComponent(component, theme);
    case 'gallery':
      return generateGallery(component);
    case 'video':
      return generateVideo(component);
    case 'contact-form':
      return generateContactForm(component, theme);
    case 'newsletter-signup':
      return generateNewsletterSignup(component, theme);
    case 'donation-form':
      return generateDonationForm(component, theme);
    case 'social-links':
      return generateSocialLinks(component);
    case 'event-list':
      return generateEventList(component, theme);
    case 'team':
      return generateTeamComponent(component, theme);
    case 'logo-grid':
      return generateLogoGridComponent(component);
    default:
      return `<!-- Unknown component type: ${component.type} -->`;
  }
}
