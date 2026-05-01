import {
  BellAlertIcon,
  CheckCircleIcon,
  PauseCircleIcon,
  PencilSquareIcon,
  PlayCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import type { AlertConfig } from '../types';
import {
  getAlertConditionLabel,
  getAlertChannelLabel,
  getAlertFrequencyLabel,
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
    return <div className="p-8 text-center text-app-text-muted">Loading alert rules...</div>;
  }

  if (configs.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-app-text-muted">No alert rules yet</p>
        <button
          onClick={onCreate}
          className="mt-4 text-sm font-medium text-app-accent hover:text-app-accent-hover"
        >
          Create your first alert rule
        </button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-app-border">
      {configs.map((config) => {
        const lastTriggered = formatLastTriggered(config.last_triggered);

        return (
          <div
            key={config.id}
            className="p-4 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-app-surface-muted"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
                    <BellAlertIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-medium text-app-text">{config.name}</h3>
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium capitalize ${getAlertSeverityClasses(config.severity)}`}
                  >
                    {config.severity}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                      config.enabled
                        ? 'bg-app-accent-soft text-app-accent-text'
                        : 'bg-app-surface-muted text-app-text-muted'
                    }`}
                  >
                    {config.enabled ? (
                      <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <PauseCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
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
                    <span className="font-medium">Checks:</span>{' '}
                    {getAlertFrequencyLabel(config.frequency)}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {config.channels.map((channel) => (
                    <span
                      key={channel}
                      className="rounded bg-app-surface-muted px-2 py-1 text-xs font-medium text-app-text-muted"
                    >
                      {getAlertChannelLabel(channel)}
                    </span>
                  ))}
                </div>

                {lastTriggered ? (
                  <p className="mt-2 text-xs text-app-text-muted">
                    Last triggered: {lastTriggered}
                  </p>
                ) : null}
              </div>

              <div className="ml-4 flex items-center space-x-2">
                <button
                  onClick={() => config.id && onToggle(config.id)}
                  className="p-2 text-app-text-subtle transition-colors hover:text-app-text-muted"
                  title={config.enabled ? 'Pause alert rule' : 'Turn on alert rule'}
                >
                  {config.enabled ? (
                    <PauseCircleIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <PlayCircleIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
                <button
                  onClick={() => onEdit(config)}
                  className="p-2 text-app-text-subtle transition-colors hover:text-app-accent"
                  title="Edit alert rule"
                >
                  <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => config.id && onDelete(config.id)}
                  className="p-2 text-app-text-subtle transition-colors hover:text-app-accent"
                  title="Delete alert rule"
                >
                  <TrashIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
