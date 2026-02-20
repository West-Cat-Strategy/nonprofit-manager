/**
 * Twilio Settings Section
 * Allows admins to configure Twilio credentials for SMS messaging.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../../../services/api';
import { useToast } from '../../../../contexts/useToast';
import { useUnsavedChangesGuard } from '../../../../hooks/useUnsavedChangesGuard';

interface TwilioSettings {
  id: string;
  accountSid: string | null;
  messagingServiceSid: string | null;
  fromPhoneNumber: string | null;
  isConfigured: boolean;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
}

interface Credentials {
  authToken: boolean;
}

const TWILIO_SETTINGS_CACHE_KEY = 'admin_twilio_settings_cache_v1';
const TWILIO_SETTINGS_CACHE_TTL_MS = 2 * 60 * 1000;

const inputClass =
  'mt-1 block w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-app-text';

export default function TwilioSettingsSection() {
  const { showSuccess, showError } = useToast();

  const [settings, setSettings] = useState<TwilioSettings | null>(null);
  const [credentials, setCredentials] = useState<Credentials>({ authToken: false });
  const [loading, setLoading] = useState(true);
  const [hasHydratedData, setHasHydratedData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');

  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [messagingServiceSid, setMessagingServiceSid] = useState('');
  const [fromPhoneNumber, setFromPhoneNumber] = useState('');

  const buildSnapshot = useCallback(
    () =>
      JSON.stringify({
        accountSid,
        messagingServiceSid,
        fromPhoneNumber,
        authTokenPresent: Boolean(authToken),
      }),
    [accountSid, messagingServiceSid, fromPhoneNumber, authToken]
  );
  const isDirty = hasHydratedData && buildSnapshot() !== savedSnapshot;

  useUnsavedChangesGuard({
    hasUnsavedChanges: isDirty && !saving && !testing,
  });

  const applySettings = useCallback((nextSettings: TwilioSettings, creds: Credentials) => {
    setSettings(nextSettings);
    setCredentials(creds);
    setAccountSid(nextSettings.accountSid || '');
    setMessagingServiceSid(nextSettings.messagingServiceSid || '');
    setFromPhoneNumber(nextSettings.fromPhoneNumber || '');
    setHasHydratedData(true);
    setSavedSnapshot(
      JSON.stringify({
        accountSid: nextSettings.accountSid || '',
        messagingServiceSid: nextSettings.messagingServiceSid || '',
        fromPhoneNumber: nextSettings.fromPhoneNumber || '',
        authTokenPresent: false,
      })
    );
  }, []);

  const fetchSettings = useCallback(
    async (background = false) => {
      try {
        if (!background) setLoading(true);
        const { data } = await api.get<{ data: TwilioSettings; credentials: Credentials }>(
          '/admin/twilio-settings'
        );

        if (data.data) {
          applySettings(data.data, data.credentials);
          sessionStorage.setItem(
            TWILIO_SETTINGS_CACHE_KEY,
            JSON.stringify({
              settings: data.data,
              credentials: data.credentials,
              cachedAt: Date.now(),
            })
          );
        }
      } catch {
        if (!hasHydratedData) {
          showError('Failed to load Twilio settings');
        }
      } finally {
        if (!background) setLoading(false);
      }
    },
    [applySettings, hasHydratedData, showError]
  );

  useEffect(() => {
    const cached = sessionStorage.getItem(TWILIO_SETTINGS_CACHE_KEY);

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          settings: TwilioSettings;
          credentials: Credentials;
          cachedAt: number;
        };
        if (Date.now() - parsed.cachedAt < TWILIO_SETTINGS_CACHE_TTL_MS && parsed.settings) {
          applySettings(parsed.settings, parsed.credentials);
          setLoading(false);
          void fetchSettings(true);
          return;
        }
      } catch {
        sessionStorage.removeItem(TWILIO_SETTINGS_CACHE_KEY);
      }
    }

    void fetchSettings();
  }, [applySettings, fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        accountSid,
        messagingServiceSid,
        fromPhoneNumber,
      };
      if (authToken) payload.authToken = authToken;

      await api.put('/admin/twilio-settings', payload);
      showSuccess('Twilio settings saved');
      setAuthToken('');
      setLastSavedAt(new Date());
      await fetchSettings();
    } catch {
      showError('Failed to save Twilio settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data } = await api.post<{ data: { success: boolean; error?: string } }>(
        '/admin/twilio-settings/test'
      );

      if (data.data.success) {
        showSuccess('Twilio connection successful!');
      } else {
        showError(`Twilio test failed: ${data.data.error || 'Unknown error'}`);
      }

      await fetchSettings();
    } catch {
      showError('Failed to test Twilio connection');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-app-border bg-app-surface p-6 shadow-sm">
        <p className="text-sm text-app-text-muted">Loading messaging settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border border-app-border bg-app-surface px-4 py-3 text-sm">
        <span className="text-app-text-muted">
          {isDirty
            ? 'Unsaved changes'
            : lastSavedAt
              ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
              : 'No pending changes'}
        </span>
        {(saving || testing) && <span className="text-app-text-subtle">Working...</span>}
      </div>

      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
          settings?.isConfigured
            ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
            : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
        }`}
      >
        <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {settings?.isConfigured ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
        </svg>
        <div>
          <strong>{settings?.isConfigured ? 'SMS messaging is configured' : 'SMS messaging is not configured'}</strong>
          {settings?.lastTestedAt && (
            <span className="ml-2 text-xs opacity-75">
              Last tested: {new Date(settings.lastTestedAt).toLocaleString()} —{' '}
              {settings.lastTestSuccess ? 'Passed' : 'Failed'}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="border-b border-app-border bg-app-surface-muted px-6 py-4">
          <h3 className="text-lg font-semibold text-app-text">Twilio SMS Settings</h3>
          <p className="mt-1 text-sm text-app-text-muted">
            Configure Twilio to send event reminder texts to registered contacts.
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Account SID</label>
            <input
              type="text"
              className={inputClass}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>
              Auth Token
              {credentials.authToken && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">(stored)</span>
              )}
            </label>
            <input
              type="password"
              className={inputClass}
              placeholder={credentials.authToken ? '••••••••' : 'Enter auth token'}
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Messaging Service SID (Recommended)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={messagingServiceSid}
              onChange={(e) => setMessagingServiceSid(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>From Phone Number (Fallback)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="+15551234567"
              value={fromPhoneNumber}
              onChange={(e) => setFromPhoneNumber(e.target.value)}
            />
            <p className="mt-1 text-xs text-app-text-muted">
              Use E.164 format. Required only if no Messaging Service SID is set.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing || !settings?.isConfigured}
          className="inline-flex items-center rounded-md border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text shadow-sm hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Test Twilio Connection'}
        </button>
      </div>
    </div>
  );
}
