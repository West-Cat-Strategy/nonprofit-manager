import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../../store';
import {
  createTemplatePage,
  createTemplateVersion,
  fetchTemplate,
  setCurrentPage,
  updateCurrentPageSections,
  updateTemplate,
  updateTemplatePage,
} from '../state';
import {
  fetchWebsiteDeployment,
  fetchWebsiteOverview,
  fetchWebsiteVersions,
  publishWebsiteSite,
} from '../../websites/state';
import { toTemplateSettingsDraft } from '../components/templateSettingsDraft';
import { useEditorHistory } from '../../../hooks/useEditorHistory';
import { useAutoSave } from '../../../hooks/useAutoSave';
import { websitesApiClient } from '../../websites/api/websitesApiClient';
import type { WebsiteOverviewSummary } from '../../websites/types';
import {
  getBuilderBackLabel,
  getBuilderBackTarget,
  getBuilderContextLabel,
  getBuilderStatusLabel,
  resolveBuilderSiteId,
} from '../lib/siteAwareEditor';
import type {
  ComponentType,
  PageComponent,
  PageSection,
  TemplatePage,
  UpdatePageRequest,
} from '../../../types/websiteBuilder';
import {
  createNewComponent,
  getDefaultRoutePattern,
  getSectionsSignature,
  normalizePageSlug,
  normalizeRoutePattern,
} from './pageEditorUtils';

export type ViewMode = 'desktop' | 'tablet' | 'mobile';

