import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../../store/hooks';
import { createAlertConfig, testAlertConfig, updateAlertConfig } from '../state';
import {
  ALERT_CHANNEL_OPTIONS,
  ALERT_CONDITION_OPTIONS,
  ALERT_FREQUENCY_OPTIONS,
  ALERT_METRIC_OPTIONS,
  ALERT_SEVERITY_OPTIONS,
  createDefaultAlertConfig,
  toEditableAlertConfig,
} from '../alertOptions';
import type {
  AlertChannel,
  AlertConfig,
  AlertCondition,
  AlertFrequency,
  AlertMetricType,
  AlertSeverity,
  AlertTestResult,
  CreateAlertDTO,
} from '../types';

interface AlertConfigModalProps {
  config: AlertConfig | null;
  onClose: () => void;
  onSuccess: () => void;
}

const parseOptionalNumber = (value: string): number | undefined =>
  value.trim() === '' ? undefined : Number(value);

const isAlertTestResult = (
  result: AlertTestResult | { error: string }
): result is AlertTestResult => 'would_trigger' in result;

export default function AlertConfigModal({
  config,
  onClose,
  onSuccess,
}: AlertConfigModalProps) {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<CreateAlertDTO>(createDefaultAlertConfig());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<AlertTestResult | { error: string } | null>(null);

  useEffect(() => {
    setFormData(toEditableAlertConfig(config));
    setErrors({});
    setTestResult(null);
    setSubmitError(null);
  }, [config]);

  const handleChange = <K extends keyof CreateAlertDTO>(field: K, value: CreateAlertDTO[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setSubmitError(null);
  };

  const toggleChannel = (channel: AlertChannel) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((currentChannel) => currentChannel !== channel)
        : [...prev.channels, channel],
    }));
    setErrors((prev) => ({ ...prev, channels: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Alert name is required';
    }

    if (
      (formData.condition === 'exceeds' || formData.condition === 'drops_below') &&
      formData.threshold === undefined
    ) {
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
    if (!validateForm()) {
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      setSubmitError(null);
      const result = await dispatch(testAlertConfig(formData)).unwrap();
      setTestResult(result);
    } catch {
      setTestResult({ error: 'Failed to test alert configuration' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitError(null);
      if (config?.id) {
        await dispatch(updateAlertConfig({ id: config.id, config: formData })).unwrap();
      } else {
        await dispatch(createAlertConfig(formData)).unwrap();
      }
      onSuccess();
    } catch {
      setSubmitError('Failed to save alert configuration');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-app-surface shadow-xl">
        <div className="border-b border-app-border p-6">
          <h2 className="text-xl font-semibold text-app-text">
            {config ? 'Edit Alert Configuration' : 'Create Alert Configuration'}
          </h2>
          <p className="mt-1 text-sm text-app-text-muted">
            Configure conditions and notifications for analytics monitoring
          </p>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <label
              htmlFor="alert-config-name"
              className="mb-1 block text-sm font-medium text-app-text-muted"
            >
              Alert Name *
            </label>
            <input
              id="alert-config-name"
              type="text"
              value={formData.name}
              onChange={(event) => handleChange('name', event.target.value)}
              className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-app-accent"
              placeholder="e.g., Low Donation Alert"
            />
            {errors.name ? <p className="mt-1 text-sm text-app-accent">{errors.name}</p> : null}
          </div>

          <div>
            <label
              htmlFor="alert-config-description"
              className="mb-1 block text-sm font-medium text-app-text-muted"
            >
              Description
            </label>
            <textarea
              id="alert-config-description"
              value={formData.description || ''}
              onChange={(event) => handleChange('description', event.target.value)}
              rows={2}
              className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-app-accent"
              placeholder="Optional description of this alert"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="alert-config-metric"
                className="mb-1 block text-sm font-medium text-app-text-muted"
              >
                Metric *
              </label>
              <select
                id="alert-config-metric"
                value={formData.metric_type}
                onChange={(event) =>
                  handleChange('metric_type', event.target.value as AlertMetricType)
                }
                className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-app-accent"
              >
                {ALERT_METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="alert-config-condition"
                className="mb-1 block text-sm font-medium text-app-text-muted"
              >
                Condition *
              </label>
              <select
                id="alert-config-condition"
                value={formData.condition}
                onChange={(event) =>
                  handleChange('condition', event.target.value as AlertCondition)
                }
                className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-app-accent"
              >
                {ALERT_CONDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(formData.condition === 'exceeds' || formData.condition === 'drops_below') ? (
            <div>
              <label
                htmlFor="alert-config-threshold"
                className="mb-1 block text-sm font-medium text-app-text-muted"
              >
                Threshold *
              </label>
              <input
                id="alert-config-threshold"
                type="number"
                value={formData.threshold ?? ''}
                onChange={(event) =>
                  handleChange('threshold', parseOptionalNumber(event.target.value))
                }
                className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-app-accent"
                placeholder="Enter threshold value"
              />
              {errors.threshold ? (
                <p className="mt-1 text-sm text-app-accent">{errors.threshold}</p>
              ) : null}
            </div>
          ) : null}

          {formData.condition === 'changes_by' ? (
            <div>
              <label
                htmlFor="alert-config-percentage-change"
                className="mb-1 block text-sm font-medium text-app-text-muted"
              >
                Percentage Change *
              </label>
              <input
                id="alert-config-percentage-change"
                type="number"
                value={formData.percentage_change ?? ''}
                onChange={(event) =>
                  handleChange('percentage_change', parseOptionalNumber(event.target.value))
                }
                className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-app-accent"
                placeholder="e.g., 20 for 20% change"
              />
              {errors.percentage_change ? (
                <p className="mt-1 text-sm text-app-accent">{errors.percentage_change}</p>
              ) : null}
            </div>
          ) : null}

          {formData.condition === 'anomaly_detected' ? (
            <div>
              <label
                htmlFor="alert-config-sensitivity"
                className="mb-1 block text-sm font-medium text-app-text-muted"
              >
                Sensitivity (1.0 = very sensitive, 4.0 = less sensitive)
              </label>
              <input
                id="alert-config-sensitivity"
                type="number"
                step="0.1"
                min="1.0"
                max="4.0"
                value={formData.sensitivity ?? 2}
                onChange={(event) =>
                  handleChange('sensitivity', parseOptionalNumber(event.target.value))
                }
                className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-app-accent"
              />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="alert-config-severity"
                className="mb-1 block text-sm font-medium text-app-text-muted"
              >
                Severity *
              </label>
              <select
                id="alert-config-severity"
                value={formData.severity}
                onChange={(event) =>
                  handleChange('severity', event.target.value as AlertSeverity)
                }
                className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-app-accent"
              >
                {ALERT_SEVERITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="alert-config-frequency"
                className="mb-1 block text-sm font-medium text-app-text-muted"
              >
                Frequency *
              </label>
              <select
                id="alert-config-frequency"
                value={formData.frequency}
                onChange={(event) =>
                  handleChange('frequency', event.target.value as AlertFrequency)
                }
                className="w-full rounded-lg border border-app-input-border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-app-accent"
              >
                {ALERT_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-app-text-muted">
              Notification Channels *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ALERT_CHANNEL_OPTIONS.map((option) => (
                <label key={option.value} className="flex cursor-pointer items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.channels.includes(option.value)}
                    onChange={() => toggleChannel(option.value)}
                    className="h-4 w-4 rounded border-app-input-border text-app-accent focus:ring-app-accent"
                  />
                  <span className="text-sm capitalize text-app-text-muted">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.channels ? (
              <p className="mt-1 text-sm text-app-accent">{errors.channels}</p>
            ) : null}
          </div>

          {submitError ? (
            <div className="rounded-lg border border-app-border bg-app-accent-soft p-4 text-sm text-app-accent-text">
              {submitError}
            </div>
          ) : null}

          {testResult ? (
            isAlertTestResult(testResult) ? (
              <div className="rounded-lg border border-app-border bg-app-accent-soft p-4">
                <p className="mb-1 text-sm font-medium">
                  {testResult.would_trigger ? 'Alert would trigger' : 'Alert would not trigger'}
                </p>
                <p className="text-sm text-app-text-muted">{testResult.message}</p>
                <p className="mt-1 text-xs text-app-text-muted">
                  Current value: {testResult.current_value}
                  {testResult.threshold_value !== undefined
                    ? ` | Threshold: ${testResult.threshold_value}`
                    : ''}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-app-border bg-app-accent-soft p-4 text-sm text-app-accent-text">
                {testResult.error}
              </div>
            )
          ) : null}
        </div>

        <div className="flex justify-between border-t border-app-border p-6">
          <button
            onClick={handleTest}
            disabled={testing}
            className="rounded-lg border border-app-input-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted hover:bg-app-surface-muted disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Alert'}
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-app-input-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted hover:bg-app-surface-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover"
            >
              {config ? 'Update Alert' : 'Create Alert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
