/**
 * Alerts Configuration Page
 * Manage analytics alert configurations
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchAlertConfigs,
  fetchAlertStats,
  deleteAlertConfig,
  toggleAlertConfig,
  setCurrentConfig,
} from '../../store/slices/alertsSlice';
import type { AlertConfig } from '../../types/alert';
import { AlertConfigModal } from '../../components/alerts';

const AlertsConfig = () => {
  const dispatch = useAppDispatch();
  const { configs, stats, loading } = useAppSelector((state) => state.alerts);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AlertConfig | null>(null);

  useEffect(() => {
    dispatch(fetchAlertConfigs());
    dispatch(fetchAlertStats());
  }, [dispatch]);

  const handleCreate = () => {
    setEditingConfig(null);
    dispatch(setCurrentConfig(null));
    setShowModal(true);
  };

  const handleEdit = (config: AlertConfig) => {
    setEditingConfig(config);
    dispatch(setCurrentConfig(config));
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this alert configuration? This cannot be undone.')) {
      await dispatch(deleteAlertConfig(id));
    }
  };

  const handleToggle = async (id: string) => {
    await dispatch(toggleAlertConfig(id));
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'text-app-text-muted bg-app-surface-muted',
      medium: 'text-app-accent bg-app-accent-soft',
      high: 'text-orange-600 bg-orange-100',
      critical: 'text-red-600 bg-red-100',
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  const getConditionLabel = (condition: string) => {
    const labels = {
      exceeds: 'Exceeds',
      drops_below: 'Drops Below',
      changes_by: 'Changes By',
      anomaly_detected: 'Anomaly Detected',
      trend_reversal: 'Trend Reversal',
    };
    return labels[condition as keyof typeof labels] || condition;
  };

  const getMetricLabel = (metric: string) => {
    const labels = {
      donations: 'Donations',
      donation_amount: 'Donation Amount',
      volunteer_hours: 'Volunteer Hours',
      event_attendance: 'Event Attendance',
      case_volume: 'Case Volume',
      engagement_score: 'Engagement Score',
    };
    return labels[metric as keyof typeof labels] || metric;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text-heading">Alert Configuration</h1>
          <p className="text-sm text-app-text-muted mt-1">
            Configure alerts to monitor key metrics and detect anomalies
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 text-sm font-medium text-white bg-app-accent rounded-lg hover:bg-app-accent-hover"
        >
          Create Alert
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-app-surface rounded-lg shadow-sm border border-app-border p-4">
            <p className="text-sm text-app-text-muted">Total Alerts</p>
            <p className="text-2xl font-bold text-app-text-heading">{stats.total_alerts}</p>
          </div>
          <div className="bg-app-surface rounded-lg shadow-sm border border-app-border p-4">
            <p className="text-sm text-app-text-muted">Active Alerts</p>
            <p className="text-2xl font-bold text-green-600">{stats.active_alerts}</p>
          </div>
          <div className="bg-app-surface rounded-lg shadow-sm border border-app-border p-4">
            <p className="text-sm text-app-text-muted">Triggered Today</p>
            <p className="text-2xl font-bold text-orange-600">{stats.triggered_today}</p>
          </div>
          <div className="bg-app-surface rounded-lg shadow-sm border border-app-border p-4">
            <p className="text-sm text-app-text-muted">This Week</p>
            <p className="text-2xl font-bold text-app-text-heading">{stats.triggered_this_week}</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex space-x-4">
        <Link
          to="/alerts/instances"
          className="flex-1 bg-app-surface rounded-lg shadow-sm border border-app-border p-4 hover:bg-app-surface-muted transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-app-text">View Triggered Alerts</p>
              <p className="text-sm text-app-text-muted">See all active and resolved alerts</p>
            </div>
            <svg className="w-5 h-5 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        <Link
          to="/alerts/history"
          className="flex-1 bg-app-surface rounded-lg shadow-sm border border-app-border p-4 hover:bg-app-surface-muted transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-app-text">Alert History</p>
              <p className="text-sm text-app-text-muted">View historical alert data</p>
            </div>
            <svg className="w-5 h-5 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Alert Configurations List */}
      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border">
        <div className="p-4 border-b border-app-border">
          <h2 className="text-lg font-semibold text-app-text-heading">Alert Configurations</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-app-text-muted">Loading alerts...</div>
        ) : configs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-app-text-muted">No alert configurations yet</p>
            <button
              onClick={handleCreate}
              className="mt-4 text-sm text-app-accent hover:text-app-accent-hover font-medium"
            >
              Create your first alert
            </button>
          </div>
        ) : (
          <div className="divide-y divide-app-border">
            {configs.map((config) => (
              <div key={config.id} className="p-4 hover:bg-app-surface-muted transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-app-text">{config.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(config.severity)}`}>
                        {config.severity}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        config.enabled ? 'bg-green-100 text-green-700' : 'bg-app-surface-muted text-app-text-muted'
                      }`}>
                        {config.enabled ? 'Active' : 'Paused'}
                      </span>
                    </div>

                    {config.description && (
                      <p className="text-sm text-app-text-muted mt-1">{config.description}</p>
                    )}

                    <div className="flex items-center space-x-6 mt-3 text-sm text-app-text-muted">
                      <div>
                        <span className="font-medium">Metric:</span>{' '}
                        {getMetricLabel(config.metric_type)}
                      </div>
                      <div>
                        <span className="font-medium">Condition:</span>{' '}
                        {getConditionLabel(config.condition)}
                      </div>
                      {config.threshold !== undefined && (
                        <div>
                          <span className="font-medium">Threshold:</span> {config.threshold}
                        </div>
                      )}
                      {config.percentage_change !== undefined && (
                        <div>
                          <span className="font-medium">Change:</span> {config.percentage_change}%
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Frequency:</span> {config.frequency}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mt-2">
                      {config.channels.map((channel) => (
                        <span
                          key={channel}
                          className="px-2 py-1 text-xs font-medium bg-app-surface-muted text-app-text-muted rounded"
                        >
                          {channel}
                        </span>
                      ))}
                    </div>

                    {config.last_triggered && (
                      <p className="text-xs text-app-text-muted mt-2">
                        Last triggered:{' '}
                        {new Date(config.last_triggered).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => {
                        if (config.id) {
                          handleToggle(config.id);
                        }
                      }}
                      className="p-2 text-app-text-subtle hover:text-app-text-muted transition-colors"
                      title={config.enabled ? 'Pause alert' : 'Enable alert'}
                    >
                      {config.enabled ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(config)}
                      className="p-2 text-app-text-subtle hover:text-app-accent transition-colors"
                      title="Edit alert"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        if (config.id) {
                          handleDelete(config.id);
                        }
                      }}
                      className="p-2 text-app-text-subtle hover:text-red-600 transition-colors"
                      title="Delete alert"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Configuration Modal */}
      {showModal && (
        <AlertConfigModal
          config={editingConfig}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            dispatch(fetchAlertConfigs());
            dispatch(fetchAlertStats());
          }}
        />
      )}
    </div>
  );
};

export default AlertsConfig;
