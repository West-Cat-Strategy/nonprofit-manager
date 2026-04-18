/**
 * MODULE-OWNERSHIP: builder page
 *
 * Canonical template-gallery implementation for feature-owned builder routes.
 */

import React from 'react';
import CreateSiteModal from './templateGallery/CreateSiteModal';
import DeleteTemplateModal from './templateGallery/DeleteTemplateModal';
import NewTemplateModal from './templateGallery/NewTemplateModal';
import TemplateGalleryContent from './templateGallery/TemplateGalleryContent';
import TemplateGalleryFilters from './templateGallery/TemplateGalleryFilters';
import TemplateGalleryHeader from './templateGallery/TemplateGalleryHeader';
import { useTemplateGalleryController } from './templateGallery/useTemplateGalleryController';

const TemplateGallery: React.FC = () => {
  const controller = useTemplateGalleryController();

  return (
    <div className="min-h-screen bg-app-surface-muted">
      <TemplateGalleryHeader
        activeTab={controller.activeTab}
        myTemplatesTotal={controller.pagination.total}
        onOpenCreateSite={controller.openCreateSiteModal}
        onOpenNewTemplate={controller.openNewTemplateModal}
        onTabChange={controller.handleTabChange}
        starterTemplatesCount={controller.systemTemplates.length}
      />

      <TemplateGalleryFilters
        activeTab={controller.activeTab}
        category={controller.searchParams.category || ''}
        onCategoryChange={controller.handleCategoryChange}
        onSearchChange={controller.setSearchInput}
        onStatusChange={controller.handleStatusChange}
        searchInput={controller.searchInput}
        status={controller.searchParams.status || ''}
      />

      <TemplateGalleryContent
        activeTab={controller.activeTab}
        displayedTemplates={controller.displayedTemplates}
        error={controller.error}
        isLoading={controller.isLoading}
        onBrowseStarterTemplates={() => controller.handleTabChange('starter-templates')}
        onDeleteTemplate={controller.handleDeleteTemplate}
        onDismissError={controller.dismissError}
        onDuplicateTemplate={controller.handleDuplicateTemplate}
        onPageChange={controller.handlePageChange}
        onPreviewTemplate={controller.handlePreviewTemplate}
        onSelectTemplate={controller.handleSelectTemplate}
        pagination={controller.pagination}
      />

      <NewTemplateModal
        open={controller.showNewModal}
        onBrowseStarterTemplates={() => {
          controller.closeNewTemplateModal();
          controller.handleTabChange('starter-templates');
        }}
        onClose={controller.closeNewTemplateModal}
        onStartFromScratch={controller.handleStartFromScratch}
      />

      <CreateSiteModal
        createSiteError={controller.createSiteError}
        isCreatingSite={controller.isCreatingSite}
        isLoading={controller.isLoading}
        myTemplatesTotal={controller.pagination.total}
        newSiteName={controller.newSiteName}
        onClose={controller.closeCreateSiteModal}
        onCreateSite={controller.handleCreateSite}
        onNewSiteNameChange={controller.setNewSiteName}
        onSelectTemplate={controller.handleSelectSiteTemplate}
        onSitePickerTabChange={controller.handleSitePickerTabChange}
        open={controller.showCreateSiteModal}
        selectedSiteTemplate={controller.selectedSiteTemplate}
        siteCreateDisabled={controller.siteCreateDisabled}
        sitePickerTab={controller.sitePickerTab}
        sitePickerTemplates={controller.sitePickerTemplates}
        starterTemplatesCount={controller.systemTemplates.length}
      />

      <DeleteTemplateModal
        onCancel={controller.handleCancelDelete}
        onConfirm={controller.confirmDelete}
        template={controller.deleteConfirm}
      />
    </div>
  );
};

export default TemplateGallery;
