/**
 * API Settings Page
 * Manage webhooks and API keys for external integrations
 */

import { useLocation } from 'react-router-dom';
import ConfirmDialog from '../../../components/ConfirmDialog';
import ApiSettingsWorkspace from '../components/ApiSettingsWorkspace';
import {
  ApiKeyCard,
  DeliveryHistoryModal,
  NewApiKeyModal,
  WebhookEndpointCard,
} from '../components/ApiSettingsPageParts';
import { useApiSettingsPage } from '../hooks/useApiSettingsPage';

export default function ApiSettingsPage() {
  const location = useLocation();
  const {
    activeTab,
    setActiveTab,
    showCreateWebhook,
    setShowCreateWebhook,
    showCreateApiKey,
    setShowCreateApiKey,
    showDeliveries,
    setShowDeliveries,
    webhookUrl,
    setWebhookUrl,
    webhookDescription,
    setWebhookDescription,
    webhookEvents,
    handleEventToggle,
    resetWebhookForm,
    apiKeyName,
    setApiKeyName,
    apiKeyScopes,
    handleScopeToggle,
    endpoints,
    apiKeys,
    availableScopes,
    deliveries,
    newApiKey,
    testResult,
    isLoading,
    isTesting,
    error,
    groupedEvents,
    dialogState,
    handleConfirm,
    handleCancel,
    handleCreateWebhook,
    handleToggleWebhook,
    handleDeleteWebhook,
    handleRegenerateSecret,
    handleTestWebhook,
    handleViewDeliveries,
    handleCreateApiKey,
    handleRevokeApiKey,
    handleDeleteApiKey,
    resetApiKeyForm,
    clearWebhookError,
    clearTestResult,
    clearNewApiKey,
  } = useApiSettingsPage();

  return (
    <ApiSettingsWorkspace currentPath={location.pathname}>
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-app-accent-text">
          <span>{error}</span>
          <button
            onClick={clearWebhookError}
            className="text-app-accent hover:text-app-accent-text"
          >
            Dismiss
          </button>
        </div>
      )}

      {testResult && (
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
            testResult.success
              ? 'bg-app-accent-soft border-app-border text-app-accent-text'
              : 'bg-app-accent-soft border-app-border text-app-accent-text'
          }`}
        >
          <span>
            {testResult.success
              ? `Test successful! Status: ${testResult.statusCode}, Response time: ${testResult.responseTime}ms`
              : `Test failed: ${testResult.error}`}
          </span>
          <button onClick={clearTestResult} className="hover:opacity-70">
            Dismiss
          </button>
        </div>
      )}

      <div className="border-b border-app-border">
        <nav className="-mb-px flex gap-6" aria-label="API settings sections">
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`border-b-2 pb-4 text-sm font-medium ${
              activeTab === 'webhooks'
                ? 'border-app-accent text-app-accent'
                : 'border-transparent text-app-text-muted hover:text-app-text-muted'
            }`}
          >
            Webhooks ({endpoints.length})
          </button>
          <button
            onClick={() => setActiveTab('apiKeys')}
            className={`border-b-2 pb-4 text-sm font-medium ${
              activeTab === 'apiKeys'
                ? 'border-app-accent text-app-accent'
                : 'border-transparent text-app-text-muted hover:text-app-text-muted'
            }`}
          >
            API Keys ({apiKeys.length})
          </button>
        </nav>
      </div>

      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-app-text-muted">
              Receive real-time notifications when events occur in your account.
            </p>
            <button
              onClick={() => setShowCreateWebhook(true)}
              className="rounded-lg bg-app-accent px-4 py-2 font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
            >
              Add Webhook
            </button>
          </div>

          {showCreateWebhook && (
            <div className="space-y-4 rounded-lg border border-app-border bg-app-surface p-6">
              <h3 className="text-lg font-semibold">Create Webhook Endpoint</h3>

              <div>
                <label className="mb-1 block text-sm font-medium text-app-text-label">
                  Endpoint URL *
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/webhook"
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-app-accent focus:ring-app-accent"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-app-text-label">
                  Description
                </label>
                <input
                  type="text"
                  value={webhookDescription}
                  onChange={(e) => setWebhookDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-app-accent focus:ring-app-accent"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-app-text-label">
                  Events to subscribe *
                </label>
                <div className="max-h-64 space-y-4 overflow-y-auto rounded-lg border border-app-border p-4">
                  {Object.entries(groupedEvents).map(([category, events]) => (
                    <div key={category}>
                      <h4 className="mb-2 text-sm font-medium capitalize text-app-text">
                        {category}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {events.map((event) => (
                          <label
                            key={event.type}
                            className="flex cursor-pointer items-center gap-2 text-sm"
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
                  className="rounded-lg bg-app-accent px-4 py-2 font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:bg-app-text-subtle"
                >
                  {isLoading ? 'Creating...' : 'Create Webhook'}
                </button>
                <button
                  onClick={resetWebhookForm}
                  className="rounded-lg bg-app-surface-muted px-4 py-2 font-medium text-app-text-muted hover:bg-app-surface-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isLoading && endpoints.length === 0 ? (
            <div className="py-8 text-center text-app-text-muted">Loading...</div>
          ) : endpoints.length === 0 ? (
            <div className="rounded-lg bg-app-surface-muted py-12 text-center">
              <p className="text-app-text-muted">No webhook endpoints configured</p>
              <p className="mt-1 text-sm text-app-text-subtle">
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

      {activeTab === 'apiKeys' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-app-text-muted">
              Create API keys to access your data programmatically.
            </p>
            <button
              onClick={() => setShowCreateApiKey(true)}
              className="rounded-lg bg-app-accent px-4 py-2 font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
            >
              Create API Key
            </button>
          </div>

          {showCreateApiKey && (
            <div className="space-y-4 rounded-lg border border-app-border bg-app-surface p-6">
              <h3 className="text-lg font-semibold">Create API Key</h3>

              <div>
                <label className="mb-1 block text-sm font-medium text-app-text-label">
                  Key Name *
                </label>
                <input
                  type="text"
                  value={apiKeyName}
                  onChange={(e) => setApiKeyName(e.target.value)}
                  placeholder="e.g., Production Integration"
                  className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-app-accent focus:ring-app-accent"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-app-text-label">
                  Permissions *
                </label>
                <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-app-border p-4">
                  {availableScopes.map((scopeInfo) => (
                    <label
                      key={scopeInfo.scope}
                      className="flex cursor-pointer items-start gap-2 rounded p-2 text-sm hover:bg-app-surface-muted"
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
                  className="rounded-lg bg-app-accent px-4 py-2 font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:bg-app-text-subtle"
                >
                  {isLoading ? 'Creating...' : 'Create API Key'}
                </button>
                <button
                  onClick={resetApiKeyForm}
                  className="rounded-lg bg-app-surface-muted px-4 py-2 font-medium text-app-text-muted hover:bg-app-surface-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isLoading && apiKeys.length === 0 ? (
            <div className="py-8 text-center text-app-text-muted">Loading...</div>
          ) : apiKeys.length === 0 ? (
            <div className="rounded-lg bg-app-surface-muted py-12 text-center">
              <p className="text-app-text-muted">No API keys created</p>
              <p className="mt-1 text-sm text-app-text-subtle">
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

      {showDeliveries && (
        <DeliveryHistoryModal deliveries={deliveries} onClose={() => setShowDeliveries(false)} />
      )}

      {newApiKey && (
        <NewApiKeyModal apiKey={newApiKey} onClose={clearNewApiKey} />
      )}

      {isTesting && (
        <div className="app-popup-backdrop fixed inset-0 z-50 flex items-center justify-center">
          <div className="rounded-lg bg-app-surface p-8 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-app-accent" />
            <p className="text-app-text-muted">Sending test webhook...</p>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </ApiSettingsWorkspace>
  );
}
