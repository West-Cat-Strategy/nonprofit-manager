const SCRIPT_TAG_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const ANALYTICS_COMMENT_PATTERN = /^(?:Site|Google)\s+Analytics$/i;
const INLINE_EVENT_HANDLER_PATTERN = /^on/i;

const getAdjacentMeaningfulSibling = (
  node: ChildNode,
  direction: 'previousSibling' | 'nextSibling'
): ChildNode | null => {
  let sibling = node[direction];

  while (sibling?.nodeType === Node.TEXT_NODE && !sibling.textContent?.trim()) {
    sibling = sibling[direction];
  }

  return sibling;
};

const removeLeadingAnalyticsComment = (scriptNode: HTMLScriptElement): void => {
  const previousSibling = getAdjacentMeaningfulSibling(scriptNode, 'previousSibling');

  if (
    previousSibling?.nodeType === Node.COMMENT_NODE &&
    ANALYTICS_COMMENT_PATTERN.test(previousSibling.textContent?.trim() ?? '')
  ) {
    previousSibling.remove();
  }
};

export const sanitizePreviewHtml = (html: string): string => {
  if (!html) {
    return html;
  }

  if (typeof DOMParser === 'undefined') {
    return html.replace(SCRIPT_TAG_PATTERN, '');
  }

  const parsedDocument = new DOMParser().parseFromString(html, 'text/html');

  parsedDocument.querySelectorAll('script').forEach((scriptNode) => {
    removeLeadingAnalyticsComment(scriptNode);
    scriptNode.remove();
  });

  parsedDocument.querySelectorAll('*').forEach((element) => {
    for (const attributeName of element.getAttributeNames()) {
      if (INLINE_EVENT_HANDLER_PATTERN.test(attributeName)) {
        element.removeAttribute(attributeName);
      }
    }
  });

  const doctype = html.match(/<!doctype[^>]*>/i)?.[0];
  const serializedDocument = parsedDocument.documentElement.outerHTML;

  return doctype ? `${doctype}\n${serializedDocument}` : serializedDocument;
};
