import type { ReactNode } from 'react';
import AdminPanelLayout from './AdminPanelLayout';
import AdminPanelNav, { type AdminPanelNavMode } from './AdminPanelNav';

interface AdminWorkspaceShellProps {
  title: string;
  description: string;
  currentPath: string;
  children: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
  mode?: AdminPanelNavMode;
  className?: string;
  contentClassName?: string;
}

const badgeClassName =
  'border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-app-text-heading';

export default function AdminWorkspaceShell({
  title,
  description,
  currentPath,
  children,
  actions,
  badge,
  mode = 'settings',
  className,
  contentClassName,
}: AdminWorkspaceShellProps) {
  const defaultBadgeLabel = mode === 'portal' ? 'Portal Workspace' : 'Admin Workspace';
  const resolvedBadge =
    badge ?? <span className={badgeClassName}>{defaultBadgeLabel}</span>;

  return (
    <AdminPanelLayout
      title={title}
      description={description}
      actions={actions}
      badge={resolvedBadge}
      sidebar={<AdminPanelNav currentPath={currentPath} mode={mode} />}
      className={className}
      contentClassName={contentClassName}
    >
      {children}
    </AdminPanelLayout>
  );
}
