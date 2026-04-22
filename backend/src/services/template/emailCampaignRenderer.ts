import {
  type CreateCampaignRequest,
  type EmailBuilderBlock,
  type EmailBuilderContent,
  type MailchimpCampaignPreview,
} from '@app-types/mailchimp';
import { sanitizeNewsletterHtml } from '@services/publishing/newsletterHtmlSanitizer';
import { escapeHtml } from '@services/site-generator/escapeHtml';
import { sanitizeRenderableUrl } from '@services/site-generator/urlSanitizer';

const DEFAULT_ACCENT_COLOR = '#0f766e';
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

interface ResolvedCampaignContent {
  accentColor: string;
  bodyHtml: string;
  html: string;
  plainText: string;
  warnings: string[];
}

const stripHtmlToText = (html: string): string =>
  html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

const toParagraphs = (plainText: string): string =>
  plainText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 1rem; color: #111827; font-size: 1rem; line-height: 1.7;">${escapeHtml(
          paragraph
        )}</p>`
    )
    .join('');

const resolveAccentColor = (builderContent?: EmailBuilderContent): string => {
  const color = builderContent?.accentColor?.trim();
  return color && HEX_COLOR_PATTERN.test(color) ? color : DEFAULT_ACCENT_COLOR;
};

const renderHeadingBlock = (block: Extract<EmailBuilderBlock, { type: 'heading' }>, accentColor: string): string => {
  const level = block.level && [1, 2, 3].includes(block.level) ? block.level : 2;
  const tagName = `h${level}`;
  const size =
    level === 1 ? '2rem' : level === 2 ? '1.5rem' : '1.25rem';

  return `<${tagName} style="margin: 0 0 1rem; color: ${accentColor}; font-size: ${size}; line-height: 1.2; font-weight: 700;">${escapeHtml(
    block.content
  )}</${tagName}>`;
};

const renderParagraphBlock = (block: Extract<EmailBuilderBlock, { type: 'paragraph' }>): string =>
  toParagraphs(block.content || '');

const renderButtonBlock = (
  block: Extract<EmailBuilderBlock, { type: 'button' }>,
  accentColor: string,
  warnings: string[]
): string => {
  const safeUrl = sanitizeRenderableUrl(block.url, { allowRelative: false });
  if (!safeUrl) {
    warnings.push(`Skipped button "${block.label}" because its URL is not safe for email preview.`);
    return '';
  }

  return `<div style="margin: 1.5rem 0;"><a href="${escapeHtml(
    safeUrl
  )}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: ${accentColor}; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 999px; padding: 0.85rem 1.4rem;">${escapeHtml(
    block.label
  )}</a></div>`;
};

const renderImageBlock = (
  block: Extract<EmailBuilderBlock, { type: 'image' }>,
  warnings: string[]
): string => {
  const safeSrc = sanitizeRenderableUrl(block.src, { allowRelative: false });
  if (!safeSrc) {
    warnings.push('Skipped an image block because its source URL is not safe for email preview.');
    return '';
  }

  const image = `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(
    block.alt || 'Email image'
  )}" style="display: block; width: 100%; max-width: 100%; height: auto; border-radius: 1rem; margin: 0 auto;">`;
  const safeHref = block.href ? sanitizeRenderableUrl(block.href, { allowRelative: false }) : null;

  if (block.href && !safeHref) {
    warnings.push('Removed an unsafe image link from email preview content.');
  }

  if (!safeHref) {
    return `<div style="margin: 1.5rem 0;">${image}</div>`;
  }

  return `<div style="margin: 1.5rem 0;"><a href="${escapeHtml(
    safeHref
  )}" target="_blank" rel="noopener noreferrer">${image}</a></div>`;
};

const renderDividerBlock = (): string =>
  '<hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 2rem 0;">';

const renderBuilderBlocks = (
  builderContent: EmailBuilderContent,
  accentColor: string,
  warnings: string[]
): string => {
  return builderContent.blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return renderHeadingBlock(block, accentColor);
        case 'paragraph':
          return renderParagraphBlock(block);
        case 'button':
          return renderButtonBlock(block, accentColor, warnings);
        case 'image':
          return renderImageBlock(block, warnings);
        case 'divider':
          return renderDividerBlock();
        default:
          warnings.push(`Skipped unsupported email block type "${String((block as { type?: string }).type || 'unknown')}".`);
          return '';
      }
    })
    .join('');
};

const renderFooter = (builderContent?: EmailBuilderContent): string => {
  const footerText = builderContent?.footerText?.trim();
  if (!footerText) {
    return '';
  }

  return `<div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.875rem; line-height: 1.6;">${toParagraphs(
    footerText
  )}</div>`;
};

const buildPreviewHtml = (
  subject: string,
  previewText: string | undefined,
  accentColor: string,
  bodyHtml: string
): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject || 'Campaign preview')}</title>
  </head>
  <body style="margin: 0; padding: 2rem 1rem; background: #f3f4f6; color: #111827; font-family: Helvetica, Arial, sans-serif;">
    <span style="display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; overflow: hidden;">
      ${escapeHtml(previewText || '')}
    </span>
    <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 1.5rem; overflow: hidden;">
      <div style="height: 0.4rem; background: ${accentColor};"></div>
      <div style="padding: 2rem;">
        ${bodyHtml}
      </div>
    </div>
  </body>
</html>`;

const resolveCampaignBody = (request: CreateCampaignRequest): ResolvedCampaignContent => {
  const warnings: string[] = [];
  const accentColor = resolveAccentColor(request.builderContent);

  let bodyHtml = '';
  let plainText = '';

  if (request.builderContent?.blocks?.length) {
    bodyHtml = `${renderBuilderBlocks(request.builderContent, accentColor, warnings)}${renderFooter(
      request.builderContent
    )}`;
    plainText = stripHtmlToText(bodyHtml);
  } else if (request.htmlContent?.trim()) {
    bodyHtml = sanitizeNewsletterHtml(request.htmlContent);
    plainText = request.plainTextContent?.trim() || stripHtmlToText(bodyHtml);
  } else if (request.plainTextContent?.trim()) {
    plainText = request.plainTextContent.trim();
    bodyHtml = toParagraphs(plainText);
  }

  if (!bodyHtml.trim()) {
    bodyHtml =
      '<p style="margin: 0; color: #6b7280; font-size: 1rem; line-height: 1.7;">Campaign content will appear here once you add a message.</p>';
    plainText = plainText || 'Campaign content will appear here once you add a message.';
  }

  return {
    accentColor,
    bodyHtml,
    html: buildPreviewHtml(request.subject, request.previewText, accentColor, bodyHtml),
    plainText,
    warnings,
  };
};

export const renderMailchimpCampaignPreview = (
  request: CreateCampaignRequest
): MailchimpCampaignPreview => {
  const resolved = resolveCampaignBody(request);

  return {
    subject: request.subject,
    previewText: request.previewText,
    html: resolved.html,
    plainText: resolved.plainText,
    warnings: resolved.warnings,
  };
};

export const resolveMailchimpCampaignContent = (
  request: CreateCampaignRequest
): ResolvedCampaignContent => resolveCampaignBody(request);
