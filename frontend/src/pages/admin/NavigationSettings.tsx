/**
 * Navigation Settings Page
 * Allows users to enable or disable navigation menu items
 * Supports drag-and-drop reordering
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigationPreferences } from '../../hooks/useNavigationPreferences';
import { useAppSelector } from '../../store/hooks';

export default function NavigationSettings() {
  const { allItems, toggleItem, resetToDefaults, reorderItems, moveItemUp, moveItemDown } = useNavigationPreferences();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
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

  return (
    <div className="min-h-screen bg-app-surface-muted p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-app-text-muted mb-2">
            <Link to="/settings/api" className="hover:text-app-text-muted">
              Settings
            </Link>
            <span>/</span>
            <span className="text-app-text">Navigation</span>
          </div>
          <h1 className="text-3xl font-bold text-app-text">Navigation Settings</h1>
          <p className="mt-2 text-app-text-muted">
            Choose which modules appear in your navigation menu. Disabled modules are still
            accessible via direct URL.
          </p>
        </div>

        {/* Settings Card */}
        <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-app-text-heading">Navigation Menu Items</h2>
                <p className="text-sm text-app-text-muted mt-1">
                  {enabledCount} of {allItems.length} modules enabled
                </p>
              </div>
              <button
                type="button"
                onClick={resetToDefaults}
                className="text-sm text-app-accent hover:text-app-accent-hover font-medium"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Items List */}
          <ul className="divide-y divide-app-border">
            {allItems.map((item, index) => {
              const isDashboard = item.id === 'dashboard';
              const canReorder = !isDashboard;

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
                  dragOverIndex === index && draggedIndex !== index ? 'border-t-2 border-app-accent' : ''
                }`}
              >
                {/* Drag Handle or Lock Icon */}
                <div className="flex items-center space-x-3">
                  {isDashboard ? (
                    <div className="text-app-text-subtle" title="Dashboard position is locked">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="cursor-grab active:cursor-grabbing text-app-text-subtle hover:text-app-text-muted">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                  )}

                  {/* Up/Down Buttons */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveItemUp(item.id)}
                      disabled={isDashboard || index <= 1}
                      className="p-0.5 text-app-text-subtle hover:text-app-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
                      title={isDashboard ? 'Dashboard position is locked' : 'Move up'}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItemDown(item.id)}
                      disabled={isDashboard || index === allItems.length - 1}
                      className="p-0.5 text-app-text-subtle hover:text-app-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
                      title={isDashboard ? 'Dashboard position is locked' : 'Move down'}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  <span className="text-2xl">{item.icon}</span>
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
                    </div>
                    <p className="text-sm text-app-text-muted">{item.path}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  {item.isCore ? (
                    <span className="text-sm text-app-text-subtle">Always visible</span>
                  ) : (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => toggleItem(item.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-app-surface-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-app-accent-soft rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-app-surface after:border-app-input-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-app-accent"></div>
                      <span className="ms-3 text-sm font-medium text-app-text-label">
                        {item.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  )}
                </div>
              </li>
              );
            })}
          </ul>

          {/* Card Footer */}
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
                  <li>
                    Dashboard is always first and cannot be moved
                  </li>
                  <li>
                    Drag other items or use the arrow buttons to reorder
                  </li>
                  <li>
                    The first 4 enabled items appear in the main navigation bar
                  </li>
                  <li>Additional items appear under the &quot;More&quot; dropdown menu</li>
                  <li>Disabled modules can still be accessed via their direct URL</li>
                  <li>Changes sync across devices when logged in</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Other Settings Links */}
        <div className="mt-6 bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
          <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
            <h2 className="text-lg font-semibold text-app-text-heading">Other Settings</h2>
          </div>
          <ul className="divide-y divide-app-border">
            {isAdmin && (
              <li>
                <Link
                  to="/settings/organization"
                  className="flex items-center justify-between px-6 py-4 hover:bg-app-surface-muted"
                >
                  <div className="flex items-center space-x-4">
                    <svg
                      className="h-6 w-6 text-app-text-subtle"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-app-text">Organization</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                          Admin
                        </span>
                      </div>
                      <p className="text-sm text-app-text-muted">Organization profile and preferences</p>
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
                <div className="flex items-center space-x-4">
                  <svg
                    className="h-6 w-6 text-app-text-subtle"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div>
                    <span className="font-medium text-app-text">API & Integrations</span>
                    <p className="text-sm text-app-text-muted">Manage webhooks and API keys</p>
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
          </ul>
        </div>
      </div>
    </div>
  );
}
