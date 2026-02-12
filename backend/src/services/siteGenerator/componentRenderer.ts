import type { PublishedComponent, PublishedSection, PublishedTheme } from '../../types/publishing';
import { imageOptimizationService } from '../imageOptimizationService';
import { escapeHtml } from './escapeHtml';
import { getSocialIcon } from './socialIcons';

export function generateSectionHtml(section: PublishedSection, theme: PublishedTheme): string {
  const style: string[] = [];

  if (section.backgroundColor) style.push(`background-color: ${section.backgroundColor}`);
  if (section.backgroundImage) style.push(`background-image: url('${section.backgroundImage}'); background-size: cover; background-position: center`);
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

function generateComponentHtml(component: PublishedComponent, theme: PublishedTheme): string {
  switch (component.type) {
    case 'heading':
      return generateHeading(component, theme);
    case 'text':
      return generateText(component, theme);
    case 'button':
      return generateButton(component, theme);
    case 'image':
      return generateImage(component);
    case 'divider':
      return generateDivider(component, theme);
    case 'spacer':
      return generateSpacer(component);
    case 'stats':
      return generateStats(component, theme);
    case 'testimonial':
      return generateTestimonial(component, theme);
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
    default:
      return `<!-- Unknown component type: ${component.type} -->`;
  }
}

function generateHeading(component: PublishedComponent, theme: PublishedTheme): string {
  const level = (component.level as number) || 2;
  const tag = `h${level}`;
  const align = (component.align as string) || 'left';
  const color = (component.color as string) || theme.colors.text;
  const content = component.content as string;

  return `<${tag} style="text-align: ${align}; color: ${color}; font-family: ${theme.typography.headingFontFamily}">${escapeHtml(content)}</${tag}>`;
}

function generateText(component: PublishedComponent, theme: PublishedTheme): string {
  const align = (component.align as string) || 'left';
  const color = (component.color as string) || theme.colors.text;
  const content = component.content as string;

  return `<p style="text-align: ${align}; color: ${color}; font-family: ${theme.typography.fontFamily}; line-height: ${theme.typography.lineHeight}">${escapeHtml(content)}</p>`;
}

function generateButton(component: PublishedComponent, theme: PublishedTheme): string {
  const text = (component.text as string) || 'Button';
  const url = (component.url as string) || '#';
  const variant = (component.variant as string) || 'primary';
  const size = (component.size as string) || 'md';
  const fullWidth = component.fullWidth as boolean;

  const variantStyles: Record<string, string> = {
    primary: `background: ${theme.colors.primary}; color: white; border: none`,
    secondary: `background: ${theme.colors.secondary}; color: white; border: none`,
    outline: `background: transparent; color: ${theme.colors.primary}; border: 2px solid ${theme.colors.primary}`,
  };

  const sizeStyles: Record<string, string> = {
    sm: 'padding: 0.5rem 1rem; font-size: 0.875rem',
    md: 'padding: 0.75rem 1.5rem; font-size: 1rem',
    lg: 'padding: 1rem 2rem; font-size: 1.125rem',
  };

  const style = `${variantStyles[variant] || variantStyles.primary}; ${sizeStyles[size] || sizeStyles.md}; border-radius: ${theme.borderRadius.md}; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; text-decoration: none${fullWidth ? '; width: 100%' : ''}`;

  return `<a href="${escapeHtml(url)}" class="btn" style="${style}">${escapeHtml(text)}</a>`;
}

function generateImage(component: PublishedComponent): string {
  const src = (component.src as string) || '';
  const alt = (component.alt as string) || '';
  const width = (component.width as string) || '100%';
  const height = (component.height as string) || 'auto';
  const caption = component.caption as string;
  const priority = component.priority as boolean;

  if (!src) {
    return '<div class="image-placeholder" style="background: #f3f4f6; padding: 2rem; text-align: center; color: #9ca3af;">Image placeholder</div>';
  }

  const numericWidth = parseInt(width, 10);
  const optimizationOptions = {
    width: !isNaN(numericWidth) ? numericWidth : 1200,
    quality: 80,
    format: 'webp' as const,
    lazy: !priority,
  };

  const optimizedImageHtml = imageOptimizationService.generateOptimizedImageHtml(
    src,
    alt,
    optimizationOptions,
    'component-image'
  );

  const preloadHint = priority
    ? `<!-- Preload: ${imageOptimizationService.getPreloadLink(src, optimizationOptions)} -->`
    : '';

  return `
      ${preloadHint}
      <figure style="margin: 0;">
        <div style="width: ${width}; height: ${height}; overflow: hidden; border-radius: 0.5rem;">
          ${optimizedImageHtml}
        </div>
        ${caption ? `<figcaption style="text-align: center; font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem">${escapeHtml(caption)}</figcaption>` : ''}
      </figure>`;
}

function generateDivider(component: PublishedComponent, theme: PublishedTheme): string {
  const color = (component.color as string) || theme.colors.border;
  const thickness = (component.thickness as string) || '1px';
  const width = (component.width as string) || '100%';

  return `<hr style="border: none; border-top: ${thickness} solid ${color}; width: ${width}; margin: 1rem auto;">`;
}

function generateSpacer(component: PublishedComponent): string {
  const height = (component.height as string) || '2rem';
  return `<div style="height: ${height}"></div>`;
}

function generateStats(component: PublishedComponent, theme: PublishedTheme): string {
  const items = (component.items as Array<{ id: string; value: string; label: string }>) || [];
  const columns = (component.columns as number) || 4;

  if (!items.length) return '';

  return `
      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 2rem; text-align: center;">
        ${items.map((item) => `
          <div class="stat-item">
            <div style="font-size: 2rem; font-weight: bold; color: ${theme.colors.primary}">${escapeHtml(item.value)}</div>
            <div style="color: ${theme.colors.textMuted}">${escapeHtml(item.label)}</div>
          </div>
        `).join('\n')}
      </div>`;
}

function generateTestimonial(component: PublishedComponent, theme: PublishedTheme): string {
  const quote = (component.quote as string) || '';
  const author = (component.author as string) || '';
  const title = component.title as string;
  const avatar = component.avatar as string;

  return `
      <blockquote style="text-align: center; margin: 0;">
        <p style="font-size: 1.25rem; font-style: italic; color: ${theme.colors.text}">"${escapeHtml(quote)}"</p>
        ${avatar ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(author)}" style="width: 3rem; height: 3rem; border-radius: 50%; margin: 1rem auto;">` : ''}
        <footer>
          <strong style="color: ${theme.colors.text}">${escapeHtml(author)}</strong>
          ${title ? `<br><span style="color: ${theme.colors.textMuted}">${escapeHtml(title)}</span>` : ''}
        </footer>
      </blockquote>`;
}

function generateGallery(component: PublishedComponent): string {
  const items = (component.items as Array<{ id: string; src: string; alt?: string; caption?: string }>) || [];
  const columns = (component.columns as number) || 3;

  if (!items.length) return '<div class="gallery-placeholder">Gallery - add images in editor</div>';

  const thumbnailWidth = Math.ceil(1200 / columns);

  return `
      <div class="gallery-grid" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 1rem;">
        ${items.map((item) => {
          const optimizedImageHtml = imageOptimizationService.generateOptimizedImageHtml(
            item.src,
            item.alt || '',
            { width: thumbnailWidth, quality: 75, lazy: true },
            'gallery-image'
          );

          return `
          <div class="gallery-item" style="position: relative; overflow: hidden; border-radius: 0.5rem; aspect-ratio: 1;">
            ${optimizedImageHtml}
            ${item.caption ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.5); color: white; padding: 0.5rem; font-size: 0.875rem;">${escapeHtml(item.caption)}</div>` : ''}
          </div>`;
        }).join('\n')}
      </div>`;
}

function generateVideo(component: PublishedComponent): string {
  const src = (component.src as string) || '';
  const provider = (component.provider as string) || 'youtube';
  const aspectRatio = (component.aspectRatio as string) || '16/9';

  if (!src) {
    return '<div class="video-placeholder" style="background: #1f2937; padding: 4rem; text-align: center; color: #9ca3af; border-radius: 0.5rem;">Video - add URL in editor</div>';
  }

  let embedUrl = src;
  if (provider === 'youtube') {
    const match = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) embedUrl = `https://www.youtube.com/embed/${match[1]}`;
  } else if (provider === 'vimeo') {
    const match = src.match(/vimeo\.com\/(\d+)/);
    if (match) embedUrl = `https://player.vimeo.com/video/${match[1]}`;
  }

  return `
      <div style="position: relative; aspect-ratio: ${aspectRatio}; overflow: hidden; border-radius: 0.5rem;">
        <iframe src="${escapeHtml(embedUrl)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>`;
}

function generateContactForm(component: PublishedComponent, theme: PublishedTheme): string {
  const submitText = (component.submitText as string) || 'Send Message';
  const includePhone = component.includePhone !== false;
  const includeMessage = component.includeMessage !== false;

  return `
      <form class="contact-form" style="max-width: 500px; margin: 0 auto;">
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: ${theme.colors.text}">Name</label>
          <input type="text" name="name" required style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md};">
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: ${theme.colors.text}">Email</label>
          <input type="email" name="email" required style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md};">
        </div>
        ${includePhone ? `
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: ${theme.colors.text}">Phone</label>
          <input type="tel" name="phone" style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md};">
        </div>
        ` : ''}
        ${includeMessage ? `
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; color: ${theme.colors.text}">Message</label>
          <textarea name="message" rows="4" required style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md}; resize: vertical;"></textarea>
        </div>
        ` : ''}
        <button type="submit" style="width: 100%; padding: 0.75rem; background: ${theme.colors.primary}; color: white; border: none; border-radius: ${theme.borderRadius.md}; cursor: pointer; font-weight: 500;">${escapeHtml(submitText)}</button>
      </form>`;
}