type SiteContext = {
  siteId: string;
  siteName: string;
  siteStatus: WebsiteOverviewSummary['site']['status'];
  blocked: boolean;
  primaryUrl: string;
  previewUrl: string | null;
  templateId: string;
};

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

  const [siteContext, setSiteContext] = useState<SiteContext | null>(null);
  const [siteContextLoading, setSiteContextLoading] = useState(false);
  const [siteContextError, setSiteContextError] = useState<string | null>(null);
  const resolvedTemplateId = templateIdParam || siteContext?.templateId || null;

  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPageList, setShowPageList] = useState(false);
  const [showTemplateSettings, setShowTemplateSettings] = useState(false);
  const [templateSettingsError, setTemplateSettingsError] = useState<string | null>(null);
  const [templateSettings, setTemplateSettings] = useState(() => toTemplateSettingsDraft(currentTemplate));
  const [autoSaveEnabled] = useState(true);
  const [publishNotice, setPublishNotice] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

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

  const handleAutoSave = useCallback(
    async (sections: PageSection[]) => {
      if (!resolvedTemplateId || !currentPage) return;

      await dispatch(
        updateTemplatePage({
          templateId: resolvedTemplateId,
          pageId: currentPage.id,
          data: { sections },
        })
      ).unwrap();
    },
    [dispatch, resolvedTemplateId, currentPage]
  );

  const {
    isSaving: isAutoSaving,
    lastSaved,
    hasUnsavedChanges,
    saveNow,
  } = useAutoSave({
    data: historySections,
    onSave: handleAutoSave,
    debounceMs: 3000,
    enabled: autoSaveEnabled && !!resolvedTemplateId && !!currentPage,
  });

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveNow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveNow]);

  const getUpdatePayload = useCallback(
    (updates: UpdatePageRequest): UpdatePageRequest => {
      if (!currentPage) {
        return updates;
      }

      const nextSlug =
        updates.slug !== undefined
          ? normalizePageSlug(updates.slug) || currentPage.slug
          : currentPage.slug;
      const nextPageType = updates.pageType || currentPage.pageType || 'static';
      const nextCollection =
        nextPageType === 'static'
          ? undefined
          : updates.collection || currentPage.collection || 'events';
      const nextIsHomepage = updates.isHomepage ?? currentPage.isHomepage;
      const previousDefaultRoute = getDefaultRoutePattern(
        currentPage.pageType || 'static',
        currentPage.collection,
        currentPage.slug,
        currentPage.isHomepage
      );
      const nextDefaultRoute = getDefaultRoutePattern(
        nextPageType,
        nextCollection,
        nextSlug,
        nextIsHomepage
      );

      const payload: UpdatePageRequest = {
        ...updates,
        pageType: nextPageType,
        collection: nextCollection,
      };

      if (updates.name !== undefined) {
        payload.name = updates.name.trim() || currentPage.name;
      }

      if (updates.slug !== undefined) {
        payload.slug = nextSlug;
      }

      if (updates.routePattern !== undefined) {
        payload.routePattern = normalizeRoutePattern(updates.routePattern);
      } else if (
        updates.slug !== undefined ||
        updates.pageType !== undefined ||
        updates.collection !== undefined ||
        updates.isHomepage !== undefined
      ) {
        if (!currentPage.routePattern || currentPage.routePattern === previousDefaultRoute) {
          payload.routePattern = nextDefaultRoute;
        }
      }

      return payload;
    },
    [currentPage]
  );

  const commitPageUpdate = useCallback(
    async (updates: UpdatePageRequest) => {
      if (!resolvedTemplateId || !currentPage) return;

      await dispatch(
        updateTemplatePage({
          templateId: resolvedTemplateId,
          pageId: currentPage.id,
          data: getUpdatePayload(updates),
        })
      ).unwrap();
    },
    [dispatch, getUpdatePayload, currentPage, resolvedTemplateId]
  );

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
    if (!siteId) {
      setSiteContext(null);
      setSiteContextLoading(false);
      setSiteContextError(null);
      return;
    }

    let cancelled = false;
    setSiteContextLoading(true);
    setSiteContextError(null);
    void websitesApiClient
      .getOverview(siteId, 30)
      .then((overview) => {
        if (cancelled) return;
        const nextTemplateId = overview.template.id || overview.site.templateId;
        if (!nextTemplateId) {
          setSiteContextError('This site does not have a linked template.');
          setSiteContext(null);
          return;
        }

        setSiteContext({
          siteId,
          siteName: overview.site.name,
          siteStatus: overview.site.status,
          blocked: overview.site.blocked,
          primaryUrl: overview.deployment.primaryUrl,
          previewUrl: overview.deployment.previewUrl,
          templateId: nextTemplateId,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setSiteContextError(err instanceof Error ? err.message : 'Failed to load website context');
      })
      .finally(() => {
        if (!cancelled) {
          setSiteContextLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [siteId]);

  useEffect(() => {
    if (resolvedTemplateId) {
      dispatch(fetchTemplate(resolvedTemplateId));
    }
  }, [dispatch, resolvedTemplateId]);

  const selectedComponent = useMemo(() => {
    if (!selectedComponentId || !currentPage) return null;

    for (const section of historySections) {
      const component = section.components.find((entry) => entry.id === selectedComponentId);
      if (component) return component;
    }
    return null;
  }, [selectedComponentId, currentPage, historySections]);

  const selectedSection = useMemo(() => {
    if (!selectedSectionId || !currentPage) return null;
    return historySections.find((section) => section.id === selectedSectionId) || null;
  }, [selectedSectionId, currentPage, historySections]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || !currentPage) return;

      const activeDragId = active.id as string;
      const overId = over.id as string;

      if (activeDragId.startsWith('palette-')) {
        const componentType = activeDragId.replace('palette-', '') as ComponentType;
        const newComponent = createNewComponent(componentType);

        let targetSectionId = overId;
        if (overId.startsWith('component-')) {
          for (const section of historySections) {
            if (section.components.some((component) => component.id === overId.replace('component-', ''))) {
              targetSectionId = section.id;
              break;
            }
          }
        }

        const updatedSections = historySections.map((section) => {
          if (section.id === targetSectionId || section.id === overId) {
            return {
              ...section,
              components: [...section.components, newComponent],
            };
          }
          return section;
        });

        setHistorySections(updatedSections);
        setSelectedComponentId(newComponent.id);
        return;
      }

      if (activeDragId !== overId) {
        const updatedSections = historySections.map((section) => {
          const oldIndex = section.components.findIndex((component) => component.id === activeDragId);
          const newIndex = section.components.findIndex((component) => component.id === overId);

          if (oldIndex !== -1 && newIndex !== -1) {
            return {
              ...section,
              components: arrayMove(section.components, oldIndex, newIndex),
            };
          }
          return section;
        });

        setHistorySections(updatedSections);
      }
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleUpdateComponent = useCallback(
    (componentId: string, updates: Partial<PageComponent>) => {
      if (!currentPage) return;

      const updatedSections = historySections.map((section) => ({
        ...section,
        components: section.components.map((component) =>
          component.id === componentId ? { ...component, ...updates } : component
        ),
      })) as PageSection[];

      setHistorySections(updatedSections);
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleUpdateSection = useCallback(
    (sectionId: string, updates: Partial<PageSection>) => {
      if (!currentPage) return;

      const updatedSections = historySections.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section
      );

      setHistorySections(updatedSections);
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleDeleteComponent = useCallback(
    (componentId: string) => {
      if (!currentPage) return;

      const updatedSections = historySections.map((section) => ({
        ...section,
        components: section.components.filter((component) => component.id !== componentId),
      }));

      setHistorySections(updatedSections);
      setSelectedComponentId(null);
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleAddSection = useCallback(() => {
    if (!currentPage) return;

    const newSection: PageSection = {
      id: `section-${Date.now()}`,
      name: `Section ${historySections.length + 1}`,
      components: [],
      paddingTop: '4rem',
      paddingBottom: '4rem',
    };

    setHistorySections([...historySections, newSection]);
    setSelectedSectionId(newSection.id);
  }, [currentPage, historySections, setHistorySections]);

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      if (!currentPage || historySections.length <= 1) return;

      const updatedSections = historySections.filter((section) => section.id !== sectionId);
      setHistorySections(updatedSections);
      setSelectedSectionId(null);
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleSave = useCallback(async () => {
    if (!resolvedTemplateId || !currentTemplate || !currentPage) return;

    try {
      await saveNow();
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }, [resolvedTemplateId, currentTemplate, currentPage, saveNow]);

  const handleSaveVersion = useCallback(async () => {
    if (!resolvedTemplateId) return;

    await handleSave();
    await dispatch(
      createTemplateVersion({ templateId: resolvedTemplateId, changes: 'Manual save' })
    );
  }, [dispatch, resolvedTemplateId, handleSave]);

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
    [currentTemplate, dispatch]
  );

  const handleAddPage = useCallback(async () => {
    if (!resolvedTemplateId || !currentTemplate) return;

    const baseIndex = currentTemplate.pages.length + 1;
    const baseName = `New Page ${baseIndex}`;
    const existingSlugs = new Set(currentTemplate.pages.map((page: TemplatePage) => page.slug));
    let slug = `page-${baseIndex}`;
    let suffix = 1;
    while (existingSlugs.has(slug)) {
      slug = `page-${baseIndex}-${suffix}`;
      suffix += 1;
    }

    try {
      await dispatch(
        createTemplatePage({
          templateId: resolvedTemplateId,
          data: {
            name: baseName,
            slug,
            pageType: 'static',
            routePattern: getDefaultRoutePattern('static', undefined, slug, false),
            sections: [],
          },
        })
      ).unwrap();
      setShowPageList(false);
    } catch (err) {
      console.error('Failed to create page:', err);
    }
  }, [dispatch, resolvedTemplateId, currentTemplate]);

  const handleUpdatePage = useCallback(
    async (updates: UpdatePageRequest) => {
      try {
        await commitPageUpdate(updates);
      } catch (err) {
        console.error('Failed to update page settings:', err);
      }
    },
    [commitPageUpdate]
  );

  const handlePublishPage = useCallback(
    async (updates: UpdatePageRequest) => {
      if (!resolvedTemplateId || !currentPage || !siteContext) return;

      setPublishNotice(null);
      setIsPublishing(true);

      try {
        await saveNow();
        await commitPageUpdate(updates);
        const result = await dispatch(
          publishWebsiteSite({
            siteId: siteContext.siteId,
            templateId: resolvedTemplateId,
            target: 'live',
          })
        ).unwrap();

        void dispatch(fetchWebsiteDeployment(siteContext.siteId));
        void dispatch(fetchWebsiteOverview({ siteId: siteContext.siteId, period: 30 }));
        void dispatch(fetchWebsiteVersions({ siteId: siteContext.siteId, limit: 10 }));

        setPublishNotice({
          tone: 'success',
          message: result.url ? `Published live at ${result.url}.` : 'Published live successfully.',
        });
      } catch (err) {
        setPublishNotice({
          tone: 'error',
          message:
            err instanceof Error
              ? err.message
              : typeof err === 'string'
                ? err
                : 'Failed to publish the live site.',
        });
      } finally {
        setIsPublishing(false);
      }
    },
    [commitPageUpdate, currentPage, dispatch, resolvedTemplateId, saveNow, siteContext]
  );

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
  };
}
