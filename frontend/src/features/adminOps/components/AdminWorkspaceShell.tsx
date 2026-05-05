import type { ReactNode } from 'react';
import AdminQuickActionsBar from './AdminQuickActionsBar';
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
  quickActionsRole?: string | null;
  quickActionsMaxItems?: number;
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
  quickActionsRole = 'admin',
  quickActionsMaxItems = 6,
}: AdminWorkspaceShellProps) {
  const defaultBadgeLabel = mode === 'portal' ? 'Portal Workspace' : 'Admin Workspace';
  const resolvedBadge = badge ?? <span className={badgeClassName}>{defaultBadgeLabel}</span>;
  const sidebar = (
    <div className="space-y-4">
      <AdminPanelNav currentPath={currentPath} mode={mode} />
      {quickActionsRole ? (
        <AdminQuickActionsBar role={quickActionsRole} compact maxItems={quickActionsMaxItems} />
      ) : null}
    </div>
  );

  return (
    <AdminPanelLayout
      title={title}
      description={description}
      actions={actions}
      badge={resolvedBadge}
      sidebar={sidebar}
      mobileNav={<AdminPanelNav currentPath={currentPath} mode={mode} variant="compact" />}
      className={className}
      contentClassName={contentClassName}
    >
      {children}
    </AdminPanelLayout>
  );
}
