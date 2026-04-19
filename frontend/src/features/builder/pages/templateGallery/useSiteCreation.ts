import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../../../store/hooks';
import type { TemplateListItem } from '../../../../types/websiteBuilder';
import { duplicateTemplate } from '../../state';
import { createWebsiteSite, publishWebsiteSite } from '../../../websites/state';
import { getSiteCreationErrorMessage, getSiteTemplateCopyName } from './helpers';
import type { SiteCreationStage, TemplateGalleryTab } from './options';

export function useSiteCreation(activeTab: TemplateGalleryTab) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [showCreateSiteModal, setShowCreateSiteModal] = useState(false);
  const [sitePickerTab, setSitePickerTab] = useState<TemplateGalleryTab>(activeTab);
  const [newSiteName, setNewSiteName] = useState('');
  const [selectedSiteTemplate, setSelectedSiteTemplate] = useState<TemplateListItem | null>(null);
  const [createSiteError, setCreateSiteError] = useState<string | null>(null);
  const [isCreatingSite, setIsCreatingSite] = useState(false);

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

  return {
    showCreateSiteModal,
    sitePickerTab,
    newSiteName,
    selectedSiteTemplate,
    createSiteError,
    isCreatingSite,
    openCreateSiteModal,
    closeCreateSiteModal,
    handleSitePickerTabChange,
    handleSelectSiteTemplate,
    handleCreateSite,
    setNewSiteName,
    setSitePickerTab,
  };
}
