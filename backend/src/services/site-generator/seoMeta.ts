import type { PublishedSEO } from '@app-types/publishing';
import { escapeHtml } from './escapeHtml';

interface PageSeoInput {
  keywords?: string[];
  noIndex?: boolean;
  canonicalUrl?: string;
  ogImage?: string;
}

function renderBaseMeta(pageTitle: string, description: string, favicon: string): string {
  return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="icon" href="${escapeHtml(favicon)}">`;
}

function renderSearchMeta(pageSeo: PageSeoInput | undefined): string {
  return `
  ${pageSeo?.keywords?.length ? `<meta name="keywords" content="${escapeHtml(pageSeo.keywords.join(', '))}">` : ''}
  ${pageSeo?.noIndex ? '<meta name="robots" content="noindex">' : ''}
  ${pageSeo?.canonicalUrl ? `<link rel="canonical" href="${escapeHtml(pageSeo.canonicalUrl)}">` : ''}`;
}

function renderOpenGraphMeta(
  pageTitle: string,
  description: string,
  seoDefaults: PublishedSEO,
  pageSeo: PageSeoInput | undefined
): string {
  const ogImage = pageSeo?.ogImage || seoDefaults.ogImage;

  return `
  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ''}`;
}

function renderTwitterMeta(pageTitle: string, description: string): string {
  return `
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">`;
}

export function buildSeoMeta(
  pageTitle: string,
  description: string,
  seoDefaults: PublishedSEO,
  pageSeo: PageSeoInput | undefined,
  css: string,
  bodyHtml: string,
  analyticsScript: string
): string {
  const favicon = seoDefaults.favicon || '/favicon.ico';

  return `<!DOCTYPE html>
<html lang="en">
<head>
${renderBaseMeta(pageTitle, description, favicon)}
${renderSearchMeta(pageSeo)}
${renderOpenGraphMeta(pageTitle, description, seoDefaults, pageSeo)}
${renderTwitterMeta(pageTitle, description)}

  ${analyticsScript}

  <!-- Custom Head Code -->
  ${seoDefaults.customHeadCode || ''}

  <style>
${css}
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
