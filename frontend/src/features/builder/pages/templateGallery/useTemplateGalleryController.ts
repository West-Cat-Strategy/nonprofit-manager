import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import type {
  TemplateCategory,
  TemplateStatus,
} from '../../../../types/websiteBuilder';
import {
  clearError,
  fetchSystemTemplates,
  searchTemplates,
  setSearchParams,
} from '../../state';
import { getTemplatePreviewPath } from '../../lib/builderRouteTargets';
import { useSiteCreation } from './useSiteCreation';
import { useTemplateManagement } from './useTemplateManagement';
import type { TemplateGalleryTab } from './options';

export function useTemplateGalleryController() {
  const dispatch = useAppDispatch();
  const { templates, systemTemplates, searchParams, pagination, isLoading, error } = useAppSelector(
    (state) => state.templates
  );

  const [activeTab, setActiveTab] = useState<TemplateGalleryTab>('starter-templates');
  const [searchInput, setSearchInput] = useState('');

  const siteCreation = useSiteCreation(activeTab);
  const templateManagement = useTemplateManagement();

  useEffect(() => {
    if (activeTab === 'starter-templates') {
      void dispatch(fetchSystemTemplates());
    } else {
      void dispatch(searchTemplates());
    }
  }, [activeTab, dispatch, searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== searchParams.search) {
        dispatch(setSearchParams({ search: searchInput, page: 1 }));
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [dispatch, searchInput, searchParams.search]);

  useEffect(() => {
    if (!siteCreation.showCreateSiteModal) {
      return;
    }

    if (siteCreation.sitePickerTab === 'starter-templates') {
      void dispatch(fetchSystemTemplates());
    } else {
      void dispatch(searchTemplates());
    }
  }, [dispatch, siteCreation.showCreateSiteModal, siteCreation.sitePickerTab]);

  const handleTabChange = useCallback((tab: TemplateGalleryTab) => {
    setActiveTab(tab);
  }, []);

  const handleCategoryChange = useCallback(
    (category: string) => {
      dispatch(
        setSearchParams({
          category: category ? (category as TemplateCategory) : undefined,
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
          status: status ? (status as TemplateStatus) : undefined,
          page: 1,
        })
      );
    },
    [dispatch]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      dispatch(setSearchParams({ page }));
    },
    [dispatch]
  );

  const handlePreviewTemplate = useCallback((template: any) => {
    window.open(getTemplatePreviewPath(template.id), '_blank', 'noopener,noreferrer');
  }, []);

  const dismissError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const displayedTemplates = activeTab === 'starter-templates' ? systemTemplates : templates;
  const sitePickerTemplates =
    siteCreation.sitePickerTab === 'starter-templates' ? systemTemplates : templates;
  const siteCreateDisabled = siteCreation.isCreatingSite || !siteCreation.newSiteName.trim() || !siteCreation.selectedSiteTemplate;

  return {
    activeTab,
    closeCreateSiteModal: siteCreation.closeCreateSiteModal,
    closeNewTemplateModal: templateManagement.closeNewTemplateModal,
    confirmDelete: templateManagement.confirmDelete,
    createSiteError: siteCreation.createSiteError,
    deleteConfirm: templateManagement.deleteConfirm,
    dismissError,
    displayedTemplates,
    error,
    handleCancelDelete: templateManagement.handleCancelDelete,
    handleCategoryChange,
    handleCreateSite: siteCreation.handleCreateSite,
    handleDeleteTemplate: templateManagement.handleDeleteTemplate,
    handleDuplicateTemplate: templateManagement.handleDuplicateTemplate,
    handlePageChange,
    handlePreviewTemplate,
    handleSelectSiteTemplate: siteCreation.handleSelectSiteTemplate,
    handleSelectTemplate: templateManagement.handleSelectTemplate,
    handleSitePickerTabChange: siteCreation.handleSitePickerTabChange,
    handleStartFromScratch: templateManagement.handleStartFromScratch,
    handleStatusChange,
    handleTabChange,
    isCreatingSite: siteCreation.isCreatingSite,
    isLoading,
    newSiteName: siteCreation.newSiteName,
    openCreateSiteModal: siteCreation.openCreateSiteModal,
    openNewTemplateModal: templateManagement.openNewTemplateModal,
    pagination,
    searchInput,
    searchParams,
    selectedSiteTemplate: siteCreation.selectedSiteTemplate,
    setNewSiteName: siteCreation.setNewSiteName,
    setSearchInput,
    showCreateSiteModal: siteCreation.showCreateSiteModal,
    showNewModal: templateManagement.showNewModal,
    siteCreateDisabled,
    sitePickerTab: siteCreation.sitePickerTab,
    sitePickerTemplates,
    systemTemplates,
  };
}
