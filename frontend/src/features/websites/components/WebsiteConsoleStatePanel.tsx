import React from 'react';

type WebsiteConsoleStateTone = 'loading' | 'empty' | 'error';

interface WebsiteConsoleStatePanelProps {
  tone: WebsiteConsoleStateTone;
  title: string;
  message: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}

const toneClasses: Record<WebsiteConsoleStateTone, string> = {
  loading: 'border-sky-200 bg-sky-50 text-sky-900',
  empty: 'border-dashed border-app-border bg-app-surface text-app-text-muted',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
};

const WebsiteConsoleStatePanel: React.FC<WebsiteConsoleStatePanelProps> = ({
  tone,
  title,
  message,
  action,
  onDismiss,
  dismissLabel = 'Dismiss',
}) => (
  <div className={`rounded-3xl border px-6 py-5 shadow-sm ${toneClasses[tone]}`}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-3xl">
        <h2 className="text-base font-semibold text-app-text">{title}</h2>
        <p className="mt-2 text-sm text-app-text-muted">{message}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-current/20 px-3 py-1 text-xs font-medium"
        >
          {dismissLabel}
        </button>
      ) : null}
    </div>
  </div>
);

export default WebsiteConsoleStatePanel;
