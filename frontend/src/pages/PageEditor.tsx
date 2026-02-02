/**
 * Page Editor
 * Drag-and-drop website builder interface
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import type { AppDispatch, RootState } from '../store';
import {
  fetchTemplate,
  updateTemplatePage,
  createTemplateVersion,
  setCurrentPage,
  updateCurrentPageSections,
} from '../store/slices/templateSlice';
import ComponentPalette from '../components/editor/ComponentPalette';
import EditorCanvas from '../components/editor/EditorCanvas';
import PropertyPanel from '../components/editor/PropertyPanel';
import EditorHeader from '../components/editor/EditorHeader';
import PageList from '../components/editor/PageList';
import { useEditorHistory } from '../hooks/useEditorHistory';
import { useAutoSave } from '../hooks/useAutoSave';
import type { PageComponent, PageSection, ComponentType } from '../types/websiteBuilder';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const PageEditor: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { currentTemplate, currentPage, isSaving, error } = useSelector(
    (state: RootState) => state.templates
  );

  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPageList, setShowPageList] = useState(false);
  const [autoSaveEnabled] = useState(true);

  // Initialize sections from currentPage
  const initialSections = useMemo(
    () => currentPage?.sections || [],
    [currentPage?.id] // Only reset when page changes
  );

  // Editor history for undo/redo
  const {
    sections: historySections,
    setSections: setHistorySections,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorHistory(initialSections, { maxHistoryLength: 50 });

  // Auto-save callback
  const handleAutoSave = useCallback(
    async (sections: PageSection[]) => {
      if (!templateId || !currentPage) return;

      await dispatch(
        updateTemplatePage({
          templateId,
          pageId: currentPage.id,
          data: { sections },
        })
      ).unwrap();
    },
    [dispatch, templateId, currentPage]
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
    enabled: autoSaveEnabled && !!templateId && !!currentPage,
  });

  // Sync history sections to Redux store
  useEffect(() => {
    if (currentPage && historySections !== currentPage.sections) {
      dispatch(updateCurrentPageSections(historySections));
    }
  }, [historySections, dispatch, currentPage]);

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
    if (templateId) {
      dispatch(fetchTemplate(templateId));
    }
  }, [dispatch, templateId]);

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

  // Create new component with defaults
  const createNewComponent = (type: ComponentType): PageComponent => {
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
      'donation-form': { type: 'donation-form', suggestedAmounts: [25, 50, 100, 250], allowCustomAmount: true, recurringOption: true },
      'event-list': { type: 'event-list', maxEvents: 6, showPastEvents: false, layout: 'grid' },
      'newsletter-signup': { type: 'newsletter-signup', buttonText: 'Subscribe', successMessage: 'Thanks for subscribing!' },
      countdown: { type: 'countdown', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), showDays: true, showHours: true, showMinutes: true, showSeconds: true },
      stats: { type: 'stats', items: [], columns: 4 },
      team: { type: 'team', members: [], columns: 3, showBio: true, showSocial: true },
      'logo-grid': { type: 'logo-grid', logos: [], columns: 4, grayscale: false },
    };

    return { id, ...defaults[type] } as PageComponent;
  };

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
    if (!templateId || !currentTemplate || !currentPage) return;

    try {
      await saveNow();
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }, [templateId, currentTemplate, currentPage, saveNow]);

  // Save version
  const handleSaveVersion = useCallback(async () => {
    if (!templateId) return;

    await handleSave();
    await dispatch(createTemplateVersion({ templateId, changes: 'Manual save' }));
  }, [dispatch, templateId, handleSave]);

  // Handle page change
  const handlePageChange = useCallback(
    (pageId: string) => {
      if (!currentTemplate) return;
      const page = currentTemplate.pages.find((p) => p.id === pageId);
      if (page) {
        dispatch(setCurrentPage(page));
        setSelectedComponentId(null);
        setSelectedSectionId(null);
      }
      setShowPageList(false);
    },
    [currentTemplate, dispatch]
  );

  if (!currentTemplate || !currentPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      <div className="h-screen flex flex-col bg-gray-100">
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
          onBack={() => navigate('/website-builder')}
          onShowPages={() => setShowPageList(true)}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          lastSaved={lastSaved}
        />

        {/* Main Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Component Palette */}
          <ComponentPalette />

          {/* Center - Canvas */}
          <div className="flex-1 overflow-auto bg-gray-200 p-4">
            <div
              className={`mx-auto bg-white shadow-lg transition-all duration-300 ${
                viewMode === 'desktop'
                  ? 'max-w-full'
                  : viewMode === 'tablet'
                  ? 'max-w-[768px]'
                  : 'max-w-[375px]'
              }`}
            >
              <SortableContext
                items={historySections.flatMap((s) =>
                  s.components.map((c) => c.id)
                )}
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

          {/* Right Sidebar - Property Panel */}
          <PropertyPanel
            selectedComponent={selectedComponent}
            selectedSection={selectedSection}
            onUpdateComponent={handleUpdateComponent}
            onUpdateSection={handleUpdateSection}
            onDeleteComponent={handleDeleteComponent}
            onDeleteSection={handleDeleteSection}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && (
            <div className="bg-white shadow-lg rounded p-2 opacity-80">
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
            onClose={() => setShowPageList(false)}
          />
        )}

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )}
      </div>
    </DndContext>
  );
};

export default PageEditor;
