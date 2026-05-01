/**
 * Alert Rules Page
 * Manage analytics alert rules
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BellAlertIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { ErrorState, PageHeader, SectionCard } from '../../../components/ui';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
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
    const confirmed = await confirm(confirmPresets.delete('Alert rule'));
    if (!confirmed) return;
    await dispatch(deleteAlertConfig(id));
  };

  const handleToggle = async (id: string) => {
    await dispatch(toggleAlertConfig(id));
  };

  const relatedWorkspaceLinks = [
    {
      to: '/analytics',
      label: 'Analytics',
      description: 'Check the signal behind alert thresholds before changing the rules.',
    },
    {
      to: '/reports/builder',
      label: 'Report Builder',
      description: 'Move from alert tuning into the reporting definition that drives the data.',
    },
    {
      to: '/settings/admin/branding',
      label: 'Branding',
      description: 'Confirm the app chrome matches the admin surfaces you are reviewing.',
    },
  ];

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Link
        to="/alerts/instances"
        className="inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border px-4 py-2 text-sm font-semibold text-app-text transition-colors hover:bg-app-hover"
      >
        <BellAlertIcon className="h-4 w-4" aria-hidden="true" />
        Active alerts
      </Link>
      <Link
        to="/alerts/history"
        className="inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-border px-4 py-2 text-sm font-semibold text-app-text transition-colors hover:bg-app-hover"
      >
        <ClockIcon className="h-4 w-4" aria-hidden="true" />
        Alert history
      </Link>
      <button
        type="button"
        onClick={handleCreate}
        className="inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-app-accent-hover hover:border-app-accent-hover"
      >
        <PlusCircleIcon className="h-4 w-4" aria-hidden="true" />
        Create alert rule
      </button>
    </div>
  );

  return (
    <NeoBrutalistLayout pageTitle="ALERT RULES">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Alert rules"
          description="Set clear rules for staff-facing alerts, then review active alerts and alert history when a rule fires."
          actions={actions}
        />

        <SectionCard
          title="Related workspaces"
          subtitle="Use analytics and reporting to tune the signal behind each alert rule."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {relatedWorkspaceLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface px-4 py-4 shadow-sm transition hover:bg-app-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
              >
                <span className="block text-sm font-semibold text-app-text-heading">
                  {link.label}
                </span>
                <span className="mt-2 block text-sm leading-6 text-app-text-muted">
                  {link.description}
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>

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
          title="Alert rules"
          subtitle="Create threshold rules for donations, volunteer capacity, event attendance, and case trends."
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-[var(--ui-radius-sm)] bg-app-surface-muted px-3 py-2 text-sm text-app-text-muted">
            <ClipboardDocumentListIcon className="h-4 w-4" aria-hidden="true" />
            Each rule can notify more than one alert channel.
          </div>
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
    </NeoBrutalistLayout>
  );
};

export default AlertsConfigPage;
