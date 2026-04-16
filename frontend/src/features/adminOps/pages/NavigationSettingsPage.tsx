/**
 * Navigation Settings Page
 * Allows users to enable or disable navigation menu items
 * Supports drag-and-drop reordering and pinned shortcuts
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNavigationPreferences } from '../../../hooks/useNavigationPreferences';
import { isAdminRole } from '../../auth/state/roleNormalization';
import { useAppSelector } from '../../../store/hooks';
import { getAdminSettingsPath } from '../adminRoutePaths';
import AdminQuickActionsBar from '../components/AdminQuickActionsBar';
import AdminWorkspaceShell from '../components/AdminWorkspaceShell';

export default function NavigationSettings() {
  const location = useLocation();
  const {
    allItems,
    toggleItem,
    togglePinned,
    resetToDefaults,
    reorderItems,
    moveItemUp,
    moveItemDown,
    isSaving,
    syncStatus,
    maxPinnedItems,
  } = useNavigationPreferences();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = isAdminRole(user?.role);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Don't allow dragging Dashboard (index 0)
    if (index === 0) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    // Don't allow dropping on Dashboard (index 0)
    if (index === 0) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      reorderItems(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const enabledCount = allItems.filter((item) => item.enabled).length;
  const pinnedCount = allItems.filter((item) => item.enabled && item.pinned).length;

  const syncStatusLabel = (() => {
    if (syncStatus === 'saving' || isSaving) return 'Saving...';
    if (syncStatus === 'synced') return 'Synced';
    return 'Offline fallback';
  })();

  const syncStatusClass = (() => {
    if (syncStatus === 'saving' || isSaving)
      return 'bg-app-accent-soft text-app-accent-text border-app-accent';
    if (syncStatus === 'synced') return 'bg-app-accent-soft text-app-accent-text border-app-border';
    return 'bg-app-surface-muted text-app-text-muted border-app-border';
  })();

  return (
    <AdminWorkspaceShell
      title="Navigation"
      description="Control menu order, pinned shortcuts, and workspace visibility from the shared admin tools surface."
      currentPath={location.pathname}
    >
      <AdminQuickActionsBar role="admin" />
      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-app-text-heading">Navigation Menu Items</h2>
              <p className="text-sm text-app-text-muted mt-1">
                {enabledCount} of {allItems.length} modules enabled · Pinned {pinnedCount}/
                {maxPinnedItems}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${syncStatusClass}`}
              >
                {syncStatusLabel}
              </span>
              <button
                type="button"
                onClick={resetToDefaults}
                className="text-sm text-app-accent hover:text-app-accent-hover font-medium"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>

        <ul className="divide-y divide-app-border">
          {allItems.map((item, index) => {
            const isDashboard = item.id === 'dashboard';
            const canReorder = !isDashboard;
            const effectiveEnabled = item.enabled && item.workspaceEnabled;
            const pinEligible = effectiveEnabled && !isDashboard && !item.isCore;
            const pinLimitReached = !item.pinned && pinnedCount >= maxPinnedItems;

            return (
              <li
                key={item.id}
                draggable={canReorder}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`px-6 py-4 flex items-center justify-between transition-colors ${
                  item.isCore ? 'bg-app-surface-muted' : 'hover:bg-app-surface-muted'
                } ${draggedIndex === index ? 'opacity-50 bg-app-accent-soft' : ''} ${
                  dragOverIndex === index && draggedIndex !== index
                    ? 'border-t-2 border-app-accent'
                    : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  {isDashboard ? (
                    <div className="text-app-text-subtle" title="Dashboard position is locked">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="cursor-grab active:cursor-grabbing text-app-text-subtle hover:text-app-text-muted">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8h16M4 16h16"
                        />
                      </svg>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveItemUp(item.id)}
                      disabled={isDashboard || index <= 1}
                      className="p-0.5 text-app-text-subtle hover:text-app-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
                      title={isDashboard ? 'Dashboard position is locked' : 'Move up'}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItemDown(item.id)}
                      disabled={isDashboard || index === allItems.length - 1}
                      className="p-0.5 text-app-text-subtle hover:text-app-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
                      title={isDashboard ? 'Dashboard position is locked' : 'Move down'}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>

                  <span className="text-2xl" aria-hidden="true">
                    {item.icon}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-app-text">{item.name}</span>
                      {isDashboard && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-app-surface-muted text-app-text-muted rounded">
                          Locked
                        </span>
                      )}
                      {item.isCore && !isDashboard && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-app-accent-soft text-app-accent-text rounded">
                          Required
                        </span>
                      )}
                      {item.lockedByWorkspace && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-app-surface-muted text-app-text-muted rounded">
                          Locked by workspace
                        </span>
                      )}
                      {item.pinned && effectiveEnabled && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-app-accent-soft text-app-accent-text rounded">
                          Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-app-text-muted">{item.path}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!pinEligible || pinLimitReached}
                    onClick={() => togglePinned(item.id)}
                    className="rounded-md border border-app-border px-2.5 py-1.5 text-xs font-semibold text-app-text hover:bg-app-hover disabled:opacity-40 disabled:cursor-not-allowed"
                    title={
                      item.lockedByWorkspace
                        ? 'This module is disabled by an organization admin'
                        : !effectiveEnabled
                          ? 'Enable this module before pinning'
                          : pinLimitReached
                            ? `Maximum of ${maxPinnedItems} pinned items reached`
                          : item.pinned
                            ? 'Unpin from quick access'
                            : 'Pin for quick access'
                    }
                  >
                    {item.pinned ? 'Unpin' : 'Pin'}
                  </button>

                    {item.isCore ? (
                    <span className="text-sm text-app-text-subtle">Always visible</span>
                  ) : (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={effectiveEnabled}
                        onChange={() => toggleItem(item.id)}
                        disabled={item.lockedByWorkspace}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-app-surface-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-app-accent-soft rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-app-surface after:border-app-input-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-app-accent" />
                      <span className="ms-3 text-sm font-medium text-app-text-label">
                        {item.lockedByWorkspace
                          ? 'Disabled by org admin'
                          : effectiveEnabled
                            ? 'Enabled'
                            : 'Disabled'}
                      </span>
                    </label>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="px-6 py-4 border-t border-app-border bg-app-surface-muted">
          <div className="flex items-start space-x-3">
            <svg
              className="h-5 w-5 text-app-accent mt-0.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-app-text-muted">
              <p className="font-medium text-app-text-label">How navigation works:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Dashboard is always first and cannot be moved</li>
                <li>
                  Pin up to {maxPinnedItems} enabled modules for instant access in the workspace
                  header and mobile menu
                </li>
                <li>Drag items or use arrows to reorder non-dashboard modules</li>
                <li>The first 4 enabled, unpinned items appear in the main navigation bar</li>
                <li>Additional enabled, unpinned items appear under the &quot;More&quot; menu</li>
                <li>Modules disabled by an organization admin stay locked until the workspace setting changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h2 className="text-lg font-semibold text-app-text-heading">Related Admin Workspaces</h2>
        </div>
        <ul className="divide-y divide-app-border">
          {isAdmin && (
            <li>
              <Link
                to={getAdminSettingsPath('organization')}
                className="flex items-center justify-between px-6 py-4 hover:bg-app-surface-muted"
              >
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-app-text">Organization</span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-app-accent-soft text-app-accent-text rounded">
                        Admin
                      </span>
                    </div>
                    <p className="text-sm text-app-text-muted">
                      Organization profile and preferences
                    </p>
                  </div>
                </div>
                <svg
                  className="h-5 w-5 text-app-text-subtle"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </li>
          )}
          <li>
            <Link
              to="/settings/api"
              className="flex items-center justify-between px-6 py-4 hover:bg-app-surface-muted"
            >
              <div>
                <span className="font-medium text-app-text">API &amp; Webhooks</span>
                <p className="text-sm text-app-text-muted">Manage webhooks and API keys</p>
              </div>
              <svg
                className="h-5 w-5 text-app-text-subtle"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </li>
        </ul>
      </div>
    </AdminWorkspaceShell>
  );
}
