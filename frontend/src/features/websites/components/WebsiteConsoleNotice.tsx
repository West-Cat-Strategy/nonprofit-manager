import React from 'react';

interface WebsiteConsoleNoticeProps {
  tone: 'success' | 'error' | 'info';
  message: string;
  onDismiss?: () => void;
}

const toneClasses: Record<WebsiteConsoleNoticeProps['tone'], string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
};

const WebsiteConsoleNotice: React.FC<WebsiteConsoleNoticeProps> = ({
  tone,
  message,
  onDismiss,
}) => (
  <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClasses[tone]}`}>
    <div className="flex items-center justify-between gap-4">
      <span>{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-current/20 px-3 py-1 text-xs font-medium"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  </div>
);

export default WebsiteConsoleNotice;
