import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../../store';
import {
  createTemplatePage,
  fetchTemplate,
  setCurrentPage,
  updateCurrentPageSections,
  updateTemplate,
} from '../state';
import { toTemplateSettingsDraft } from '../components/templateSettingsDraft';
import { useEditorHistory } from '../../../hooks/useEditorHistory';
import { resolveBuilderSiteId } from '../lib/siteAwareEditor';
import type { TemplatePage } from '../../../types/websiteBuilder';
import { getSectionsSignature } from './pageEditorUtils';
import { createPageDraft } from './pageEditorControllerHelpers';
import { useBuilderSiteContext } from './useBuilderSiteContext';
import { usePageEditorKeyboardShortcuts } from './usePageEditorKeyboardShortcuts';
import { usePagePersistenceActions } from './usePagePersistenceActions';
import { usePageSectionEditing } from './usePageSectionEditing';

export type ViewMode = 'desktop' | 'tablet' | 'mobile';

export function usePageEditorController() {
  const { templateId: templateIdParam, siteId: routeSiteId } = useParams<{
    templateId?: string;
    siteId?: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const siteId = resolveBuilderSiteId(routeSiteId, searchParams.get('siteId'));

  const { currentTemplate, currentPage, isSaving, error } = useSelector(
    (state: RootState) => state.templates
  );

  const { siteContext, siteContextError, siteContextLoading } = useBuilderSiteContext(siteId);
  const resolvedTemplateId = templateIdParam || siteContext?.templateId || null;

  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [showPageList, setShowPageList] = useState(false);
  const [showTemplateSettings, setShowTemplateSettings] = useState(false);
  const [templateSettingsError, setTemplateSettingsError] = useState<string | null>(null);
  const [templateSettings, setTemplateSettings] = useState(() => toTemplateSettingsDraft(currentTemplate));
  const [autoSaveEnabled] = useState(true);

  const initialSections = useMemo(() => currentPage?.sections || [], [currentPage?.sections]);
  const currentPageSectionsSignature = useMemo(
    () => getSectionsSignature(currentPage?.sections),
    [currentPage?.sections]
  );

  const {
    sections: historySections,
    setSections: setHistorySections,
    undo,
    redo,
    isDirty,
    canUndo,
    canRedo,
  } = useEditorHistory(initialSections, {
    maxHistoryLength: 50,
    resetKey: currentPage?.id,
  });
  const historySectionsSignature = useMemo(
    () => getSectionsSignature(historySections),
    [historySections]
  );

  useEffect(() => {
    if (currentPage && isDirty && historySectionsSignature !== currentPageSectionsSignature) {
      dispatch(updateCurrentPageSections(historySections));
    }
  }, [
    historySections,
    historySectionsSignature,
    currentPage,
    currentPageSectionsSignature,
    dispatch,
    isDirty,
  ]);

  useEffect(() => {
    if (currentTemplate && !showTemplateSettings) {
      setTemplateSettings(toTemplateSettingsDraft(currentTemplate));
    }
  }, [currentTemplate, showTemplateSettings]);

  const handleOpenTemplateSettings = useCallback(() => {
    setTemplateSettingsError(null);
    setTemplateSettings(toTemplateSettingsDraft(currentTemplate));
    setShowTemplateSettings(true);
  }, [currentTemplate]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (resolvedTemplateId) {
      dispatch(fetchTemplate(resolvedTemplateId));
    }
  }, [dispatch, resolvedTemplateId]);

  const {
    activeId,
    handleAddSection,
    handleDeleteComponent,
    handleDeleteSection,
    handleDuplicateComponent,
    handleDuplicateSection,
    handleDragEnd,
    handleDragStart,
    handleMoveComponent,
    handleMoveSection,
    handleUpdateComponent,
    handleUpdateSection,
    selectedComponent,
    selectedComponentId,
    selectedSection,
    selectedSectionId,
    setSelectedComponentId,
    setSelectedSectionId,
  } = usePageSectionEditing({
    currentPage,
    historySections,
    setHistorySections,
  });

  const {
    handlePublishPage,
    handleSave,
    handleSaveVersion,
    handleUpdatePage,
    hasUnsavedChanges,
    isAutoSaving,
    isPublishing,
    lastSaved,
    publishNotice,
    saveNow,
  } = usePagePersistenceActions({
    autoSaveEnabled,
    currentPage,
    currentTemplate,
    dispatch,
    historySections,
    resolvedTemplateId,
    siteContext,
  });

  usePageEditorKeyboardShortcuts({ undo, redo, saveNow });

  const handlePageChange = useCallback(
    (pageId: string) => {
      if (!currentTemplate) return;
      const page = currentTemplate.pages.find((entry: TemplatePage) => entry.id === pageId);
      if (page) {
        dispatch(setCurrentPage(page));
        setSelectedComponentId(null);
        setSelectedSectionId(null);
      }
      setShowPageList(false);
    },
    [currentTemplate, dispatch, setSelectedComponentId, setSelectedSectionId]
  );

  const handleAddPage = useCallback(async () => {
    if (!resolvedTemplateId || !currentTemplate) return;

    try {
      await dispatch(
        createTemplatePage({
          templateId: resolvedTemplateId,
          data: createPageDraft(currentTemplate.pages),
        })
      ).unwrap();
      setShowPageList(false);
    } catch (err) {
      console.error('Failed to create page:', err);
    }
  }, [dispatch, resolvedTemplateId, currentTemplate]);

  const handleSaveTemplateSettings = useCallback(async () => {
    if (!currentTemplate) return;
    setTemplateSettingsError(null);
    try {
      await dispatch(
        updateTemplate({
          id: currentTemplate.id,
          data: {
            name: templateSettings.name.trim(),
            description: templateSettings.description.trim() || undefined,
            status: templateSettings.status as 'draft' | 'published' | 'archived',
          },
        })
      ).unwrap();
      setShowTemplateSettings(false);
    } catch (err) {
      setTemplateSettingsError(err instanceof Error ? err.message : 'Failed to update template');
    }
  }, [dispatch, currentTemplate, templateSettings]);

  return {
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
    handleDuplicateComponent,
    handleDuplicateSection,
    handleDragEnd,
    handleDragStart,
    handleMoveComponent,
    handleMoveSection,
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
  };
}
