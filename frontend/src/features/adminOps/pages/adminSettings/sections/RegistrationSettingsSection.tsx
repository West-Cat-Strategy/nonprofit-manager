import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../../../contexts/useToast';
import type { RoleSelectorItem } from '../types';
import { getRoleDisplayLabel } from '../utils';
import {
  getRegistrationSettings,
  updateRegistrationSettings,
  type RegistrationMode,
  type RegistrationSettings,
} from '../../../api/adminHubApiClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RegistrationSettingsSectionProps {
  roleOptions: RoleSelectorItem[];
}

export default function RegistrationSettingsSection({
  roleOptions,
}: RegistrationSettingsSectionProps) {
  const { pushToast } = useToast();
  const [settings, setSettings] = useState<RegistrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchSettings = useCallback(async () => {
    try {
      const response = await getRegistrationSettings();
      setSettings(response);
    } catch {
      // ignore — will show loading/empty state
    }
  }, []);

  useEffect(() => {
    fetchSettings().finally(() => setLoading(false));
  }, [fetchSettings]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleModeChange = async (mode: RegistrationMode) => {
    if (!settings) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const response = await updateRegistrationSettings({
        registrationMode: mode,
        defaultRole: settings.defaultRole,
      });
      setSettings(response);
      setSaveStatus('success');
      pushToast({ message: 'Registration mode updated', variant: 'success' });
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      pushToast({ message: 'Failed to update registration settings', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDefaultRoleChange = async (role: string) => {
    if (!settings) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const response = await updateRegistrationSettings({
        registrationMode: settings.registrationMode,
        defaultRole: role,
      });
      setSettings(response);
      setSaveStatus('success');
      pushToast({ message: 'Default role updated', variant: 'success' });
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      pushToast({ message: 'Failed to update default role', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-app-surface-muted rounded w-1/3" />
          <div className="h-10 bg-app-surface-muted rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-app-surface-elevated/90 rounded-xl shadow-[var(--ui-elev-2)] border border-app-border-muted overflow-hidden backdrop-blur">
        <div className="px-6 py-5 border-b border-app-border-muted bg-app-surface-muted/50">
          <h2 className="text-xl font-display font-semibold text-app-text-heading">
            Registration Defaults
          </h2>
          <p className="text-sm text-app-text-muted mt-1.5">
            Control whether new users can self-register and what approved accounts receive by
            default.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <fieldset>
            <legend className="text-sm font-medium text-app-text mb-3">Registration Mode</legend>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="registrationMode"
                  value="disabled"
                  checked={settings?.registrationMode === 'disabled'}
                  onChange={() => handleModeChange('disabled')}
                  disabled={saving}
                  className="mt-1 h-4 w-4 text-app-accent border-app-input-border focus:ring-app-accent"
                />
                <div>
                  <div className="text-sm font-medium text-app-text">Disabled</div>
                  <div className="text-sm text-app-text-muted">
                    Only admins can create accounts via invitations. No public registration form is
                    shown on the login page.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="registrationMode"
                  value="approval_required"
                  checked={settings?.registrationMode === 'approval_required'}
                  onChange={() => handleModeChange('approval_required')}
                  disabled={saving}
                  className="mt-1 h-4 w-4 text-app-accent border-app-input-border focus:ring-app-accent"
                />
                <div>
                  <div className="text-sm font-medium text-app-text">Enabled — Requires Approval</div>
                  <div className="text-sm text-app-text-muted">
                    A &ldquo;Register&rdquo; button appears on the login page. New accounts are
                    placed in a pending queue until an admin approves them.
                  </div>
                </div>
              </label>
            </div>
          </fieldset>

          {settings?.registrationMode === 'approval_required' && (
            <div>
              <label
                htmlFor="defaultRole"
                className="block text-sm font-medium text-app-text mb-1"
              >
                Default Role for Approved Users
              </label>
              <select
                id="defaultRole"
                value={settings.defaultRole}
                onChange={(e) => handleDefaultRoleChange(e.target.value)}
                disabled={saving || roleOptions.length === 0}
                className="w-full max-w-xs px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
              >
                {roleOptions.length === 0 ? (
                  <option value={settings.defaultRole}>
                    {getRoleDisplayLabel(settings.defaultRole, {})}
                  </option>
                ) : (
                  roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                      {role.description ? ` - ${role.description}` : ''}
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-app-text-muted mt-1">
                Admins can change a user&apos;s role after approval.
              </p>
            </div>
          )}

          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-sm text-app-accent-text bg-app-accent-soft border border-app-border rounded-lg px-4 py-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Settings saved
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-sm text-app-accent-text bg-app-accent-soft border border-app-border rounded-lg px-4 py-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              Failed to save settings
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
