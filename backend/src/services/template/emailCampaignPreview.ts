import { escapeHtml } from '@services/site-generator/escapeHtml';

export const buildCampaignPreviewHtml = (
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
