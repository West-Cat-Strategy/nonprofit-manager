import React from 'react';

interface WebsiteConsoleNoticeProps {
  tone: 'success' | 'error' | 'info';
  message: string;
  onDismiss?: () => void;
}

const toneClasses: Record<WebsiteConsoleNoticeProps['tone'], string> = {
  success:
    'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-50',
  error:
    'border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-300 dark:bg-rose-950/40 dark:text-rose-50',
  info:
    'border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-300 dark:bg-sky-950/40 dark:text-sky-50',
};

const WebsiteConsoleNotice: React.FC<WebsiteConsoleNoticeProps> = ({
  tone,
  message,
  onDismiss,
}) => (
  <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClasses[tone]}`}>
    <div className="flex items-center justify-between gap-4">
      <span className="text-current">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-current/20 px-3 py-1 text-xs font-medium text-current"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  </div>
);

export default WebsiteConsoleNotice;
