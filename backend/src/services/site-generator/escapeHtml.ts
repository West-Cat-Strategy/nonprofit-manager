export function escapeHtml(text: unknown): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  const normalizedText =
    typeof text === 'string' ? text : text == null ? '' : String(text);

  return normalizedText.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}
