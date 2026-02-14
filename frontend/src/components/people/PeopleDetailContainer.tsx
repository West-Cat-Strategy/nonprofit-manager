/**
 * People Detail Container
 * Reusable container for detail pages with consistent layout and functionality
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { BrutalCard, BrutalButton } from './index';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface DetailTab {
  id: string;
  label: string;
  content: React.ReactNode;
  badge?: number | string;
}

interface PeopleDetailContainerProps {
  title: string;
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
  defaultTab?: string;
  metadata?: {
    label: string;
    value: React.ReactNode;
  }[];
  children?: React.ReactNode;
  backPath?: string;
}

export const PeopleDetailContainer: React.FC<
  PeopleDetailContainerProps
> = ({
  title,
  subtitle,
  breadcrumb,
  onEdit,
  onDelete,
  loading,
  error,
  tabs,
  defaultTab,
  metadata,
  children,
  backPath,
}) => {
  const [activeTab, setActiveTab] = React.useState(
    defaultTab || tabs?.[0]?.id || 'info'
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <BrutalCard className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 font-mono text-gray-600">Loading...</p>
          </BrutalCard>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <BrutalCard className="border-red-600 p-6">
            <p className="font-bold text-red-600 mb-4">{error}</p>
            {backPath && (
              <Link to={backPath} className="text-blue-600 hover:text-blue-900">
                ← Go back
              </Link>
            )}
          </BrutalCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        {breadcrumb && (
          <div className="mb-6 flex items-center gap-2">
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={idx}>
                {item.path ? (
                  <Link
                    to={item.path}
                    className="text-blue-600 hover:text-blue-900 font-mono text-sm"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-mono text-sm text-gray-500">
                    {item.label}
                  </span>
                )}
                {idx < breadcrumb.length - 1 && (
                  <span className="text-gray-400">/</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            {backPath && (
              <Link
                to={backPath}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900 mb-2 font-mono text-sm"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </Link>
            )}
            <h1 className="text-4xl font-bold text-gray-900 mt-2 mb-1">
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-600 font-mono">{subtitle}</p>
            )}
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <BrutalButton onClick={onEdit}>
                Edit
              </BrutalButton>
            )}
            {onDelete && (
              <BrutalButton
                variant="secondary"
                onClick={onDelete}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                Delete
              </BrutalButton>
            )}
          </div>
        </div>

        {/* Metadata */}
        {metadata && metadata.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {metadata.map((item, idx) => (
              <BrutalCard key={idx} className="p-4">
                <p className="text-xs font-bold uppercase text-gray-500 mb-1">
                  {item.label}
                </p>
                <p className="font-mono text-sm text-gray-900">
                  {item.value}
                </p>
              </BrutalCard>
            ))}
          </div>
        )}

        {/* Tabs */}
        {tabs && tabs.length > 0 ? (
          <BrutalCard>
            {/* Tab Navigation */}
            <div className="border-b-2 border-gray-900">
              <div className="flex overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition
                      ${
                        activeTab === tab.id
                          ? 'text-gray-900 border-b-gray-900'
                          : 'text-gray-600 border-b-transparent hover:text-gray-900'
                      }`}
                  >
                    {tab.label}
                    {tab.badge !== undefined && (
                      <span className="ml-2 bg-gray-900 text-white px-2 py-1 text-xs rounded">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {tabs.find((tab) => tab.id === activeTab)?.content}
            </div>
          </BrutalCard>
        ) : (
          children && <BrutalCard className="p-6">{children}</BrutalCard>
        )}
      </div>
    </div>
  );
};
