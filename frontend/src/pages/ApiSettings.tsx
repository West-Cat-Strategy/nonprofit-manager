/**
 * API Settings Page
 * Manage webhooks and API keys for external integrations
 */

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
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
} from '../store/slices/webhookSlice';
import type {
  WebhookEndpoint,
  WebhookEventType,
  ApiKey,
  ApiKeyScope,
  WebhookDelivery,
} from '../types/webhook';

/**
 * Status Badge Component
 */
function StatusBadge({ status, type: _type }: { status: string; type: 'webhook' | 'apiKey' | 'delivery' }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    success: 'bg-green-100 text-green-800',
    revoked: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    retrying: 'bg-orange-100 text-orange-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
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
      <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
        {isVisible ? secret : '••••••••••••••••••••••••'}
      </code>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="px-3 py-2 text-gray-600 hover:text-gray-800"
        title={isVisible ? 'Hide' : 'Show'}
      >
        {isVisible ? 'Hide' : 'Show'}
      </button>
      <button
        onClick={handleCopy}
        className="px-3 py-2 text-blue-600 hover:text-blue-800"
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">{endpoint.url}</h3>
            <StatusBadge status={endpoint.isActive ? 'active' : 'inactive'} type="webhook" />
          </div>
          {endpoint.description && (
            <p className="mt-1 text-sm text-gray-500">{endpoint.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onTest}
            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
          >
            Test
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded"
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
        <h4 className="text-sm font-medium text-gray-700 mb-2">Events</h4>
        <div className="flex flex-wrap gap-1">
          {endpoint.events.map((event) => (
            <span
              key={event}
              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
            >
              {event}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Signing Secret</h4>
        <SecretDisplay secret={endpoint.secret} onRegenerate={onRegenerateSecret} />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-sm text-gray-500">
          {endpoint.lastDeliveryAt ? (
            <>
              Last delivery: {new Date(endpoint.lastDeliveryAt).toLocaleString()} -{' '}
              <StatusBadge status={endpoint.lastDeliveryStatus || 'unknown'} type="delivery" />
            </>
          ) : (
            'No deliveries yet'
          )}
        </div>
        <button
          onClick={onViewDeliveries}
          className="text-sm text-blue-600 hover:underline"
        >
          View deliveries
        </button>
      </div>

      {endpoint.totalDeliveries !== undefined && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 text-center">
          <div>
            <div className="text-2xl font-semibold text-gray-900">{endpoint.totalDeliveries}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-green-600">{endpoint.successfulDeliveries}</div>
            <div className="text-xs text-gray-500">Successful</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-red-600">{endpoint.failedDeliveries}</div>
            <div className="text-xs text-gray-500">Failed</div>
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{apiKey.name}</h3>
            <StatusBadge status={apiKey.status} type="apiKey" />
          </div>
          <p className="mt-1 text-sm text-gray-500 font-mono">{apiKey.keyPrefix}...</p>
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
        <h4 className="text-sm font-medium text-gray-700 mb-2">Scopes</h4>
        <div className="flex flex-wrap gap-1">
          {apiKey.scopes.map((scope) => (
            <span
              key={scope}
              className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
            >
              {scope}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-sm text-gray-500">
        <div>Created: {new Date(apiKey.createdAt).toLocaleDateString()}</div>
        <div>
          {apiKey.lastUsedAt
            ? `Last used: ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`
            : 'Never used'}
        </div>
      </div>

      {apiKey.totalRequests !== undefined && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 text-center">
          <div>
            <div className="text-2xl font-semibold text-gray-900">{apiKey.totalRequests}</div>
            <div className="text-xs text-gray-500">Total Requests</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-blue-600">{apiKey.requestsThisMonth}</div>
            <div className="text-xs text-gray-500">This Month</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-gray-600">
              {apiKey.averageResponseTime?.toFixed(0) || 0}ms
            </div>
            <div className="text-xs text-gray-500">Avg Response</div>
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Delivery History</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            Close
          </button>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          {deliveries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No deliveries yet</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Response
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Attempts
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{delivery.eventType}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={delivery.status} type="delivery" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {delivery.responseStatus || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{delivery.attempts}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">API Key Created</h3>
          <p className="mt-2 text-sm text-gray-500">
            Copy your API key now. You won't be able to see it again!
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {apiKey.name}
          </label>
          <div className="flex gap-2">
            <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-sm break-all">
              {apiKey.key}
            </code>
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded font-medium ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
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
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
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
  const [_selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);

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
    if (confirm('Are you sure you want to delete this webhook endpoint?')) {
      await dispatch(deleteWebhookEndpoint(id));
    }
  };

  const handleRegenerateSecret = async (id: string) => {
    if (confirm('Are you sure you want to regenerate the webhook secret? This will invalidate the current secret.')) {
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
    if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      await dispatch(revokeApiKey(id));
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (confirm('Are you sure you want to delete this API key?')) {
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
        <h1 className="text-2xl font-bold text-gray-900">API Settings</h1>
        <p className="mt-1 text-gray-500">
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
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`pb-4 text-sm font-medium border-b-2 ${
              activeTab === 'webhooks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Webhooks ({endpoints.length})
          </button>
          <button
            onClick={() => setActiveTab('apiKeys')}
            className={`pb-4 text-sm font-medium border-b-2 ${
              activeTab === 'apiKeys'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
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
            <p className="text-gray-600">
              Receive real-time notifications when events occur in your account.
            </p>
            <button
              onClick={() => setShowCreateWebhook(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Add Webhook
            </button>
          </div>

          {/* Create Webhook Form */}
          {showCreateWebhook && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold">Create Webhook Endpoint</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endpoint URL *
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/webhook"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={webhookDescription}
                  onChange={(e) => setWebhookDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Events to subscribe *
                </label>
                <div className="space-y-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {Object.entries(groupedEvents).map(([category, events]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-gray-900 capitalize mb-2">
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
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Webhook'}
                </button>
                <button
                  onClick={resetWebhookForm}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Webhook List */}
          {isLoading && endpoints.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : endpoints.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No webhook endpoints configured</p>
              <p className="text-sm text-gray-400 mt-1">
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
            <p className="text-gray-600">
              Create API keys to access your data programmatically.
            </p>
            <button
              onClick={() => setShowCreateApiKey(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Create API Key
            </button>
          </div>

          {/* Create API Key Form */}
          {showCreateApiKey && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold">Create API Key</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Name *
                </label>
                <input
                  type="text"
                  value={apiKeyName}
                  onChange={(e) => setApiKeyName(e.target.value)}
                  placeholder="e.g., Production Integration"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions *
                </label>
                <div className="grid grid-cols-2 gap-2 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {availableScopes.map((scopeInfo) => (
                    <label
                      key={scopeInfo.scope}
                      className="flex items-start gap-2 text-sm cursor-pointer p-2 rounded hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={apiKeyScopes.includes(scopeInfo.scope)}
                        onChange={() => handleScopeToggle(scopeInfo.scope)}
                        className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium">{scopeInfo.name}</span>
                        <p className="text-xs text-gray-500">{scopeInfo.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateApiKey}
                  disabled={!apiKeyName || apiKeyScopes.length === 0 || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create API Key'}
                </button>
                <button
                  onClick={resetApiKeyForm}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* API Key List */}
          {isLoading && apiKeys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No API keys created</p>
              <p className="text-sm text-gray-400 mt-1">
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
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Sending test webhook...</p>
          </div>
        </div>
      )}
    </div>
  );
}
