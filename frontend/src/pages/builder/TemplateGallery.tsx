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
import TemplateCard from '../../components/templates/TemplateCard';
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
        dispatch(duplicateTemplate({ id: template.id })).then((result: any) => {
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
      dispatch(duplicateTemplate({ id: template.id })).then((result: any) => {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Website Builder</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create and manage your nonprofit's website
              </p>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('starter-templates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'starter-templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Starter Templates
              <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                {systemTemplates.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('my-templates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Templates
              <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
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
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category filter */}
          <select
            value={searchParams.category || ''}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : displayedTemplates.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'my-templates'
                ? 'Get started by selecting a starter template.'
                : 'No starter templates available.'}
            </p>
            {activeTab === 'my-templates' && (
              <button
                onClick={() => setActiveTab('starter-templates')}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* New Template Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Website</h2>
            <p className="text-gray-600 mb-6">
              Choose how you'd like to start:
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setActiveTab('starter-templates');
                }}
                className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Start from a Template</div>
                <div className="text-sm text-gray-500">
                  Choose from our collection of professional templates
                </div>
              </button>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  navigate('/website-builder/new');
                }}
                className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Start from Scratch</div>
                <div className="text-sm text-gray-500">
                  Begin with a blank template and build your own design
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowNewModal(false)}
              className="mt-4 w-full py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Template</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
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
