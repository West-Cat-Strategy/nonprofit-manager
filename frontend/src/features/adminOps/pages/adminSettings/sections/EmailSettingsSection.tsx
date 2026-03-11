/**
 * Email Settings Section
 * Allows admins to configure SMTP and IMAP settings for transactional email.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../../../services/api';
import { useToast } from '../../../../../contexts/useToast';
import { useUnsavedChangesGuard } from '../../../../../hooks/useUnsavedChangesGuard';

interface EmailSettings {
  id: string;
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpFromAddress: string | null;
  smtpFromName: string | null;
  imapHost: string | null;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string | null;
  isConfigured: boolean;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
}

interface Credentials {
  smtp: boolean;
  imap: boolean;
}

const EMAIL_SETTINGS_CACHE_KEY = 'admin_email_settings_cache_v1';
const EMAIL_SETTINGS_CACHE_TTL_MS = 2 * 60 * 1000;

const inputClass =
  'mt-1 block w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-sm focus:border-app-border focus:outline-none focus:ring-1 focus:ring-app-accent';
const labelClass = 'block text-sm font-medium text-app-text';
const checkboxClass = 'h-4 w-4 rounded border-app-border text-app-accent focus:ring-app-accent';

export default function EmailSettingsSection() {
  const { showSuccess, showError } = useToast();

  // State
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [credentials, setCredentials] = useState<Credentials>({ smtp: false, imap: false });
  const [loading, setLoading] = useState(true);
  const [hasHydratedData, setHasHydratedData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');

  // Form state
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromAddress, setSmtpFromAddress] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(993);
  const [imapSecure, setImapSecure] = useState(true);
  const [imapUser, setImapUser] = useState('');
  const [imapPass, setImapPass] = useState('');
  const hasBootstrappedRef = useRef(false);

  const buildSnapshot = useCallback(
    () =>
      JSON.stringify({
        smtpHost,
        smtpPort,
        smtpSecure,
        smtpUser,
        smtpFromAddress,
        smtpFromName,
        imapHost,
        imapPort,
        imapSecure,
        imapUser,
        smtpPassPresent: Boolean(smtpPass),
        imapPassPresent: Boolean(imapPass),
      }),
    [
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpFromAddress,
      smtpFromName,
      imapHost,
      imapPort,
      imapSecure,
      imapUser,
      smtpPass,
      imapPass,
    ]
  );
  const isDirty = hasHydratedData && buildSnapshot() !== savedSnapshot;

  useUnsavedChangesGuard({
    hasUnsavedChanges: isDirty && !saving && !testing,
  });

  // ---- Fetch ----
  const buildSavedSnapshot = useCallback(
    (s: EmailSettings) =>
      JSON.stringify({
        smtpHost: s.smtpHost || '',
        smtpPort: s.smtpPort,
        smtpSecure: s.smtpSecure,
        smtpUser: s.smtpUser || '',
        smtpFromAddress: s.smtpFromAddress || '',
        smtpFromName: s.smtpFromName || '',
        imapHost: s.imapHost || '',
        imapPort: s.imapPort,
        imapSecure: s.imapSecure,
        imapUser: s.imapUser || '',
        smtpPassPresent: false,
        imapPassPresent: false,
      }),
    []
  );

  const cacheSettings = useCallback((s: EmailSettings, creds: Credentials) => {
    sessionStorage.setItem(
      EMAIL_SETTINGS_CACHE_KEY,
      JSON.stringify({
        settings: s,
        credentials: creds,
        cachedAt: Date.now(),
      })
    );
  }, []);

  const syncServerMetadata = useCallback((s: EmailSettings, creds: Credentials) => {
    setSettings(s);
    setCredentials(creds);
  }, []);

  const hydrateDraftFromServer = useCallback((s: EmailSettings, creds: Credentials) => {
    syncServerMetadata(s, creds);
    setSmtpHost(s.smtpHost || '');
    setSmtpPort(s.smtpPort);
    setSmtpSecure(s.smtpSecure);
    setSmtpUser(s.smtpUser || '');
    setSmtpFromAddress(s.smtpFromAddress || '');
    setSmtpFromName(s.smtpFromName || '');
    setImapHost(s.imapHost || '');
    setImapPort(s.imapPort);
    setImapSecure(s.imapSecure);
    setImapUser(s.imapUser || '');
    setHasHydratedData(true);
    setSavedSnapshot(buildSavedSnapshot(s));
  }, [buildSavedSnapshot, syncServerMetadata]);

  const fetchSettings = useCallback(async (background = false) => {
    try {
      if (!background) {
        setLoading(true);
      }
      const { data } = await api.get<{ data: EmailSettings; credentials: Credentials }>(
        '/admin/email-settings'
      );
      const s = data.data;
      if (s) {
        hydrateDraftFromServer(s, data.credentials);
        cacheSettings(s, data.credentials);
      }
    } catch {
      if (!hasHydratedData) {
        showError('Failed to load email settings');
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, [cacheSettings, hasHydratedData, hydrateDraftFromServer, showError]);

  const refreshMetadata = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: EmailSettings; credentials: Credentials }>(
        '/admin/email-settings'
      );
      const s = data.data;
      if (s) {
        syncServerMetadata(s, data.credentials);
        cacheSettings(s, data.credentials);
      }
    } catch {
      if (!hasHydratedData) {
        showError('Failed to load email settings');
      }
    }
  }, [cacheSettings, hasHydratedData, showError, syncServerMetadata]);

  useEffect(() => {
    if (hasBootstrappedRef.current) {
      return;
    }
    hasBootstrappedRef.current = true;

    const cached = sessionStorage.getItem(EMAIL_SETTINGS_CACHE_KEY);

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          settings: EmailSettings;
          credentials: Credentials;
          cachedAt: number;
        };
        if (Date.now() - parsed.cachedAt < EMAIL_SETTINGS_CACHE_TTL_MS && parsed.settings) {
          hydrateDraftFromServer(parsed.settings, parsed.credentials);
          setLoading(false);
          void refreshMetadata();
          return;
        }
      } catch {
        sessionStorage.removeItem(EMAIL_SETTINGS_CACHE_KEY);
      }
    }

    void fetchSettings();
  }, [fetchSettings, hydrateDraftFromServer, refreshMetadata]);

  // ---- Save ----
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        smtpHost,
        smtpPort,
        smtpSecure,
        smtpUser,
        smtpFromAddress,
        smtpFromName,
        imapHost,
        imapPort,
        imapSecure,
        imapUser,
      };
      // Only include passwords if the user typed something
      if (smtpPass) payload.smtpPass = smtpPass;
      if (imapPass) payload.imapPass = imapPass;

      await api.put('/admin/email-settings', payload);
      showSuccess('Email settings saved');
      setSmtpPass('');
      setImapPass('');
      setLastSavedAt(new Date());
      await fetchSettings();
    } catch {
      showError('Failed to save email settings');
    } finally {
      setSaving(false);
    }
  };

  // ---- Test Connection ----
  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data } = await api.post<{ data: { success: boolean; error?: string }; message: string }>(
        '/admin/email-settings/test'
      );
      if (data.data.success) {
        showSuccess('SMTP connection successful!');
      } else {
        showError(`SMTP test failed: ${data.data.error || 'Unknown error'}`);
      }
      await fetchSettings();
    } catch {
      showError('Failed to test SMTP connection');
    } finally {
      setTesting(false);
    }
  };

  // ---- Render ----
  if (loading) {
    return (
      <div className="rounded-lg border border-app-border bg-app-surface p-6 shadow-sm">
        <p className="text-sm text-app-text-muted">Loading email settings...</p>
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

      {/* Status Banner */}
      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
          settings?.isConfigured
            ? 'border-app-border bg-app-accent-soft text-app-accent-text dark:border-app-accent dark:bg-app-accent-hover/20 dark:text-app-text-muted'
            : 'border-app-border bg-app-accent-soft text-app-accent-text dark:border-app-accent dark:bg-app-accent-hover/20 dark:text-app-text-muted'
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
          <strong>{settings?.isConfigured ? 'Email is configured' : 'Email is not configured'}</strong>
          {settings?.lastTestedAt && (
            <span className="ml-2 text-xs opacity-75">
              Last tested: {new Date(settings.lastTestedAt).toLocaleString()} —{' '}
              {settings.lastTestSuccess ? 'Passed' : 'Failed'}
            </span>
          )}
        </div>
      </div>

      {/* SMTP Settings */}
      <div className="rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="border-b border-app-border bg-app-surface-muted px-6 py-4">
          <h3 className="text-lg font-semibold text-app-text">SMTP Settings (Outbound Email)</h3>
          <p className="mt-1 text-sm text-app-text-muted">
            Configure your mail server for sending password resets, invitations, and notifications.
          </p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <label className={labelClass}>SMTP Host</label>
            <input
              type="text"
              className={inputClass}
              placeholder="smtp.example.com"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>SMTP Port</label>
            <input
              type="number"
              className={inputClass}
              value={smtpPort}
              onChange={(e) => setSmtpPort(Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Username</label>
            <input
              type="text"
              className={inputClass}
              placeholder="you@example.com"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              Password
              {credentials.smtp && (
                <span className="ml-2 text-xs text-app-accent dark:text-app-text-muted">(stored)</span>
              )}
            </label>
            <input
              type="password"
              className={inputClass}
              placeholder={credentials.smtp ? '••••••••' : 'Enter password'}
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>From Address</label>
            <input
              type="email"
              className={inputClass}
              placeholder="noreply@example.com"
              value={smtpFromAddress}
              onChange={(e) => setSmtpFromAddress(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>From Name</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Nonprofit Manager"
              value={smtpFromName}
              onChange={(e) => setSmtpFromName(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="smtp-secure"
              type="checkbox"
              className={checkboxClass}
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
            />
            <label htmlFor="smtp-secure" className="text-sm text-app-text">
              Use TLS / SSL
            </label>
          </div>
        </div>
      </div>

      {/* IMAP Settings */}
      <div className="rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="border-b border-app-border bg-app-surface-muted px-6 py-4">
          <h3 className="text-lg font-semibold text-app-text">IMAP Settings (Inbound Email)</h3>
          <p className="mt-1 text-sm text-app-text-muted">
            Optional. Configure to receive or monitor incoming email.
          </p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <label className={labelClass}>IMAP Host</label>
            <input
              type="text"
              className={inputClass}
              placeholder="imap.example.com"
              value={imapHost}
              onChange={(e) => setImapHost(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>IMAP Port</label>
            <input
              type="number"
              className={inputClass}
              value={imapPort}
              onChange={(e) => setImapPort(Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Username</label>
            <input
              type="text"
              className={inputClass}
              placeholder="you@example.com"
              value={imapUser}
              onChange={(e) => setImapUser(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              Password
              {credentials.imap && (
                <span className="ml-2 text-xs text-app-accent dark:text-app-text-muted">(stored)</span>
              )}
            </label>
            <input
              type="password"
              className={inputClass}
              placeholder={credentials.imap ? '••••••••' : 'Enter password'}
              value={imapPass}
              onChange={(e) => setImapPass(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="imap-secure"
              type="checkbox"
              className={checkboxClass}
              checked={imapSecure}
              onChange={(e) => setImapSecure(e.target.checked)}
            />
            <label htmlFor="imap-secure" className="text-sm text-app-text">
              Use TLS / SSL
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center rounded-md bg-app-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing || !settings?.isConfigured}
          className="inline-flex items-center rounded-md border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text shadow-sm hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Test SMTP Connection'}
        </button>
      </div>
    </div>
  );
}
