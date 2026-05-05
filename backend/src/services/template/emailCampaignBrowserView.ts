import { escapeHtml } from '@services/site-generator/escapeHtml';

const PLACEHOLDER_LABELS: Record<string, string> = {
  ADDRESS: 'Mailing address',
  EMAIL: 'Email address',
  FIRSTNAME: 'First name',
  FIRST_NAME: 'First name',
  FNAME: 'First name',
  FULLNAME: 'Full name',
  FULL_NAME: 'Full name',
  LASTNAME: 'Last name',
  LAST_NAME: 'Last name',
  LNAME: 'Last name',
  ORGANIZATION: 'Organization name',
  ORGANIZATION_NAME: 'Organization name',
  ORG_NAME: 'Organization name',
  PHONE: 'Phone number',
};

const formatTokenLabel = (token: string): string => {
  const normalized = token.trim().replace(/^contact[._-]/i, '');
  const lookupKey = normalized.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
  const knownLabel = PLACEHOLDER_LABELS[lookupKey] ?? PLACEHOLDER_LABELS[lookupKey.replace(/_/g, '')];
  if (knownLabel) {
    return knownLabel;
  }

  const spaced = normalized
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  return spaced
    ? spaced.charAt(0).toUpperCase() + spaced.slice(1)
    : 'Merge field';
};

export const genericizeMailMergeVariables = (content: string): string =>
  content
    .replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, token: string) =>
      formatTokenLabel(token)
    )
    .replace(/\*\|\s*([a-zA-Z0-9_.-]+)\s*\|\*/g, (_match, token: string) =>
      formatTokenLabel(token)
    );

export const buildUnavailableCampaignBrowserViewHtml = (): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>Email unavailable</title>
  </head>
  <body style="margin: 0; padding: 2rem 1rem; background: #f3f4f6; color: #111827; font-family: Helvetica, Arial, sans-serif;">
    <main style="max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 1rem; padding: 2rem;">
      <h1 style="margin: 0 0 1rem; font-size: 1.5rem; line-height: 1.2;">Email unavailable</h1>
      <p style="margin: 0; font-size: 1rem; line-height: 1.6;">This email cannot be displayed in the browser.</p>
    </main>
  </body>
</html>`;

export const renderCampaignBrowserViewHtml = (
  contentSnapshot: Record<string, unknown> | null | undefined
): string => {
  const html = typeof contentSnapshot?.html === 'string' ? contentSnapshot.html : '';
  if (!html.trim()) {
    return buildUnavailableCampaignBrowserViewHtml();
  }

  const title = typeof contentSnapshot?.subject === 'string' ? contentSnapshot.subject : 'Email';
  const withGenericVariables = genericizeMailMergeVariables(html);
  if (withGenericVariables.includes('<meta name="robots"')) {
    return withGenericVariables;
  }

  const withNoIndex = withGenericVariables.replace(
    /<\/head>/i,
    '    <meta name="robots" content="noindex,nofollow">\n  </head>'
  );
  if (withNoIndex !== withGenericVariables) {
    return withNoIndex;
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>${escapeHtml(title)}</title>
  </head>
  <body>${withGenericVariables}</body>
</html>`;
};
