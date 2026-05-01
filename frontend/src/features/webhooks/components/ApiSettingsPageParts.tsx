import { useEffect, useId, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import type { ApiKey, WebhookDelivery, WebhookEndpoint } from '../../../types/webhook';

export function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();
  const config: Record<
    string,
    {
      label: string;
      className: string;
      icon: typeof CheckCircleIcon;
    }
  > = {
    active: {
      label: 'Active',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: CheckCircleIcon,
    },
    success: {
      label: 'Delivered',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: CheckCircleIcon,
    },
    inactive: {
      label: 'Paused',
      className: 'border-app-border bg-app-surface-muted text-app-text-muted',
      icon: NoSymbolIcon,
    },
    revoked: {
      label: 'Revoked',
      className: 'border-app-border bg-app-surface-muted text-app-text-muted',
      icon: NoSymbolIcon,
    },
    failed: {
      label: 'Failed',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
      icon: XCircleIcon,
    },
    expired: {
      label: 'Expired',
      className: 'border-amber-200 bg-amber-50 text-amber-800',
      icon: ClockIcon,
    },
    pending: {
      label: 'Pending',
      className: 'border-amber-200 bg-amber-50 text-amber-800',
      icon: ClockIcon,
    },
    retrying: {
      label: 'Retrying',
      className: 'border-sky-200 bg-sky-50 text-sky-700',
      icon: ArrowPathIcon,
    },
  };
  const statusConfig = config[normalizedStatus] ?? {
    label: status || 'Unknown',
    className: 'border-app-border bg-app-surface-muted text-app-text',
    icon: ClockIcon,
  };
  const StatusIcon = statusConfig.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${statusConfig.className}`}
    >
      <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
      {statusConfig.label}
    </span>
  );
}

function SecretDisplay({ secret, onRegenerate }: { secret: string; onRegenerate: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 bg-app-surface-muted px-3 py-2 rounded text-sm font-mono">
        {isVisible ? secret : '••••••••••••••••••••••••'}
      </code>
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-app-text-muted transition-colors hover:bg-app-surface-muted hover:text-app-text"
        title={isVisible ? 'Hide' : 'Show'}
        aria-label={isVisible ? 'Hide webhook signing secret' : 'Show webhook signing secret'}
      >
        {isVisible ? (
          <EyeSlashIcon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <EyeIcon className="h-4 w-4" aria-hidden="true" />
        )}
        {isVisible ? 'Hide' : 'Show'}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-app-accent transition-colors hover:bg-app-accent-soft hover:text-app-accent-hover"
        title="Copy"
        aria-label="Copy webhook signing secret"
      >
        <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <button
        type="button"
        onClick={onRegenerate}
        className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-app-accent transition-colors hover:bg-app-accent-soft hover:text-app-accent-text"
        title="Regenerate"
        aria-label="Regenerate webhook signing secret"
      >
        <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
        Regenerate
      </button>
    </div>
  );
}

export function WebhookEndpointCard({
  endpoint,
  onEdit,
  onDelete,
  onTest,
  onViewDeliveries,
  onRegenerateSecret,
}: {
  endpoint: WebhookEndpoint;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  onViewDeliveries: () => void;
  onRegenerateSecret: () => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-app-border bg-app-surface p-6 transition-all duration-150 hover:border-app-accent hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-app-text truncate">{endpoint.url}</h3>
            <StatusBadge status={endpoint.isActive ? 'active' : 'inactive'} />
          </div>
          {endpoint.description && (
            <p className="mt-1 text-sm text-app-text-muted">{endpoint.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTest}
            className="rounded px-3 py-1.5 text-sm text-app-accent transition-colors hover:bg-app-accent-soft"
            aria-label={`Send test delivery to ${endpoint.url}`}
          >
            Test
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded px-3 py-1.5 text-sm text-app-text-muted transition-colors hover:bg-app-surface-muted"
            aria-label={`${endpoint.isActive ? 'Pause' : 'Resume'} webhook endpoint ${endpoint.url}`}
          >
            {endpoint.isActive ? 'Pause' : 'Resume'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded px-3 py-1.5 text-sm text-app-accent transition-colors hover:bg-app-accent-soft"
            aria-label={`Delete webhook endpoint ${endpoint.url}`}
          >
            Delete
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-app-text-label mb-2">Events</h4>
        <div className="flex flex-wrap gap-1">
          {endpoint.events.map((event) => (
            <span
              key={event}
              className="px-2 py-0.5 text-xs bg-app-surface-muted text-app-text-muted rounded"
            >
              {event}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-app-text-label mb-2">Signing Secret</h4>
        <SecretDisplay secret={endpoint.secret} onRegenerate={onRegenerateSecret} />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-app-border-muted">
        <div className="text-sm text-app-text-muted">
          {endpoint.lastDeliveryAt ? (
            <>
              Last delivery: {new Date(endpoint.lastDeliveryAt).toLocaleString()} -{' '}
              <StatusBadge status={endpoint.lastDeliveryStatus || 'unknown'} />
            </>
          ) : (
            'No deliveries yet'
          )}
        </div>
        <button
          type="button"
          onClick={onViewDeliveries}
          className="text-sm text-app-accent hover:underline"
        >
          View deliveries
        </button>
      </div>

      {endpoint.totalDeliveries !== undefined && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-app-border-muted text-center">
          <div>
            <div className="text-2xl font-semibold text-app-text-heading">
              {endpoint.totalDeliveries}
            </div>
            <div className="text-xs text-app-text-muted">Total</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-emerald-700">
              {endpoint.successfulDeliveries}
            </div>
            <div className="text-xs text-app-text-muted">Successful</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-rose-700">{endpoint.failedDeliveries}</div>
            <div className="text-xs text-app-text-muted">Failed</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ApiKeyCard({
  apiKey,
  onRevoke,
  onDelete,
}: {
  apiKey: ApiKey;
  onRevoke: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-app-border bg-app-surface p-6 transition-all duration-150 hover:border-app-accent hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-app-text">{apiKey.name}</h3>
            <StatusBadge status={apiKey.status} />
          </div>
          <p className="mt-1 text-sm text-app-text-muted font-mono">{apiKey.keyPrefix}...</p>
        </div>
        <div className="flex items-center gap-2">
          {apiKey.status === 'active' && (
            <button
              type="button"
              onClick={onRevoke}
              className="rounded px-3 py-1.5 text-sm text-app-accent transition-colors hover:bg-app-accent-soft"
              aria-label={`Revoke API key ${apiKey.name}`}
            >
              Revoke
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="rounded px-3 py-1.5 text-sm text-app-accent transition-colors hover:bg-app-accent-soft"
            aria-label={`Delete API key ${apiKey.name}`}
          >
            Delete
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-app-text-label mb-2">Scopes</h4>
        <div className="flex flex-wrap gap-1">
          {apiKey.scopes.map((scope) => (
            <span
              key={scope}
              className="px-2 py-0.5 text-xs bg-app-accent-soft text-app-accent-text rounded"
            >
              {scope}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-app-border-muted text-sm text-app-text-muted">
        <div>Created: {new Date(apiKey.createdAt).toLocaleDateString()}</div>
        <div>
          {apiKey.lastUsedAt
            ? `Last used: ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`
            : 'Never used'}
        </div>
      </div>

      {apiKey.totalRequests !== undefined && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-app-border-muted text-center">
          <div>
            <div className="text-2xl font-semibold text-app-text-heading">
              {apiKey.totalRequests}
            </div>
            <div className="text-xs text-app-text-muted">Total Requests</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-app-accent">{apiKey.requestsThisMonth}</div>
            <div className="text-xs text-app-text-muted">This Month</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-app-text-muted">
              {apiKey.averageResponseTime?.toFixed(0) || 0}ms
            </div>
            <div className="text-xs text-app-text-muted">Avg Response</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeliveryHistoryModal({
  deliveries,
  onClose,
}: {
  deliveries: WebhookDelivery[];
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center app-popup-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-lg bg-app-surface shadow-xl transition-all duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-app-border">
          <h3 id={titleId} className="text-lg font-semibold">
            Delivery History
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-app-text-muted transition-colors hover:bg-app-surface-muted hover:text-app-text"
            aria-label="Close delivery history"
          >
            Close
          </button>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          {deliveries.length === 0 ? (
            <div className="p-8 text-center text-app-text-muted">No deliveries yet</div>
          ) : (
            <table className="w-full">
              <thead className="bg-app-surface-muted sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Response
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Attempts
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-app-surface-muted">
                    <td className="px-4 py-3 text-sm text-app-text">{delivery.eventType}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={delivery.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-app-text-muted">
                      {delivery.responseStatus || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-app-text-muted">{delivery.attempts}</td>
                    <td className="px-4 py-3 text-sm text-app-text-muted">
                      {new Date(delivery.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function NewApiKeyModal({
  apiKey,
  onClose,
}: {
  apiKey: { key: string; name: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center app-popup-backdrop">
      <div
        className="w-full max-w-lg rounded-lg bg-app-surface p-6 shadow-xl transition-all duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-app-accent-soft rounded-full flex items-center justify-center mb-4">
            <ShieldCheckIcon className="w-6 h-6 text-app-accent" aria-hidden="true" />
          </div>
          <h3 id={titleId} className="text-lg font-semibold text-app-text-heading">
            API Key Created
          </h3>
          <p id={descriptionId} className="mt-2 text-sm text-app-text-muted">
            Copy your API key now. You won't be able to see it again!
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-app-text-label mb-1">
            {apiKey.name}
          </label>
          <div className="flex gap-2">
            <code className="flex-1 bg-app-surface-muted px-3 py-2 rounded font-mono text-sm break-all">
              {apiKey.key}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-2 rounded px-4 py-2 font-medium transition-colors ${
                copied
                  ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                  : 'bg-app-accent text-[var(--app-accent-foreground)] hover:bg-app-accent-hover'
              }`}
              aria-label={`Copy API key for ${apiKey.name}`}
            >
              <KeyIcon className="h-4 w-4" aria-hidden="true" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="bg-app-accent-soft border border-app-border rounded-lg p-4 mb-6">
          <p className="text-sm text-app-accent-text">
            <strong>Important:</strong> Store this key securely. It will only be shown once.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-app-surface-muted px-4 py-2 font-medium text-app-text-muted transition-colors hover:bg-app-hover hover:text-app-text"
        >
          Done
        </button>
      </div>
    </div>
  );
}
