import type { PublishedComponent, PublishedTheme } from '@app-types/publishing';
import { escapeHtml } from '../escapeHtml';

export function generateHeading(component: PublishedComponent, theme: PublishedTheme): string {
  const level = (component.level as number) || 2;
  const tag = `h${level}`;
  const align = (component.align as string) || 'left';
  const color = (component.color as string) || theme.colors.text;
  const content = component.content as string;

  return `<${tag} style="text-align: ${align}; color: ${color}; font-family: ${theme.typography.headingFontFamily}">${escapeHtml(content)}</${tag}>`;
}

export function generateText(component: PublishedComponent, theme: PublishedTheme): string {
  const align = (component.align as string) || 'left';
  const color = (component.color as string) || theme.colors.text;
  const content = component.content as string;

  return `<p style="text-align: ${align}; color: ${color}; font-family: ${theme.typography.fontFamily}; line-height: ${theme.typography.lineHeight}">${escapeHtml(content)}</p>`;
}

export function generateButton(component: PublishedComponent, theme: PublishedTheme): string {
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

export function generateDivider(component: PublishedComponent, theme: PublishedTheme): string {
  const color = (component.color as string) || theme.colors.border;
  const thickness = (component.thickness as string) || '1px';
  const width = (component.width as string) || '100%';

  return `<hr style="border: none; border-top: ${thickness} solid ${color}; width: ${width}; margin: 1rem auto;">`;
}

export function generateSpacer(component: PublishedComponent): string {
  const height = (component.height as string) || '2rem';
  return `<div style="height: ${height}"></div>`;
}

export function generateStats(component: PublishedComponent, theme: PublishedTheme): string {
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

export function generateTestimonial(component: PublishedComponent, theme: PublishedTheme): string {
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
