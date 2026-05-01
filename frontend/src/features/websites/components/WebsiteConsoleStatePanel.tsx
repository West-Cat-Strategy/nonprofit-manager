import React from 'react';
import { ExclamationCircleIcon, InboxIcon, SparklesIcon } from '@heroicons/react/24/outline';

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
  loading:
    'border-app-border bg-app-surface-elevated text-app-text dark:border-sky-300 dark:bg-sky-950/40 dark:text-sky-50',
  empty: 'border-dashed border-app-border bg-app-surface text-app-text-muted',
  error:
    'border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-300 dark:bg-rose-950/40 dark:text-rose-50',
};

const toneIcons: Record<WebsiteConsoleStateTone, typeof SparklesIcon> = {
  loading: SparklesIcon,
  empty: InboxIcon,
  error: ExclamationCircleIcon,
};

const WebsiteConsoleStatePanel: React.FC<WebsiteConsoleStatePanelProps> = ({
  tone,
  title,
  message,
  action,
  onDismiss,
  dismissLabel = 'Dismiss',
}) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    aria-live={tone === 'error' ? 'assertive' : 'polite'}
    className={`rounded-3xl border px-6 py-5 shadow-sm transition duration-200 ${toneClasses[tone]}`}
  >
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex max-w-3xl gap-3">
        {React.createElement(toneIcons[tone], {
          className: 'mt-0.5 h-5 w-5 shrink-0',
          'aria-hidden': true,
        })}
        <div>
          <h2 className="text-base font-semibold text-current">{title}</h2>
          <p className="mt-2 text-sm text-current/80">{message}</p>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-current/20 px-3 py-1 text-xs font-medium text-current"
        >
          {dismissLabel}
        </button>
      ) : null}
    </div>
  </div>
);

export default WebsiteConsoleStatePanel;
