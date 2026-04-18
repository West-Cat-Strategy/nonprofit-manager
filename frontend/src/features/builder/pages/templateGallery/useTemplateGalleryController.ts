import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import type {
  TemplateCategory,
  TemplateListItem,
  TemplateStatus,
} from '../../../../types/websiteBuilder';
import {
  clearError,
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  fetchSystemTemplates,
  searchTemplates,
  setSearchParams,
} from '../../state';
import { createWebsiteSite, publishWebsiteSite } from '../../../websites/state';
import {
  getSiteCreationErrorMessage,
  getSiteTemplateCopyName,
  getTemplateCopyName,
} from './helpers';
import type { SiteCreationStage, TemplateGalleryTab } from './options';

export function useTemplateGalleryController() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { templates, systemTemplates, searchParams, pagination, isLoading, error } = useAppSelector(
    (state) => state.templates
  );

  const [activeTab, setActiveTab] = useState<TemplateGalleryTab>('starter-templates');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showCreateSiteModal, setShowCreateSiteModal] = useState(false);
  const [sitePickerTab, setSitePickerTab] = useState<TemplateGalleryTab>('starter-templates');
  const [newSiteName, setNewSiteName] = useState('');
  const [selectedSiteTemplate, setSelectedSiteTemplate] = useState<TemplateListItem | null>(null);
  const [createSiteError, setCreateSiteError] = useState<string | null>(null);
  const [isCreatingSite, setIsCreatingSite] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<TemplateListItem | null>(null);
  const [searchInput, setSearchInput] = useState('');

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
    if (!showCreateSiteModal) {
      return;
    }

    if (sitePickerTab === 'starter-templates') {
      void dispatch(fetchSystemTemplates());
    } else {
      void dispatch(searchTemplates());
    }
  }, [dispatch, showCreateSiteModal, sitePickerTab]);

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

  const handleSelectTemplate = useCallback(
    async (template: TemplateListItem) => {
      if (template.isSystemTemplate) {
        try {
          const duplicatedTemplate = await dispatch(
            duplicateTemplate({
              id: template.id,
              name: getTemplateCopyName(template),
            })
          ).unwrap();
          navigate(`/website-builder/${duplicatedTemplate.id}`);
        } catch {
          return;
        }

        return;
      }

      navigate(`/website-builder/${template.id}`);
    },
    [dispatch, navigate]
  );

  const handlePreviewTemplate = useCallback((template: TemplateListItem) => {
    window.open(`/website-builder/${template.id}/preview`, '_blank', 'noopener,noreferrer');
  }, []);

  const handleDuplicateTemplate = useCallback(
    async (template: TemplateListItem) => {
      try {
        await dispatch(
          duplicateTemplate({
            id: template.id,
            name: getTemplateCopyName(template),
          })
        ).unwrap();
        void dispatch(searchTemplates());
      } catch {
        return;
      }
    },
    [dispatch]
  );

  const handleDeleteTemplate = useCallback((template: TemplateListItem) => {
    setDeleteConfirm(template);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirm) {
      return;
    }

    void dispatch(deleteTemplate(deleteConfirm.id));
    setDeleteConfirm(null);
  }, [deleteConfirm, dispatch]);

  const handlePageChange = useCallback(
    (page: number) => {
      dispatch(setSearchParams({ page }));
    },
    [dispatch]
  );

  const openNewTemplateModal = useCallback(() => {
    setShowNewModal(true);
  }, []);

  const closeNewTemplateModal = useCallback(() => {
    setShowNewModal(false);
  }, []);

  const handleStartFromScratch = useCallback(async () => {
    try {
      const createdTemplate = await dispatch(
        createTemplate({
          name: 'Untitled Website',
          description: 'New website template',
          category: 'multi-page',
          tags: [],
        })
      ).unwrap();
      setShowNewModal(false);
      navigate(`/website-builder/${createdTemplate.id}`);
    } catch {
      return;
    }
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

  const handleSitePickerTabChange = useCallback((tab: TemplateGalleryTab) => {
    setSitePickerTab(tab);
    setSelectedSiteTemplate(null);
    setCreateSiteError(null);
  }, []);

  const handleSelectSiteTemplate = useCallback((template: TemplateListItem) => {
    setSelectedSiteTemplate(template);
    setCreateSiteError(null);
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
    } catch (caughtError) {
      setCreateSiteError(getSiteCreationErrorMessage(stage, caughtError));
    } finally {
      setIsCreatingSite(false);
    }
  }, [closeCreateSiteModal, dispatch, navigate, newSiteName, selectedSiteTemplate]);

  const dismissError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const displayedTemplates = activeTab === 'starter-templates' ? systemTemplates : templates;
  const sitePickerTemplates =
    sitePickerTab === 'starter-templates' ? systemTemplates : templates;
  const siteCreateDisabled = isCreatingSite || !newSiteName.trim() || !selectedSiteTemplate;

  return {
    activeTab,
    closeCreateSiteModal,
    closeNewTemplateModal,
    confirmDelete,
    createSiteError,
    deleteConfirm,
    dismissError,
    displayedTemplates,
    error,
    handleCancelDelete,
    handleCategoryChange,
    handleCreateSite,
    handleDeleteTemplate,
    handleDuplicateTemplate,
    handlePageChange,
    handlePreviewTemplate,
    handleSelectSiteTemplate,
    handleSelectTemplate,
    handleSitePickerTabChange,
    handleStartFromScratch,
    handleStatusChange,
    handleTabChange,
    isCreatingSite,
    isLoading,
    newSiteName,
    openCreateSiteModal,
    openNewTemplateModal,
    pagination,
    searchInput,
    searchParams,
    selectedSiteTemplate,
    setNewSiteName,
    setSearchInput,
    showCreateSiteModal,
    showNewModal,
    siteCreateDisabled,
    sitePickerTab,
    sitePickerTemplates,
    systemTemplates,
  };
}
