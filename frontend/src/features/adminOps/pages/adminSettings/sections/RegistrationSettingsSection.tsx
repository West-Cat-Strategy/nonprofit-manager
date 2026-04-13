import { useState, useEffect, useCallback } from 'react';
import api from '../../../../../services/api';
import { useToast } from '../../../../../contexts/useToast';
import type { RoleSelectorItem } from '../types';
import { getRoleDisplayLabel } from '../utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RegistrationMode = 'disabled' | 'approval_required';

interface RegistrationSettings {
  id: string;
  registrationMode: RegistrationMode;
  defaultRole: string;
}

interface PendingRegistration {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RegistrationSettingsSectionProps {
  roleOptions: RoleSelectorItem[];
}

export default function RegistrationSettingsSection({
  roleOptions,
}: RegistrationSettingsSectionProps) {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<RegistrationSettings | null>(null);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get('/admin/registration-settings');
      setSettings(response.data);
    } catch {
      // ignore — will show loading/empty state
    }
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      const response = await api.get('/admin/pending-registrations?status=pending');
      setPendingRegistrations(response.data.data ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchPending()]).finally(() => setLoading(false));
  }, [fetchSettings, fetchPending]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleModeChange = async (mode: RegistrationMode) => {
    if (!settings) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const response = await api.put('/admin/registration-settings', {
        registrationMode: mode,
        defaultRole: settings.defaultRole,
      });
      setSettings(response.data);
      setSaveStatus('success');
      addToast({ message: 'Registration mode updated', variant: 'success' });
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      addToast({ message: 'Failed to update registration settings', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDefaultRoleChange = async (role: string) => {
    if (!settings) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const response = await api.put('/admin/registration-settings', {
        registrationMode: settings.registrationMode,
        defaultRole: role,
      });
      setSettings(response.data);
      setSaveStatus('success');
      addToast({ message: 'Default role updated', variant: 'success' });
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      addToast({ message: 'Failed to update default role', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string, name: string) => {
    setActionLoading(id);
    try {
      await api.post(`/admin/pending-registrations/${id}/approve`);
      setPendingRegistrations((prev) => prev.filter((r) => r.id !== id));
      addToast({ message: `Approved registration for ${name}`, variant: 'success' });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message || 'Failed to approve registration';
      addToast({ message, variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    setActionLoading(id);
    try {
      await api.post(`/admin/pending-registrations/${id}/reject`, {
        reason: rejectionReason || undefined,
      });
      setPendingRegistrations((prev) => prev.filter((r) => r.id !== id));
      addToast({ message: `Rejected registration for ${name}`, variant: 'info' });
      setRejectingId(null);
      setRejectionReason('');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message || 'Failed to reject registration';
      addToast({ message, variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  };
 bitumen

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

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
      {/* Registration Mode */}
      <div className="bg-app-surface-elevated/90 rounded-xl shadow-[var(--ui-elev-2)] border border-app-border-muted overflow-hidden backdrop-blur">
        <div className="px-6 py-5 border-b border-app-border-muted bg-app-surface-muted/50">
          <h2 className="text-xl font-display font-semibold text-app-text-heading">Registration Settings</h2>
          <p className="text-sm text-app-text-muted mt-1.5">
            Control whether new users can self-register for an account
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Mode selector */}
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

          {/* Default role for approved registrations */}
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

          {/* Save feedback */}
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

      {/* Pending Registrations Queue */}
      {settings?.registrationMode === 'approval_required' && (
        <div className="bg-app-surface-elevated/90 rounded-xl shadow-[var(--ui-elev-2)] border border-app-border-muted overflow-hidden backdrop-blur">
          <div className="px-6 py-5 border-b border-app-border-muted bg-app-surface-muted/50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-display font-semibold text-app-text-heading">
                Pending Registrations
                {pendingRegistrations.length > 0 && (
                  <span className="ml-3 px-2.5 py-0.5 text-xs font-semibold bg-app-accent-soft text-app-accent-text rounded-full shadow-sm">
                    {pendingRegistrations.length}
                  </span>
                )}
              </h2>
              <p className="text-sm text-app-text-muted mt-1.5">
                Review and approve or reject new account requests
              </p>
            </div>
            <button
              type="button"
              onClick={fetchPending}
              className="px-4 py-2 text-sm text-app-accent hover:text-app-accent-hover font-semibold transition hover:bg-app-accent-soft rounded-lg"
            >
              Refresh
            </button>
          </div>

          {pendingRegistrations.length === 0 ? (
            <div className="p-6 text-center text-app-text-muted text-sm">
              No pending registration requests
            </div>
          ) : (
            <div className="divide-y divide-app-border-muted">
              {pendingRegistrations.map((reg) => {
                const displayName = [reg.firstName, reg.lastName].filter(Boolean).join(' ') || reg.email;
                return (
                  <div 
                    key={reg.id} 
                    className="p-5 transition hover:bg-app-surface-muted/30 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-app-accent-soft border border-app-border-muted flex items-center justify-center text-app-accent font-semibold font-display shadow-sm">
                          {reg.firstName ? (reg.firstName[0] + (reg.lastName ? reg.lastName[0] : '')).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-app-text text-base">
                              {displayName}
                            </span>
                            {(reg.firstName || reg.lastName) && (
                              <span className="text-sm text-app-text-muted bg-app-surface-muted px-2 py-0.5 rounded border border-app-border-muted/50">{reg.email}</span>
                            )}
                          </div>
                          <div className="text-sm text-app-text-muted mt-1.5 flex items-center gap-1.5">
                            <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Requested {new Date(reg.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}{' '}
                            at {new Date(reg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {rejectingId !== reg.id && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleApprove(reg.id, displayName)}
                            disabled={actionLoading === reg.id}
                            className="px-5 py-2 text-sm font-semibold text-white bg-app-accent hover:bg-app-accent-hover rounded-xl shadow-sm transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                          >
                            {actionLoading === reg.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingId(reg.id)}
                            disabled={actionLoading === reg.id}
                            className="px-5 py-2 text-sm font-semibold text-app-text-heading hover:bg-app-surface-muted border border-app-border-muted rounded-xl transition active:scale-[0.98] disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Rejection reason form */}
                    {rejectingId === reg.id && (
                      <div className="mt-5 p-4 bg-app-surface-muted/40 rounded-xl border border-app-border-muted/50 animate-in zoom-in-95 duration-200">
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-app-text-muted mb-2">
                              Rejection reason (optional)
                            </label>
                            <input
                              type="text"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="e.g. Not a member of the organization"
                              className="w-full px-4 py-2.5 border border-app-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/30 focus:border-app-accent shadow-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleReject(reg.id, displayName)}
                            disabled={actionLoading === reg.id}
                            className="px-5 py-2.5 text-sm font-semibold text-white bg-app-accent hover:bg-app-accent-hover rounded-xl shadow-sm transition active:scale-[0.98] disabled:opacity-50"
                          >
                            {actionLoading === reg.id ? 'Rejecting...' : 'Confirm Reject'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                            className="px-5 py-2.5 text-sm font-semibold text-app-text-muted hover:text-app-text transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
