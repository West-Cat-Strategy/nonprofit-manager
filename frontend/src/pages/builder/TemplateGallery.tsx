/**
 * Template Gallery Page
 * Browse, search, and manage website templates
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  searchTemplates,
  fetchSystemTemplates,
  deleteTemplate,
  duplicateTemplate,
  setSearchParams,
  clearError,
} from '../../store/slices/templateSlice';
import { TemplateCard } from '../../components/templates';
import type { TemplateListItem, TemplateCategory, TemplateStatus } from '../../types/websiteBuilder';

const categories: { value: TemplateCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'landing-page', label: 'Landing Page' },
  { value: 'event', label: 'Event' },
  { value: 'donation', label: 'Donation' },
  { value: 'blog', label: 'Blog' },
  { value: 'multi-page', label: 'Multi-Page' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'contact', label: 'Contact' },
];

const statuses: { value: TemplateStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

type TabType = 'my-templates' | 'starter-templates';

const TemplateGallery: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const {
    templates,
    systemTemplates,
    searchParams,
    pagination,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.templates);

  const [activeTab, setActiveTab] = useState<TabType>('starter-templates');
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<TemplateListItem | null>(null);
  const [searchInput, setSearchInput] = useState('');

  // Fetch templates on mount and when params change
  useEffect(() => {
    if (activeTab === 'starter-templates') {
      dispatch(fetchSystemTemplates());
    } else {
      dispatch(searchTemplates());
    }
  }, [dispatch, activeTab, searchParams]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParams.search) {
        dispatch(setSearchParams({ search: searchInput, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, dispatch, searchParams.search]);

  const handleCategoryChange = useCallback(
    (category: string) => {
      dispatch(
        setSearchParams({
          category: category as TemplateCategory | undefined,
          page: 1,
        })
      );
    },
    [dispatch]
  );

  const handleStatusChange = useCallback(
    (status: string) => {
      dispatch(
        setSearchParams({
          status: status as TemplateStatus | undefined,
          page: 1,
        })
      );
    },
    [dispatch]
  );

  const handleSelectTemplate = useCallback(
    (template: TemplateListItem) => {
      if (template.isSystemTemplate) {
        // For system templates, duplicate and then edit
        dispatch(duplicateTemplate({ id: template.id })).then((result) => {
          if (duplicateTemplate.fulfilled.match(result)) {
            navigate(`/website-builder/${result.payload.id}`);
          }
        });
      } else {
        // For user templates, go directly to editor
        navigate(`/website-builder/${template.id}`);
      }
    },
    [dispatch, navigate]
  );

  const handlePreviewTemplate = useCallback((template: TemplateListItem) => {
    // Open preview in new tab or modal
    window.open(`/website-builder/${template.id}/preview`, '_blank');
  }, []);

  const handleDuplicateTemplate = useCallback(
    (template: TemplateListItem) => {
      dispatch(duplicateTemplate({ id: template.id })).then((result) => {
        if (duplicateTemplate.fulfilled.match(result)) {
          // Refresh list to show new template
          dispatch(searchTemplates());
        }
      });
    },
    [dispatch]
  );

  const handleDeleteTemplate = useCallback(
    (template: TemplateListItem) => {
      setDeleteConfirm(template);
    },
    []
  );

  const confirmDelete = useCallback(() => {
    if (deleteConfirm) {
      dispatch(deleteTemplate(deleteConfirm.id));
      setDeleteConfirm(null);
    }
  }, [dispatch, deleteConfirm]);

  const handlePageChange = useCallback(
    (page: number) => {
      dispatch(setSearchParams({ page }));
    },
    [dispatch]
  );

  const displayedTemplates = activeTab === 'starter-templates' ? systemTemplates : templates;

  return (
    <div className="min-h-screen bg-app-surface-muted">
      {/* Header */}
      <div className="bg-app-surface border-b border-app-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-app-text">Website Builder</h1>
              <p className="mt-1 text-sm text-app-text-muted">
                Create and manage your nonprofit's website
              </p>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Website
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-app-surface border-b border-app-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('starter-templates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'starter-templates'
                  ? 'border-app-accent text-app-accent'
                  : 'border-transparent text-app-text-muted hover:text-app-text-muted hover:border-app-input-border'
              }`}
            >
              Starter Templates
              <span className="ml-2 bg-app-surface-muted text-app-text-muted py-0.5 px-2 rounded-full text-xs">
                {systemTemplates.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('my-templates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-templates'
                  ? 'border-app-accent text-app-accent'
                  : 'border-transparent text-app-text-muted hover:text-app-text-muted hover:border-app-input-border'
              }`}
            >
              My Templates
              <span className="ml-2 bg-app-surface-muted text-app-text-muted py-0.5 px-2 rounded-full text-xs">
                {pagination.total}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-app-text-subtle"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
              />
            </div>
          </div>

          {/* Category filter */}
          <select
            value={searchParams.category || ''}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-4 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Status filter (only for My Templates) */}
          {activeTab === 'my-templates' && (
            <select
              value={searchParams.status || ''}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-4 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => dispatch(clearError())} className="text-red-500 hover:text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Template Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent"></div>
          </div>
        ) : displayedTemplates.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-app-text-subtle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-app-text">No templates found</h3>
            <p className="mt-1 text-sm text-app-text-muted">
              {activeTab === 'my-templates'
                ? 'Get started by selecting a starter template.'
                : 'No starter templates available.'}
            </p>
            {activeTab === 'my-templates' && (
              <button
                onClick={() => setActiveTab('starter-templates')}
                className="mt-4 inline-flex items-center px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover"
              >
                Browse Starter Templates
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={handleSelectTemplate}
                onPreview={handlePreviewTemplate}
                onDuplicate={handleDuplicateTemplate}
                onDelete={activeTab === 'my-templates' ? handleDeleteTemplate : undefined}
              />
            ))}
          </div>
        )}

        {/* Pagination (only for My Templates) */}
        {activeTab === 'my-templates' && pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-2 text-sm border border-app-input-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-app-surface-muted"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-app-text-muted">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-2 text-sm border border-app-input-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-app-surface-muted"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* New Template Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-app-surface rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold text-app-text mb-4">Create New Website</h2>
            <p className="text-app-text-muted mb-6">
              Choose how you'd like to start:
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setActiveTab('starter-templates');
                }}
                className="w-full p-4 text-left border border-app-border rounded-lg hover:border-app-accent hover:bg-app-accent-soft transition-colors"
              >
                <div className="font-medium text-app-text">Start from a Template</div>
                <div className="text-sm text-app-text-muted">
                  Choose from our collection of professional templates
                </div>
              </button>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  navigate('/website-builder/new');
                }}
                className="w-full p-4 text-left border border-app-border rounded-lg hover:border-app-accent hover:bg-app-accent-soft transition-colors"
              >
                <div className="font-medium text-app-text">Start from Scratch</div>
                <div className="text-sm text-app-text-muted">
                  Begin with a blank template and build your own design
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowNewModal(false)}
              className="mt-4 w-full py-2 text-app-text-muted hover:text-app-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-app-surface rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold text-app-text mb-4">Delete Template</h2>
            <p className="text-app-text-muted mb-6">
              Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 px-4 border border-app-input-border rounded-lg text-app-text-muted hover:bg-app-surface-muted"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateGallery;
