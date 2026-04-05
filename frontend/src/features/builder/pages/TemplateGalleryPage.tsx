/**
 * MODULE-OWNERSHIP: builder page
 *
 * Canonical template-gallery implementation for feature-owned builder routes.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../store';
import {
  createTemplate,
  searchTemplates,
  fetchSystemTemplates,
  deleteTemplate,
  duplicateTemplate,
  setSearchParams,
  clearError,
} from '../state';
import { createWebsiteSite, publishWebsiteSite } from '../../websites/state';
import { TemplateCard } from '../../../components/templates';
import type { TemplateListItem, TemplateCategory, TemplateStatus } from '../../../types/websiteBuilder';

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
type SiteCreationStage = 'duplicate' | 'create' | 'publish';

const getTemplateCopyName = (template: TemplateListItem): string =>
  template.name ? `${template.name} (Copy)` : 'Untitled Website Copy';

const getSiteTemplateCopyName = (siteName: string): string =>
  siteName.trim() ? `${siteName.trim()} Website Template` : 'Untitled Website Template';

const getAsyncErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallbackMessage;
};

const getSiteCreationErrorMessage = (stage: SiteCreationStage, error: unknown): string => {
  const message = getAsyncErrorMessage(error, 'Please try again.');

  switch (stage) {
    case 'duplicate':
      return `Could not prepare the starter template. ${message}`;
    case 'publish':
      return `The site was created, but publishing live failed. ${message}`;
    case 'create':
    default:
      return `Could not create the site. ${message}`;
  }
};

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
  const [showCreateSiteModal, setShowCreateSiteModal] = useState(false);
  const [sitePickerTab, setSitePickerTab] = useState<TabType>('starter-templates');
  const [newSiteName, setNewSiteName] = useState('');
  const [selectedSiteTemplate, setSelectedSiteTemplate] = useState<TemplateListItem | null>(null);
  const [createSiteError, setCreateSiteError] = useState<string | null>(null);
  const [isCreatingSite, setIsCreatingSite] = useState(false);
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

  useEffect(() => {
    if (!showCreateSiteModal) {
      return;
    }

    if (sitePickerTab === 'starter-templates') {
      dispatch(fetchSystemTemplates());
    } else {
      dispatch(searchTemplates());
    }
  }, [dispatch, showCreateSiteModal, sitePickerTab]);

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
        dispatch(
          duplicateTemplate({
            id: template.id,
            name: getTemplateCopyName(template),
          })
        ).then((result) => {
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
    window.open(`/website-builder/${template.id}/preview`, '_blank', 'noopener,noreferrer');
  }, []);

  const handleDuplicateTemplate = useCallback(
    (template: TemplateListItem) => {
      dispatch(
        duplicateTemplate({
          id: template.id,
          name: getTemplateCopyName(template),
        })
      ).then((result) => {
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

  const handleStartFromScratch = useCallback(() => {
    dispatch(
      createTemplate({
        name: 'Untitled Website',
        description: 'New website template',
        category: 'multi-page',
        tags: [],
      })
    ).then((result) => {
      if (createTemplate.fulfilled.match(result)) {
        navigate(`/website-builder/${result.payload.id}`);
      }
    });
  }, [dispatch, navigate]);

  const openCreateSiteModal = useCallback(() => {
    setCreateSiteError(null);
    setNewSiteName('');
    setSelectedSiteTemplate(null);
    setSitePickerTab(activeTab);
    setShowCreateSiteModal(true);
  }, [activeTab]);

  const closeCreateSiteModal = useCallback(() => {
    setShowCreateSiteModal(false);
    setCreateSiteError(null);
    setNewSiteName('');
    setSelectedSiteTemplate(null);
    setIsCreatingSite(false);
  }, []);

  const handleCreateSite = useCallback(async () => {
    const trimmedSiteName = newSiteName.trim();

    if (!selectedSiteTemplate || !trimmedSiteName) {
      return;
    }

    let stage: SiteCreationStage = 'create';
    let templateId = selectedSiteTemplate.id;

    setCreateSiteError(null);
    setIsCreatingSite(true);

    try {
      if (selectedSiteTemplate.isSystemTemplate) {
        stage = 'duplicate';
        const duplicatedTemplate = await dispatch(
          duplicateTemplate({
            id: selectedSiteTemplate.id,
            name: getSiteTemplateCopyName(trimmedSiteName),
          })
        ).unwrap();
        templateId = duplicatedTemplate.id;
      }

      stage = 'create';
      const site = await dispatch(
        createWebsiteSite({
          templateId,
          name: trimmedSiteName,
          siteKind: 'organization',
        })
      ).unwrap();

      stage = 'publish';
      const publishResult = await dispatch(
        publishWebsiteSite({
          siteId: site.id,
          templateId,
          target: 'live',
        })
      ).unwrap();

      closeCreateSiteModal();
      navigate(`/websites/${publishResult.siteId}/builder`);
    } catch (error) {
      setCreateSiteError(getSiteCreationErrorMessage(stage, error));
    } finally {
      setIsCreatingSite(false);
    }
  }, [closeCreateSiteModal, dispatch, navigate, newSiteName, selectedSiteTemplate]);

  const displayedTemplates = activeTab === 'starter-templates' ? systemTemplates : templates;
  const sitePickerTemplates =
    sitePickerTab === 'starter-templates' ? systemTemplates : templates;
  const siteCreateDisabled = isCreatingSite || !newSiteName.trim() || !selectedSiteTemplate;

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
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={openCreateSiteModal}
                className="inline-flex items-center px-4 py-2 border border-app-border bg-app-surface text-app-text rounded-lg hover:bg-app-surface-muted transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7h18M7 3v4m10-4v4M5 11h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2zm7 2v6m3-3H9"
                  />
                </svg>
                New Site
              </button>
              <button
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Website
              </button>
            </div>
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
                aria-label="Search templates"
                placeholder="Search templates..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
              />
            </div>
          </div>

          {/* Category filter */}
          <select
            aria-label="Filter templates by category"
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
              aria-label="Filter templates by status"
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
          <div className="bg-app-accent-soft border border-app-border text-app-accent-text px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => dispatch(clearError())} className="text-app-accent hover:text-app-accent-text">
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
                className="mt-4 inline-flex items-center px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover"
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
                  handleStartFromScratch();
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

      {/* Create Site Modal */}
      {showCreateSiteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-site-title"
            className="bg-app-surface rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
          >
            <div className="border-b border-app-border px-6 py-5">
              <h2 id="create-site-title" className="text-xl font-semibold text-app-text">
                Create and Publish Site
              </h2>
              <p className="mt-1 text-sm text-app-text-muted">
                Choose a source template, create the site, publish it live, and continue in the website workflow.
              </p>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[calc(85vh-10rem)]">
              <label className="block">
                <span className="block text-sm font-medium text-app-text mb-2">Site name</span>
                <input
                  type="text"
                  aria-label="Site name"
                  value={newSiteName}
                  onChange={(event) => setNewSiteName(event.target.value)}
                  placeholder="Community Support Hub"
                  className="w-full px-4 py-3 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
                />
              </label>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-app-text">Source template</h3>
                    <p className="mt-1 text-sm text-app-text-muted">
                      Starter templates are copied first so your new site has its own editable template.
                    </p>
                  </div>
                  {selectedSiteTemplate ? (
                    <span className="rounded-full bg-app-surface-muted px-3 py-1 text-xs font-medium text-app-text-muted">
                      Selected: {selectedSiteTemplate.name}
                    </span>
                  ) : null}
                </div>

                <nav className="mt-4 flex space-x-6 border-b border-app-border" aria-label="Template picker tabs">
                  <button
                    type="button"
                    onClick={() => {
                      setSitePickerTab('starter-templates');
                      setSelectedSiteTemplate(null);
                      setCreateSiteError(null);
                    }}
                    className={`pb-3 text-sm font-medium border-b-2 ${
                      sitePickerTab === 'starter-templates'
                        ? 'border-app-accent text-app-accent'
                        : 'border-transparent text-app-text-muted hover:border-app-input-border hover:text-app-text'
                    }`}
                  >
                    Starter Templates
                    <span className="ml-2 rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                      {systemTemplates.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSitePickerTab('my-templates');
                      setSelectedSiteTemplate(null);
                      setCreateSiteError(null);
                    }}
                    className={`pb-3 text-sm font-medium border-b-2 ${
                      sitePickerTab === 'my-templates'
                        ? 'border-app-accent text-app-accent'
                        : 'border-transparent text-app-text-muted hover:border-app-input-border hover:text-app-text'
                    }`}
                  >
                    My Templates
                    <span className="ml-2 rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                      {pagination.total}
                    </span>
                  </button>
                </nav>

                <div className="mt-4 min-h-56">
                  {isLoading && sitePickerTemplates.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-app-accent"></div>
                    </div>
                  ) : sitePickerTemplates.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-app-border p-6 text-center">
                      <h4 className="text-sm font-medium text-app-text">No templates available</h4>
                      <p className="mt-2 text-sm text-app-text-muted">
                        {sitePickerTab === 'starter-templates'
                          ? 'No starter templates are available right now.'
                          : 'Create or duplicate a template first, then come back to create a site from it.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {sitePickerTemplates.map((template) => {
                        const selected = selectedSiteTemplate?.id === template.id;

                        return (
                          <button
                            key={template.id}
                            type="button"
                            aria-label={`Select template ${template.name}`}
                            aria-pressed={selected}
                            onClick={() => {
                              setSelectedSiteTemplate(template);
                              setCreateSiteError(null);
                            }}
                            className={`rounded-xl border p-4 text-left transition-colors ${
                              selected
                                ? 'border-app-accent bg-app-accent-soft'
                                : 'border-app-border bg-app-surface hover:border-app-accent hover:bg-app-surface-muted'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-app-text">{template.name}</div>
                                <div className="mt-1 text-sm text-app-text-muted line-clamp-2">
                                  {template.description || 'No description'}
                                </div>
                              </div>
                              {template.isSystemTemplate ? (
                                <span className="rounded-full bg-app-accent px-2 py-1 text-xs font-medium text-white">
                                  Starter
                                </span>
                              ) : (
                                <span className="rounded-full bg-app-surface-muted px-2 py-1 text-xs font-medium text-app-text-muted capitalize">
                                  {template.status}
                                </span>
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-app-text-muted">
                              <span className="rounded-full bg-app-surface-muted px-2 py-1">
                                {categories.find((category) => category.value === template.category)?.label ||
                                  template.category}
                              </span>
                              <span>
                                {template.pageCount} {template.pageCount === 1 ? 'page' : 'pages'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {createSiteError ? (
                <div className="rounded-lg border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
                  {createSiteError}
                </div>
              ) : null}
            </div>

            <div className="border-t border-app-border px-6 py-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={closeCreateSiteModal}
                disabled={isCreatingSite}
                className="rounded-lg border border-app-input-border px-4 py-2 text-app-text-muted hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCreateSite();
                }}
                disabled={siteCreateDisabled}
                className="inline-flex items-center justify-center rounded-lg bg-app-accent px-4 py-2 font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingSite ? 'Creating Site...' : 'Create and Publish Site'}
              </button>
            </div>
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
                className="flex-1 py-2 px-4 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover"
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
