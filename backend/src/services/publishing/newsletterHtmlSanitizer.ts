import { escapeHtml } from '@services/site-generator/escapeHtml';
import { sanitizeRenderableUrl } from '@services/site-generator/urlSanitizer';

const STRIP_CONTENT_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'form',
];

const STRIP_TAGS = ['input', 'button', 'textarea', 'select', 'option'];

const ALLOWED_TAGS = new Set([
  'a',
  'article',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'section',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const VOID_TAGS = new Set(['br', 'hr', 'img']);

const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  td: new Set(['colspan', 'rowspan']),
  table: new Set(['summary']),
};

const BLOCKED_ATTRS = new Set(['style', 'srcdoc', 'formaction']);

const stripContentTagPattern = STRIP_CONTENT_TAGS.map((tag) => [
  new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'),
  new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'),
] as const);

const stripTagPattern = STRIP_TAGS.map((tag) => new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi'));

const sanitizeAttributes = (tagName: string, rawAttrs: string): string => {
  const allowedAttrs = TAG_ATTRS[tagName] || new Set<string>();
  const attrs: string[] = [];
  const attrPattern = /([^\s=/>]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;

  for (const match of rawAttrs.matchAll(attrPattern)) {
    const name = match[1]?.trim().toLowerCase();
    if (!name || name.startsWith('on') || BLOCKED_ATTRS.has(name)) {
      continue;
    }
    if (!allowedAttrs.has(name)) {
      continue;
    }

    const value = match[3] ?? match[4] ?? match[5] ?? '';
    if (name === 'href' || name === 'src') {
      const safeUrl = sanitizeRenderableUrl(value);
      if (!safeUrl) {
        continue;
      }
      attrs.push(`${name}="${escapeHtml(safeUrl)}"`);
      continue;
    }

    if (name === 'target') {
      const normalizedTarget = value.trim().toLowerCase();
      if (!['_blank', '_self', '_parent', '_top'].includes(normalizedTarget)) {
        continue;
      }
      attrs.push(`${name}="${escapeHtml(normalizedTarget)}"`);
      continue;
    }

    if (name === 'rel') {
      attrs.push(`${name}="${escapeHtml(value.trim())}"`);
      continue;
    }

    attrs.push(`${name}="${escapeHtml(value)}"`);
  }

  if (tagName === 'a') {
    const hasTargetBlank = attrs.some((attr) => attr.startsWith('target="_blank"'));
    const hasRel = attrs.some((attr) => attr.startsWith('rel='));
    if (hasTargetBlank && !hasRel) {
      attrs.push('rel="noopener noreferrer"');
    }
  }

  return attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
};

export const sanitizeNewsletterHtml = (html: string): string => {
  if (!html) return '';

  let sanitized = html;
  for (const [contentPattern, selfClosingPattern] of stripContentTagPattern) {
    sanitized = sanitized.replace(contentPattern, '');
    sanitized = sanitized.replace(selfClosingPattern, '');
  }

  for (const pattern of stripTagPattern) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized.replace(/<\/?([a-zA-Z][a-zA-Z0-9:-]*)([^>]*)>/g, (fullMatch, rawTagName: string, rawAttrs: string) => {
    const tagName = String(rawTagName).toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      return '';
    }

    if (fullMatch.startsWith('</')) {
      return `</${tagName}>`;
    }

    const attrs = sanitizeAttributes(tagName, String(rawAttrs || ''));
    return VOID_TAGS.has(tagName) ? `<${tagName}${attrs}>` : `<${tagName}${attrs}>`;
  });
};
