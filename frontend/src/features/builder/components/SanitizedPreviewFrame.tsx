import { sanitizePreviewHtml } from '../lib/sanitizePreviewHtml';

interface SanitizedPreviewFrameProps {
  html: string;
  title: string;
  className?: string;
}

export default function SanitizedPreviewFrame({
  html,
  title,
  className = 'w-full h-full border-0',
}: SanitizedPreviewFrameProps) {
  return (
    <iframe
      title={title}
      className={className}
      srcDoc={sanitizePreviewHtml(html)}
      sandbox=""
    />
  );
}
