import { createLocalUnsubscribeToken } from './unsubscribeTokenService';
import { hashUnsubscribeEmail } from './unsubscribeService';

const getPublicBaseUrl = (): string =>
  (process.env.API_ORIGIN || 'http://localhost:3000').replace(/\/+$/, '');

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const buildLocalCampaignUnsubscribeUrl = (
  runId: string,
  recipientId: string,
  email: string
): string => {
  const token = createLocalUnsubscribeToken({
    v: 1,
    runId,
    recipientId,
    emailHash: hashUnsubscribeEmail(email),
  });
  return `${getPublicBaseUrl()}/api/v2/public/communications/unsubscribe/${encodeURIComponent(token)}`;
};

export const appendUnsubscribeFooter = (
  content: { html: string; plainText: string },
  unsubscribeUrl: string
): { html: string; plainText: string } => {
  const footerText = `Unsubscribe: ${unsubscribeUrl}`;
  const htmlFooter = `<p style="margin-top:24px;font-size:12px;line-height:1.5;color:#555">No longer want these emails? <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a>.</p>`;
  const trimmedHtml = content.html.trimEnd();
  const html = trimmedHtml.includes('</body>')
    ? trimmedHtml.replace('</body>', `${htmlFooter}\n  </body>`)
    : [trimmedHtml, htmlFooter].filter(Boolean).join('\n');

  return {
    plainText: [content.plainText.trimEnd(), footerText].filter(Boolean).join('\n\n'),
    html,
  };
};
