import { useState, useEffect, useCallback } from 'react';
import api from '../../../../services/api';

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

export default function RegistrationSettingsSection() {
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
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
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
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/admin/pending-registrations/${id}/approve`);
      setPendingRegistrations((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message || 'Failed to approve registration';
      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/admin/pending-registrations/${id}/reject`, {
        reason: rejectionReason || undefined,
      });
      setPendingRegistrations((prev) => prev.filter((r) => r.id !== id));
      setRejectingId(null);
      setRejectionReason('');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message || 'Failed to reject registration';
      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

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
      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h2 className="text-lg font-semibold text-app-text-heading">Registration Settings</h2>
          <p className="text-sm text-app-text-muted mt-1">
            Control whether new users can self-register for an account
          </p>
        </div>

        <div className="p-6 space-y-5">
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
                disabled={saving}
                className="w-full max-w-xs px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
              >
                <option value="user">User</option>
                <option value="readonly">Read Only</option>
              </select>
              <p className="text-xs text-app-text-muted mt-1">
                Admins can change a user&apos;s role after approval.
              </p>
            </div>
          )}

          {/* Save feedback */}
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
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
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
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
        <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
          <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-app-text-heading">
                Pending Registrations
                {pendingRegistrations.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                    {pendingRegistrations.length}
                  </span>
                )}
              </h2>
              <p className="text-sm text-app-text-muted mt-1">
                Review and approve or reject new account requests
              </p>
            </div>
            <button
              type="button"
              onClick={fetchPending}
              className="px-3 py-1.5 text-sm text-app-accent hover:text-app-accent-hover font-medium"
            >
              Refresh
            </button>
          </div>

          {pendingRegistrations.length === 0 ? (
            <div className="p-6 text-center text-app-text-muted text-sm">
              No pending registration requests
            </div>
          ) : (
            <div className="divide-y divide-app-border">
              {pendingRegistrations.map((reg) => (
                <div key={reg.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-app-text">
                          {[reg.firstName, reg.lastName].filter(Boolean).join(' ') || reg.email}
                        </span>
                        {(reg.firstName || reg.lastName) && (
                          <span className="text-sm text-app-text-muted">{reg.email}</span>
                        )}
                      </div>
                      <div className="text-sm text-app-text-muted mt-1">
                        Requested {new Date(reg.createdAt).toLocaleDateString('en-CA')}{' '}
                        at {new Date(reg.createdAt).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {rejectingId !== reg.id && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(reg.id)}
                          disabled={actionLoading === reg.id}
                          className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                        >
                          {actionLoading === reg.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingId(reg.id)}
                          disabled={actionLoading === reg.id}
                          className="px-4 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 rounded-lg disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Rejection reason form */}
                  {rejectingId === reg.id && (
                    <div className="mt-3 flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-app-text-muted mb-1">
                          Rejection reason (optional)
                        </label>
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="e.g. Not a member of the organization"
                          className="w-full px-3 py-2 border border-app-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReject(reg.id)}
                        disabled={actionLoading === reg.id}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                      >
                        {actionLoading === reg.id ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                        className="px-4 py-2 text-sm font-medium text-app-text-muted hover:text-app-text"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
