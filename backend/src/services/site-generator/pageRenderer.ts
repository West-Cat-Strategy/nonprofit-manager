import type { PublishedContent, PublishedPage } from '@app-types/publishing';
import {
  buildSeoMeta,
  generateFooterHtml,
  generateGoogleAnalyticsScript,
  generateNavigationHtml,
} from './layoutRenderer';
import { generateSectionHtml } from './componentRenderer';
import { generateSiteAnalyticsScript } from './analyticsScript';

export function renderPageHtml(
  page: PublishedPage,
  content: PublishedContent,
  css: string
): string {
  const title = page.seo?.title || page.name || content.seoDefaults.title;
  const description = page.seo?.description || content.seoDefaults.description;
  const analyticsScript = content.seoDefaults.googleAnalyticsId
    ? generateGoogleAnalyticsScript(content.seoDefaults.googleAnalyticsId)
    : '';

  const bodyHtml = `
  ${generateNavigationHtml(content)}

  <main>
    ${page.sections.map((section) => generateSectionHtml(section, content.theme)).join('\n')}
  </main>

  ${generateFooterHtml(content)}
  ${generateSiteAnalyticsScript(content.templateId)}
`;

  return buildSeoMeta(
    title,
    description,
    content.seoDefaults,
    page.seo,
    css,
    bodyHtml,
    analyticsScript
  );
}
