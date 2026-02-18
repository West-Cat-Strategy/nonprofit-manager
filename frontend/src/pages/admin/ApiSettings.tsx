/**
 * API Settings Page
 * Manage webhooks and API keys for external integrations
 */

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchWebhookEndpoints,
  fetchAvailableWebhookEvents,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  regenerateWebhookSecret,
  testWebhookEndpoint,
  fetchWebhookDeliveries,
  fetchApiKeys,
  fetchAvailableScopes,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  clearWebhookError,
  clearTestResult,
  clearNewApiKey,
} from '../../store/slices/webhookSlice';
import type {
  WebhookEndpoint,
  WebhookEventType,
  ApiKey,
  ApiKeyScope,
  WebhookDelivery,
} from '../../types/webhook';
import ConfirmDialog from '../../components/ConfirmDialog';
import useConfirmDialog, { confirmPresets } from '../../hooks/useConfirmDialog';

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    success: 'bg-green-100 text-green-800',
    revoked: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800',
    expired: 'bg-app-surface-muted text-app-text',
    pending: 'bg-yellow-100 text-yellow-800',
    retrying: 'bg-orange-100 text-orange-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-app-surface-muted text-app-text'}`}>
      {status}
    </span>
  );
}

/**
 * Secret Display Component
 */
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
        className="px-3 py-2 text-orange-600 hover:text-orange-800"
        title="Regenerate"
      >
        Regenerate
      </button>
    </div>
  );
}

/**
 * Webhook Endpoint Card
 */
function WebhookEndpointCard({
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
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
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
            <div className="text-2xl font-semibold text-app-text-heading">{endpoint.totalDeliveries}</div>
            <div className="text-xs text-app-text-muted">Total</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-green-600">{endpoint.successfulDeliveries}</div>
            <div className="text-xs text-app-text-muted">Successful</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-red-600">{endpoint.failedDeliveries}</div>
            <div className="text-xs text-app-text-muted">Failed</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * API Key Card
 */
function ApiKeyCard({
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
              className="px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded"
            >
              Revoke
            </button>
          )}
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
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
            <div className="text-2xl font-semibold text-app-text-heading">{apiKey.totalRequests}</div>
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

/**
 * Delivery History Modal
 */
function DeliveryHistoryModal({
  deliveries,
  onClose,
}: {
  deliveries: WebhookDelivery[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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

/**
 * New API Key Modal
 */
function NewApiKeyModal({
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-app-surface rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                  ? 'bg-green-600 text-white'
                  : 'bg-app-accent text-white hover:bg-app-accent-hover'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
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

/**
 * API Settings Page Component
 */
export default function ApiSettings() {
  const dispatch = useAppDispatch();
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const {
    endpoints,
    availableEvents,
    apiKeys,
    availableScopes,
    deliveries,
    newApiKey,
    testResult,
    isLoading,
    isTesting,
    error,
  } = useAppSelector((state) => state.webhooks);

  const [activeTab, setActiveTab] = useState<'webhooks' | 'apiKeys'>('webhooks');
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const [showDeliveries, setShowDeliveries] = useState(false);
  const [, setSelectedEndpointId] = useState<string | null>(null);

  // Webhook form state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookDescription, setWebhookDescription] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventType[]>([]);

  // API key form state
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeyScopes, setApiKeyScopes] = useState<ApiKeyScope[]>([]);

  // Fetch data on mount
  useEffect(() => {
    dispatch(fetchWebhookEndpoints());
    dispatch(fetchAvailableWebhookEvents());
    dispatch(fetchApiKeys());
    dispatch(fetchAvailableScopes());
  }, [dispatch]);

  // Reset forms
  const resetWebhookForm = () => {
    setWebhookUrl('');
    setWebhookDescription('');
    setWebhookEvents([]);
    setShowCreateWebhook(false);
  };

  const resetApiKeyForm = () => {
    setApiKeyName('');
    setApiKeyScopes([]);
    setShowCreateApiKey(false);
  };

  // Handlers
  const handleCreateWebhook = async () => {
    if (!webhookUrl || webhookEvents.length === 0) return;

    await dispatch(
      createWebhookEndpoint({
        url: webhookUrl,
        description: webhookDescription || undefined,
        events: webhookEvents,
      })
    );
    resetWebhookForm();
  };

  const handleToggleWebhook = async (endpoint: WebhookEndpoint) => {
    await dispatch(
      updateWebhookEndpoint({
        id: endpoint.id,
        data: { isActive: !endpoint.isActive },
      })
    );
  };

  const handleDeleteWebhook = async (id: string) => {
    const confirmed = await confirm(confirmPresets.delete('Webhook Endpoint'));
    if (confirmed) {
      await dispatch(deleteWebhookEndpoint(id));
    }
  };

  const handleRegenerateSecret = async (id: string) => {
    const confirmed = await confirm({
      title: 'Regenerate Webhook Secret',
      message:
        'Are you sure you want to regenerate the webhook secret? This will invalidate the current secret.',
      confirmLabel: 'Regenerate',
      variant: 'warning',
    });
    if (confirmed) {
      await dispatch(regenerateWebhookSecret(id));
    }
  };

  const handleTestWebhook = async (id: string) => {
    dispatch(clearTestResult());
    await dispatch(testWebhookEndpoint(id));
  };

  const handleViewDeliveries = async (id: string) => {
    setSelectedEndpointId(id);
    await dispatch(fetchWebhookDeliveries({ endpointId: id }));
    setShowDeliveries(true);
  };

  const handleCreateApiKey = async () => {
    if (!apiKeyName || apiKeyScopes.length === 0) return;

    await dispatch(
      createApiKey({
        name: apiKeyName,
        scopes: apiKeyScopes,
      })
    );
    resetApiKeyForm();
  };

  const handleRevokeApiKey = async (id: string) => {
    const confirmed = await confirm({
      title: 'Revoke API Key',
      message: 'Are you sure you want to revoke this API key? This action cannot be undone.',
      confirmLabel: 'Revoke',
      variant: 'danger',
    });
    if (confirmed) {
      await dispatch(revokeApiKey(id));
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    const confirmed = await confirm(confirmPresets.delete('API Key'));
    if (confirmed) {
      await dispatch(deleteApiKey(id));
    }
  };

  const handleEventToggle = (event: WebhookEventType) => {
    setWebhookEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  };

  const handleScopeToggle = (scope: ApiKeyScope) => {
    setApiKeyScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  // Group events by category
  const groupedEvents = availableEvents.reduce((acc, event) => {
    if (!acc[event.category]) {
      acc[event.category] = [];
    }
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, typeof availableEvents>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-app-text-heading">API Settings</h1>
        <p className="mt-1 text-app-text-muted">
          Manage webhooks and API keys for external integrations
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => dispatch(clearWebhookError())} className="text-red-500 hover:text-red-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className={`border px-4 py-3 rounded-lg flex items-center justify-between ${
          testResult.success
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <span>
            {testResult.success
              ? `Test successful! Status: ${testResult.statusCode}, Response time: ${testResult.responseTime}ms`
              : `Test failed: ${testResult.error}`}
          </span>
          <button onClick={() => dispatch(clearTestResult())} className="hover:opacity-70">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-app-border">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`pb-4 text-sm font-medium border-b-2 ${
              activeTab === 'webhooks'
                ? 'border-app-accent text-app-accent'
                : 'border-transparent text-app-text-muted hover:text-app-text-muted'
            }`}
          >
            Webhooks ({endpoints.length})
          </button>
          <button
            onClick={() => setActiveTab('apiKeys')}
            className={`pb-4 text-sm font-medium border-b-2 ${
              activeTab === 'apiKeys'
                ? 'border-app-accent text-app-accent'
                : 'border-transparent text-app-text-muted hover:text-app-text-muted'
            }`}
          >
            API Keys ({apiKeys.length})
          </button>
        </nav>
      </div>

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-app-text-muted">
              Receive real-time notifications when events occur in your account.
            </p>
            <button
              onClick={() => setShowCreateWebhook(true)}
              className="px-4 py-2 bg-app-accent text-white rounded-lg font-medium hover:bg-app-accent-hover"
            >
              Add Webhook
            </button>
          </div>

          {/* Create Webhook Form */}
          {showCreateWebhook && (
            <div className="bg-app-surface rounded-lg border border-app-border p-6 space-y-4">
              <h3 className="text-lg font-semibold">Create Webhook Endpoint</h3>

              <div>
                <label className="block text-sm font-medium text-app-text-label mb-1">
                  Endpoint URL *
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/webhook"
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-app-accent focus:border-app-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-text-label mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={webhookDescription}
                  onChange={(e) => setWebhookDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-app-accent focus:border-app-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-text-label mb-2">
                  Events to subscribe *
                </label>
                <div className="space-y-4 max-h-64 overflow-y-auto border border-app-border rounded-lg p-4">
                  {Object.entries(groupedEvents).map(([category, events]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-app-text capitalize mb-2">
                        {category}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {events.map((event) => (
                          <label
                            key={event.type}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={webhookEvents.includes(event.type)}
                              onChange={() => handleEventToggle(event.type)}
                              className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
                            />
                            <span>{event.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateWebhook}
                  disabled={!webhookUrl || webhookEvents.length === 0 || isLoading}
                  className="px-4 py-2 bg-app-accent text-white rounded-lg font-medium hover:bg-app-accent-hover disabled:bg-app-text-subtle disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Webhook'}
                </button>
                <button
                  onClick={resetWebhookForm}
                  className="px-4 py-2 bg-app-surface-muted text-app-text-muted rounded-lg font-medium hover:bg-app-surface-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Webhook List */}
          {isLoading && endpoints.length === 0 ? (
            <div className="text-center py-8 text-app-text-muted">Loading...</div>
          ) : endpoints.length === 0 ? (
            <div className="text-center py-12 bg-app-surface-muted rounded-lg">
              <p className="text-app-text-muted">No webhook endpoints configured</p>
              <p className="text-sm text-app-text-subtle mt-1">
                Create a webhook to receive real-time event notifications
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {endpoints.map((endpoint) => (
                <WebhookEndpointCard
                  key={endpoint.id}
                  endpoint={endpoint}
                  onEdit={() => handleToggleWebhook(endpoint)}
                  onDelete={() => handleDeleteWebhook(endpoint.id)}
                  onTest={() => handleTestWebhook(endpoint.id)}
                  onViewDeliveries={() => handleViewDeliveries(endpoint.id)}
                  onRegenerateSecret={() => handleRegenerateSecret(endpoint.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'apiKeys' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-app-text-muted">
              Create API keys to access your data programmatically.
            </p>
            <button
              onClick={() => setShowCreateApiKey(true)}
              className="px-4 py-2 bg-app-accent text-white rounded-lg font-medium hover:bg-app-accent-hover"
            >
              Create API Key
            </button>
          </div>

          {/* Create API Key Form */}
          {showCreateApiKey && (
            <div className="bg-app-surface rounded-lg border border-app-border p-6 space-y-4">
              <h3 className="text-lg font-semibold">Create API Key</h3>

              <div>
                <label className="block text-sm font-medium text-app-text-label mb-1">
                  Key Name *
                </label>
                <input
                  type="text"
                  value={apiKeyName}
                  onChange={(e) => setApiKeyName(e.target.value)}
                  placeholder="e.g., Production Integration"
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-app-accent focus:border-app-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-text-label mb-2">
                  Permissions *
                </label>
                <div className="grid grid-cols-2 gap-2 border border-app-border rounded-lg p-4 max-h-64 overflow-y-auto">
                  {availableScopes.map((scopeInfo) => (
                    <label
                      key={scopeInfo.scope}
                      className="flex items-start gap-2 text-sm cursor-pointer p-2 rounded hover:bg-app-surface-muted"
                    >
                      <input
                        type="checkbox"
                        checked={apiKeyScopes.includes(scopeInfo.scope)}
                        onChange={() => handleScopeToggle(scopeInfo.scope)}
                        className="mt-0.5 rounded border-app-input-border text-app-accent focus:ring-app-accent"
                      />
                      <div>
                        <span className="font-medium">{scopeInfo.name}</span>
                        <p className="text-xs text-app-text-muted">{scopeInfo.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateApiKey}
                  disabled={!apiKeyName || apiKeyScopes.length === 0 || isLoading}
                  className="px-4 py-2 bg-app-accent text-white rounded-lg font-medium hover:bg-app-accent-hover disabled:bg-app-text-subtle disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create API Key'}
                </button>
                <button
                  onClick={resetApiKeyForm}
                  className="px-4 py-2 bg-app-surface-muted text-app-text-muted rounded-lg font-medium hover:bg-app-surface-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* API Key List */}
          {isLoading && apiKeys.length === 0 ? (
            <div className="text-center py-8 text-app-text-muted">Loading...</div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12 bg-app-surface-muted rounded-lg">
              <p className="text-app-text-muted">No API keys created</p>
              <p className="text-sm text-app-text-subtle mt-1">
                Create an API key to access your data programmatically
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {apiKeys.map((apiKey) => (
                <ApiKeyCard
                  key={apiKey.id}
                  apiKey={apiKey}
                  onRevoke={() => handleRevokeApiKey(apiKey.id)}
                  onDelete={() => handleDeleteApiKey(apiKey.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showDeliveries && (
        <DeliveryHistoryModal
          deliveries={deliveries}
          onClose={() => setShowDeliveries(false)}
        />
      )}

      {newApiKey && (
        <NewApiKeyModal
          apiKey={newApiKey}
          onClose={() => dispatch(clearNewApiKey())}
        />
      )}

      {isTesting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-app-surface rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent mx-auto mb-4"></div>
            <p className="text-app-text-muted">Sending test webhook...</p>
          </div>
        </div>
      )}
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
}
