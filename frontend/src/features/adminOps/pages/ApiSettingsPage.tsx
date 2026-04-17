/**
 * API Settings Page
 * Manage webhooks and API keys for external integrations
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
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
} from '../../webhooks/state';
import type {
  WebhookEndpoint,
  WebhookEventType,
  ApiKeyScope,
} from '../../../types/webhook';
import ConfirmDialog from '../../../components/ConfirmDialog';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';
import AdminQuickActionsBar from '../components/AdminQuickActionsBar';
import {
  ApiKeyCard,
  DeliveryHistoryModal,
  NewApiKeyModal,
  WebhookEndpointCard,
} from '../components/ApiSettingsPageParts';
import AdminWorkspaceShell from '../components/AdminWorkspaceShell';

/**
 * API Settings Page Component
 */
export default function ApiSettings() {
  const location = useLocation();
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
    <AdminWorkspaceShell
      title="API & Webhooks"
      description="Manage webhook endpoints, delivery history, and API key access from one admin workspace."
      currentPath={location.pathname}
    >
      <AdminQuickActionsBar role="admin" />
      {/* Error Display */}
      {error && (
        <div className="bg-app-accent-soft border border-app-border text-app-accent-text px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => dispatch(clearWebhookError())} className="text-app-accent hover:text-app-accent-text">
            Dismiss
          </button>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className={`border px-4 py-3 rounded-lg flex items-center justify-between ${
          testResult.success
            ? 'bg-app-accent-soft border-app-border text-app-accent-text'
            : 'bg-app-accent-soft border-app-border text-app-accent-text'
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
        <nav className="-mb-px flex gap-6" aria-label="API settings sections">
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
              className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg font-medium hover:bg-app-accent-hover"
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
                  className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg font-medium hover:bg-app-accent-hover disabled:bg-app-text-subtle disabled:cursor-not-allowed"
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
              className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg font-medium hover:bg-app-accent-hover"
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
                  className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg font-medium hover:bg-app-accent-hover disabled:bg-app-text-subtle disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 app-popup-backdrop flex items-center justify-center z-50">
          <div className="bg-app-surface rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent mx-auto mb-4"></div>
            <p className="text-app-text-muted">Sending test webhook...</p>
          </div>
        </div>
      )}
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </AdminWorkspaceShell>
  );
}
