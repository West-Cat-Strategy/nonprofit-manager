import pool from '../../config/database';
import { logger } from '../../config/logger';
import { SiteGeneratorService } from '../siteGeneratorService';
import type { Template, TemplateListItem } from '../../types/websiteBuilder';
import type { PublishedContent, GeneratedPage } from '../../types/publishing';
import type { ColorPalette } from '../../types/websiteBuilder';
import { mapRowToListItem, generateThemeCssVariables, convertToPublishedTheme, convertToPublishedPage } from './helpers';
import { getTemplate } from './templateCrud';
import { createTemplate, updateTemplate } from './templateCrud';
import { getTemplatePages } from './templatePages';

/**
 * Get all system templates (for browsing)
 */
export async function getSystemTemplates(): Promise<TemplateListItem[]> {
  const result = await pool.query(
    `SELECT t.*, COUNT(tp.id) as page_count
     FROM templates t
     LEFT JOIN template_pages tp ON t.id = tp.template_id
     WHERE t.is_system_template = true AND t.status = 'published'
     GROUP BY t.id
     ORDER BY t.category, t.name`
  );

  return result.rows.map(mapRowToListItem);
}

/**
 * Duplicate a template (for users to customize)
 */
export async function duplicateTemplate(
  templateId: string,
  userId: string,
  newName?: string
): Promise<Template | null> {
  const source = await getTemplate(templateId, userId);

  if (!source) {
    return null;
  }

  return createTemplate(userId, {
    name: newName || `${source.name} (Copy)`,
    description: source.description,
    category: source.category,
    tags: source.tags,
    theme: source.theme,
    globalSettings: source.globalSettings,
    cloneFromId: templateId,
  });
}

/**
 * Generate a preview of a template
 */
export async function generateTemplatePreview(
  templateId: string,
  userId: string,
  pageSlug: string = 'home'
): Promise<GeneratedPage | null> {
  try {
    const template = await getTemplate(templateId, userId);
    if (!template) {
      return null;
    }

    const pages = await getTemplatePages(templateId);
    if (pages.length === 0) {
      return null;
    }

    const requestedPage = pages.find(p => p.slug === pageSlug) || pages.find(p => p.isHomepage) || pages[0];
    if (!requestedPage) {
      return null;
    }

    const publishedContent: PublishedContent = {
      templateId: template.id,
      templateName: template.name,
      theme: convertToPublishedTheme(template.theme),
      pages: pages.map(convertToPublishedPage),
      navigation: {
        items: (template.globalSettings?.header?.navigation || []).map(nav => ({
          id: nav.id,
          label: nav.label,
          url: nav.href,
          children: nav.children?.map(child => ({
            id: child.id,
            label: child.label,
            url: child.href,
            openInNewTab: child.isExternal,
          })),
          openInNewTab: nav.isExternal,
        })),
        logo: template.globalSettings?.header?.logo,
        logoAlt: template.globalSettings?.header?.logoAlt,
        style: 'horizontal',
        sticky: template.globalSettings?.header?.sticky ?? true,
        transparent: template.globalSettings?.header?.transparent ?? false,
      },
      footer: {
        columns: (template.globalSettings?.footer?.columns || []).map((col, idx) => ({
          id: `col-${idx}`,
          title: col.title,
          links: col.links.map((link, linkIdx) => ({
            id: `link-${idx}-${linkIdx}`,
            label: link.label,
            url: link.href,
          })),
        })),
        copyright: template.globalSettings?.footer?.copyright || `© ${new Date().getFullYear()} Your Organization`,
        socialLinks: template.globalSettings?.footer?.socialLinks?.map(link => ({
          platform: link.platform,
          url: link.url,
        })),
        showNewsletter: template.globalSettings?.footer?.showNewsletter,
        backgroundColor: template.globalSettings?.footer?.backgroundColor,
      },
      seoDefaults: {
        title: template.name,
        description: template.description || '',
        keywords: template.tags || [],
        favicon: template.globalSettings?.favicon || '/favicon.ico',
        ogImage: '',
        googleAnalyticsId: template.globalSettings?.analyticsId || '',
        customHeadCode: '',
      },
      publishedAt: new Date().toISOString(),
      version: '1.0.0-preview',
    };

    const generator = new SiteGeneratorService();
    const publishedPage = convertToPublishedPage(requestedPage);
    const generatedPage = generator.generatePage(publishedPage, publishedContent);

    return generatedPage;
  } catch (error) {
    logger.error('Error generating template preview', { error, templateId, pageSlug });
    return null;
  }
}

export async function getTemplateCssVariables(
  templateId: string,
  userId: string
): Promise<string | null> {
  const template = await getTemplate(templateId, userId);
  if (!template) return null;
  return generateThemeCssVariables(template.theme);
}

export async function applyPaletteToTemplate(
  templateId: string,
  userId: string,
  palette: ColorPalette
): Promise<Template | null> {
  const template = await getTemplate(templateId, userId);
  if (!template) return null;
  const theme = { ...template.theme, colors: { ...template.theme.colors, ...palette } };
  return updateTemplate(templateId, userId, { theme });
}

export async function applyFontPairingToTemplate(
  templateId: string,
  userId: string,
  pairing: { headingFont: string; bodyFont: string }
): Promise<Template | null> {
  const template = await getTemplate(templateId, userId);
  if (!template) return null;
  const theme = {
    ...template.theme,
    typography: {
      ...template.theme.typography,
      headingFontFamily: pairing.headingFont,
      fontFamily: pairing.bodyFont,
    },
  };
  return updateTemplate(templateId, userId, { theme });
}
