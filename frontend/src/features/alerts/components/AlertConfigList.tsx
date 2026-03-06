import type { AlertConfig } from '../types';
import {
  getAlertConditionLabel,
  getAlertMetricLabel,
  getAlertSeverityClasses,
} from '../alertOptions';

interface AlertConfigListProps {
  configs: AlertConfig[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (config: AlertConfig) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const formatLastTriggered = (lastTriggered?: string | null): string | null => {
  if (!lastTriggered) {
    return null;
  }

  return new Date(lastTriggered).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AlertConfigList({
  configs,
  loading,
  onCreate,
  onDelete,
  onEdit,
  onToggle,
}: AlertConfigListProps) {
  if (loading) {
    return <div className="p-8 text-center text-app-text-muted">Loading alerts...</div>;
  }

  if (configs.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-app-text-muted">No alert configurations yet</p>
        <button
          onClick={onCreate}
          className="mt-4 text-sm font-medium text-app-accent hover:text-app-accent-hover"
        >
          Create your first alert
        </button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-app-border">
      {configs.map((config) => {
        const lastTriggered = formatLastTriggered(config.last_triggered);

        return (
          <div key={config.id} className="p-4 transition-colors hover:bg-app-surface-muted">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="font-medium text-app-text">{config.name}</h3>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${getAlertSeverityClasses(config.severity)}`}>
                    {config.severity}
                  </span>
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      config.enabled
                        ? 'bg-app-accent-soft text-app-accent-text'
                        : 'bg-app-surface-muted text-app-text-muted'
                    }`}
                  >
                    {config.enabled ? 'Active' : 'Paused'}
                  </span>
                </div>

                {config.description ? (
                  <p className="mt-1 text-sm text-app-text-muted">{config.description}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-app-text-muted">
                  <div>
                    <span className="font-medium">Metric:</span>{' '}
                    {getAlertMetricLabel(config.metric_type)}
                  </div>
                  <div>
                    <span className="font-medium">Condition:</span>{' '}
                    {getAlertConditionLabel(config.condition)}
                  </div>
                  {config.threshold !== undefined ? (
                    <div>
                      <span className="font-medium">Threshold:</span> {config.threshold}
                    </div>
                  ) : null}
                  {config.percentage_change !== undefined ? (
                    <div>
                      <span className="font-medium">Change:</span> {config.percentage_change}%
                    </div>
                  ) : null}
                  <div>
                    <span className="font-medium">Frequency:</span> {config.frequency}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {config.channels.map((channel) => (
                    <span
                      key={channel}
                      className="rounded bg-app-surface-muted px-2 py-1 text-xs font-medium text-app-text-muted"
                    >
                      {channel}
                    </span>
                  ))}
                </div>

                {lastTriggered ? (
                  <p className="mt-2 text-xs text-app-text-muted">Last triggered: {lastTriggered}</p>
                ) : null}
              </div>

              <div className="ml-4 flex items-center space-x-2">
                <button
                  onClick={() => config.id && onToggle(config.id)}
                  className="p-2 text-app-text-subtle transition-colors hover:text-app-text-muted"
                  title={config.enabled ? 'Pause alert' : 'Enable alert'}
                >
                  {config.enabled ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => onEdit(config)}
                  className="p-2 text-app-text-subtle transition-colors hover:text-app-accent"
                  title="Edit alert"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => config.id && onDelete(config.id)}
                  className="p-2 text-app-text-subtle transition-colors hover:text-app-accent"
                  title="Delete alert"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