function generateNewsletterSignup(component: PublishedComponent, theme: PublishedTheme): string {
  const buttonText = (component.buttonText as string) || 'Subscribe';

  return `
      <form class="newsletter-form" style="display: flex; gap: 0.5rem; max-width: 400px; margin: 0 auto;">
        <input type="email" name="email" placeholder="Enter your email" required style="flex: 1; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md};">
        <button type="submit" style="padding: 0.75rem 1.5rem; background: ${theme.colors.primary}; color: white; border: none; border-radius: ${theme.borderRadius.md}; cursor: pointer; font-weight: 500; white-space: nowrap;">${escapeHtml(buttonText)}</button>
      </form>`;
}

function generateDonationForm(component: PublishedComponent, theme: PublishedTheme): string {
  const amounts = (component.suggestedAmounts as number[]) || [25, 50, 100, 250];
  const allowCustom = component.allowCustomAmount !== false;

  return `
      <form class="donation-form" style="max-width: 400px; margin: 0 auto; text-align: center;">
        <div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1rem; flex-wrap: wrap;">
          ${amounts.map((amount) => `
            <button type="button" class="amount-btn" data-amount="${amount}" style="padding: 0.75rem 1.5rem; background: white; border: 2px solid ${theme.colors.primary}; border-radius: ${theme.borderRadius.md}; cursor: pointer; color: ${theme.colors.primary}; font-weight: 500;">$${amount}</button>
          `).join('\n')}
        </div>
        ${allowCustom ? `
        <div style="margin-bottom: 1rem;">
          <input type="number" name="custom_amount" placeholder="Custom amount" style="width: 100%; padding: 0.75rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.md}; text-align: center;">
        </div>
        ` : ''}
        <button type="submit" style="width: 100%; padding: 1rem; background: ${theme.colors.primary}; color: white; border: none; border-radius: ${theme.borderRadius.md}; cursor: pointer; font-weight: 600; font-size: 1.125rem;">Donate Now</button>
      </form>`;
}

function generateSocialLinks(component: PublishedComponent): string {
  const links = (component.links as Array<{ platform: string; url: string }>) || [];
  const align = (component.align as string) || 'center';

  if (!links.length) return '';

  const justifyMap: Record<string, string> = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };

  return `
      <div class="social-links" style="display: flex; gap: 1rem; justify-content: ${justifyMap[align] || 'center'}; flex-wrap: wrap;">
        ${links.map((link) => `
          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(link.platform)}" style="color: inherit; transition: opacity 0.2s;">
            ${getSocialIcon(link.platform)}
          </a>
        `).join('\n')}
      </div>`;
}
