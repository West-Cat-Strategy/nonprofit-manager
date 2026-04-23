import type { EmailBuilderBlock, EmailBuilderContent } from '@app-types/mailchimp';
import { escapeHtml } from '@services/site-generator/escapeHtml';
import { sanitizeRenderableUrl } from '@services/site-generator/urlSanitizer';

import { plainTextToHtmlParagraphs } from './emailCampaignText';

const DEFAULT_ACCENT_COLOR = '#0f766e';
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

interface BlockRenderContext {
  accentColor: string;
  warnings: string[];
}

const renderHeadingBlock = (
  block: Extract<EmailBuilderBlock, { type: 'heading' }>,
  { accentColor }: BlockRenderContext
): string => {
  const level = block.level && [1, 2, 3].includes(block.level) ? block.level : 2;
  const tagName = `h${level}`;
  const size = level === 1 ? '2rem' : level === 2 ? '1.5rem' : '1.25rem';

  return `<${tagName} style="margin: 0 0 1rem; color: ${accentColor}; font-size: ${size}; line-height: 1.2; font-weight: 700;">${escapeHtml(
    block.content
  )}</${tagName}>`;
};

const renderParagraphBlock = (block: Extract<EmailBuilderBlock, { type: 'paragraph' }>): string =>
  plainTextToHtmlParagraphs(block.content || '');

const renderButtonBlock = (
  block: Extract<EmailBuilderBlock, { type: 'button' }>,
  { accentColor, warnings }: BlockRenderContext
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
  { warnings }: BlockRenderContext
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

const renderBuilderBlock = (block: EmailBuilderBlock, context: BlockRenderContext): string => {
  switch (block.type) {
    case 'heading':
      return renderHeadingBlock(block, context);
    case 'paragraph':
      return renderParagraphBlock(block);
    case 'button':
      return renderButtonBlock(block, context);
    case 'image':
      return renderImageBlock(block, context);
    case 'divider':
      return renderDividerBlock();
    default:
      context.warnings.push(
        `Skipped unsupported email block type "${String((block as { type?: string }).type || 'unknown')}".`
      );
      return '';
  }
};

const renderFooter = (builderContent?: EmailBuilderContent): string => {
  const footerText = builderContent?.footerText?.trim();
  if (!footerText) {
    return '';
  }

  return `<div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.875rem; line-height: 1.6;">${plainTextToHtmlParagraphs(
    footerText
  )}</div>`;
};

export const resolveAccentColor = (builderContent?: EmailBuilderContent): string => {
  const color = builderContent?.accentColor?.trim();
  return color && HEX_COLOR_PATTERN.test(color) ? color : DEFAULT_ACCENT_COLOR;
};

export const renderBuilderBodyHtml = (
  builderContent: EmailBuilderContent,
  accentColor: string,
  warnings: string[]
): string => {
  const context: BlockRenderContext = { accentColor, warnings };

  return `${builderContent.blocks
    .map((block) => renderBuilderBlock(block, context))
    .join('')}${renderFooter(builderContent)}`;
};
