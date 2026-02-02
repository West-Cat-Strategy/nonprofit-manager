/**
 * Alert Configuration Modal
 * Form for creating and editing alert configurations
 */

import { useState, useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { createAlertConfig, updateAlertConfig, testAlertConfig } from '../../store/slices/alertsSlice';
import type { AlertConfig, CreateAlertDTO, AlertMetricType, AlertCondition, AlertFrequency, AlertChannel, AlertSeverity } from '../../types/alert';

interface AlertConfigModalProps {
  config: AlertConfig | null;
  onClose: () => void;
  onSuccess: () => void;
}

const AlertConfigModal = ({ config, onClose, onSuccess }: AlertConfigModalProps) => {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<CreateAlertDTO>({
    name: '',
    description: '',
    metric_type: 'donations',
    condition: 'exceeds',
    threshold: undefined,
    percentage_change: undefined,
    sensitivity: 2.0,
    frequency: 'daily',
    channels: ['email', 'in_app'],
    severity: 'medium',
    enabled: true,
    recipients: [],
    filters: {},
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    if (config) {
      setFormData({
        name: config.name,
        description: config.description || '',
        metric_type: config.metric_type,
        condition: config.condition,
        threshold: config.threshold,
        percentage_change: config.percentage_change,
        sensitivity: config.sensitivity,
        frequency: config.frequency,
        channels: config.channels,
        severity: config.severity,
        enabled: config.enabled,
        recipients: config.recipients || [],
        filters: config.filters || {},
      });
    }
  }, [config]);

  const handleChange = (field: keyof CreateAlertDTO, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const toggleChannel = (channel: AlertChannel) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Alert name is required';
    }

    if (['exceeds', 'drops_below'].includes(formData.condition) && formData.threshold === undefined) {
      newErrors.threshold = 'Threshold is required for this condition';
    }

    if (formData.condition === 'changes_by' && formData.percentage_change === undefined) {
      newErrors.percentage_change = 'Percentage change is required for this condition';
    }

    if (formData.channels.length === 0) {
      newErrors.channels = 'At least one notification channel is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validateForm()) return;

    try {
      setTesting(true);
      setTestResult(null);
      const result = await dispatch(testAlertConfig(formData)).unwrap();
      setTestResult(result);
    } catch (error) {
      setTestResult({ error: 'Failed to test alert configuration' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (config) {
        await dispatch(updateAlertConfig({ id: config.id!, config: formData })).unwrap();
      } else {
        await dispatch(createAlertConfig(formData)).unwrap();
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save alert configuration:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {config ? 'Edit Alert Configuration' : 'Create Alert Configuration'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure conditions and notifications for analytics monitoring
          </p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alert Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Low Donation Alert"
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional description of this alert"
            />
          </div>

          {/* Metric and Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metric *</label>
              <select
                value={formData.metric_type}
                onChange={(e) => handleChange('metric_type', e.target.value as AlertMetricType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="donations">Donations</option>
                <option value="donation_amount">Donation Amount</option>
                <option value="volunteer_hours">Volunteer Hours</option>
                <option value="event_attendance">Event Attendance</option>
                <option value="case_volume">Case Volume</option>
                <option value="engagement_score">Engagement Score</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition *</label>
              <select
                value={formData.condition}
                onChange={(e) => handleChange('condition', e.target.value as AlertCondition)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="exceeds">Exceeds Threshold</option>
                <option value="drops_below">Drops Below Threshold</option>
                <option value="changes_by">Changes By Percentage</option>
                <option value="anomaly_detected">Anomaly Detected</option>
                <option value="trend_reversal">Trend Reversal</option>
              </select>
            </div>
          </div>

          {/* Conditional Fields */}
          {['exceeds', 'drops_below'].includes(formData.condition) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Threshold *</label>
              <input
                type="number"
                value={formData.threshold || ''}
                onChange={(e) => handleChange('threshold', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter threshold value"
              />
              {errors.threshold && <p className="text-sm text-red-600 mt-1">{errors.threshold}</p>}
            </div>
          )}

          {formData.condition === 'changes_by' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Percentage Change *
              </label>
              <input
                type="number"
                value={formData.percentage_change || ''}
                onChange={(e) => handleChange('percentage_change', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 20 for 20% change"
              />
              {errors.percentage_change && (
                <p className="text-sm text-red-600 mt-1">{errors.percentage_change}</p>
              )}
            </div>
          )}

          {formData.condition === 'anomaly_detected' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sensitivity (1.0 = very sensitive, 4.0 = less sensitive)
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="4.0"
                value={formData.sensitivity || 2.0}
                onChange={(e) => handleChange('sensitivity', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Severity and Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
              <select
                value={formData.severity}
                onChange={(e) => handleChange('severity', e.target.value as AlertSeverity)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
              <select
                value={formData.frequency}
                onChange={(e) => handleChange('frequency', e.target.value as AlertFrequency)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="real_time">Real-time</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Summary</option>
                <option value="monthly">Monthly Report</option>
              </select>
            </div>
          </div>

          {/* Notification Channels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Channels *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['email', 'in_app', 'slack', 'webhook'] as AlertChannel[]).map((channel) => (
                <label key={channel} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.channels.includes(channel)}
                    onChange={() => toggleChannel(channel)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{channel.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
            {errors.channels && <p className="text-sm text-red-600 mt-1">{errors.channels}</p>}
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-lg ${testResult.would_trigger ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
              <p className="font-medium text-sm mb-1">
                {testResult.would_trigger ? '⚠️ Alert would trigger' : '✓ Alert would not trigger'}
              </p>
              <p className="text-sm text-gray-600">{testResult.message}</p>
              {testResult.current_value !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  Current value: {testResult.current_value}
                  {testResult.threshold_value !== undefined && ` | Threshold: ${testResult.threshold_value}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Alert'}
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {config ? 'Update Alert' : 'Create Alert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertConfigModal;
