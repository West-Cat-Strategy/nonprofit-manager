/**
 * Reconciliation Dashboard
 * Main interface for payment reconciliation system
 */

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchReconciliationDashboard,
  createReconciliation,
  fetchReconciliations,
  fetchAllDiscrepancies,
} from '../../../store/slices/reconciliationSlice';
import type { CreateReconciliationRequest } from '../../../types/reconciliation';
import { formatDate, formatCurrency } from '../../../utils/format';

const ReconciliationDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    dashboardStats,
    latestReconciliation,
    reconciliations,
    discrepancies,
    loading,
    creating,
    error,
  } = useAppSelector((state) => state.reconciliation);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreateReconciliationRequest>({
    reconciliation_type: 'manual',
    start_date: '',
    end_date: '',
    notes: '',
  });

  useEffect(() => {
    dispatch(fetchReconciliationDashboard());
    dispatch(fetchReconciliations({ page: 1, limit: 10 }));
    dispatch(fetchAllDiscrepancies({ status: 'open', page: 1, limit: 10 }));
  }, [dispatch]);

  const handleCreateReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createReconciliation(formData)).unwrap();
      setShowCreateModal(false);
      setFormData({
        reconciliation_type: 'manual',
        start_date: '',
        end_date: '',
        notes: '',
      });
      // Refresh dashboard
      dispatch(fetchReconciliationDashboard());
      dispatch(fetchReconciliations({ page: 1, limit: 10 }));
    } catch (err) {
      console.error('Failed to create reconciliation:', err);
    }
  };

  const formatCurrencyOrZero = (amount?: number | null) => {
    return formatCurrency(amount ?? 0);
  };

  const formatDateOrNA = (dateString?: string | null) => {
    return dateString ? formatDate(dateString) : 'N/A';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-app-accent-soft text-app-accent-text';
      default:
        return 'bg-app-surface-muted text-app-text';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-app-accent-soft text-app-accent-text';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-app-surface-muted text-app-text';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-app-text">Payment Reconciliation</h1>
          <p className="text-app-text-muted mt-1">Match Stripe transactions with donation records</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={creating}
          className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover disabled:bg-app-text-subtle disabled:cursor-not-allowed"
        >
          {creating ? 'Creating...' : 'New Reconciliation'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Statistics Grid */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-app-surface p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-app-text-muted">Total Reconciliations</div>
            <div className="mt-2 text-3xl font-bold text-app-text">
              {dashboardStats.total_reconciliations}
            </div>
            <div className="mt-1 text-sm text-green-600">
              {dashboardStats.completed_reconciliations} completed
            </div>
          </div>

          <div className="bg-app-surface p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-app-text-muted">Matched Transactions</div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {dashboardStats.total_matched}
            </div>
            <div className="mt-1 text-sm text-app-text-muted">Successfully matched</div>
          </div>

          <div className="bg-app-surface p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-app-text-muted">Open Discrepancies</div>
            <div className="mt-2 text-3xl font-bold text-orange-600">
              {dashboardStats.total_open_discrepancies}
            </div>
            <div className="mt-1 text-sm text-red-600">
              {dashboardStats.critical_discrepancies} critical
            </div>
          </div>

          <div className="bg-app-surface p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-app-text-muted">Unreconciled Donations</div>
            <div className="mt-2 text-3xl font-bold text-app-accent">
              {dashboardStats.unreconciled_donations}
            </div>
            <div className="mt-1 text-sm text-app-text-muted">Awaiting reconciliation</div>
          </div>
        </div>
      )}

      {/* Latest Reconciliation */}
      {latestReconciliation && (
        <div className="bg-app-surface p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-app-text mb-4">Latest Reconciliation</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-app-text-muted">Reconciliation #</div>
              <div className="font-semibold">{latestReconciliation.reconciliation_number}</div>
            </div>
            <div>
              <div className="text-sm text-app-text-muted">Status</div>
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(latestReconciliation.status)}`}>
                {latestReconciliation.status}
              </span>
            </div>
            <div>
              <div className="text-sm text-app-text-muted">Period</div>
              <div className="text-sm">
                {formatDateOrNA(latestReconciliation.start_date)} - {formatDateOrNA(latestReconciliation.end_date)}
              </div>
            </div>
            <div>
              <div className="text-sm text-app-text-muted">Matched</div>
              <div className="font-semibold text-green-600">
                {latestReconciliation.matched_count}/{latestReconciliation.donations_count || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-app-text-muted">Stripe Amount</div>
              <div className="font-semibold">
                {formatCurrencyOrZero(latestReconciliation.stripe_balance_amount)}
              </div>
            </div>
            <div>
              <div className="text-sm text-app-text-muted">Donations Amount</div>
              <div className="font-semibold">
                {formatCurrencyOrZero(latestReconciliation.donations_total_amount)}
              </div>
            </div>
            <div>
              <div className="text-sm text-app-text-muted">Fees</div>
              <div className="font-semibold text-red-600">
                {formatCurrencyOrZero(latestReconciliation.stripe_total_fees)}
              </div>
            </div>
            <div>
              <div className="text-sm text-app-text-muted">Discrepancies</div>
              <div className="font-semibold text-orange-600">
                {latestReconciliation.discrepancy_count}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Reconciliations */}
      <div className="bg-app-surface rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-app-border">
          <h2 className="text-xl font-bold text-app-text">Recent Reconciliations</h2>
        </div>
        <div className="overflow-x-auto">
          {loading && reconciliations.length === 0 ? (
            <div className="p-8 text-center text-app-text-muted">Loading...</div>
          ) : reconciliations.length === 0 ? (
            <div className="p-8 text-center text-app-text-muted">
              No reconciliations yet. Create one to get started.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-app-border">
              <thead className="bg-app-surface-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Matched
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Discrepancies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-app-surface divide-y divide-app-border">
                {reconciliations.map((recon) => (
                  <tr key={recon.id} className="hover:bg-app-surface-muted cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-app-accent">
                      {recon.reconciliation_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text">
                      {recon.reconciliation_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text-muted">
                      {formatDateOrNA(recon.start_date)} - {formatDateOrNA(recon.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(recon.status)}`}>
                        {recon.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text">
                      {recon.matched_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-orange-600 font-semibold">
                        {recon.discrepancy_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text-muted">
                      {formatDateOrNA(recon.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Open Discrepancies */}
      <div className="bg-app-surface rounded-lg shadow">
        <div className="px-6 py-4 border-b border-app-border">
          <h2 className="text-xl font-bold text-app-text">Open Discrepancies</h2>
        </div>
        <div className="overflow-x-auto">
          {loading && discrepancies.length === 0 ? (
            <div className="p-8 text-center text-app-text-muted">Loading...</div>
          ) : discrepancies.length === 0 ? (
            <div className="p-8 text-center text-app-text-muted">No open discrepancies</div>
          ) : (
            <table className="min-w-full divide-y divide-app-border">
              <thead className="bg-app-surface-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-app-surface divide-y divide-app-border">
                {discrepancies.map((disc) => (
                  <tr key={disc.id} className="hover:bg-app-surface-muted">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(disc.severity)}`}>
                        {disc.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text">
                      {disc.discrepancy_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-app-text max-w-md truncate">
                      {disc.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      {disc.difference_amount ? formatCurrencyOrZero(disc.difference_amount) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text">
                      {disc.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-app-text-muted">
                      {formatDateOrNA(disc.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Reconciliation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-app-surface rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-app-text mb-4">
              Create New Reconciliation
            </h3>
            <form onSubmit={handleCreateReconciliation}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-text-muted mb-1">
                    Type
                  </label>
                  <select
                    value={formData.reconciliation_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reconciliation_type: e.target.value as 'manual' | 'automatic' | 'scheduled',
                      })
                    }
                    className="w-full px-3 py-2 border border-app-input-border rounded-md"
                    required
                  >
                    <option value="manual">Manual</option>
                    <option value="automatic">Automatic</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text-muted mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-app-input-border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text-muted mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-app-input-border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text-muted mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-app-input-border rounded-md"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-app-text-muted border border-app-input-border rounded-md hover:bg-app-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover disabled:bg-app-text-subtle"
                >
                  {creating ? 'Creating...' : 'Create Reconciliation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationDashboard;
