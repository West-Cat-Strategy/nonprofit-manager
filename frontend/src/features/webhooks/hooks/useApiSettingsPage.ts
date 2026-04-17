import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  clearNewApiKey,
  clearTestResult,
  clearWebhookError,
  createApiKey,
  createWebhookEndpoint,
  deleteApiKey,
  deleteWebhookEndpoint,
  fetchApiKeys,
  fetchAvailableScopes,
  fetchAvailableWebhookEvents,
  fetchWebhookDeliveries,
  fetchWebhookEndpoints,
  regenerateWebhookSecret,
  revokeApiKey,
  testWebhookEndpoint,
  updateWebhookEndpoint,
} from '../state';
import { confirmPresets } from '../../../hooks/useConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import type {
  ApiKeyScope,
  WebhookEndpoint,
  WebhookEventInfo,
  WebhookEventType,
} from '../../../types/webhook';

export type ApiSettingsTab = 'webhooks' | 'apiKeys';

type GroupedWebhookEvents = Record<string, WebhookEventInfo[]>;

export function useApiSettingsPage() {
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

  const [activeTab, setActiveTab] = useState<ApiSettingsTab>('webhooks');
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const [showDeliveries, setShowDeliveries] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookDescription, setWebhookDescription] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventType[]>([]);
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeyScopes, setApiKeyScopes] = useState<ApiKeyScope[]>([]);

  useEffect(() => {
    dispatch(fetchWebhookEndpoints());
    dispatch(fetchAvailableWebhookEvents());
    dispatch(fetchApiKeys());
    dispatch(fetchAvailableScopes());
  }, [dispatch]);

  const groupedEvents = useMemo(
    () =>
      availableEvents.reduce((acc, event) => {
        if (!acc[event.category]) {
          acc[event.category] = [];
        }
        acc[event.category].push(event);
        return acc;
      }, {} as GroupedWebhookEvents),
    [availableEvents]
  );

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
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleScopeToggle = (scope: ApiKeyScope) => {
    setApiKeyScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  return {
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
    apiKeyName,
    setApiKeyName,
    apiKeyScopes,
    handleScopeToggle,
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
    resetWebhookForm,
    resetApiKeyForm,
    clearWebhookError: () => dispatch(clearWebhookError()),
    clearTestResult: () => dispatch(clearTestResult()),
    clearNewApiKey: () => dispatch(clearNewApiKey()),
  };
}
