/**
 * MODULE-OWNERSHIP: builder page
 *
 * Canonical page-editor implementation for feature-owned builder routes.
 */

import React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  ComponentPalette,
  EditorCanvas,
  PropertyPanel,
  EditorHeader,
  PageList,
} from '../../../components/editor';
import TemplateSettingsDialog from '../components/TemplateSettingsDialog';
import {
  getBuilderBackLabel,
  getBuilderBackTarget,
  getBuilderContextLabel,
  getBuilderStatusLabel,
} from '../lib/siteAwareEditor';
import { usePageEditorController } from './usePageEditorController';

const PageEditor: React.FC = () => {
  const {
    activeId,
    canRedo,
    canUndo,
    currentPage,
    currentTemplate,
    error,
    handleAddPage,
    handleAddSection,
    handleDeleteComponent,
    handleDeleteSection,
    handleDragEnd,
    handleDragStart,
    handleOpenTemplateSettings,
    handlePageChange,
    handlePublishPage,
    handleSave,
    handleSaveTemplateSettings,
    handleSaveVersion,
    handleUpdateComponent,
    handleUpdatePage,
    handleUpdateSection,
    hasUnsavedChanges,
    historySections,
    isAutoSaving,
    isPublishing,
    isSaving,
    lastSaved,
    navigate,
    publishNotice,
    redo,
    resolvedTemplateId,
    selectedComponent,
    selectedComponentId,
    selectedSection,
    selectedSectionId,
    sensors,
    setSelectedComponentId,
    setSelectedSectionId,
    setShowPageList,
    setShowTemplateSettings,
    setTemplateSettings,
    setViewMode,
    showPageList,
    showTemplateSettings,
    siteId,
    siteContext,
    siteContextError,
    siteContextLoading,
    templateSettings,
    templateSettingsError,
    undo,
    viewMode,
  } = usePageEditorController();

  if (siteContextLoading && !resolvedTemplateId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-surface-muted">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent"></div>
      </div>
    );
  }

  if (siteContextError && !resolvedTemplateId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-surface-muted px-4">
        <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-app-surface p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-app-text">Website builder unavailable</h1>
          <p className="mt-2 text-sm text-app-text-muted">{siteContextError}</p>
          <button
            type="button"
            onClick={() => navigate(siteId ? `/websites/${siteId}/overview` : '/website-builder')}
            className="mt-4 rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)]"
          >
            Return
          </button>
        </div>
      </div>
    );
  }

  if (!currentTemplate || !currentPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-surface-muted">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent"></div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-h-screen flex-col bg-app-surface-muted">
        {/* Editor Header */}
        <EditorHeader
          template={currentTemplate}
          currentPage={currentPage}
          viewMode={viewMode}
          isSaving={isSaving || isAutoSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          onViewModeChange={setViewMode}
          onSave={handleSave}
          onSaveVersion={handleSaveVersion}
          onBack={() => navigate(getBuilderBackTarget(siteContext))}
          onShowPages={() => setShowPageList(true)}
          onOpenSettings={handleOpenTemplateSettings}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          lastSaved={lastSaved}
          backLabel={getBuilderBackLabel(siteContext)}
          contextLabel={getBuilderContextLabel(siteContext)}
          statusLabel={getBuilderStatusLabel(siteContext)}
          previewHref={siteContext?.previewUrl || siteContext?.primaryUrl}
          publishingHref={siteContext ? `/websites/${siteContext.siteId}/publishing` : undefined}
        />

        {publishNotice ? (
          <div
            className={`mx-4 mt-4 rounded-2xl border px-4 py-3 text-sm shadow-sm sm:mx-6 lg:mx-8 ${
              publishNotice.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
            role={publishNotice.tone === 'error' ? 'alert' : 'status'}
          >
            {publishNotice.message}
          </div>
        ) : null}

        {/* Main Editor Area */}
        <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(16rem,18rem)_minmax(0,1fr)] lg:p-6 xl:grid-cols-[minmax(16rem,18rem)_minmax(0,1fr)_minmax(18rem,22rem)]">
          {/* Left Sidebar - Component Palette */}
          <aside className="min-h-0 lg:self-start xl:sticky xl:top-6">
            <ComponentPalette />
          </aside>

          {/* Center - Canvas */}
          <main className="min-h-0 overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-sm">
            <div className="h-full overflow-auto p-3 sm:p-4">
              <div
                className={`mx-auto transition-all duration-300 ${
                  viewMode === 'desktop'
                    ? 'max-w-full'
                    : viewMode === 'tablet'
                      ? 'max-w-[768px]'
                      : 'max-w-[375px]'
                }`}
              >
                <SortableContext
                  items={historySections.flatMap((s) => s.components.map((c) => c.id))}
                  strategy={verticalListSortingStrategy}
                >
                  <EditorCanvas
                    sections={historySections}
                    theme={currentTemplate.theme}
                    selectedComponentId={selectedComponentId}
                    selectedSectionId={selectedSectionId}
                    onSelectComponent={setSelectedComponentId}
                    onSelectSection={setSelectedSectionId}
                    onAddSection={handleAddSection}
                    onDeleteSection={handleDeleteSection}
                    onDeleteComponent={handleDeleteComponent}
                  />
                </SortableContext>
              </div>
            </div>
          </main>

          {/* Right Sidebar - Property Panel */}
          <aside className="min-h-0 xl:sticky xl:top-6 xl:self-start">
            <PropertyPanel
              currentPage={currentPage}
              selectedComponent={selectedComponent}
              selectedSection={selectedSection}
              onUpdatePage={handleUpdatePage}
              onUpdateComponent={handleUpdateComponent}
              onUpdateSection={handleUpdateSection}
              onDeleteComponent={handleDeleteComponent}
              onDeleteSection={handleDeleteSection}
              previewHref={siteContext?.previewUrl || siteContext?.primaryUrl || null}
              onPublishPage={handlePublishPage}
              canPublish={!!siteContext && !!resolvedTemplateId}
              isPublishing={isPublishing}
            />
          </aside>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && (
            <div className="bg-app-surface shadow-lg rounded p-2 opacity-80">
              Dragging...
            </div>
          )}
        </DragOverlay>

        {/* Page List Modal */}
        {showPageList && (
          <PageList
            pages={currentTemplate.pages}
            currentPageId={currentPage.id}
            onSelectPage={handlePageChange}
            onAddPage={handleAddPage}
            onClose={() => setShowPageList(false)}
          />
        )}

        {showTemplateSettings && (
          <TemplateSettingsDialog
            error={templateSettingsError}
            settings={templateSettings}
            onClose={() => setShowTemplateSettings(false)}
            onSave={handleSaveTemplateSettings}
            onSettingsChange={setTemplateSettings}
          />
        )}

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-app-accent text-[var(--app-accent-foreground)] px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )}
      </div>
    </DndContext>
  );
};

export default PageEditor;
