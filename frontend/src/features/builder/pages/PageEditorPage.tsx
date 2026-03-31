/**
 * MODULE-OWNERSHIP: builder page
 *
 * Canonical page-editor implementation for feature-owned builder routes.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { AppDispatch, RootState } from '../../../store';
import {
  fetchTemplate,
  updateTemplatePage,
  createTemplateVersion,
  createTemplatePage,
  updateTemplate,
  setCurrentPage,
  updateCurrentPageSections,
} from '../state';
import {
  fetchWebsiteDeployment,
  fetchWebsiteOverview,
  fetchWebsiteVersions,
  publishWebsiteSite,
} from '../../websites/state';
import {
  ComponentPalette,
  EditorCanvas,
  PropertyPanel,
  EditorHeader,
  PageList,
} from '../../../components/editor';
import TemplateSettingsDialog from '../components/TemplateSettingsDialog';
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
  PageComponent,
  PageSection,
  ComponentType,
  PageCollectionType,
  TemplatePage,
  TemplatePageType,
  UpdatePageRequest,
} from '../../../types/websiteBuilder';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const normalizePageSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const getSectionsSignature = (sections: PageSection[] | undefined): string =>
  JSON.stringify(sections ?? []);

const normalizeRoutePattern = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '/';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const getDefaultRoutePattern = (
  pageType: TemplatePageType,
  collection: PageCollectionType | undefined,
  slug: string,
  isHomepage: boolean
): string => {
  if (pageType === 'collectionIndex') {
    return collection === 'newsletters' ? '/newsletters' : '/events';
  }

  if (pageType === 'collectionDetail') {
    return collection === 'newsletters' ? '/newsletters/:slug' : '/events/:slug';
  }

  if (isHomepage) {
    return '/';
  }

  return `/${slug || 'page'}`;
};

const PageEditor: React.FC = () => {
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

  const [siteContext, setSiteContext] = useState<{
    siteId: string;
    siteName: string;
    siteStatus: WebsiteOverviewSummary['site']['status'];
    blocked: boolean;
    primaryUrl: string;
    previewUrl: string | null;
    templateId: string;
  } | null>(null);
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

  // Initialize sections from currentPage
  const initialSections = useMemo(() => currentPage?.sections || [], [currentPage?.sections]);
  const currentPageSectionsSignature = useMemo(
    () => getSectionsSignature(currentPage?.sections),
    [currentPage?.sections]
  );

  // Editor history for undo/redo
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

  // Auto-save callback
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

  // Auto-save hook
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

  // Sync history sections to Redux store
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

  // Keyboard shortcuts for undo/redo
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
      // Save shortcut
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

  // DnD sensors
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

  // Fetch template on mount
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

  // Get selected component
  const selectedComponent = useMemo(() => {
    if (!selectedComponentId || !currentPage) return null;

    for (const section of historySections) {
      const component = section.components.find((c) => c.id === selectedComponentId);
      if (component) return component;
    }
    return null;
  }, [selectedComponentId, currentPage, historySections]);

  // Get selected section
  const selectedSection = useMemo(() => {
    if (!selectedSectionId || !currentPage) return null;
    return historySections.find((s) => s.id === selectedSectionId) || null;
  }, [selectedSectionId, currentPage, historySections]);

  // Create new component with defaults
  function createNewComponent(type: ComponentType): PageComponent {
    const id = `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const defaults: Record<ComponentType, Partial<PageComponent>> = {
      text: { type: 'text', content: 'Add your text here...', align: 'left' },
      heading: { type: 'heading', content: 'Heading', level: 2, align: 'left' },
      image: { type: 'image', src: '', alt: 'Image description', objectFit: 'cover' },
      button: { type: 'button', text: 'Click me', variant: 'primary', size: 'md' },
      divider: { type: 'divider', color: '#e2e8f0', thickness: '1px', width: '100%' },
      spacer: { type: 'spacer', height: '2rem' },
      form: { type: 'form', fields: [], submitText: 'Submit', submitAction: '', successMessage: 'Thank you!', errorMessage: 'Something went wrong.' },
      gallery: { type: 'gallery', items: [], columns: 3 },
      video: { type: 'video', src: '', provider: 'youtube', controls: true },
      map: { type: 'map', height: '300px', zoom: 14 },
      'social-links': { type: 'social-links', links: [], iconSize: 'md', align: 'center' },
      columns: { type: 'columns', columns: [{ id: 'col1', width: '1/2', components: [] }, { id: 'col2', width: '1/2', components: [] }], gap: '1rem' },
      hero: { type: 'hero', minHeight: '400px', verticalAlign: 'center', components: [] },
      card: { type: 'card', shadow: true },
      testimonial: { type: 'testimonial', quote: 'Add testimonial quote...', author: 'Author Name' },
      pricing: { type: 'pricing', tiers: [], columns: 3 },
      faq: { type: 'faq', items: [], expandFirst: true, allowMultiple: false },
      'contact-form': { type: 'contact-form', submitText: 'Send Message', includePhone: true, includeMessage: true },
      'referral-form': {
        type: 'referral-form',
        heading: 'Referral intake',
        description: 'Send people who need support, follow-up, or case review.',
        submitText: 'Send Referral',
        successMessage: 'Referral received.',
        includePhone: true,
        defaultTags: ['referral'],
      },
      'donation-form': { type: 'donation-form', suggestedAmounts: [25, 50, 100, 250], allowCustomAmount: true, recurringOption: true },
      'event-list': {
        type: 'event-list',
        maxEvents: 6,
        showPastEvents: false,
        layout: 'grid',
        emptyMessage: 'No public events are available right now.',
      },
      'event-calendar': {
        type: 'event-calendar',
        maxEvents: 8,
        showPastEvents: false,
        initialView: 'month',
        emptyMessage: 'No public events are available right now.',
      },
      'event-detail': {
        type: 'event-detail',
        showDescription: true,
        showLocation: true,
        showCapacity: true,
        showRegistrationStatus: true,
      },
      'event-registration': {
        type: 'event-registration',
        submitText: 'Register',
        successMessage: 'Registration received.',
        includePhone: true,
        defaultStatus: 'registered',
      },
      'newsletter-signup': { type: 'newsletter-signup', buttonText: 'Subscribe', successMessage: 'Thanks for subscribing!' },
      'newsletter-archive': {
        type: 'newsletter-archive',
        maxItems: 10,
        sourceFilter: 'all',
        emptyMessage: 'No newsletters are available right now.',
      },
      'volunteer-interest-form': {
        type: 'volunteer-interest-form',
        submitText: 'Share Interest',
        successMessage: 'Volunteer interest received.',
        includePhone: true,
      },
      countdown: { type: 'countdown', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), showDays: true, showHours: true, showMinutes: true, showSeconds: true },
      stats: { type: 'stats', items: [], columns: 4 },
      team: { type: 'team', members: [], columns: 3, showBio: true, showSocial: true },
      'logo-grid': { type: 'logo-grid', logos: [], columns: 4, grayscale: false },
    };

    return { id, ...defaults[type] } as PageComponent;
  }

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || !currentPage) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Check if dropping a new component from palette
      if (activeId.startsWith('palette-')) {
        const componentType = activeId.replace('palette-', '') as ComponentType;
        const newComponent = createNewComponent(componentType);

        // Find target section
        let targetSectionId = overId;
        if (overId.startsWith('component-')) {
          // Find section containing this component
          for (const section of historySections) {
            if (section.components.some((c) => c.id === overId.replace('component-', ''))) {
              targetSectionId = section.id;
              break;
            }
          }
        }

        // Add to section
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

      // Reordering existing components
      if (activeId !== overId) {
        const updatedSections = historySections.map((section) => {
          const oldIndex = section.components.findIndex((c) => c.id === activeId);
          const newIndex = section.components.findIndex((c) => c.id === overId);

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

  // Update component properties
  const handleUpdateComponent = useCallback(
    (componentId: string, updates: Partial<PageComponent>) => {
      if (!currentPage) return;

      const updatedSections = historySections.map((section) => ({
        ...section,
        components: section.components.map((c) =>
          c.id === componentId ? { ...c, ...updates } : c
        ),
      })) as PageSection[];

      setHistorySections(updatedSections);
    },
    [currentPage, historySections, setHistorySections]
  );

  // Update section properties
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

  // Delete component
  const handleDeleteComponent = useCallback(
    (componentId: string) => {
      if (!currentPage) return;

      const updatedSections = historySections.map((section) => ({
        ...section,
        components: section.components.filter((c) => c.id !== componentId),
      }));

      setHistorySections(updatedSections);
      setSelectedComponentId(null);
    },
    [currentPage, historySections, setHistorySections]
  );

  // Add new section
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

  // Delete section
  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      if (!currentPage || historySections.length <= 1) return;

      const updatedSections = historySections.filter((s) => s.id !== sectionId);
      setHistorySections(updatedSections);
      setSelectedSectionId(null);
    },
    [currentPage, historySections, setHistorySections]
  );

  // Save changes
  const handleSave = useCallback(async () => {
    if (!resolvedTemplateId || !currentTemplate || !currentPage) return;

    try {
      await saveNow();
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }, [resolvedTemplateId, currentTemplate, currentPage, saveNow]);

  // Save version
  const handleSaveVersion = useCallback(async () => {
    if (!resolvedTemplateId) return;

    await handleSave();
    await dispatch(createTemplateVersion({ templateId: resolvedTemplateId, changes: 'Manual save' }));
  }, [dispatch, resolvedTemplateId, handleSave]);

  // Handle page change
  const handlePageChange = useCallback(
    (pageId: string) => {
      if (!currentTemplate) return;
      const page = currentTemplate.pages.find((p: TemplatePage) => p.id === pageId);
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
    const existingSlugs = new Set(currentTemplate.pages.map((p: TemplatePage) => p.slug));
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
          message: result.url
            ? `Published live at ${result.url}.`
            : 'Published live successfully.',
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
            className="mt-4 rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-white"
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
          <div className="fixed bottom-4 right-4 bg-app-accent text-white px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )}
      </div>
    </DndContext>
  );
};

export default PageEditor;
