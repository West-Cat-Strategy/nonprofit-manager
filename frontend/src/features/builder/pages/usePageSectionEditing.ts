import { useCallback, useMemo, useState } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type {
  ComponentType,
  PageComponent,
  PageSection,
  TemplatePage,
} from '../../../types/websiteBuilder';
import { createNewComponent } from './pageEditorUtils';
import {
  applyDragEndToSections,
  createSectionDraft,
  deleteComponentFromSections,
  deleteSectionFromSections,
  updateComponentInSections,
  updateSectionInSections,
} from './pageEditorControllerHelpers';

type UsePageSectionEditingParams = {
  currentPage: TemplatePage | null | undefined;
  historySections: PageSection[];
  setHistorySections: (sections: PageSection[]) => void;
};

export function usePageSectionEditing({
  currentPage,
  historySections,
  setHistorySections,
}: UsePageSectionEditingParams) {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const selectedComponent = useMemo(() => {
    if (!selectedComponentId || !currentPage) return null;

    for (const section of historySections) {
      const component = section.components.find((entry) => entry.id === selectedComponentId);
      if (component) return component;
    }

    return null;
  }, [currentPage, historySections, selectedComponentId]);

  const selectedSection = useMemo(() => {
    if (!selectedSectionId || !currentPage) return null;
    return historySections.find((section) => section.id === selectedSectionId) || null;
  }, [currentPage, historySections, selectedSectionId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || !currentPage) return;

      const activeId = active.id as string;
      const paletteComponent = activeId.startsWith('palette-')
        ? createNewComponent(activeId.replace('palette-', '') as ComponentType)
        : undefined;
      const updatedSections = applyDragEndToSections({
        sections: historySections,
        activeId,
        overId: over.id as string,
        paletteComponent,
      });

      setHistorySections(updatedSections);
      if (paletteComponent) {
        setSelectedComponentId(paletteComponent.id);
      }
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleUpdateComponent = useCallback(
    (componentId: string, updates: Partial<PageComponent>) => {
      if (!currentPage) return;
      setHistorySections(updateComponentInSections(historySections, componentId, updates));
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleUpdateSection = useCallback(
    (sectionId: string, updates: Partial<PageSection>) => {
      if (!currentPage) return;
      setHistorySections(updateSectionInSections(historySections, sectionId, updates));
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleDeleteComponent = useCallback(
    (componentId: string) => {
      if (!currentPage) return;
      setHistorySections(deleteComponentFromSections(historySections, componentId));
      setSelectedComponentId(null);
    },
    [currentPage, historySections, setHistorySections]
  );

  const handleAddSection = useCallback(() => {
    if (!currentPage) return;

    const newSection = createSectionDraft(historySections, `section-${Date.now()}`);
    setHistorySections([...historySections, newSection]);
    setSelectedSectionId(newSection.id);
  }, [currentPage, historySections, setHistorySections]);

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      if (!currentPage || historySections.length <= 1) return;
      setHistorySections(deleteSectionFromSections(historySections, sectionId));
      setSelectedSectionId(null);
    },
    [currentPage, historySections, setHistorySections]
  );

  return {
    activeId,
    handleAddSection,
    handleDeleteComponent,
    handleDeleteSection,
    handleDragEnd,
    handleDragStart,
    handleUpdateComponent,
    handleUpdateSection,
    selectedComponent,
    selectedComponentId,
    selectedSection,
    selectedSectionId,
    setSelectedComponentId,
    setSelectedSectionId,
  };
}
