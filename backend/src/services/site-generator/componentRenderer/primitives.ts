import type { PublishedTheme, RenderablePublishedComponent } from '@app-types/publishing';
import { escapeHtml } from '../escapeHtml';
import { sanitizeRenderableUrl } from '../urlSanitizer';

export function generateHeading(
  component: RenderablePublishedComponent,
  theme: PublishedTheme
): string {
  const level = (component.level as number) || 2;
  const tag = `h${level}`;
  const align = (component.align as string) || 'left';
  const color = (component.color as string) || theme.colors.text;
  const content = component.content as string;
  const sizeMap: Record<number, string> = {
    1: 'clamp(2.5rem, 5vw, 4.25rem)',
    2: 'clamp(2rem, 3vw, 3rem)',
    3: 'clamp(1.35rem, 1.8vw, 1.75rem)',
    4: '1.25rem',
    5: '1.1rem',
    6: '1rem',
  };

  const margin = align === 'center' ? '0 auto 0.75rem' : '0 0 0.75rem';

  return `<${tag} style="text-align: ${align}; color: ${color}; font-family: ${theme.typography.headingFontFamily}; font-size: ${sizeMap[level] || sizeMap[2]}; max-width: 30ch; margin: ${margin}; letter-spacing: -0.02em;">${escapeHtml(content)}</${tag}>`;
}

export function generateText(component: RenderablePublishedComponent, theme: PublishedTheme): string {
  const align = (component.align as string) || 'left';
  const color = (component.color as string) || theme.colors.text;
  const content = component.content as string;

  const margin = align === 'center' ? '0 auto 1rem' : '0 0 1rem';

  return `<p style="text-align: ${align}; color: ${color}; font-family: ${theme.typography.fontFamily}; line-height: ${theme.typography.lineHeight}; max-width: 70ch; margin: ${margin}; font-size: 1rem;">${escapeHtml(content)}</p>`;
}

export function generateButton(
  component: RenderablePublishedComponent,
  theme: PublishedTheme
): string {
  const text = (component.text as string) || 'Button';
  const url =
    sanitizeRenderableUrl(
      (component.href as string | undefined) || (component.url as string | undefined) || '#'
    ) || '#';
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

  const style = `${variantStyles[variant] || variantStyles.primary}; ${sizeStyles[size] || sizeStyles.md}; border-radius: ${theme.borderRadius.full}; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-weight: ${theme.typography.fontWeightMedium}; box-shadow: ${variant === 'outline' ? 'none' : theme.shadows.sm};${fullWidth ? '; width: 100%' : ''}`;
  const dataAttributes = `data-track-click="true" data-track-label="${escapeHtml(text)}" data-track-href="${escapeHtml(url)}"`;

  return `<a href="${escapeHtml(url)}" class="btn btn--${escapeHtml(variant)}" ${dataAttributes} style="${style}">${escapeHtml(text)}</a>`;
}

export function generateDivider(
  component: RenderablePublishedComponent,
  theme: PublishedTheme
): string {
  const color = (component.color as string) || theme.colors.border;
  const thickness = (component.thickness as string) || '1px';
  const width = (component.width as string) || '100%';

  return `<hr style="border: none; border-top: ${thickness} solid ${color}; width: ${width}; margin: 1rem auto;">`;
}

export function generateSpacer(component: RenderablePublishedComponent): string {
  const height = (component.height as string) || '2rem';
  return `<div style="height: ${height}"></div>`;
}

export function generateStats(component: RenderablePublishedComponent, theme: PublishedTheme): string {
  const items = (component.items as Array<{ id: string; value: string; label: string }>) || [];
  const columns = (component.columns as number) || 4;

  if (!items.length) return '';

  return `
      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(${columns}, minmax(0, 1fr)); gap: 1.5rem; text-align: center;">
        ${items.map((item) => `
          <div class="stat-item" style="display: grid; gap: 0.35rem; padding: 1.25rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.lg}; background: ${theme.colors.surface}; box-shadow: ${theme.shadows.sm};">
            <div style="font-size: 2rem; font-weight: bold; color: ${theme.colors.primary}">${escapeHtml(item.value)}</div>
            <div style="color: ${theme.colors.textMuted}">${escapeHtml(item.label)}</div>
          </div>
        `).join('\n')}
      </div>`;
}

export function generateTestimonial(
  component: RenderablePublishedComponent,
  theme: PublishedTheme
): string {
  const quote = (component.quote as string) || '';
  const author = (component.author as string) || '';
  const title = component.title as string;
  const avatar = sanitizeRenderableUrl(component.avatar as string) || '';

  return `
      <blockquote class="testimonial-component" style="text-align: center; margin: 0 auto; max-width: 48rem; padding: 1.5rem; border: 1px solid ${theme.colors.border}; border-radius: ${theme.borderRadius.lg}; background: ${theme.colors.surface}; box-shadow: ${theme.shadows.sm};">
        <p style="font-size: 1.25rem; font-style: italic; color: ${theme.colors.text}">"${escapeHtml(quote)}"</p>
        ${avatar ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(author)}" style="width: 3rem; height: 3rem; border-radius: 50%; margin: 1rem auto;">` : ''}
        <footer>
          <strong style="color: ${theme.colors.text}">${escapeHtml(author)}</strong>
          ${title ? `<br><span style="color: ${theme.colors.textMuted}">${escapeHtml(title)}</span>` : ''}
        </footer>
      </blockquote>`;
}
