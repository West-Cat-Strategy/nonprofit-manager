/**
 * Alerts Configuration Page
 * Manage analytics alert configurations
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../../../components/ConfirmDialog';
import {
  ErrorState,
  PageHeader,
  SectionCard,
} from '../../../components/ui';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  AlertConfigList,
  AlertConfigModal,
  AlertsSectionTabs,
  AlertSummaryCards,
} from '../components';
import {
  deleteAlertConfig,
  fetchAlertConfigs,
  fetchAlertStats,
  setCurrentConfig,
  toggleAlertConfig,
} from '../state';
import type { AlertConfig } from '../types';

const AlertsConfigPage = () => {
  const dispatch = useAppDispatch();
  const { configs, error, stats, loading } = useAppSelector((state) => state.alerts);
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
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
    const confirmed = await confirm(confirmPresets.delete('Alert Configuration'));
    if (!confirmed) return;
    await dispatch(deleteAlertConfig(id));
  };

  const handleToggle = async (id: string) => {
    await dispatch(toggleAlertConfig(id));
  };

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Link
        to="/alerts/instances"
        className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border px-4 py-2 text-sm font-semibold text-app-text transition-colors hover:bg-app-hover"
      >
        View triggered alerts
      </Link>
      <Link
        to="/alerts/history"
        className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border px-4 py-2 text-sm font-semibold text-app-text transition-colors hover:bg-app-hover"
      >
        Review history
      </Link>
      <button
        type="button"
        onClick={handleCreate}
        className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover hover:border-app-accent-hover"
      >
        Create alert
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Configure alert rules, review live incidents, and keep high-signal thresholds tuned for staff workflows."
        actions={actions}
      />

      <AlertsSectionTabs />

      <AlertSummaryCards stats={stats} />

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            void dispatch(fetchAlertConfigs());
            void dispatch(fetchAlertStats());
          }}
        />
      ) : null}

      <SectionCard
        title="Alert configurations"
        subtitle="Create threshold rules for donations, volunteer capacity, event attendance, and case trends."
      >
        <AlertConfigList
          configs={configs}
          loading={loading}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onToggle={handleToggle}
        />
      </SectionCard>

      {showModal ? (
        <AlertConfigModal
          config={editingConfig}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            dispatch(fetchAlertConfigs());
            dispatch(fetchAlertStats());
          }}
        />
      ) : null}
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
};

export default AlertsConfigPage;
