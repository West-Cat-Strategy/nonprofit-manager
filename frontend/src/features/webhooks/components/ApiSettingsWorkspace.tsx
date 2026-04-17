import type { ReactNode } from 'react';
import AdminQuickActionsBar from '../../adminOps/components/AdminQuickActionsBar';
import AdminWorkspaceShell from '../../adminOps/components/AdminWorkspaceShell';

interface ApiSettingsWorkspaceProps {
  currentPath: string;
  children: ReactNode;
}

export default function ApiSettingsWorkspace({
  currentPath,
  children,
}: ApiSettingsWorkspaceProps) {
  return (
    <AdminWorkspaceShell
      title="API & Webhooks"
      description="Manage webhook endpoints, delivery history, and API key access from one admin workspace."
      currentPath={currentPath}
    >
      <AdminQuickActionsBar role="admin" />
      {children}
    </AdminWorkspaceShell>
  );
}
