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

  const formatCurrency = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Reconciliation</h1>
          <p className="text-gray-600 mt-1">Match Stripe transactions with donation records</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={creating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-600">Total Reconciliations</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {dashboardStats.total_reconciliations}
            </div>
            <div className="mt-1 text-sm text-green-600">
              {dashboardStats.completed_reconciliations} completed
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-600">Matched Transactions</div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {dashboardStats.total_matched}
            </div>
            <div className="mt-1 text-sm text-gray-500">Successfully matched</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-600">Open Discrepancies</div>
            <div className="mt-2 text-3xl font-bold text-orange-600">
              {dashboardStats.total_open_discrepancies}
            </div>
            <div className="mt-1 text-sm text-red-600">
              {dashboardStats.critical_discrepancies} critical
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-600">Unreconciled Donations</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">
              {dashboardStats.unreconciled_donations}
            </div>
            <div className="mt-1 text-sm text-gray-500">Awaiting reconciliation</div>
          </div>
        </div>
      )}

      {/* Latest Reconciliation */}
      {latestReconciliation && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Latest Reconciliation</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Reconciliation #</div>
              <div className="font-semibold">{latestReconciliation.reconciliation_number}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(latestReconciliation.status)}`}>
                {latestReconciliation.status}
              </span>
            </div>
            <div>
              <div className="text-sm text-gray-600">Period</div>
              <div className="text-sm">
                {formatDate(latestReconciliation.start_date)} - {formatDate(latestReconciliation.end_date)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Matched</div>
              <div className="font-semibold text-green-600">
                {latestReconciliation.matched_count}/{latestReconciliation.donations_count || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Stripe Amount</div>
              <div className="font-semibold">
                {formatCurrency(latestReconciliation.stripe_balance_amount)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Donations Amount</div>
              <div className="font-semibold">
                {formatCurrency(latestReconciliation.donations_total_amount)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Fees</div>
              <div className="font-semibold text-red-600">
                {formatCurrency(latestReconciliation.stripe_total_fees)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Discrepancies</div>
              <div className="font-semibold text-orange-600">
                {latestReconciliation.discrepancy_count}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Reconciliations */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Reconciliations</h2>
        </div>
        <div className="overflow-x-auto">
          {loading && reconciliations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : reconciliations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No reconciliations yet. Create one to get started.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Matched
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Discrepancies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reconciliations.map((recon) => (
                  <tr key={recon.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {recon.reconciliation_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recon.reconciliation_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(recon.start_date)} - {formatDate(recon.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(recon.status)}`}>
                        {recon.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recon.matched_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-orange-600 font-semibold">
                        {recon.discrepancy_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(recon.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Open Discrepancies */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Open Discrepancies</h2>
        </div>
        <div className="overflow-x-auto">
          {loading && discrepancies.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : discrepancies.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No open discrepancies</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {discrepancies.map((disc) => (
                  <tr key={disc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(disc.severity)}`}>
                        {disc.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disc.discrepancy_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                      {disc.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      {disc.difference_amount ? formatCurrency(disc.difference_amount) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disc.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(disc.created_at)}
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
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Create New Reconciliation
            </h3>
            <form onSubmit={handleCreateReconciliation}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="manual">Manual</option>
                    <option value="automatic">Automatic</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
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
