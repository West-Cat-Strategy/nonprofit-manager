import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../../../../contexts/useToast';
import type { PendingRegistration } from '../../../contracts';
import {
  approvePendingRegistration,
  listPendingRegistrations,
  rejectPendingRegistration,
} from '../../../api/adminHubApiClient';

const formatDisplayName = (registration: PendingRegistration): string =>
  [registration.firstName, registration.lastName].filter(Boolean).join(' ') || registration.email;

export default function PendingRegistrationsQueue() {
  const { pushToast } = useToast();
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchPending = useCallback(async () => {
    try {
      const response = await listPendingRegistrations('pending');
      setPendingRegistrations(response.items);
    } catch {
      pushToast({ message: 'Failed to load pending registrations', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void fetchPending();
  }, [fetchPending]);

  const handleApprove = async (id: string, name: string) => {
    setActionLoading(id);
    try {
      await approvePendingRegistration(id);
      setPendingRegistrations((prev) => prev.filter((registration) => registration.id !== id));
      pushToast({ message: `Approved registration for ${name}`, variant: 'success' });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      pushToast({ message: message || 'Failed to approve registration', variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    setActionLoading(id);
    try {
      await rejectPendingRegistration(id, rejectionReason || undefined);
      setPendingRegistrations((prev) => prev.filter((registration) => registration.id !== id));
      pushToast({ message: `Rejected registration for ${name}`, variant: 'info' });
      setRejectingId(null);
      setRejectionReason('');
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      pushToast({ message: message || 'Failed to reject registration', variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-app-border-muted bg-app-surface-elevated/90 p-6 shadow-[var(--ui-elev-2)] backdrop-blur">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-1/4 rounded bg-app-surface-muted" />
          <div className="h-20 rounded-xl bg-app-surface-muted" />
          <div className="h-20 rounded-xl bg-app-surface-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-app-surface-elevated/90 rounded-xl shadow-[var(--ui-elev-2)] border border-app-border-muted overflow-hidden backdrop-blur">
      <div className="px-6 py-5 border-b border-app-border-muted bg-app-surface-muted/50 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-semibold text-app-text-heading">
            Pending Registrations
            <span className="ml-3 px-2.5 py-0.5 text-xs font-semibold bg-app-accent-soft text-app-accent-text rounded-full shadow-sm">
              {pendingRegistrations.length}
            </span>
          </h2>
          <p className="text-sm text-app-text-muted mt-1.5">
            Review new staff account requests before they can sign in.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void fetchPending();
          }}
          className="px-4 py-2 text-sm text-app-accent hover:text-app-accent-hover font-semibold transition hover:bg-app-accent-soft rounded-lg"
        >
          Refresh
        </button>
      </div>

      {pendingRegistrations.length === 0 ? (
        <div className="p-6 text-center text-app-text-muted text-sm">
          No pending registration requests.
        </div>
      ) : (
        <div className="divide-y divide-app-border-muted">
          {pendingRegistrations.map((registration) => {
            const displayName = formatDisplayName(registration);
            return (
              <div
                key={registration.id}
                className="p-5 transition hover:bg-app-surface-muted/30 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-app-accent-soft border border-app-border-muted flex items-center justify-center text-app-accent font-semibold font-display shadow-sm">
                      {registration.firstName
                        ? `${registration.firstName[0]}${registration.lastName?.[0] || ''}`.toUpperCase()
                        : '?'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-app-text text-base">{displayName}</span>
                        {(registration.firstName || registration.lastName) && (
                          <span className="text-sm text-app-text-muted bg-app-surface-muted px-2 py-0.5 rounded border border-app-border-muted/50">
                            {registration.email}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-app-text-muted mt-1.5 flex items-center gap-1.5">
                        <svg
                          className="w-4 h-4 opacity-70"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Requested{' '}
                        {new Date(registration.createdAt).toLocaleDateString(undefined, {
                          dateStyle: 'medium',
                        })}{' '}
                        at{' '}
                        {new Date(registration.createdAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {registration.hasStagedPasskeys ? (
                        <div className="mt-2 inline-flex rounded-full bg-app-accent-soft px-2.5 py-0.5 text-xs font-medium text-app-accent-text">
                          Passkey staged
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {rejectingId !== registration.id ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void handleApprove(registration.id, displayName)}
                        disabled={actionLoading === registration.id}
                        className="px-5 py-2 text-sm font-semibold text-white bg-app-accent hover:bg-app-accent-hover rounded-xl shadow-sm transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                      >
                        {actionLoading === registration.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingId(registration.id)}
                        disabled={actionLoading === registration.id}
                        className="px-5 py-2 text-sm font-semibold text-app-text-heading hover:bg-app-surface-muted border border-app-border-muted rounded-xl transition active:scale-[0.98] disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>

                {rejectingId === registration.id ? (
                  <div className="mt-5 p-4 bg-app-surface-muted/40 rounded-xl border border-app-border-muted/50 animate-in zoom-in-95 duration-200">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-app-text-muted mb-2">
                          Rejection reason (optional)
                        </label>
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(event) => setRejectionReason(event.target.value)}
                          placeholder="e.g. Not a member of the organization"
                          className="w-full px-4 py-2.5 border border-app-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/30 focus:border-app-accent shadow-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleReject(registration.id, displayName)}
                        disabled={actionLoading === registration.id}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-app-accent hover:bg-app-accent-hover rounded-xl shadow-sm transition active:scale-[0.98] disabled:opacity-50"
                      >
                        {actionLoading === registration.id ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectionReason('');
                        }}
                        className="px-5 py-2.5 text-sm font-semibold text-app-text-muted hover:text-app-text transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
