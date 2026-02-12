import type {
  Template,
  TemplateListItem,
  TemplatePage,
  TemplateTheme,
  TemplateCategory,
  TemplateStatus,
  PageSEO,
  PageSection,
} from '@app-types/websiteBuilder';
import type { PublishedPage, PublishedTheme, PublishedSection } from '@app-types/publishing';

/**
 * Map database row to Template object
 */
export function mapRowToTemplate(row: Record<string, unknown>): Template {
  return {
    id: row.id as string,
    userId: row.user_id as string | undefined,
    name: row.name as string,
    description: row.description as string || '',
    category: row.category as TemplateCategory,
    tags: (row.tags as string[]) || [],
    status: row.status as TemplateStatus,
    isSystemTemplate: row.is_system_template as boolean,
    theme: row.theme as TemplateTheme,
    globalSettings: row.global_settings as Template['globalSettings'],
    pages: [],
    metadata: row.metadata as Template['metadata'],
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

/**
 * Map database row to TemplateListItem
 */
export function mapRowToListItem(row: Record<string, unknown>): TemplateListItem {
  const metadata = row.metadata as Template['metadata'] || {};
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string || '',
    category: row.category as TemplateCategory,
    tags: (row.tags as string[]) || [],
    status: row.status as TemplateStatus,
    isSystemTemplate: row.is_system_template as boolean,
    thumbnailImage: metadata.thumbnailImage,
    pageCount: parseInt(row.page_count as string) || 0,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

/**
 * Map database row to TemplatePage
 */
export function mapRowToPage(row: Record<string, unknown>): TemplatePage {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    isHomepage: row.is_homepage as boolean,
    seo: row.seo as PageSEO,
    sections: (row.sections as PageSection[]) || [],
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

/**
 * Increment version string (e.g., '1.0.0' -> '1.0.1')
 */
export function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

/**
 * Generate CSS variables from a template theme
 */
export function generateThemeCssVariables(theme: TemplateTheme): string {
  const { colors, typography, spacing, borderRadius, shadows } = theme;
  let css = ':root {\n';

  css += `  --color-primary: ${colors.primary};\n`;
  css += `  --color-secondary: ${colors.secondary};\n`;
  css += `  --color-accent: ${colors.accent};\n`;
  css += `  --color-background: ${colors.background};\n`;
  css += `  --color-surface: ${colors.surface};\n`;
  css += `  --color-text: ${colors.text};\n`;
  css += `  --color-text-muted: ${colors.textMuted};\n`;
  css += `  --color-border: ${colors.border};\n`;
  css += `  --color-error: ${colors.error};\n`;
  css += `  --color-success: ${colors.success};\n`;
  css += `  --color-warning: ${colors.warning};\n`;

  css += `  --font-body: ${typography.fontFamily};\n`;
  css += `  --font-heading: ${typography.headingFontFamily};\n`;
  css += `  --font-base-size: ${typography.baseFontSize};\n`;
  css += `  --line-height: ${typography.lineHeight};\n`;
  css += `  --line-height-heading: ${typography.headingLineHeight};\n`;
  css += `  --font-weight-normal: ${typography.fontWeightNormal};\n`;
  css += `  --font-weight-medium: ${typography.fontWeightMedium};\n`;
  css += `  --font-weight-bold: ${typography.fontWeightBold};\n`;

  css += `  --spacing-xs: ${spacing.xs};\n`;
  css += `  --spacing-sm: ${spacing.sm};\n`;
  css += `  --spacing-md: ${spacing.md};\n`;
  css += `  --spacing-lg: ${spacing.lg};\n`;
  css += `  --spacing-xl: ${spacing.xl};\n`;
  css += `  --spacing-xxl: ${spacing.xxl};\n`;

  css += `  --radius-sm: ${borderRadius.sm};\n`;
  css += `  --radius-md: ${borderRadius.md};\n`;
  css += `  --radius-lg: ${borderRadius.lg};\n`;
  css += `  --radius-full: ${borderRadius.full};\n`;

  css += `  --shadow-sm: ${shadows.sm};\n`;
  css += `  --shadow-md: ${shadows.md};\n`;
  css += `  --shadow-lg: ${shadows.lg};\n`;
  css += `  --shadow-xl: ${shadows.xl};\n`;

  css += '}\n';
  return css;
}

/**
 * Convert TemplateTheme to PublishedTheme
 */
export function convertToPublishedTheme(theme: TemplateTheme): PublishedTheme {
  return {
    colors: theme.colors,
    typography: theme.typography,
    borderRadius: theme.borderRadius,
    shadows: {
      sm: theme.shadows.sm,
      md: theme.shadows.md,
      lg: theme.shadows.lg,
    },
  };
}

/**
 * Convert TemplatePage to PublishedPage
 */
export function convertToPublishedPage(page: TemplatePage): PublishedPage {
  return {
    id: page.id,
    slug: page.slug,
    name: page.name,
    isHomepage: page.isHomepage,
    sections: (page.sections || []) as unknown as PublishedSection[],
    seo: page.seo || {
      title: page.name,
      description: '',
      keywords: [],
    },
  };
}
