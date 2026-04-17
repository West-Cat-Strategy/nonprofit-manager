import { useState } from 'react';
import type {
  ApiKey,
  WebhookDelivery,
  WebhookEndpoint,
} from '../../../types/webhook';

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-app-accent-soft text-app-accent-text',
    success: 'bg-app-accent-soft text-app-accent-text',
    revoked: 'bg-app-accent-soft text-app-accent-text',
    failed: 'bg-app-accent-soft text-app-accent-text',
    expired: 'bg-app-surface-muted text-app-text',
    pending: 'bg-app-accent-soft text-app-accent-text',
    retrying: 'bg-app-accent-soft text-app-accent-text',
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${
        colors[status] || 'bg-app-surface-muted text-app-text'
      }`}
    >
      {status}
    </span>
  );
}

function SecretDisplay({
  secret,
  onRegenerate,
}: {
  secret: string;
  onRegenerate: () => void;
}) {
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
        onClick={() => setIsVisible(!isVisible)}
        className="px-3 py-2 text-app-text-muted hover:text-app-text"
        title={isVisible ? 'Hide' : 'Show'}
      >
        {isVisible ? 'Hide' : 'Show'}
      </button>
      <button
        onClick={handleCopy}
        className="px-3 py-2 text-app-accent hover:text-app-accent-hover"
        title="Copy"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <button
        onClick={onRegenerate}
        className="px-3 py-2 text-app-accent hover:text-app-accent-text"
        title="Regenerate"
      >
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
    <div className="bg-app-surface rounded-lg border border-app-border p-6 space-y-4">
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
            onClick={onTest}
            className="px-3 py-1.5 text-sm text-app-accent hover:bg-app-accent-soft rounded"
          >
            Test
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-sm text-app-text-muted hover:bg-app-surface-muted rounded"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm text-app-accent hover:bg-app-accent-soft rounded"
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
            <div className="text-2xl font-semibold text-app-accent">
              {endpoint.successfulDeliveries}
            </div>
            <div className="text-xs text-app-text-muted">Successful</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-app-accent">
              {endpoint.failedDeliveries}
            </div>
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
    <div className="bg-app-surface rounded-lg border border-app-border p-6 space-y-4">
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
              onClick={onRevoke}
              className="px-3 py-1.5 text-sm text-app-accent hover:bg-app-accent-soft rounded"
            >
              Revoke
            </button>
          )}
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm text-app-accent hover:bg-app-accent-soft rounded"
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
            <div className="text-2xl font-semibold text-app-accent">
              {apiKey.requestsThisMonth}
            </div>
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
  return (
    <div className="fixed inset-0 app-popup-backdrop flex items-center justify-center z-50">
      <div className="bg-app-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-app-border">
          <h3 className="text-lg font-semibold">Delivery History</h3>
          <button onClick={onClose} className="text-app-text-muted hover:text-app-text-muted">
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
                    <td className="px-4 py-3 text-sm text-app-text-muted">
                      {delivery.attempts}
                    </td>
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

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
  };

  return (
    <div className="fixed inset-0 app-popup-backdrop flex items-center justify-center z-50">
      <div className="bg-app-surface rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-app-accent-soft rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-app-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-app-text-heading">API Key Created</h3>
          <p className="mt-2 text-sm text-app-text-muted">
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
              onClick={handleCopy}
              className={`px-4 py-2 rounded font-medium ${
                copied
                  ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                  : 'bg-app-accent text-[var(--app-accent-foreground)] hover:bg-app-accent-hover'
              }`}
            >
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
          onClick={onClose}
          className="w-full px-4 py-2 bg-app-surface-muted text-app-text-muted rounded-lg font-medium hover:bg-app-surface-muted"
        >
          Done
        </button>
      </div>
    </div>
  );
}
