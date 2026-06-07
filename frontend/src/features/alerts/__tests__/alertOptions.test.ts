import { describe, expect, it } from 'vitest';
import { toEditableAlertConfig } from '../alertOptions';
import type { AlertConfig } from '../types';

describe('alertOptions', () => {
  it('normalizes nullable API threshold fields for the edit model', () => {
    const editable = toEditableAlertConfig({
      id: 'alert-1',
      name: 'Nullable threshold alert',
      description: null,
      metric_type: 'donations',
      condition: 'exceeds',
      threshold: null,
      percentage_change: null,
      sensitivity: null,
      frequency: 'daily',
      channels: ['email'],
      severity: 'medium',
      enabled: true,
      recipients: null,
      filters: null,
      last_triggered: null,
    } as AlertConfig);

    expect(editable).toMatchObject({
      description: '',
      threshold: undefined,
      percentage_change: undefined,
      sensitivity: undefined,
      recipients: [],
      filters: {},
    });
  });
});
