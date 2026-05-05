import type { ReactNode } from 'react';
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
      {children}
    </AdminWorkspaceShell>
  );
}
