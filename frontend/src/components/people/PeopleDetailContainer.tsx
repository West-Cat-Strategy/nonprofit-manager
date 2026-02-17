/**
 * People Detail Container
 * Reusable container for detail pages with consistent layout and functionality
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { BrutalCard, BrutalButton } from '../neo-brutalist';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export interface DetailTab {
  id: string;
  label: string;
  content?: React.ReactNode;
  badge?: number | string;
}

interface PeopleDetailContainerProps {
  title: string;
  description?: string; // Added description prop
  subtitle?: string;
  breadcrumb?: {
    label: string;
    path?: string;
  }[];
  onEdit?: () => void;
  onDelete?: () => void;
  loading?: boolean;
  error?: string;
  tabs?: DetailTab[];
  activeTab?: string; // Controlled active tab
  onTabChange?: (tabId: string) => void;
  defaultTab?: string;
  metadata?: {
    label: string;
    value: React.ReactNode;
  }[];
  children?: React.ReactNode;
  backPath?: string;
  onBack?: () => void; // Added onBack prop
}

export const PeopleDetailContainer: React.FC<PeopleDetailContainerProps> = ({
  title,
  description,
  subtitle,
  breadcrumb,
  onEdit,
  onDelete,
  loading,
  error,
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  defaultTab,
  metadata,
  children,
  backPath,
  onBack,
}) => {
  const [internalActiveTab, setInternalActiveTab] = React.useState(
    defaultTab || tabs?.[0]?.id || 'info'
  );

  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const handleTabChange = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setInternalActiveTab(tabId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] p-6 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <BrutalCard className="p-12 text-center border-4 border-[var(--app-border)] bg-[var(--app-surface)] shadow-[8px_8px_0px_0px_var(--shadow-color)]">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--app-border)] border-b-[var(--app-accent)] mx-auto"></div>
            <p className="mt-6 font-black uppercase tracking-widest text-[var(--app-text)] animate-pulse text-xl">Loading...</p>
          </BrutalCard>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] p-6 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <BrutalCard className="border-4 border-black bg-red-500 text-white p-8 shadow-[8px_8px_0px_0px_var(--shadow-color)]">
            <p className="font-black uppercase text-2xl mb-6">{error}</p>
            {(backPath || onBack) && (
              <button
                onClick={onBack || (() => window.history.back())}
                className="bg-white text-black px-6 py-2 font-black uppercase border-4 border-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_#000] transition-all"
              >
                ← Go back
              </button>
            )}
          </BrutalCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        {breadcrumb && (
          <div className="mb-6 flex items-center gap-2">
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={idx}>
                {item.path ? (
                  <Link
                    to={item.path}
                    className="text-[var(--app-accent)] hover:text-[var(--app-accent-text)] font-black uppercase text-sm tracking-wider"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-black uppercase text-sm text-[var(--app-text-muted)] tracking-wider">
                    {item.label}
                  </span>
                )}
                {idx < breadcrumb.length - 1 && (
                  <span className="text-[var(--app-text-muted)] font-black">/</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            {(backPath || onBack) && (
              <button
                onClick={onBack || (() => window.history.back())}
                className="inline-flex items-center gap-2 text-[var(--app-accent)] hover:text-[var(--app-accent-text)] mb-2 font-black uppercase text-sm transition-all"
              >
                <ArrowLeftIcon className="w-5 h-5 stroke-[3px]" />
                Back
              </button>
            )}
            <h1 className="text-5xl font-black uppercase text-[var(--app-text)] tracking-tight leading-none">
              {title}
            </h1>
            {description && (
              <p className="text-[var(--app-text-muted)] mt-2 font-medium text-lg italic">{description}</p>
            )}
            {subtitle && (
              <p className="text-[var(--app-text-muted)] mt-1 font-black uppercase tracking-widest">{subtitle}</p>
            )}
          </div>
          <div className="flex gap-4">
            {onEdit && (
              <BrutalButton onClick={onEdit} className="px-8 py-3 bg-[var(--app-surface)] text-xl">
                Edit
              </BrutalButton>
            )}
            {onDelete && (
              <BrutalButton
                variant="secondary"
                onClick={onDelete}
                className="px-8 py-3 bg-red-500 text-white text-xl"
              >
                Delete
              </BrutalButton>
            )}
          </div>
        </div>

        {/* Metadata */}
        {metadata && metadata.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {metadata.map((item, idx) => (
              <BrutalCard key={idx} className="p-4 border-4 border-[var(--app-border)] bg-[var(--app-surface)] shadow-[6px_6px_0px_0px_var(--shadow-color)]">
                <p className="text-xs font-black uppercase text-[var(--app-text-muted)] mb-2 tracking-widest">
                  {item.label}
                </p>
                <div className="font-bold text-[var(--app-text)]">
                  {item.value}
                </div>
              </BrutalCard>
            ))}
          </div>
        )}

        {/* Tabs */}
        <BrutalCard className="border-4 border-[var(--app-border)] bg-[var(--app-surface)] shadow-[10px_10px_0px_0px_var(--shadow-color)] overflow-hidden">
          {tabs && tabs.length > 0 && (
            <div className="border-b-4 border-[var(--app-border)] bg-[var(--app-surface-muted)]">
              <div className="flex overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`px-8 py-5 text-sm font-black uppercase tracking-widest transition-all
                      ${activeTab === tab.id
                        ? 'text-[var(--app-text)] bg-[var(--app-surface)] border-r-4 border-[var(--app-border)] last:border-r-0'
                        : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] border-r-4 border-[var(--app-border)] last:border-r-0'
                      }`}
                  >
                    {tab.label}
                    {tab.badge !== undefined && (
                      <span className="ml-3 bg-[var(--app-accent)] text-[var(--app-accent-text)] px-3 py-1 text-xs font-black rounded-none border-2 border-black inline-block transform -rotate-3">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab Content / Children */}
          <div className="p-8">
            {tabs && tabs.length > 0
              ? (tabs.find((tab) => tab.id === activeTab)?.content || children)
              : children}
          </div>
        </BrutalCard>
      </div>
    </div>
  );
};
