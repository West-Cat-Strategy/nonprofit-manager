import {
  type CreateCampaignRequest,
  type MailchimpCampaignPreview,
} from '@app-types/mailchimp';
import { sanitizeNewsletterHtml } from '@services/publishing/newsletterHtmlSanitizer';
import { renderBuilderBodyHtml, resolveAccentColor } from './emailCampaignBlockRenderer';
import { buildCampaignPreviewHtml } from './emailCampaignPreview';
import { plainTextToHtmlParagraphs, stripHtmlToText } from './emailCampaignText';

interface ResolvedCampaignContent {
  accentColor: string;
  bodyHtml: string;
  html: string;
  plainText: string;
  warnings: string[];
}

const EMPTY_CAMPAIGN_BODY_HTML =
  '<p style="margin: 0; color: #6b7280; font-size: 1rem; line-height: 1.7;">Campaign content will appear here once you add a message.</p>';
const EMPTY_CAMPAIGN_PLAIN_TEXT = 'Campaign content will appear here once you add a message.';

const resolveCampaignBody = (request: CreateCampaignRequest): ResolvedCampaignContent => {
  const warnings: string[] = [];
  const accentColor = resolveAccentColor(request.builderContent);

  let bodyHtml = '';
  let plainText = '';

  if (request.builderContent?.blocks?.length) {
    bodyHtml = renderBuilderBodyHtml(request.builderContent, accentColor, warnings);
    plainText = stripHtmlToText(bodyHtml);
  } else if (request.htmlContent?.trim()) {
    bodyHtml = sanitizeNewsletterHtml(request.htmlContent);
    plainText = request.plainTextContent?.trim() || stripHtmlToText(bodyHtml);
  } else if (request.plainTextContent?.trim()) {
    plainText = request.plainTextContent.trim();
    bodyHtml = plainTextToHtmlParagraphs(plainText);
  }

  if (!bodyHtml.trim()) {
    bodyHtml = EMPTY_CAMPAIGN_BODY_HTML;
    plainText = plainText || EMPTY_CAMPAIGN_PLAIN_TEXT;
  }

  return {
    accentColor,
    bodyHtml,
    html: buildCampaignPreviewHtml(request.subject, request.previewText, accentColor, bodyHtml),
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
